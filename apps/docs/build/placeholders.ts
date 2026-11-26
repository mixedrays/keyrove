// The one list build/html-tree.ts and src/components/markdown.tsx both read,
// so neither can miss a placeholder. Data only: Node and the browser read it.

// `data-*` only: html-react-parser renames most other attributes for React.
type Marker = { tag?: string } & (
  { attribute: `data-${string}` } | { className: string }
);

type Placeholder = Marker & {
  /** Kept as HTML, not reconciled: something else rearranges it after mount. */
  opaque: boolean;
};

/** In order of precedence: an element is the first placeholder it matches. */
export const PLACEHOLDERS = {
  /** Code blocks written back to back, or the landing page's pattern tabs. */
  codeTabs: { attribute: 'data-code-tabs', opaque: false },
  /** A demo panel, which its definition's behaviour is mounted on. */
  demo: { attribute: 'data-demo', opaque: false },
  hero: { className: 'hero-demo', opaque: false },
  copyCode: { tag: 'button', className: 'code-copy', opaque: false },
  copyCommand: { tag: 'button', attribute: 'data-copy-command', opaque: false },
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
