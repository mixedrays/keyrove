import Shiki from '@shikijs/markdown-it';
import MarkdownIt, {
  type MarkdownIt as MarkdownItInstance,
  type Token,
} from 'markdown-it';

import { icon } from './icons.ts';

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

/** What a tab calls a block when its fence gives no `title="…"`. */
const LANGUAGE_NAMES: Record<string, string> = {
  html: 'HTML',
  css: 'CSS',
  js: 'JavaScript',
  ts: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  vue: 'Vue',
  svelte: 'Svelte',
  sh: 'Shell',
};

/**
 * A block's tab label: the fence's `title="…"` when it has one — the way to
 * tell apart two blocks in the same language, like the install commands — and
 * the name of its language otherwise.
 */
const tabLabel = (info: string) => {
  const title = /\btitle="([^"]*)"/.exec(info)?.[1];
  if (title) return title;

  const lang = info.trim().split(/\s+/)[0];
  return LANGUAGE_NAMES[lang] ?? lang;
};

/**
 * Whether a fence asks for a copy button: a bare `copy` word after the
 * language, as in ```` ```text copy ```` or ```` ```text title="React" copy ````.
 * Quoted values are dropped first, so a title that says "copy" does not count.
 */
const wantsCopy = (info: string) =>
  info
    .replace(/"[^"]*"/g, '')
    .trim()
    .split(/\s+/)
    .slice(1)
    .includes('copy');

/**
 * The copy button a code panel carries, shared with the demos' source blocks.
 * It copies the visible block beside it in the same container, which
 * src/copy-code.ts looks up on the click.
 */
export const copyButton = (label: string) =>
  [
    '<button type="button" class="code-copy" data-copy-code',
    `aria-label="${label}">`,
    icon('copy', 'size-3.5 icon-idle'),
    icon('check', 'size-3.5 icon-done'),
    '</button>',
  ].join(' ');

/** The visible text of a heading, with the markdown syntax dropped. */
const plainText = (token: Token): string =>
  (token.children ?? [])
    .map((child) =>
      child.type === 'softbreak' || child.type === 'hardbreak'
        ? ' '
        : child.type === 'text' || child.type === 'code_inline'
          ? child.content
          : '',
    )
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

/** Search uses the same parser and ID allocator, without loading Shiki. */
const searchParser = MarkdownIt({ html: true, linkify: true });

export const collectSearchSections = (source: string) => {
  const tokens = searchParser.parse(source, {});
  collectHeadings(tokens);
  const sections = [{ id: '', heading: '', text: '' }];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type === 'heading_open' && ANCHORED_TAGS.has(token.tag)) {
      sections.push({
        id: String(token.attrGet('id')),
        heading: plainText(tokens[index + 1]),
        text: '',
      });
      index += 2;
    } else if (token.type === 'inline') {
      sections[sections.length - 1].text += `${plainText(token)} `;
    } else if (token.type === 'fence' || token.type === 'code_block') {
      sections[sections.length - 1].text += `${token.content} `;
    }
  }
  return sections.map((section) => ({
    ...section,
    text: section.text.replace(/\s+/g, ' ').trim(),
  }));
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

  /*
   * Blocks written back to back are one panel with a tab per block: the
   * markup and the script that drives it, or the same command for three
   * package managers. Nothing marks a group but the adjacency itself — any
   * prose between two blocks keeps them apart.
   *
   * The tabs are stamped here, the first one selected, so the panel arrives
   * finished and src/code-tabs.ts only has to switch it. Ids are numbered per
   * page through `env`, which a render gets fresh.
   *
   * A fence flagged `copy` gets a copy button in the top corner, over the block
   * or at the end of the tab strip. One flagged block is enough to give its
   * panel the button, which then copies whichever tab is showing.
   */
  const renderFence = md.renderer.rules.fence!;
  const isFence = (token: Token | undefined) => token?.type === 'fence';
  const copy = copyButton('Copy to clipboard');

  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const block = renderFence(tokens, index, options, env, self);
    const isFirst = !isFence(tokens[index - 1]);
    const isLast = !isFence(tokens[index + 1]);
    if (isFirst && isLast) {
      return wantsCopy(tokens[index].info)
        ? `<div class="code-copyable">${copy}${block}</div>\n`
        : block;
    }

    let start = index;
    while (isFence(tokens[start - 1])) start--;
    const position = index - start;

    // renderMarkdown always passes one; the fallback only satisfies the type.
    const page = (env ?? {}) as { codeTabs?: number };
    if (isFirst) page.codeTabs = (page.codeTabs ?? 0) + 1;
    const id = `code-tabs-${page.codeTabs}`;

    let open = '';
    if (isFirst) {
      const tabs: string[] = [];
      let copyable = false;
      for (let i = index; isFence(tokens[i]); i++) {
        copyable ||= wantsCopy(tokens[i].info);
        const selected = i === index;
        tabs.push(
          `<button type="button" role="tab" class="code-tab" id="${id}-tab-${i - index}"` +
            ` aria-controls="${id}-panel-${i - index}" aria-selected="${selected}"` +
            ` tabindex="${selected ? 0 : -1}" data-keyrove-item>` +
            `${md.utils.escapeHtml(tabLabel(tokens[i].info))}</button>`,
        );
      }

      open =
        (copyable
          ? `<div class="code-tabs code-copyable" data-code-tabs>${copy}`
          : '<div class="code-tabs" data-code-tabs>') +
        `<div class="code-tabs-bar" role="tablist" data-keyrove-orientation="horizontal">${tabs.join('')}</div>`;
    }

    const panel =
      `<div class="code-tabs-panel" role="tabpanel" id="${id}-panel-${position}"` +
      ` aria-labelledby="${id}-tab-${position}"${position === 0 ? '' : ' hidden'}>` +
      `${block}</div>`;

    return `${open}${panel}${isLast ? '</div>\n' : ''}`;
  };

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
