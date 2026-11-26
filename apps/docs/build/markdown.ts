import Shiki from '@shikijs/markdown-it';
import MarkdownIt, { type Token } from 'markdown-it';

// Parse and render in two steps, walking the tokens between, so the ids the
// rail and search link to are the ids the page renders.

// Both themes as CSS variables; style.css picks one under `dark`, so there is
// no theme state to sync.
const THEMES = { light: 'github-light', dark: 'github-dark' } as const;

export type Heading = {
  id: string;
  text: string;
  /** 2 or 3. */
  level: number;
};

// The same ones the rail lists, so every rail entry has a copyable URL.
const ANCHORED_TAGS = new Set(['h2', 'h3']);

/** The text under one h2 or h3. The first, before any heading, has no id. */
export type Section = {
  id: string;
  heading: string;
  text: string;
};

type ParsedMarkdown = {
  headings: Heading[];
  sections: Section[];
  /** The HTML. The first call loads Shiki, which takes seconds. */
  render: () => Promise<string>;
};

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

const tabLabel = (info: string) => {
  const title = /\btitle="([^"]*)"/.exec(info)?.[1];
  if (title) return title;

  const lang = info.trim().split(/\s+/)[0];
  return LANGUAGE_NAMES[lang] ?? lang;
};

// Quoted values are dropped first, so a title that says "copy" doesn't count.
const hasFlag = (info: string, flag: string) =>
  info
    .replace(/"[^"]*"/g, '')
    .trim()
    .split(/\s+/)
    .slice(1)
    .includes(flag);

const wantsCopy = (info: string) => hasFlag(info, 'copy');

// A placeholder; src/components/markdown.tsx swaps in the component.
const COPY_BUTTON =
  '<button class="code-copy" aria-label="Copy to clipboard"></button>';

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

// Ids are deduped with a numeric suffix, so two same-named sections both
// get an anchor.
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
    if (level === 2 || level === 3) headings.push({ id, text, level });
  });

  return headings;
};

// Runs after `collectHeadings`, whose ids it reads.
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

// Site-absolute links stay as written: the router prefixes the deploy base,
// and a second prefix here would double it.
const openExternalLinks = (tokens: Token[]) => {
  for (const token of tokens) {
    if (token.type === 'inline') {
      openExternalLinks(token.children ?? []);
      continue;
    }

    if (token.type !== 'link_open') continue;

    // markdown-it types attribute values as `string | number`.
    const href = String(token.attrGet('href') ?? '');

    if (/^https?:\/\//.test(href)) {
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noreferrer');
    }
  }
};

// Loading Shiki takes seconds, so it loads once, on first render. Parsing
// doesn't wait: Shiki only sets the `highlight` option.
let highlighter: Promise<void> | undefined;

const loadHighlighter = () =>
  (highlighter ??= Shiki({
    themes: THEMES,
    defaultColor: false,
    transformers: [
      {
        pre(node) {
          // Drop Shiki's background, so blocks keep the site's panel style.
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

  // Back-to-back blocks become one tabbed panel; any prose between keeps them
  // apart. One `copy` flag gives the whole panel a button, which copies the
  // showing tab.
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

  // A wide table scrolls in its own box rather than widening the page.
  md.renderer.rules.table_open = () => '<div class="table-wrap"><table>';
  md.renderer.rules.table_close = () => '</table></div>';

  // The anchor wraps the title so its name is the title; the `#` is aria-hidden
  // outside it. A heading already holding a link goes without: anchors can't
  // nest.
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
    if (!isAnchored(tokens, index - 2)) return close;

    return `<span class="heading-anchor-mark" aria-hidden="true">#</span></a>${close}`;
  };

  // By class, so the `<code>` Shiki nests in a block isn't caught.
  md.renderer.rules.code_inline = (tokens, index, _options, _env, self) => {
    const token = tokens[index];
    token.attrSet('class', 'code-inline');
    return `<code${self.renderAttrs(token)}>${md.utils.escapeHtml(token.content)}</code>`;
  };

  return md;
};

const md = createRenderer();

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
