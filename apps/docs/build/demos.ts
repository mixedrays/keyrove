import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { KEYPAD_HTML } from '../src/keypad.ts';
import { READOUT_HTML } from '../src/readout.ts';
import { demoDefinition } from './demo-definitions.ts';
import { decorateDemo } from './demo-icons.ts';

// Each demo is stamped twice, live and as source, so the two can't drift.
// Fragments carry no site classes, so a reader can paste them as-is.

const DEMOS_DIR = fileURLToPath(new URL('../content/_demos/', import.meta.url));

/** Filename without extension → markup. */
export type Demos = Map<string, string>;

type DemoTarget = 'html' | 'markdown';

// Two markers rather than one cut point, so the shown markup stays balanced.
const FOLD =
  /^([ \t]*)<!--[ \t]*fold[ \t]*-->\n[\s\S]*?^[ \t]*<!--[ \t]*\/fold[ \t]*-->[ \t]*\n/gm;

const FOLD_MARKER = /^[ \t]*<!--[ \t]*\/?fold[ \t]*-->[ \t]*\n/gm;

const FENCE = '```';

// Matches loosely, so a malformed placeholder fails the build instead of
// shipping an empty `<div>`. HTML blocks under it are excerpts, not files.
const PLACEHOLDER = new RegExp(
  String.raw`^(<div\b[^\n]*\bdata-demo\b[^\n]*)$` +
    String.raw`((?:\n\n${FENCE}(?!html\b)\w[^\n]*\n[\s\S]*?\n${FENCE}$)*)`,
  'gm',
);

const READOUT_PLACEHOLDER = /^<output data-demo-readout><\/output>$/gm;

const KEYPAD_PLACEHOLDER = /^<div class="demo-keypad"><\/div>$/gm;

// `data-demo-class` is layout the library doesn't teach; it goes on the
// surface, not the fragment, so it stays out of the source block.
type Placeholder = { name: string; label: string; surfaceClass: string };

const PLACEHOLDER_ATTRIBUTES = new Set([
  'data-demo',
  'data-demo-label',
  'data-demo-class',
]);

const ATTRIBUTE = /\s+([\w-]+)="([^"]*)"/g;

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

const toExcerpt = (markup: string) => markup.replace(FOLD, '$1<!-- … -->\n');

// markdown-it ends a raw HTML block at a blank line.
const toLive = (markup: string) =>
  markup.replace(FOLD_MARKER, '').replace(/^[ \t]*\n/gm, '');

const withClass = (markup: string, className: string) =>
  markup.replace(/^<(\w+)/, `<$1 class="${className}"`);

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The source is a fence, not pre-highlighted HTML, so it goes through the
// page's Shiki pass; markdown-it needs the blank lines around it.
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
${KEYPAD_HTML}

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

// Runs on the source, so the `.md` twin carries the markup too.
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
    .replace(READOUT_PLACEHOLDER, READOUT_HTML)
    .replace(KEYPAD_PLACEHOLDER, target === 'html' ? KEYPAD_HTML : '');
