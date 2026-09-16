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

/**
 * The demos whose log is a history rather than one line.
 *
 * One line shows the last move and nothing else, which leaves the two answers
 * that are not a move invisible: a key keyrove claimed but could not act on,
 * and a key that was never its own. A history shows all three, and costs the
 * preview a third of its width, so it is worth it only where the page is about
 * what a keypress comes back with. The log is the same markup whichever demo
 * opts in; adding a name here is all it takes.
 */
const HISTORY = new Set([
  'list',
  'loop',
  'roving',
  'inbox',
  'skip',
  'listbox',
  'typeahead',
  'labels',
  'nested',
  'keys',
  'orientation',
  'rtl',
  'editable',
  'panes',
  'grid',
  'responsive',
]);

/**
 * The demos whose log runs across the foot of the preview rather than up its
 * right-hand side.
 *
 * A history costs the stage half its width. A vertical list can spare it — it
 * was never using the space to the right of its longest item — but a
 * horizontal one is spending that width on the thing it is demonstrating: a
 * toolbar given half a preview wraps its buttons onto a second row, and a
 * filter bar that wraps has stopped being the shape the page is about. A grid
 * is the same argument with a second axis: its columns are the thing being
 * navigated, and six of them squeezed into half a preview read as a column of
 * crushed cells rather than as rows worth pressing an arrow across. The
 * responsive grid puts it strongest: the reader drags that panel to change its
 * column count, so its width is not the room the demo needs but the demo
 * itself, and a rail would have spent half of it before they started. Those
 * demos keep the band across the foot, which is the layout the narrow screens
 * already use, at every width instead.
 *
 * This is a list of names rather than something read off the fragment because
 * both spellings of "horizontal" are in use — an orientation on the filter
 * bars, an explicit ArrowRight on the toolbar — and a layout that turned on
 * which one a fragment happened to choose would be a trap for whoever edited
 * it next. What the CSS keys off is the attribute stamped below, so the
 * stylesheet stays free of demo names.
 */
const BAND = new Set([
  'keys',
  'orientation',
  'rtl',
  'panes',
  'grid',
  'responsive',
]);

/**
 * The log under — or beside — a demo's preview.
 *
 * The history's row is stamped here as a <template> rather than assembled in
 * the browser, so this file stays the one place a demo's markup is written:
 * src/demos.ts clones the row and fills its slots. The list is `aria-hidden`
 * and the <output> beside it carries one line, which splits the two jobs the
 * single-line log used to do at once — what is read, and what is announced.
 * Announcing every row of a history would talk over the reader.
 */
const renderLog = (name: string) => {
  if (!HISTORY.has(name)) {
    return '<output class="log">Waiting for a keypress…</output>';
  }

  return [
    '<div class="demo-log">',
    '<div class="demo-log-bar">',
    '<span class="demo-log-title">What happened</span>',
    '<button type="button" class="demo-log-clear" data-clear-log>Clear</button>',
    '</div>',
    '<ol class="demo-log-list" data-log aria-hidden="true">',
    '<li class="demo-log-empty" data-log-empty>Waiting for a keypress…</li>',
    '</ol>',
    '<template data-log-row>',
    '<li class="log-row">',
    '<span class="log-dot"></span>',
    '<kbd class="kbd log-key" data-key></kbd>',
    '<span class="log-line">',
    // The spaces are the ones between the words of the finished sentence: an
    // empty slot is hidden, and the space beside it collapses with it.
    '<span class="log-action" data-action></span> ',
    '<span class="log-phrase" data-phrase></span> ',
    '<b class="log-target" data-target></b>',
    '</span>',
    '<span class="log-repeat" data-repeat hidden></span>',
    '</li>',
    '</template>',
    '<output class="demo-log-live" aria-live="polite"></output>',
    '</div>',
  ].join('');
};

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
 * The demo's name rides on the wrapper as `data-demo`, so src/demos.ts can key
 * the behaviour a page's demo needs beyond navigation off it.
 *
 * The source is emitted as a fence rather than as pre-highlighted HTML so that
 * it goes through the page's own Shiki pass and is themed like every other
 * block on the site. That is why the wrapper is split around it — markdown-it
 * needs the blank lines either side to see a fence at all.
 */
const renderUnit = (name: string, markup: string, surfaceClass: string) => {
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

  // The band demos say so on the wrapper: the layout is a property of the
  // demo, and keying the stylesheet off a name would put the list in two
  // places at once.
  const layout = BAND.has(name) ? ' data-demo-log="band"' : '';

  return `<div class="demo" data-demo="${name}"${layout}>
<div class="demo-preview">
${live}
${renderLog(name)}
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
      ? renderUnit(name, markup, surfaceClass)
      : `${FENCE}html\n${toExcerpt(markup)}\n${FENCE}`;
  });
