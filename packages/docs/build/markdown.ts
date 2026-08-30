import Shiki from '@shikijs/markdown-it';
import MarkdownIt, {
  type MarkdownIt as MarkdownItInstance,
  type Token,
} from 'markdown-it';

/**
 * Markdown → HTML, with the two bits of structure the docs layout needs:
 * stable heading ids to link at, and the heading list the "On this page" rail
 * is built from.
 *
 * Both come out of a single parse. `md.render` would hide the token stream, so
 * this parses and renders in two steps and walks the tokens in between —
 * cheaper and less fragile than re-deriving headings from the rendered HTML.
 */

/**
 * Shiki writes both themes' colours as CSS variables on every token and
 * style.css picks one under the `dark` variant — the same mechanism the rest of
 * the site's dark mode rides on, so there is no theme state to sync.
 */
const THEMES = { light: 'github-light', dark: 'github-dark' } as const;

export type Heading = {
  id: string;
  text: string;
  /** 2 or 3 — deeper headings are not worth a rail entry. */
  level: number;
};

/**
 * Headings that become their own link — the same ones the rail lists, so every
 * rail entry has a heading a reader can copy a URL from.
 */
const ANCHORED_TAGS = new Set(['h2', 'h3']);

export type RenderContext = {
  /** Turns a site-absolute href like `/docs/api` into one this page can use. */
  resolveHref: (href: string) => string;
};

export type RenderedMarkdown = {
  html: string;
  headings: Heading[];
};

/** The visible text of a heading, with the markdown syntax dropped. */
const plainText = (token: Token): string =>
  (token.children ?? [])
    .filter((child) => child.type === 'text' || child.type === 'code_inline')
    .map((child) => child.content)
    .join('');

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '');

/**
 * Gives every heading an id and returns the ones worth a table of contents.
 *
 * Ids are deduped with a numeric suffix, so two sections that happen to share a
 * name still get one anchor each rather than one anchor and one dead link.
 */
const collectHeadings = (tokens: Token[]): Heading[] => {
  const headings: Heading[] = [];
  const used = new Map<string, number>();

  tokens.forEach((token, index) => {
    if (token.type !== 'heading_open') return;

    const text = plainText(tokens[index + 1]);
    const base = slugify(text) || 'section';
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);

    const id = count === 0 ? base : `${base}-${count + 1}`;
    token.attrSet('id', id);

    const level = Number(token.tag.slice(1));
    // h1 is the page title and h4+ are too fine-grained to navigate by.
    if (level === 2 || level === 3) headings.push({ id, text, level });
  });

  return headings;
};

/**
 * Rewrites the site-absolute links authors write in markdown.
 *
 * Pages are linked as `/docs/api` in the source regardless of where they end up
 * being served from; `resolveHref` is what turns that into a working href for
 * the page currently being rendered. Off-site links are left alone but get the
 * usual `rel`, since they open in a new tab.
 */
const resolveLinks = (tokens: Token[], { resolveHref }: RenderContext) => {
  for (const token of tokens) {
    if (token.type === 'inline') {
      resolveLinks(token.children ?? [], { resolveHref });
      continue;
    }

    if (token.type !== 'link_open') continue;

    // markdown-it types attribute values as `string | number`; an href is
    // always the former, but the narrowing has to be written out.
    const href = String(token.attrGet('href') ?? '');
    if (href === '') continue;

    if (href.startsWith('/')) {
      token.attrSet('href', resolveHref(href));
    } else if (/^https?:\/\//.test(href)) {
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noreferrer');
    }
  }
};

/**
 * Building the highlighter loads Shiki's grammars, so the instance is created
 * once and shared. Rendering itself stays synchronous and per-page.
 */
let instance: Promise<MarkdownItInstance> | undefined;

const createRenderer = async () => {
  const md = MarkdownIt({ html: true, linkify: true, typographer: false });

  md.use(
    await Shiki({
      themes: THEMES,
      // Emit the CSS variables only — with no default colour baked in, the
      // `dark` variant in style.css is what decides which theme applies.
      defaultColor: false,
      transformers: [
        {
          pre(node) {
            // Carry the site's panel styling over and drop Shiki's inline
            // background, so blocks keep their border and spacing; only the
            // tokens inside get themed.
            node.properties.class = `code-block ${node.properties.class ?? ''}`;
            node.properties['data-lang'] = this.options.lang;
            delete node.properties.style;
          },
        },
      ],
    }),
  );

  // A wide table should scroll in its own box rather than widening the page,
  // and markdown has nowhere to hang the wrapper that needs.
  md.renderer.rules.table_open = () => '<div class="table-wrap"><table>';
  md.renderer.rules.table_close = () => '</table></div>';

  /*
   * Headings link to themselves.
   *
   * The anchor wraps the heading's content rather than sitting beside it, so
   * the whole title is the click target and the link's accessible name is the
   * title itself. The trailing `#` is a separate, aria-hidden element — as a
   * CSS pseudo-element its text can end up announced, and as part of the anchor
   * text it would end up in the link's name.
   */
  const isAnchored = (token: Token | undefined) =>
    token?.type === 'heading_open' &&
    ANCHORED_TAGS.has(token.tag) &&
    token.attrGet('id') !== null;

  md.renderer.rules.heading_open = (tokens, index, options, _env, self) => {
    const token = tokens[index];
    const open = self.renderToken(tokens, index, options);
    if (!isAnchored(token)) return open;

    return `${open}<a class="heading-anchor" href="#${token.attrGet('id')}">`;
  };

  md.renderer.rules.heading_close = (tokens, index, options, _env, self) => {
    const close = self.renderToken(tokens, index, options);
    // markdown-it emits heading_open, inline, heading_close in sequence, so the
    // opening tag this one closes is always two tokens back.
    if (!isAnchored(tokens[index - 2])) return close;

    return `<span class="heading-anchor-mark" aria-hidden="true">#</span></a>${close}`;
  };

  // Inline code is styled by class rather than by element, so that the `<code>`
  // Shiki nests inside a highlighted block is not caught by the same rule.
  md.renderer.rules.code_inline = (tokens, index, _options, _env, self) => {
    const token = tokens[index];
    token.attrSet('class', 'code-inline');
    return `<code${self.renderAttrs(token)}>${md.utils.escapeHtml(token.content)}</code>`;
  };

  return md;
};

export const renderMarkdown = async (
  source: string,
  context: RenderContext,
): Promise<RenderedMarkdown> => {
  instance ??= createRenderer();
  const md = await instance;

  const tokens = md.parse(source, {});
  const headings = collectHeadings(tokens);
  resolveLinks(tokens, context);

  return { html: md.renderer.render(tokens, md.options, {}), headings };
};
