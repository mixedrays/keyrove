import {
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_ROVING_TABINDEX,
  KEYROVE_ATTR_SKIP,
} from './attributes.js';
import { innerRoot, outerRoot, ownerRoot, rootAt } from './nesting.js';
import { hasEnabledAttribute } from './utils.js';
import type {
  ActionResult,
  Group,
  GroupReader,
  IsRoot,
  IsRoving,
  IsSkipped,
  MoveArgs,
  ReadItems,
  RovingTabindexOptions,
} from './types.js';

const attributeRoot: IsRoot = (element) =>
  hasEnabledAttribute(element, KEYROVE_ATTR_ROOT);

const attributeItems: ReadItems = (root) =>
  Array.from(root.querySelectorAll(`[${KEYROVE_ATTR_ITEM}]`)).filter((item) =>
    hasEnabledAttribute(item, KEYROVE_ATTR_ITEM),
  );

const attributeRoving: IsRoving = (from) =>
  hasEnabledAttribute(from, KEYROVE_ATTR_ROVING_TABINDEX);

/** Also read by the focus-key scan, on elements that need not be items. */
export const attributeSkip: IsSkipped = (element) =>
  hasEnabledAttribute(element, KEYROVE_ATTR_SKIP);

// A shadow root handed to `rove` is asked too, and has no `matches`.
const rootTest = ({ root }: RovingTabindexOptions): IsRoot =>
  root ? (element) => !!element.matches?.(root) : attributeRoot;

const itemsReader = ({ items }: RovingTabindexOptions): ReadItems => {
  if (!items) return attributeItems;

  if (typeof items === 'string') {
    return (root) => Array.from(root.querySelectorAll(items));
  }

  return items;
};

const skipTest = ({ skip }: RovingTabindexOptions): IsSkipped => {
  if (!skip) return attributeSkip;

  return typeof skip === 'string' ? (element) => element.matches(skip) : skip;
};

const rovingTest = ({ rovingTabindex }: RovingTabindexOptions): IsRoving =>
  rovingTabindex === undefined ? attributeRoving : () => rovingTabindex;

/** Inside a shadow root the document sees only the host, so ask the root. */
export const activeElementOf = (element: Element): Element | null =>
  (element.getRootNode() as Partial<DocumentOrShadowRoot>).activeElement ??
  null;

/**
 * `:focus-within`, asked of the tree: focus moves without mutating the DOM,
 * so a cached selector result can go stale where a walk cannot.
 */
export const holdsFocus = (element: Element): boolean => {
  const active = activeElementOf(element);

  return !!active && element.contains(active);
};

/**
 * `:disabled` covers controls in a `<fieldset disabled>`; the attribute
 * covers non-controls. `aria-disabled` elements still take focus.
 */
export const isDisabled = (element: Element) =>
  element.hasAttribute('disabled') || element.matches(':disabled');

const placeStop = (items: Element[], stop: Element | null) => {
  for (const item of items) {
    const tabindex = item === stop ? '0' : '-1';

    if (item.getAttribute('tabindex') !== tabindex) {
      item.setAttribute('tabindex', tabindex);
    }
  }
};

// Returns an undo that restores both `tabindex` values, absent included.
const carryStop = (from: Element, to: Element) => {
  const before = [from, to].map(
    (element) => [element, element.getAttribute('tabindex')] as const,
  );

  from.setAttribute('tabindex', '-1');
  to.setAttribute('tabindex', '0');

  return () => {
    for (const [element, value] of before) {
      if (value === null) element.removeAttribute('tabindex');
      else element.setAttribute('tabindex', value);
    }
  };
};

/**
 * `retarget` resumes the walk with a stricter test. Since the test only
 * grows stricter, resuming lands where restarting would, in one pass.
 */
export const walkOn = (
  walk: (
    isNavigable: (item: Element) => boolean,
  ) => Iterator<Element, null | undefined>,
  isNavigable: (item: Element) => boolean,
) => {
  let test = isNavigable;
  const targets = walk((item) => test(item));

  return {
    to: targets.next().value,
    retarget: (stricter: (item: Element) => boolean) => {
      test = stricter;

      return targets.next().value;
    },
  };
};

/**
 * Call only once the press is the handler's own: `preventDefault` is
 * unconditional. A `to` refusing focus (inert, hidden) gets its stop put back
 * and the walk goes on via `retarget`.
 */
const land = <Action extends string>(
  { e, action, from, to, retarget, onMove }: MoveArgs<Action>,
  isRoving: IsRoving,
  isNavigable: (item: Element) => boolean,
  stopSource: (to: Element) => Element | null,
): ActionResult<Action> => {
  e?.preventDefault();

  let refused: Set<Element> | undefined;

  // A `retarget` handing back a refused item would loop forever.
  while (to && to !== from && !refused?.has(to)) {
    // Stop before focus: `tabindex="0"` is what makes a bare item focusable.
    const stopFrom = stopSource(to);
    const putBack =
      stopFrom && stopFrom !== to && isRoving(stopFrom)
        ? carryStop(stopFrom, to)
        : undefined;

    (to as HTMLElement).focus();

    // `focus()` fails silently.
    if (holdsFocus(to)) {
      const move = { action, from, to };
      onMove?.(move);

      return move;
    }

    putBack?.();

    if (!retarget) break;

    const passed = (refused ??= new Set());
    passed.add(to);
    to = retarget((item) => !passed.has(item) && isNavigable(item));
  }

  return { action, from, to: null };
};

