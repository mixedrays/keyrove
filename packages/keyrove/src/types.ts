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
  // Optional so any object with the four fields above still qualifies; a
  // missing flag is treated as "not held" by `matchesCombo`.
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  // The produced character (`KeyboardEvent.key`). Only typeahead reads it —
  // matching typed text needs the layout-dependent character, where bindings
  // deliberately stay on the physical `code`. Optional: an event without it
  // still navigates; it just never typeaheads.
  key?: string;
};

/**
 * The movements a keypress can resolve to.
 *
 * `next`/`prev` are ±1 in DOM order in every layout — a list item, or a grid
 * cell flowing across row ends. The `Row` actions exist only in grids:
 * `nextRow`/`prevRow` move a whole row keeping the column; `homeRow`/`endRow`
 * are the focused row's ends (bare Home/End there, by default), while
 * `home`/`end` are the whole sequence's (bare Home/End in a list,
 * `ctrl+Home`/`ctrl+End` in a grid, by default). Every move has a `*-key`
 * attribute that rebinds it.
 */
export type MoveAction =
  | 'home'
  | 'end'
  | 'homeRow'
  | 'endRow'
  | 'next'
  | 'prev'
  | 'nextRow'
  | 'prevRow'
  | 'pageUp'
  | 'pageDown';

/**
 * The shape every handler returns for a consumed keypress, parameterised by
 * the action it reports. `from` is null when the group was entered from
 * outside; `to` is null for a consumed no-op — the key is the handler's, but
 * there is nowhere to go, or the target is the focused item already.
 */
export type ActionResult<Action extends string> = {
  action: Action;
  from: Element | null;
  to: Element | null;
};

/**
 * What `keyRove` returns for a consumed keypress. Its no-op is a bound key
 * pressed at an edge, where the group owns the key but there is nowhere to go.
 */
export type MoveResult = ActionResult<MoveAction>;

/** The argument `onMove` receives: a move that actually happened. */
export type Move = MoveResult & { to: Element };

export type Options = {
  /** Fired after focus has moved — and only when it actually moved. */
  onMove?: (move: Move) => void;
};

export type TypeaheadOptions = {
  /** Milliseconds of typing silence after which the buffer resets. Defaults to 500. */
  resetMs?: number;
  /** Fired after focus has moved — and only when it actually moved. */
  onMove?: (move: TypeaheadMove) => void;
};

/**
 * What a typeahead handler returns for a consumed keypress.
 *
 * The shared {@link ActionResult} with its own action — derived rather than
 * re-spelled, so a field added there reaches both branches of the chain
 * `keyRove(e) || typeahead(e)`. `to` is null for a consumed no-op — the
 * buffer grew but still matches the focused item.
 */
export type TypeaheadResult = ActionResult<'typeahead'>;

/** The argument a typeahead `onMove` receives: a move that actually happened. */
export type TypeaheadMove = TypeaheadResult & { to: Element };

/**
 * Attribute names keyrove reads from the DOM, keyed by role.
 *
 * `DEFAULT_ATTRIBUTES` is checked against this with `satisfies`, so the map and
 * this type cannot drift apart in either direction. The `*Key` entries are
 * mapped from {@link MoveAction}, one per move, so a move cannot exist without
 * the attribute that rebinds it.
 */
export type Attributes = {
  item: string;
  skip: string;
  root: string;
  pageLength: string;
  cols: string;
  rovingTabindex: string;
  loop: string;
  orientation: string;
  typeahead: string;
} & {
  [Intent in MoveAction as `${Intent}Key`]: string;
};

/**
 * How a group folds its DOM-ordered sequence — read once off the root and
 * handed to both pure layers, so neither re-derives it.
 *
 * A list is a single column (`cols` is 1); `cols` above 1 makes a grid.
 * `horizontal` says whether `next`/`prev` run sideways — every grid, and a
 * list with `orientation="horizontal"` — and decides nothing but which default
 * arrows they get. `loop` wraps `next`/`prev` past the ends; lists only, a
 * grid keeps its edges per the APG grid pattern.
 */
export type Layout = {
  kind: 'list' | 'grid';
  cols: number;
  horizontal: boolean;
  loop: boolean;
};

/**
 * One row of the binding table: a key combo, the move it resolves to, and
 * whether the combo enters a group when pressed with nothing focused inside —
 * true for the four directional moves, false for every other, which move only
 * within a group. A property of the move, not of the key it is bound to.
 */
export type Binding = {
  combo: string;
  intent: MoveAction;
  enters: boolean;
};

/**
 * The explicitly bound combos, straight off the root's `*-key` attributes —
 * `null` or absent where the attribute is unset and the move keeps its
 * default key.
 */
export type ExplicitBindings = Partial<Record<MoveAction, string | null>>;

export type BuildBindingsArgs = {
  explicit: ExplicitBindings;
  layout: Layout;
  /**
   * Reading direction, resolved on demand: called only when an unbound
   * `next`/`prev` default on a horizontal axis could flip, never otherwise.
   */
  rtl: () => boolean;
};

export type ResolveTargetArgs = {
  intent: MoveAction;
  elements: Element[];
  /** Index of the focused item, or -1 when the group is entered from outside. */
  fromIndex: number;
  layout: Layout;
  /** Rows per page jump — items, in a list. */
  pageLength: number;
  skipAttribute: string;
};

export type ToggleTabIndexArgs = {
  root: Element | null | undefined;
  isActive: boolean;
};

/** What a root governs: its navigable items in DOM order, and the item holding focus. */
export type Group = {
  items: Element[];
  focused: Element | null;
};

/**
 * What it takes to land a move: the event to claim, the action to report, the
 * item focus is leaving (`null` from outside the group) and the one it lands
 * on (nullish when there is nowhere to go). Generic in the action so each
 * handler's result comes back exactly typed.
 */
export type MoveFocusArgs<Action extends string> = {
  e: Pick<KeyRoveEvent, 'preventDefault'>;
  action: Action;
  from: Element | null;
  to: Element | null | undefined;
  onMove?: (move: ActionResult<Action> & { to: Element }) => void;
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

export type LinearMoveArgs = NavBounds & {
  /** Wrap past the ends instead of clamping to them. */
  loop?: boolean;
};

export type GridNeighborArgs = NavBounds & {
  /** Signed offset to the neighbour: ±1 within a row, ±`cols` across rows. */
  step: number;
};

export type PageTargetArgs = NavBounds & {
  direction: 1 | -1;
  stride: number;
};
