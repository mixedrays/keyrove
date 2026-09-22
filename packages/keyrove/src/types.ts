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
  // Whether an input method is mid-composition (`KeyboardEvent.isComposing`).
  // Optional like the flags: absent reads as "not composing".
  isComposing?: boolean;
  // The produced character (`KeyboardEvent.key`). Only typeahead reads it —
  // matching typed text needs the layout-dependent character, where bindings
  // deliberately stay on the physical `code`. Optional: an event without it
  // still navigates; it just never typeaheads.
  key?: string;
};

/**
 * The moves defined by a position in the group — a stride from where focus is.
 *
 * `next`/`prev` are ±1 in DOM order in every layout — a list item, or a grid
 * cell flowing across row ends. The `Row` actions exist only in grids:
 * `nextRow`/`prevRow` move a whole row keeping the column; `homeRow`/`endRow`
 * are the focused row's ends (bare Home/End there, by default), while
 * `home`/`end` are the whole sequence's (bare Home/End in a list,
 * `ctrl+Home`/`ctrl+End` in a grid, by default). Every stride has a default
 * key and a root `*-key` attribute that rebinds it.
 */
export type StrideAction =
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
 * Everything a keypress can resolve to: the strides, plus `focus` — an element
 * named outright by its own `data-keyrove-focus-key`, item or not, reached from
 * anywhere under the listener rather than from a position. It is the one move
 * whose `*-key` attribute sits on its destination, and the one with no default.
 */
export type MoveAction = StrideAction | 'focus';

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

/**
 * A group's configuration, named in JavaScript rather than in markup.
 *
 * Every field is optional and falls back on its own to the `data-keyrove-*`
 * attribute it stands for, so a group can be described here, in its markup, or
 * in any mixture of the two: `{ loop: true }` over marked-up items loops a
 * group whose items, keys and columns still come from its attributes, and a
 * handler passing no options reads exactly the markup it always did.
 */
export type GroupOptions = {
  /**
   * The group's items: a selector run inside the root, or a reading of your
   * own. Defaults to the item attribute. Items carrying `disabled` are never
   * navigable, whichever reading found them.
   */
  items?: string | ReadItems;
  /**
   * The selector a root answers to, matched at or above the event's target.
   * Defaults to the root attribute; either way the listener's element stands
   * in when nothing above the target matches.
   */
  root?: string;
  /**
   * Columns. Above 1 the group is a grid. `'auto'` counts the tracks of the
   * root's CSS grid on every keypress. Defaults to the cols attribute.
   */
  cols?: number | 'auto';
  /**
   * Whether `next`/`prev` wrap at the ends. Lists only, as for the attribute.
   */
  loop?: boolean;
  /** Which axis `next`/`prev` take their default arrows from. */
  orientation?: 'horizontal' | 'vertical';
  /** Rows per page jump — items, in a list. Defaults to 10. */
  pageLength?: number;
  /**
   * The combo each move answers to, or a comma-separated list of them:
   * `{ next: 'ArrowDown, KeyJ', prev: 'KeyK' }`. Read move by move, so a move
   * left out keeps its attribute and then its default key. `'none'` binds a
   * move to no key, freeing its default.
   */
  keys?: Partial<Record<StrideAction, KeyRoveCode | 'none'>>;
  /**
   * Elements reachable by a combo of their own: combo, or a comma-separated
   * list of them, → the element, or a selector resolved within the listener's
   * reach. Replaces the focus-key scan rather than adding to it.
   */
  focusKeys?: Record<string, string | Element>;
  /** Which items a move passes over. Defaults to the skip attribute. */
  skip?: string | IsSkipped;
  /**
   * Whether the group carries one tab stop that follows focus. One boolean for
   * the whole group, where the attribute is read per item.
   */
  rovingTabindex?: boolean;
};

export type Options = GroupOptions & {
  /** Fired after focus has moved — and only when it actually moved. */
  onMove?: (move: Move) => void;
};

/**
 * Every setting one keypress needs, resolved for the root it is navigating:
 * options where they name a field, the root's attributes where they do not.
 * The layers below take these as given and never read a source of their own.
 */
export type GroupConfig = {
  layout: Layout;
  explicit: ExplicitBinding;
  focus: FocusKey[];
  rtl: () => boolean;
  pageLength: number;
  readItems: ReadItems;
  isSkipped: IsSkipped;
  isRoving: IsRoving;
};

/**
 * The typeahead handler's options: the group settings that bear on matching a
 * label, and the handler's own.
 *
 * The group settings are the same fields {@link GroupOptions} names, and fall
 * back the same way, so one object can be handed to both handlers and each
 * takes what it needs. The rest of a group's settings are about moves, which
 * typeahead does not make: it has one way to reach an item, its label.
 */
