// Only the types re-exported from `index.ts` are public.

/**
 * The codes keyrove's own defaults use. Strict, so a typo is a compile error;
 * consumers get the wider {@link KeyRoveCode}.
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
 * A `KeyboardEvent.code`. `(string & {})` keeps it assignable from the DOM's
 * and React's plain `string` while editors still complete keyrove's codes.
 */
export type KeyRoveCode = KnownCode | (string & {});

/**
 * One combo, `"ctrl+ArrowDown"`, or a comma-separated list, `"ArrowDown, KeyJ"`.
 * See `matchesCombo` for the grammar. Open like {@link KeyRoveCode}; not validated.
 */
export type KeyCombo = KnownCode | (string & {});

/**
 * Structural, so both DOM and React keyboard events fit without a React
 * dependency. Optional fields read as absent: not held, not composing, etc.
 */
export type KeyRoveEvent = {
  code: KeyRoveCode;
  target: EventTarget | null;
  currentTarget: EventTarget | null;
  preventDefault: () => void;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  /**
   * Tells AltGr, which Windows reports as Ctrl+Alt, from a Ctrl+Alt command.
   * Narrowed to `'AltGraph'` so React's `ModifierKey` parameter fits.
   */
  getModifierState?: (key: 'AltGraph') => boolean;
  /** `KeyboardEvent.isComposing`: an IME owns every press mid-composition. */
  isComposing?: boolean;
  /** A press another handler already claimed is left alone. */
  defaultPrevented?: boolean;
  /** The produced character. Only typeahead reads it; bindings use `code`. */
  key?: string;
  /** Finds a field inside a shadow root, where `target` is the host. */
  composedPath?: () => EventTarget[];
  /** React's synthetic events have no `composedPath`; it is read here. */
  nativeEvent?: { composedPath?: () => EventTarget[] };
};

/**
 * A move from the focused position. `next`/`prev` are ±1 in DOM order, across
 * row ends in a grid. The `Row` actions exist only in grids.
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
 * `exit` to the group around a nested root, `enter` into the group inside an
 * item. No default key: Escape and Enter already mean something to the page.
 */
export type BoundaryAction = 'exit' | 'enter';

/**
 * Everything a keypress can resolve to. `focus` reaches an element by its own
 * `data-keyrove-focus-key`, from anywhere under the listener.
 */
export type MoveAction = StrideAction | BoundaryAction | 'focus';

/**
 * `from` is null when the group was entered from outside; `to` is null for a
 * consumed no-op: nowhere to go, or the target is already focused.
 */
export type ActionResult<Action extends string> = {
  action: Action;
  from: Element | null;
  to: Element | null;
};

/** What `keyRove` returns for a consumed keypress. */
export type MoveResult = ActionResult<MoveAction>;

/** The argument `onMove` receives: a move that actually happened. */
export type Move = MoveResult & { to: Element };

/**
 * A group's settings in JavaScript. Each field falls back on its own to its
 * `data-keyrove-*` attribute, so options and markup mix freely.
 */
export type GroupOptions = {
  /**
   * A selector run inside the root, or a function. Defaults to the item
   * attribute. Disabled items are never navigable.
   */
  items?: string | ReadItems;
  /**
   * The selector a root answers to, matched at or above the event's target.
   * Defaults to the root attribute; either way the listener's element stands
   * in when nothing above the target matches.
   */
  root?: string;
  /**
   * Above 1 the group is a grid. `'auto'` counts the root's CSS grid tracks on
   * each keypress, else the items on a wrapping layout's first line.
   */
  cols?: number | 'auto';
  /** Whether `next`/`prev` wrap at the ends. Lists only. */
  loop?: boolean;
  /** Which axis `next`/`prev` take their default arrows from. */
  orientation?: 'horizontal' | 'vertical';
  /** Rows per page jump — items, in a list. Defaults to 10. */
  pageLength?: number;
  /**
   * `{ next: 'ArrowDown, KeyJ', exit: 'Escape' }`. A move left out keeps its
   * attribute, then its default. `'none'` frees the default key.
   */
  keys?: Partial<Record<StrideAction | BoundaryAction, KeyCombo | 'none'>>;
  /**
   * {@link KeyCombo} → element, or a selector resolved within the listener's
   * reach. Replaces the focus-key attribute scan.
   */
  focusKeys?: Record<string, string | Element>;
  /** Which items a move passes over. Defaults to the skip attribute. */
  skip?: string | IsSkipped;
  /** One tab stop that follows focus, for the whole group. The attribute is per item. */
  rovingTabindex?: boolean;
};

/** What `keyRove` and `rove` take: the group's settings, and `onMove`. */
export type KeyRoveOptions = GroupOptions & {
  /** Fired only when focus actually moved. */
  onMove?: (move: Move) => void;
};

/**
 * {@link KeyRoveOptions} under its earlier name, kept for existing imports.
 *
 * @deprecated Use {@link KeyRoveOptions}. `Options` will be removed in the
 * next major version.
 */
export type Options = KeyRoveOptions;

/**
 * What `initRovingTabindex` and `followFocus` take: the {@link GroupOptions}
 * fields that decide a group's roving items.
 */
export type RovingTabindexOptions = Pick<
  GroupOptions,
  'items' | 'root' | 'skip' | 'rovingTabindex'
>;

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

export type GroupConfig = {
  /** Read on first ask: with `auto`, it reads the page's layout. */
  readonly layout: Layout;
  explicit: ExplicitBinding;
  rtl: () => boolean;
  pageLength: number;
};

