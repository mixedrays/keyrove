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
 * A `KeyboardEvent.code`: the physical key an event carries. A binding, which
 * can add modifiers and list several keys, is a {@link KeyCombo}.
 *
 * The `(string & {})` arm keeps this assignable from a plain `string` — which
 * is how both the DOM and React type `code` — while editors still complete
 * the codes keyrove acts on. It documents intent and aids autocomplete; it
 * does not validate.
 */
export type KeyRoveCode = KnownCode | (string & {});

/**
 * A key binding: one combo, `"KeyJ"` or `"ctrl+ArrowDown"`, or a
 * comma-separated list of them, `"ArrowDown, KeyJ"`. Each combo is optional
 * modifiers followed by a {@link KeyRoveCode}; see `matchesCombo` for the
 * grammar.
 *
 * Open like {@link KeyRoveCode}, and for the same reasons: bindings also
 * arrive as attribute values and from outside data, as plain strings. It
 * documents intent and aids autocomplete; it does not validate.
 */
export type KeyCombo = KnownCode | (string & {});

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
  // Whether a handler has already claimed the press (`Event.defaultPrevented`)
  // — another keyrove handler, or one of your own. Optional like the flags:
  // absent reads as "not claimed".
  defaultPrevented?: boolean;
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
 * The moves across a nested root's boundary: `exit`, from inside a nested
 * group to the group around it, and `enter`, from an item into the group
 * nested inside it. Bound on a root like the strides, but with no default key:
 * the keys they suit, Escape and Enter, already mean something to the page.
 */
export type BoundaryAction = 'exit' | 'enter';

/**
 * Everything a keypress can resolve to: the strides, the boundary moves, plus
 * `focus` — an element named outright by its own `data-keyrove-focus-key`,
 * item or not, reached from anywhere under the listener rather than from a
 * position. It is the one move whose `*-key` attribute sits on its
 * destination.
 */
export type MoveAction = StrideAction | 'exit' | 'enter' | 'focus';

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
   * move to no key, freeing its default. `exit` and `enter` have no default,
   * and move across a nested root's boundary: `{ exit: 'Escape' }`.
   */
  keys?: Partial<Record<StrideAction | 'exit' | 'enter', KeyCombo | 'none'>>;
  /**
   * Elements reachable by a combo of their own: a {@link KeyCombo} → the
   * element, or a selector resolved within the listener's reach. Replaces the
   * focus-key scan rather than adding to it.
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

/** What `keyRove` and `rove` take: the group's settings, and `onMove`. */
export type KeyRoveOptions = GroupOptions & {
  /** Fired after focus has moved — and only when it actually moved. */
  onMove?: (move: Move) => void;
};

/** {@link KeyRoveOptions} under its earlier name, kept for existing imports. */
export type Options = KeyRoveOptions;

/** Group settings that can be written as attributes on a root. */
export type RootAttributeOptions = Pick<
  GroupOptions,
  'cols' | 'loop' | 'orientation' | 'pageLength' | 'keys'
>;

/** Settings on one item, rather than on the whole group. */
export type ItemAttributeOptions = {
  skip?: boolean;
  rovingTabindex?: boolean;
  focusKey?: KeyCombo;
  typeahead?: string;
};

/** The attribute spelling of a camel-cased action. */
type KebabCase<S extends string> = S extends `${infer Head}${infer Tail}`
  ? `${Head extends Lowercase<Head> ? Head : `-${Lowercase<Head>}`}${KebabCase<Tail>}`
  : S;

export type KeyAttributeName =
  `data-keyrove-${KebabCase<keyof NonNullable<GroupOptions['keys']>>}-key`;

/** A spreadable root marker and the settings supplied to its builder. */
export type RootAttributes = {
  'data-keyrove-root': 'true';
  'data-keyrove-cols'?: string;
  'data-keyrove-loop'?: string;
  'data-keyrove-orientation'?: string;
  'data-keyrove-page-length'?: string;
} & Partial<Record<KeyAttributeName, string>>;

