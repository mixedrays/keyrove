import Shiki from '@shikijs/markdown-it';
import MarkdownIt, { type Token } from 'markdown-it';

/**
 * Markdown → HTML, with the structure the site needs beside it: stable heading
 * ids to link at, the heading list the "On this page" rail is built from, and
 * the sections the search index is built from.
 *
 * All of it comes out of a single parse. `md.render` would hide the token
 * stream, so this parses and renders in two steps and walks the tokens in
 * between — cheaper and less fragile than re-deriving headings from the
 * rendered HTML, and the ids a search result links to are the ids the page
 * renders, because they are the same tokens.
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

/**
 * A stretch of a page a search result can land on: the text under one h2 or
 * h3, up to the next. The first section is what comes before any heading, and
 * has no id of its own.
 */
export type Section = {
  id: string;
  heading: string;
  text: string;
};

export type ParsedMarkdown = {
  headings: Heading[];
  sections: Section[];
  /** The HTML. The first call loads Shiki, which takes seconds. */
  render: () => Promise<string>;
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
 * Whether a fence carries a bare flag word after the language, as in
 * ```` ```text copy ```` or ```` ```ts title="React" selected ````. Quoted
 * values are dropped first, so a title that says "copy" does not count.
 */
const hasFlag = (info: string, flag: string) =>
  info
    .replace(/"[^"]*"/g, '')
    .trim()
    .split(/\s+/)
    .slice(1)
    .includes(flag);

/** Whether a fence asks for a copy button. */
const wantsCopy = (info: string) => hasFlag(info, 'copy');

/**
 * The copy button a code panel carries, the demos' source blocks among them.
 * It copies the visible block beside it in the same container. The markup is
 * a placeholder (see build/placeholders.ts) saying only where the button goes
 * and what it is called: src/components/markdown.tsx swaps in the component,
 * which draws its own glyphs.
 */
const COPY_BUTTON =
  '<button class="code-copy" aria-label="Copy to clipboard"></button>';

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

/**
 * Splits the page at its anchored headings, keeping the text a reader would
 * search for: prose, inline code and code blocks. Runs after
 * `collectHeadings`, whose ids it reads.
 */
const collectSections = (tokens: Token[]): Section[] => {
  const sections: Section[] = [{ id: '', heading: '', text: '' }];
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
 * Opens off-site links in a new tab, with the usual `rel`.
 *
 * Links between pages are written site-absolute, as `/docs/api`, and stay that
 * way: the router prefixes the deploy base when it renders them, and a second
 * prefix here would double it.
 */
const openExternalLinks = (tokens: Token[]) => {
  for (const token of tokens) {
    if (token.type === 'inline') {
      openExternalLinks(token.children ?? []);
      continue;
    }

    if (token.type !== 'link_open') continue;

    // markdown-it types attribute values as `string | number`; an href is
    // always the former, but the narrowing has to be written out.
    const href = String(token.attrGet('href') ?? '');

    if (/^https?:\/\//.test(href)) {
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noreferrer');
    }
  }
};

/**
 * Building the highlighter loads Shiki's grammars, which takes seconds, so it
 * is loaded once, on the first render, and shared. Parsing does not wait for
 * it: Shiki only sets the `highlight` option the fence rule calls, so the
 * tokens are the same with it or without it.
 */
let highlighter: Promise<void> | undefined;

const loadHighlighter = () =>
  (highlighter ??= Shiki({
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
  }).then((plugin) => {
    md.use(plugin);
  }));

const createRenderer = () => {
  const md = MarkdownIt({ html: true, linkify: true, typographer: false });

  /*
   * Blocks written back to back are one panel with a tab per block: the
   * markup and the script that drives it, or the same command for three
   * package managers. Nothing marks a group but the adjacency itself — any
   * prose between two blocks keeps them apart.
   *
   * The tabs are stamped here as a placeholder (see build/placeholders.ts)
   * carrying what each tab is called and which one is selected, and
   * src/components/markdown.tsx hands that to Base UI's tabs, which draw the
   * rest of the ARIA wiring, switch the tabs and own their arrow keys. The
   * first tab is the one selected unless a later fence is flagged `selected`
   * — the landing page's point is the script, and the markup is only what it
   * runs on.
   *
   * A fence flagged `copy` gets a copy button in the top corner, over the block
   * or at the end of the tab strip. One flagged block is enough to give its
   * panel the button, which then copies whichever tab is showing.
   */
  const renderFence = md.renderer.rules.fence!;
  const isFence = (token: Token | undefined) => token?.type === 'fence';

  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const block = renderFence(tokens, index, options, env, self);
    const isFirst = !isFence(tokens[index - 1]);
    const isLast = !isFence(tokens[index + 1]);
    if (isFirst && isLast) {
      return wantsCopy(tokens[index].info)
        ? `<div class="code-copyable">${COPY_BUTTON}${block}</div>\n`
        : block;
    }

    let open = '';
    if (isFirst) {
      // The first block opens the group, so it stamps every tab.
      const fences: Token[] = [];
      for (let i = index; isFence(tokens[i]); i++) fences.push(tokens[i]);
      const chosen = Math.max(
        0,
        fences.findIndex((fence) => hasFlag(fence.info, 'selected')),
      );

      const tabs = fences.map(
        (fence, position) =>
          `<button role="tab" class="code-tab" aria-selected="${position === chosen}">` +
          `${md.utils.escapeHtml(tabLabel(fence.info))}</button>`,
      );

      open =
        (fences.some((fence) => wantsCopy(fence.info))
          ? `<div class="code-tabs code-copyable" data-code-tabs>${COPY_BUTTON}`
          : '<div class="code-tabs" data-code-tabs>') +
        `<div class="code-tabs-bar" role="tablist">${tabs.join('')}</div>`;
    }

    const panel = `<div class="code-tabs-panel" role="tabpanel">${block}</div>`;

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
  //
  // A heading whose text is a link already — a card's title on the landing
  // page — keeps it and goes without: an anchor cannot hold another anchor,
  // and the browser would split the two apart. markdown-it emits
  // heading_open, inline, heading_close in sequence, so the heading's text is
  // always the token after its opening tag.
  const isAnchored = (tokens: Token[], index: number) => {
    const token = tokens[index];
    return (
      token?.type === 'heading_open' &&
      ANCHORED_TAGS.has(token.tag) &&
      token.attrGet('id') !== null &&
      !tokens[index + 1]?.children?.some((child) => child.type === 'link_open')
    );
  };

  md.renderer.rules.heading_open = (tokens, index, options, _env, self) => {
    const open = self.renderToken(tokens, index, options);
    if (!isAnchored(tokens, index)) return open;

    return `${open}<a class="heading-anchor" href="#${tokens[index].attrGet('id')}">`;
  };

  md.renderer.rules.heading_close = (tokens, index, options, _env, self) => {
    const close = self.renderToken(tokens, index, options);
    // The opening tag this one closes is always two tokens back.
    if (!isAnchored(tokens, index - 2)) return close;

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

const md = createRenderer();

/**
 * Parses a page once. The headings and sections are read off the tokens
 * straight away; `render` turns the same tokens into HTML, so every id either
 * of them names is an id the HTML carries.
 */
export const parseMarkdown = (source: string): ParsedMarkdown => {
  const tokens = md.parse(source, {});
  const headings = collectHeadings(tokens);
  openExternalLinks(tokens);

  return {
    headings,
    sections: collectSections(tokens),
    render: async () => {
      await loadHighlighter();
      return md.renderer.render(tokens, md.options, {});
    },
  };
};
