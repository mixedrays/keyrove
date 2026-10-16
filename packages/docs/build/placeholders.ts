/**
 * The placeholders: elements in a page's HTML that stand for something the
 * markup cannot carry on its own — a widget React draws, or contents that
 * something other than React keeps up to date.
 *
 * Three producers write them: build/markdown.ts (code tabs, copy buttons),
 * build/demos.ts (demo panels, their previews and readouts), and content
 * written by hand (the landing page's hero, pattern tabs and install button,
 * the 404's links). Two readers act on them: build/html-tree.ts keeps an
 * opaque placeholder's contents as HTML, and src/components/markdown.tsx swaps
 * every other one for the component that draws it. This is the one list both
 * read, so a placeholder is added once and neither can miss it;
 * tests/placeholders.test.ts holds what the pages write to it.
 *
 * Read by Node and the browser alike, so it holds data only. Which component
 * draws a placeholder is markdown.tsx's to say, in a table keyed by these
 * names that does not compile with one missing.
 */

/**
 * What marks a placeholder: a `data-*` attribute or a class, and the tag as
 * well where the mark alone could be on something else. Attributes are
 * `data-*` only, which both trees spell the same: html-react-parser renames
 * most others for React, `class` to `className` among them.
 */
type Marker = { tag?: string } & (
  { attribute: `data-${string}` } | { className: string }
);

type Placeholder = Marker & {
  /**
   * Whether its contents are kept as HTML, for `dangerouslySetInnerHTML`,
   * rather than as a tree React would reconcile: React draws them once, and
   * something else rearranges them from then on.
   */
  opaque: boolean;
};

/** In order of precedence: an element is the first placeholder it matches. */
export const PLACEHOLDERS = {
  /** Code blocks written back to back, or the landing page's pattern tabs. */
  codeTabs: { attribute: 'data-code-tabs', opaque: false },
  /** A demo panel, which its definition's behaviour is mounted on. */
  demo: { attribute: 'data-demo', opaque: false },
  /** The landing page's hero demo, written into the page. */
  hero: { className: 'hero-demo', opaque: false },
  /** The button that copies the code block beside it. */
  copyCode: { tag: 'button', className: 'code-copy', opaque: false },
  /** The landing page's button that copies the install command. */
  copyCommand: { tag: 'button', attribute: 'data-copy-command', opaque: false },
  /** The 404's list of places to go instead, put on the arrows. */
  notFoundLinks: { attribute: 'data-not-found-links', opaque: false },
  /** A demo's live preview, which keyrove and src/demos.ts rearrange. */
  demoPreview: { className: 'demo-panel-preview', opaque: true },
  /** A live demo's readout, which src/readout.ts rewrites on every key. */
  readout: { attribute: 'data-demo-readout', opaque: true },
} as const satisfies Record<string, Placeholder>;

export type PlaceholderName = keyof typeof PLACEHOLDERS;

export type OpaquePlaceholder = {
  [Name in PlaceholderName]: (typeof PLACEHOLDERS)[Name]['opaque'] extends true
    ? Name
    : never;
}[PlaceholderName];

/** The placeholders React swaps for a component. */
export type SwappedPlaceholder = Exclude<PlaceholderName, OpaquePlaceholder>;

const isMarkedBy = (
  marker: Marker,
  tag: string,
  className: string,
  has: (attribute: `data-${string}`) => boolean,
) =>
  (marker.tag === undefined || marker.tag === tag) &&
  ('attribute' in marker
    ? has(marker.attribute)
    : className.split(/\s+/).includes(marker.className));

/**
 * The placeholder an element is, or undefined for a plain one — read off its
 * tag, its `class` and its attributes, however the caller's tree holds them.
 */
export const placeholderOf = (
  tag: string,
  className: string,
  has: (attribute: `data-${string}`) => boolean,
): PlaceholderName | undefined =>
  (Object.keys(PLACEHOLDERS) as PlaceholderName[]).find((name) =>
    isMarkedBy(PLACEHOLDERS[name], tag, className, has),
  );

export const isOpaque = (name: PlaceholderName): name is OpaquePlaceholder =>
  PLACEHOLDERS[name].opaque;