export type TypeaheadOptions = Pick<
  GroupOptions,
  'items' | 'root' | 'skip' | 'rovingTabindex'
> & {
  /**
   * The text an item is matched by. Falling back, where it returns nothing, to
   * the typeahead attribute and then the item's own text — the same chain an
   * absent attribute walks.
   */
  label?: (item: Element) => string;
  /** Milliseconds of typing silence after which the buffer resets. Defaults to 500. */
  resetMs?: number;
  /**
   * How repeated characters match. `'prefix'` extends the prefix; `'cycle'`
   * moves each single-character press to the next item after the focused one
   * starting with it, wrapping, so repeats cycle. Defaults to `'prefix'`.
   */
  matchMode?: 'prefix' | 'cycle';
  /**
   * Whether accents and other combining marks are ignored on both sides of
   * the match, so "e" reaches "Émilie" and "É" reaches "emilie". Turn it off
   * where an accent tells two items apart. Defaults to `true`.
   */
  foldDiacritics?: boolean;
  /** Fired after focus has moved — and only when it actually moved. */
  onMove?: (move: TypeaheadMove) => void;
};

/**
 * What a typeahead handler returns for a consumed keypress.
 *
 * The shared {@link ActionResult} with its own action — derived rather than
 * re-spelled, so a field added there reaches both branches of the chain
 * `keyRove(e) || typeahead(e)`. `to` is null for a consumed no-op — the
 * match is the focused item already.
 */
export type TypeaheadResult = ActionResult<'typeahead'>;

/** The argument a typeahead `onMove` receives: a move that actually happened. */
export type TypeaheadMove = TypeaheadResult & { to: Element };

/**
 * What `initRovingTabindex` and `followFocus` take: the group settings that
 * decide which elements are a group's roving items. The same fields {@link GroupOptions}
 * names, falling back the same way, so one object serves every export.
 */
export type RovingTabindexOptions = Pick<
  GroupOptions,
  'items' | 'root' | 'skip' | 'rovingTabindex'
>;

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
 * true for the four directional moves, false for every other stride, which
 * move only within a group. A property of the move, not of the key it is bound
 * to. A focus row carries its target outright — the element that declared the
 * key — and always enters: it names a destination, not a step from a position.
 */
export type Binding =
  | { combo: string; intent: StrideAction; enters: boolean }
  | { combo: string; intent: 'focus'; enters: true; target: Element };

/**
 * Looks up the combo explicitly bound to a move, straight off the root's
 * `*-key` attribute — nullish where the attribute is unset and the move keeps
 * its default key, and `none` where the move is bound to no key.
 */
export type ExplicitBinding = (
  intent: StrideAction,
) => string | null | undefined;

/** A focus key as read off an element: its combo, and the element it focuses. */
export type FocusKey = {
  combo: string;
  target: Element;
};

/**
 * The readings the group and position layers need but do not make themselves:
 * which elements a root governs, which of them a move passes over, which
 * element scopes a group, and whether the item focus is leaving carries the
 * roving tab stop.
 *
 * Each one defaults to the `data-keyrove-*` reading it stands for, so the
 * attribute API passes none of them. They are parameters rather than reads so
 * that a second config source can answer the same questions without either
 * layer knowing where the answers came from.
 */
export type ReadItems = (root: Element) => Element[];
export type IsSkipped = (element: Element) => boolean;
export type IsRoot = (element: Element) => boolean;
export type IsRoving = (from: Element) => boolean;

export type BuildBindingsArgs = {
  /**
   * Asked only about the moves in the layout's default table, so a move the
   * layout lacks is never looked up.
   */
  explicit: ExplicitBinding;
  /**
   * The focus keys in the listener's reach, in DOM order. Head of the table:
   * an element's own key is the most specific declaration there is.
   */
  focus?: readonly FocusKey[];
  layout: Layout;
  /**
   * Reading direction, resolved on demand: called only when an unbound
   * `next`/`prev` default on a horizontal axis could flip, never otherwise.
   */
  rtl: () => boolean;
};

export type ResolveTargetArgs = {
  intent: StrideAction;
  elements: Element[];
  /** Index of the focused item, or -1 when the group is entered from outside. */
  fromIndex: number;
  layout: Layout;
  /** Rows per page jump — items, in a list. */
  pageLength: number;
  /** Whether a move passes an item over. Defaults to the skip attribute. */
  isSkipped?: IsSkipped;
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
  /**
   * Whether the item focus is leaving carries the roving tab stop. Defaults to
   * the roving-tabindex attribute.
   */
  isRoving?: IsRoving;
  onMove?: (move: ActionResult<Action> & { to: Element }) => void;
};
