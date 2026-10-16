import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { READOUT_HTML } from '../src/readout.ts';
import { demoDefinition } from './demo-definitions.ts';
import { decorateDemo } from './demo-icons.ts';

/**
 * Live demos, built from the markup the page documents.
 *
 * One file under `content/_demos` is a demo, with an entry of the same name in
 * build/demo-definitions.ts. It is stamped into the page twice — once as real
 * elements a reader can arrow through, once as the source block under them —
 * so the two cannot drift: what is on the clipboard is what was just pressed a
 * key in.
 *
 * A content file writes only the placeholder,
 * `<div data-demo="grid" data-demo-label="time slots"></div>`, and the
 * fragment carries no site classes: styling hangs off the same
 * `data-keyrove-*` attributes the docs teach, which is what keeps a fragment
 * markup a reader could paste as-is.
 *
 * The script a page writes straight under the placeholder joins the source
 * block as a tab of its own (see build/markdown.ts), so the markup and the call
 * that drives it read as the two files of one demo rather than as a demo and a
 * stray block below it.
 */

const DEMOS_DIR = fileURLToPath(new URL('../content/_demos/', import.meta.url));

/** Demo name — its filename without the extension — to its markup. */
export type Demos = Map<string, string>;

/** What the reader gets: HTML for a page, a fenced block for the `.md` twin. */
type DemoTarget = 'html' | 'markdown';

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
 * The placeholder a content file writes, alone on its line, and the fenced
 * blocks directly under it. Any line opening a `<div>` with a `data-demo*`
 * attribute is taken for one, so a placeholder written wrong fails the build
 * (see `parsePlaceholder`) rather than reaching the page as an empty `<div>`.
 *
 * The blocks are the demo's other files, and they are taken with it so they
 * can share its panel. HTML is left where it stands: a demo has one HTML file,
 * its own, and an HTML block right under it is a closer look at that file —
 * custom keys picks out the two attributes of its root — not a second one.
 */
const PLACEHOLDER = new RegExp(
  String.raw`^(<div\b[^\n]*\bdata-demo\b[^\n]*)$` +
    String.raw`((?:\n\n${FENCE}(?!html\b)\w[^\n]*\n[\s\S]*?\n${FENCE}$)*)`,
  'gm',
);

/**
 * The placeholder the landing page's hero writes for its readout. The hero's
 * markup is the page's own rather than a demo's, but its readout is the one
 * every panel opens with, so it is stamped from the same place.
 */
const READOUT_PLACEHOLDER = /^<output data-demo-readout><\/output>$/gm;

/**
 * What a placeholder says, read off its attributes in whatever order.
 *
 * - `data-demo` names the demo.
 * - `data-demo-label` names the panel's live preview; every demo has one.
 * - `data-demo-class`, optional, is layout the demo needs but the library
 *   does not teach — the grid's columns, the long list's scroll box. It lands
 *   on the surface at render time rather than in the fragment, so it stays
 *   out of the source block.
 */
type Placeholder = { name: string; label: string; surfaceClass: string };

const PLACEHOLDER_ATTRIBUTES = new Set([
  'data-demo',
  'data-demo-label',
  'data-demo-class',
]);

const ATTRIBUTE = /\s+([\w-]+)="([^"]*)"/g;

/**
 * Reads a placeholder, or fails the build on one it cannot read: anything
 * short of an exact placeholder would otherwise ship as an empty `<div>`,
 * which is a demo gone missing without a word.
 */
const parsePlaceholder = (line: string): Placeholder => {
  const fail: (reason: string) => never = (reason) => {
    throw new Error(`[docs] ${reason} in the demo placeholder ${line}`);
  };

  const tag = /^<div((?:\s+[\w-]+="[^"]*")*)><\/div>$/.exec(line);
  if (!tag) fail('unreadable markup');

  const attributes = new Map<string, string>();
  for (const [, name, value] of tag[1].matchAll(ATTRIBUTE)) {
    if (!PLACEHOLDER_ATTRIBUTES.has(name)) fail(`unknown attribute ${name}`);
    if (attributes.has(name)) fail(`${name} twice`);
    attributes.set(name, value);
  }

  const name = attributes.get('data-demo');
  const label = attributes.get('data-demo-label');
  if (!name) fail('no data-demo');
  if (!label) fail('no data-demo-label to name the panel');

  return {
    name,
    label,
    surfaceClass: attributes.get('data-demo-class') ?? '',
  };
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

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * One demo's panel: a header naming it over the readout, the live markup, then
 * the same markup as source.
 *
 * The demo's name rides on the panel as `data-demo`, so src/demos.ts can look
 * up the behaviour its definition adds to navigation.
 *
 * The source is emitted as a fence rather than as pre-highlighted HTML so that
 * it goes through the page's own Shiki pass and is themed like every other
 * block on the site. That is why the panel is split around it — markdown-it
 * needs the blank lines either side to see a fence at all. `files` are the
 * blocks the placeholder took with it, still fenced and each led by its blank
 * line, so they land beside the markup and share its panel.
 */
const renderPanel = (
  { name, label, surfaceClass }: Placeholder,
  markup: string,
  files: string,
) => {
  const live = withClass(
    toLive(markup),
    ['demo-surface', surfaceClass].filter(Boolean).join(' '),
  );

  return `<div class="demo-panel" data-demo="${name}">
<div class="demo-panel-header">
<span class="demo-panel-label"><span class="demo-live-indicator" aria-hidden="true"></span>Live · ${escapeHtml(label)}</span>
${READOUT_HTML}
</div>
<div class="demo-panel-preview">${decorateDemo(live, demoDefinition(name).icons)}</div>

${FENCE}html copy
${toExcerpt(markup)}
${FENCE}${files}

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
 * Replaces every placeholder in a markdown body with the demo it names, and
 * the hero's readout placeholder with the readout.
 *
 * This runs on the source rather than on rendered HTML, so the `.md` twin a
 * reader (or an agent) fetches carries the markup too — it used to carry the
 * bare placeholder, which said nothing at all. The blocks a placeholder took
 * with it go back under the markup there, as the page wrote them.
 */
export const expandDemos = (
  body: string,
  demos: Demos,
  target: DemoTarget,
): string =>
  body
    .replace(PLACEHOLDER, (_match, line: string, files: string) => {
      const placeholder = parsePlaceholder(line);
      const markup = demos.get(placeholder.name);
      if (markup === undefined) {
        throw new Error(
          `[docs] no demo named "${placeholder.name}" in content/_demos.`,
        );
      }

      return target === 'html'
        ? renderPanel(placeholder, markup, files)
        : `${FENCE}html\n${toExcerpt(markup)}\n${FENCE}${files}`;
    })
    .replace(READOUT_PLACEHOLDER, READOUT_HTML);