type Readings = {
  isRoot: IsRoot;
  readItems: ReadItems;
  isRoving: IsRoving;
  isNavigable: (item: Element) => boolean;
  holdsStop: (item: Element) => boolean;
  of: (root: Element | ShadowRoot) => Group;
};

// A class, not an object literal: getters live on the prototype, so resolving
// a group allocates one object per keypress.
class ResolvedGroup implements Group {
  readonly root: Element;
  readonly isNavigable: (item: Element) => boolean;
  readonly holdsStop: (item: Element) => boolean;
  private readonly readings: Readings;
  // `undefined` until first asked for.
  private read: Element[] | undefined = undefined;
  private sequence: Element[] | undefined = undefined;
  private focus: Element | null | undefined = undefined;
  private owned: Element[] | undefined = undefined;
  private shared: Element[] | undefined = undefined;
  private holder: Element | null | undefined = undefined;

  constructor(root: Element | ShadowRoot, readings: Readings) {
    // A shadow root is read as a root with no attributes.
    this.root = root as Element;
    this.readings = readings;
    this.isNavigable = readings.isNavigable;
    this.holdsStop = readings.holdsStop;
  }

  private get all() {
    return (this.read ??= this.readings.readItems(this.root));
  }

  get items() {
    return (this.sequence ??= this.all.filter((item) => !isDisabled(item)));
  }

  get focused() {
    if (this.focus === undefined) {
      this.focus = holdsFocus(this.root)
        ? (this.items.find(holdsFocus) ?? null)
        : null;
    }

    return this.focus;
  }

  get own() {
    // Not `items`, which keep a nested root's items; a nested stop is its own.
    const { root } = this;
    const { isRoot } = this.readings;

    return (this.owned ??= this.all.filter(
      (item) => ownerRoot(item, root, isRoot) === root,
    ));
  }

  get roving() {
    return (this.shared ??= this.own.filter(this.readings.isRoving));
  }

  get stop() {
    if (this.holder === undefined) {
      this.holder =
        this.own.find((item) => !isDisabled(item) && this.holdsStop(item)) ??
        null;
    }

    return this.holder;
  }

  placeStop(stop: Element | null) {
    placeStop(this.roving, stop);
  }

  move<Action extends string>(move: MoveArgs<Action>): ActionResult<Action> {
    const { isRoving, isNavigable } = this.readings;

    return land(move, isRoving, isNavigable, (to) =>
      this.stopSource(move.from, to),
    );
  }

  cross<Action extends string>(move: MoveArgs<Action>): ActionResult<Action> {
    const { isRoving, isNavigable } = this.readings;

    return land(move, isRoving, isNavigable, () => this.stop);
  }

  // Within one group the stop comes from `from`; into another, from that
  // group's own stop.
  private stopSource(from: Element | null, to: Element): Element | null {
    if (!from) return null;

    const { root } = this;
    const { isRoot } = this.readings;
    const owner = ownerRoot(to, root, isRoot);

    if (ownerRoot(from, root, isRoot) === owner) return from;

    return owner === root ? this.stop : this.readings.of(owner).stop;
  }
}

const createReader = (
  isRoot: IsRoot,
  readItems: ReadItems,
  isSkipped: IsSkipped,
  isRoving: IsRoving,
): GroupReader => {
  const readings: Readings = {
    isRoot,
    readItems,
    isRoving,
    isNavigable: (item) => !isDisabled(item) && !isSkipped(item),
    holdsStop: (item) =>
      isRoving(item) && item.getAttribute('tabindex') === '0',
    of: (root) => new ResolvedGroup(root, readings),
  };

  const ofFound = (root: Element | null) => (root ? readings.of(root) : null);

  return {
    at: (target, listener) => ofFound(rootAt(target, listener, isRoot)),
    of: readings.of,
    around: (element, reach) => ofFound(outerRoot(element, reach, isRoot)),
    inside: (item) => ofFound(innerRoot(item, isRoot)),
  };
};

// Shared by every call that names none of the four readings.
const attributeReader = createReader(
  attributeRoot,
  attributeItems,
  attributeSkip,
  attributeRoving,
);

export const readGroups = (options: RovingTabindexOptions): GroupReader =>
  !options.root &&
  !options.items &&
  !options.skip &&
  options.rovingTabindex === undefined
    ? attributeReader
    : createReader(
        rootTest(options),
        itemsReader(options),
        skipTest(options),
        rovingTest(options),
      );
