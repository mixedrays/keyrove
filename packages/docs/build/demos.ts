import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { icon } from './icons.ts';

/**
 * Live demos, built from the markup the page documents.
 *
 * One file under `content/_demos` is a demo. It is stamped into the page twice
 * — once as real elements a reader can arrow through, once as the source block
 * under them — so the two cannot drift: what is on the clipboard is what was
 * just pressed a key in.
 *
 * A content file writes only the placeholder, `<div data-demo="grid"></div>`,
 * and the fragment carries no site classes: styling hangs off the same
 * `data-keyrove-*` attributes the docs teach, which is what keeps a fragment
 * markup a reader could paste as-is.
 */

export const DEMOS_DIR = fileURLToPath(
  new URL('../content/_demos/', import.meta.url),
);

/** Demo name — its filename without the extension — to its markup. */
export type Demos = Map<string, string>;

/** What the reader gets: HTML for a page, a fenced block for the `.md` twin. */
export type DemoTarget = 'html' | 'markdown';

/**
 * The placeholder a content file writes, alone on its line.
 *
 * `data-demo-class` is layout the demo needs but the library does not teach —
 * the grid's columns, the long list's scroll box. It lands on the surface at
 * render time rather than in the fragment, so it stays out of the source block.
 */
const PLACEHOLDER =
  /^<div data-demo="([\w-]+)"(?: data-demo-class="([^"]*)")?><\/div>$/gm;

/**
 * A folded region: markup that runs but is not worth reading.
 *
 * Both markers are needed rather than one cut point, so that what is shown
 * stays balanced — a list truncated after its third item would be shown with no
 * closing tag. The elided lines are always repetition of the lines above them.
 */
const FOLD =
  /^([ \t]*)<!--[ \t]*fold[ \t]*-->\n[\s\S]*?^[ \t]*<!--[ \t]*\/fold[ \t]*-->[ \t]*\n/gm;

const FOLD_MARKER = /^[ \t]*<!--[ \t]*\/?fold[ \t]*-->[ \t]*\n/gm;

const FENCE = '```';

/** The excerpt a reader sees: each folded region collapses to one comment. */
const toExcerpt = (markup: string) => markup.replace(FOLD, '$1<!-- … -->\n');

/**
 * The markup that actually runs: markers drop out, and so do blank lines —
 * markdown-it ends a raw HTML block at the first one, which would close the
 * demo's wrapper early.
 */
const toLive = (markup: string) =>
  markup.replace(FOLD_MARKER, '').replace(/^[ \t]*\n/gm, '');

/** Adds the site's classes to the fragment's root, which is the demo surface. */
const withClass = (markup: string, className: string) =>
  markup.replace(/^<(\w+)/, `<$1 class="${className}"`);

/**
 * One demo: the live markup, then the same markup as source.
 *
 * The source is emitted as a fence rather than as pre-highlighted HTML so that
 * it goes through the page's own Shiki pass and is themed like every other
 * block on the site. That is why the wrapper is split around it — markdown-it
 * needs the blank lines either side to see a fence at all.
 */
const renderUnit = (markup: string, surfaceClass: string) => {
  const live = withClass(
    toLive(markup),
    ['demo-surface', surfaceClass].filter(Boolean).join(' '),
  );

  const copy = [
    '<button type="button" class="demo-copy" data-copy-code',
    'aria-label="Copy markup">',
    icon('copy', 'size-3.5 icon-idle'),
    icon('check', 'size-3.5 icon-done'),
    '</button>',
  ].join(' ');

  return `<div class="demo">
<div class="demo-preview">
${live}
<output class="log">Waiting for a keypress…</output>
</div>
<div class="demo-code">
${copy}

${FENCE}html
${toExcerpt(markup)}
${FENCE}

</div>
</div>`;
};

export const loadDemos = async (): Promise<Demos> => {
  const files = await readdir(DEMOS_DIR);

  const entries = await Promise.all(
    files
      .filter((file) => file.endsWith('.html'))
      .sort()
      .map(
        async (file) =>
          [
            file.replace(/\.html$/, ''),
            (await readFile(path.join(DEMOS_DIR, file), 'utf8')).trim(),
          ] as const,
      ),
  );

  return new Map(entries);
};

/**
 * Replaces every placeholder in a markdown body with the demo it names.
 *
 * This runs on the source rather than on rendered HTML, so the `.md` twin a
 * reader (or an agent) fetches carries the markup too — it used to carry the
 * bare placeholder, which said nothing at all.
 */
export const expandDemos = (
  body: string,
  demos: Demos,
  target: DemoTarget,
): string =>
  body.replace(PLACEHOLDER, (_match, name: string, surfaceClass = '') => {
    const markup = demos.get(name);
    if (markup === undefined) {
      throw new Error(`[docs] no demo named "${name}" in content/_demos.`);
    }

    return target === 'html'
      ? renderUnit(markup, surfaceClass)
      : `${FENCE}html\n${toExcerpt(markup)}\n${FENCE}`;
  });
