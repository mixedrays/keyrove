/**
 * Every named type in keyrove.
 *
 * Kept in one place so the package's shape can be read without following the
 * implementation. Only the types re-exported from `index.ts` are public
 * surface; the rest live here because the modules that use them need them, not
 * because consumers do.
 */

/**
 * The `KeyboardEvent.code` values keyrove dispatches on.
 *
 * Strict on purpose: it types the literals *we* author, so a typo is a compile
 * error rather than a key that silently never fires. Consumers get the wider
 * {@link KeyRoveCode}.
 */
export type KnownCode =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Home'
  | 'End'
  | 'PageUp'
  | 'PageDown';

/**
 * A `KeyboardEvent.code`.
 *
 * The `(string & {})` arm keeps this assignable from a plain `string` — which
 * is how both the DOM and React type `code`, and what a `data-keyrove-*-key`
 * attribute yields — while editors still complete the codes keyrove acts on.
 * It documents intent and aids autocomplete; it does not validate.
 */
export type KeyRoveCode = KnownCode | (string & {});

/**
 * The shape keyrove needs from a keydown event.
 *
 * Structural rather than a union of `KeyboardEvent | React.KeyboardEvent`, so
 * the package stays dependency-free while accepting both. `currentTarget` is
 * widened to `EventTarget` because React types it more narrowly than the DOM.
 * `code` stays assignable from a plain `string` for the same reason — see
 * {@link KeyRoveCode}.
 */
export type KeyRoveEvent = {
  code: KeyRoveCode;
  target: EventTarget | null;
  currentTarget: EventTarget | null;
  preventDefault: () => void;
};

/** The movements a consumer can hook into. */
export type CallbacksKeys =
  'home' | 'end' | 'next' | 'prev' | 'pageUp' | 'pageDown';

export type Callbacks = {
  [K in CallbacksKeys]?: (args: { focused: Element | null }) => void;
};

export type Options = {
  callbacks?: Callbacks;
};

/**
 * Attribute names keyrove reads from the DOM, keyed by role.
 *
 * `DEFAULT_ATTRIBUTES` is checked against this with `satisfies`, so the map and
 * this type cannot drift apart in either direction.
 */
export type Attributes = {
  item: string;
  skip: string;
  root: string;
  nextKey: string;
  prevKey: string;
  pageLength: string;
  colsLength: string;
  rovingTabindex: string;
};

export type GetNavElementsArgs = {
  root: Element | null | undefined;
  elementsSelector: string;
  focusedSelector: string;
  attributes?: Attributes;
};

export type ToggleTabIndexArgs = {
  root: Element | null | undefined;
  isActive: boolean;
};

/**
 * The element list a lookup walks, and where in it the walk starts.
 *
 * `skipAttribute` is the attribute *name* rather than the attribute map, so the
 * helpers in `utils.ts` stay independent of keyrove's own concepts.
 */
export type NavBounds = {
  elements: Element[];
  fromIndex: number;
  skipAttribute: string;
};

export type GridNeighborArgs = NavBounds & {
  /** Signed offset to the neighbour: ±1 within a row, ±`colsLength` across rows. */
  step: number;
};

export type PageTargetArgs = NavBounds & {
  direction: 1 | -1;
  stride: number;
};