/** A spreadable item marker and the settings supplied to its builder. */
export type ItemAttributes = {
  'data-keyrove-item': 'true';
  'data-keyrove-skip'?: string;
  'data-keyrove-roving-tabindex'?: string;
  'data-keyrove-focus-key'?: string;
  'data-keyrove-typeahead'?: string;
};

/**
 * Every setting one move needs, resolved for the root it is navigating:
 * options where they name a field, the root's attributes where they do not.
 * The layers below take these as given and never read a source of their own.
 * What the group's items are, and which of them a move lands on, are the
 * group's own readings: see {@link GroupReader}.
 */
export type GroupConfig = {
  layout: Layout;
  explicit: ExplicitBinding;
  rtl: () => boolean;
  pageLength: number;
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
 * What `initRovingTabindex` takes: the group settings, and the item the stop
 * should go to.
 */
export type InitRovingTabindexOptions = RovingTabindexOptions & {
  /**
   * The item to hold the stop, such as a listbox's selected option. It wins
   * over a stop the group already has. Nullish, or anything that is not one of
   * the group's navigable roving items, is passed over for the usual rule, so
   * a query that found nothing needs no guard.
   */
  initial?: Element | null;
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
 * true for the four directional moves, false for every other stride, which
 * move only within a group. A property of the move, not of the key it is bound
 * to. A focus row carries its target outright — the element that declared the
 * key — and always enters: it names a destination, not a step from a position.
 * A boundary row never enters: it goes from the group focus is in to the one
 * next to it, and decides for itself what it needs to be in.
 */
export type Binding =
  | { combo: string; intent: StrideAction; enters: boolean }
  | { combo: string; intent: BoundaryAction; enters: false }
  | { combo: string; intent: 'focus'; enters: true; target: Element };

/**
 * Looks up the combo explicitly bound to a move, straight off the root's
 * `*-key` attribute — nullish where the attribute is unset and the move keeps
 * its default key, and `none` where the move is bound to no key.
 */
export type ExplicitBinding = (
  intent: StrideAction | BoundaryAction,
) => string | null | undefined;

/** A focus key as read off an element: its combo, and the element it focuses. */
export type FocusKey = {
  combo: string;
  target: Element;
};

/**
 * The four readings a group is read by: which elements a root governs, which
 * of them a move passes over, which element scopes a group, and whether the
 * item focus is leaving carries the roving tab stop.
 *
 * The group layer resolves them once from options, each falling back to the
 * `data-keyrove-*` reading it stands for, so the attribute API passes none of
 * them. Every layer past it asks the {@link Group} instead, and never learns
 * where the answers came from.
 */
export type ReadItems = (root: Element) => Element[];
export type IsSkipped = (element: Element) => boolean;
export type IsRoot = (element: Element) => boolean;
export type IsRoving = (from: Element) => boolean;

export type BuildBindingsArgs = {
  /**
   * Asked only about the moves in the layout's default table and the boundary
   * moves, so a move the layout lacks is never looked up.
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
  /**
   * Whether a move can land on an element: the group's navigable test. The
   * elements it turns down keep their place in the sequence, and their cell
   * in a grid.
   */
  isNavigable: (element: Element) => boolean;
};

export type ToggleTabIndexArgs = {
  root: Element | null | undefined;
  isActive: boolean;
};

/** The group settings the group layer reads: the four readings' sources. */
export type GroupReadingOptions = Pick<
  GroupOptions,
  'items' | 'root' | 'skip' | 'rovingTabindex'
>;

/**
 * One group, resolved for one call: the items its root governs and every
 * question the handlers ask about them, with the way a move lands in it.
 *
 * Read lazily: each answer is read off the DOM the first time it is asked
 * for, and kept for the life of the call, so a press that is turned away
 * early reads nothing it does not need, and nothing is read twice. Its two
 * tests take no `this`, and can be handed on as callbacks.
 */
export type Group = {
  /**
   * The element the group's items are read in: a root, the listener's
   * element, or a shadow root, which has no attributes.
   */
  readonly root: Element;
  /**
   * The sequence a move strides through: the root's items in DOM order,
   * disabled ones aside — `disabled` is the DOM's own word for an element that
   * takes no part, whichever source named the items. A nested root's items
   * keep their place in it, and so do skipped ones.
   */
  readonly items: Element[];
  /**
   * The item holding focus, where focus is anywhere inside it
   * (`:focus-within`) — the outermost, where items nest. `null` with focus in
   * none of them.
   */
  readonly focused: Element | null;
  /**
   * The items the group governs itself: its items less those of a root nested
   * inside it, which belong to that root — an item that is itself a root
   * belongs to the group around it. Disabled ones included.
   */
  readonly own: Element[];
  /** The own items that carry the roving stop: the set one stop is shared across. */
  readonly roving: Element[];
  /**
   * The own item holding the roving stop, disabled ones aside: the first that
   * {@link Group.holdsStop}. `null` where the group has none.
   */
  readonly stop: Element | null;
  /** Whether a move can land on an item: one neither skipped nor disabled. */
  isNavigable: (item: Element) => boolean;
  /** Whether an item holds the roving stop: it carries it, and has `tabindex="0"`. */
  holdsStop: (item: Element) => boolean;
  /**
   * Gives `stop` the group's one `tabindex="0"` and every other roving item
   * `-1` — or all of them `-1` where `stop` is `null`. A nested group's stop
   * is left alone. Only attributes that change are written, so a group already
   * in order takes no mutations.
   */
  placeStop(stop: Element | null): void;
  /**
   * Lands a move through the group's order. The order runs on through a
   * nested root's items, but each group keeps a stop of its own: a move within
   * one group carries the stop from `from`, and a move into another carries
   * that group's own stop, leaving the stop of the group focus left where it
   * is. A move with no `from` enters from outside, and carries nothing.
   */
  move<Action extends string>(move: MoveArgs<Action>): ActionResult<Action>;
  /**
   * Lands a move into this group from the one next to it, across a nested
   * root's boundary: the stop carried is this group's own, wherever focus
   * came from, and the group focus left keeps its stop for the way back.
   */
  cross<Action extends string>(move: MoveArgs<Action>): ActionResult<Action>;
};

/**
 * How a handler reads its groups: the four readings, resolved once from its
 * options, and the two ways to a group — from where an event happened, or from
 * a root.
 */
export type GroupReader = {
  /**
   * The group an event at `target` is in: the nearest root at or above it,
   * else the listener's element. `null` with neither. Resolving from the
   * target rather than the listener is what lets one delegated listener serve
   * several groups, and lets a nested root win while focus is in it.
   */
  at: (
    target: Element | null | undefined,
    listener: EventTarget | null | undefined,
  ) => Group | null;
  /** The group `root` governs: an element, or a shadow root a listener is attached to. */
  of: (root: Element | ShadowRoot) => Group;
  /** Whether an element is a root, for the walks from one group to the next. */
  isRoot: IsRoot;
};

/**
 * What it takes to land a move: the event to claim, the action to report, the
 * item focus is leaving (`null` from outside the group), the one it lands on
 * (nullish when there is nowhere to go), and who to tell. Generic in the action
 * so each handler's result comes back exactly typed. Which item the roving
 * stop is carried from is the group's to decide: see {@link Group.move}.
 */
export type MoveArgs<Action extends string> = {
  /** The keypress to claim. A move made from code has none. */
  e?: Pick<KeyRoveEvent, 'preventDefault'>;
  action: Action;
  from: Element | null;
  to: Element | null | undefined;
  onMove?: (move: ActionResult<Action> & { to: Element }) => void;
};