/**
 * The typeahead handler's options. The group fields match {@link GroupOptions},
 * so one object can serve both handlers.
 */
export type TypeaheadOptions = RovingTabindexOptions & {
  /** Falls back, when empty, to the typeahead attribute, then `textContent`. */
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
  /** Fired only when focus actually moved. */
  onMove?: (move: TypeaheadMove) => void;
};

/**
 * What a typeahead handler returns for a consumed keypress. `to` is null when
 * the match is already focused.
 */
export type TypeaheadResult = ActionResult<'typeahead'>;

/** The argument a typeahead `onMove` receives: a move that actually happened. */
export type TypeaheadMove = TypeaheadResult & { to: Element };

/**
 * The `onMove` argument when one config object serves both `keyRove` and
 * `createTypeahead`; {@link Move} alone fits only `keyRove`.
 */
export type AnyMove = Move | TypeaheadMove;

export type InitRovingTabindexOptions = RovingTabindexOptions & {
  /**
   * The item to hold the stop, such as a listbox's selected option; wins over
   * an existing stop. Ignored unless a navigable roving item, so nullish is fine.
   */
  initial?: Element | null;
};

// `horizontal` picks only the default arrows for `next`/`prev`.
export type Layout = {
  kind: 'list' | 'grid';
  cols: number;
  horizontal: boolean;
  loop: boolean;
};

// `enters`: whether the move acts with nothing focused in the group. A
// property of the move, not of the key.
export type Binding =
  | { combo: string; intent: StrideAction; enters: boolean }
  | { combo: string; intent: BoundaryAction; enters: false }
  | { combo: string; intent: 'focus'; enters: true; target: Element };

// Nullish where the move keeps its default key; `none` where it has no key.
export type ExplicitBinding = (
  intent: StrideAction | BoundaryAction,
) => string | null | undefined;

export type FocusKey = {
  combo: string;
  target: Element;
};

export type ReadItems = (root: Element) => Element[];
export type IsSkipped = (element: Element) => boolean;
export type IsRoot = (element: Element) => boolean;
export type IsRoving = (from: Element) => boolean;

export type BuildBindingsArgs = {
  explicit: ExplicitBinding;
  /** In DOM order. */
  focus?: readonly FocusKey[];
  layout: Layout;
  /** Called only when an unbound horizontal `next`/`prev` default could flip. */
  rtl: () => boolean;
};

export type FindBindingArgs = Omit<BuildBindingsArgs, 'layout'> & {
  /** Lazy: with `auto`, reading it reads the page's layout. */
  layout: () => Layout;
};

export type ResolveTargetArgs = {
  intent: StrideAction;
  elements: Element[];
  /** Index of the focused item, or -1 when the group is entered from outside. */
  fromIndex: number;
  layout: Layout;
  pageLength: number;
  /** Elements it rejects keep their place in the sequence and their grid cell. */
  isNavigable: (element: Element) => boolean;
};

export type ToggleTabIndexArgs = {
  root: Element | null | undefined;
  isActive: boolean;
};

/**
 * One group, resolved for one call. Each answer is read lazily and kept. The
 * two tests take no `this`, so they can be passed as callbacks.
 */
export type Group = {
  /** A root, the listener's element, or a shadow root (no attributes). */
  readonly root: Element;
  /** In DOM order, disabled excluded. Nested and skipped items keep their place. */
  readonly items: Element[];
  /** The outermost item matching `:focus-within`. */
  readonly focused: Element | null;
  /** All items less a nested root's, disabled included. */
  readonly own: Element[];
  /** The own items one stop is shared across. */
  readonly roving: Element[];
  /** The first enabled own item that {@link Group.holdsStop}. */
  readonly stop: Element | null;
  /** Neither skipped nor disabled. */
  isNavigable: (item: Element) => boolean;
  /** Roving and `tabindex="0"`. */
  holdsStop: (item: Element) => boolean;
  /** Writes only changed attributes; a nested group's stop is left alone. */
  placeStop(stop: Element | null): void;
  /**
   * Within one group the stop comes from `from`; into a nested group, from
   * that group's own stop. With no `from` nothing is carried.
   */
  move<Action extends string>(move: MoveArgs<Action>): ActionResult<Action>;
  /** Across a boundary: carries this group's own stop; the left group keeps its. */
  cross<Action extends string>(move: MoveArgs<Action>): ActionResult<Action>;
};

export type GroupReader = {
  /**
   * The nearest root at or above `target`, else the listener's element.
   * Resolving from the target lets one listener serve several groups.
   */
  at: (
    target: Element | null | undefined,
    listener: EventTarget | null | undefined,
  ) => Group | null;
  of: (root: Element | ShadowRoot) => Group;
  /** `null` for `reach` (the listener's element) itself, or anything outside it. */
  around: (element: Element, reach: Element) => Group | null;
  inside: (item: Element) => Group | null;
};

export type MoveArgs<Action extends string> = {
  /** Absent for a move made from code. */
  e?: Pick<KeyRoveEvent, 'preventDefault'>;
  action: Action;
  from: Element | null;
  to: Element | null | undefined;
  /** Resumes the walk after `to` refuses focus. Without it a refusal ends the move. */
  retarget?: (
    isNavigable: (item: Element) => boolean,
  ) => Element | null | undefined;
  onMove?: (move: ActionResult<Action> & { to: Element }) => void;
};
