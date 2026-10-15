/**
 * The group layer, shared by every handler.
 *
 * Every handler resolves its group here, once per call — from where an event
 * happened, or from a root — and asks the group what it needs: its items,
 * which of them a move can land on, which are its own rather than a nested
 * root's, and the item holding its roving tab stop. A move ends here too:
 * claim the key, land focus, carry the stop, report. That tail *is* the
 * result contract consumers chain on with `||`, and which item the stop is
 * carried from is the rule nested groups turn on, so both are spelled out
 * once, here, and no handler re-derives either.
 */

import {
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_ROVING_TABINDEX,
  KEYROVE_ATTR_SKIP,
} from './attributes.js';
import { hasEnabledAttribute, toggleTabIndex } from './utils.js';
import type {
  ActionResult,
  Group,
  GroupReader,
  GroupReadingOptions,
  IsRoot,
  IsRoving,
  IsSkipped,
  MoveArgs,
  ReadItems,
} from './types.js';

// The attribute source's answers to the four questions this layer asks about
// a group. They stand in for any reading an options object leaves unnamed, so
// a caller that names no other source navigates markup exactly as it always
// has.
const attributeRoot: IsRoot = (element) =>
  hasEnabledAttribute(element, KEYROVE_ATTR_ROOT);

const attributeItems: ReadItems = (root) =>
  Array.from(root.querySelectorAll(`[${KEYROVE_ATTR_ITEM}]`)).filter((item) =>
    hasEnabledAttribute(item, KEYROVE_ATTR_ITEM),
  );

const attributeRoving: IsRoving = (from) =>
  hasEnabledAttribute(from, KEYROVE_ATTR_ROVING_TABINDEX);

/**
 * Which elements a move passes over, by the skip attribute. Also how the
 * focus-key scan reads the attribute, on elements that need not be items.
 */
export const attributeSkip: IsSkipped = (element) =>
  hasEnabledAttribute(element, KEYROVE_ATTR_SKIP);

/**
 * What marks a root: a `root` selector where one is named, else the attribute.
 * A shadow root handed to `rove` is asked too, and matches no selector.
 */
const rootTest = ({ root }: GroupReadingOptions): IsRoot =>
  root ? (element) => !!element.matches?.(root) : attributeRoot;

/** How the items are found: a selector run in the root, a reading of your own, or the attribute. */
const itemsReader = ({ items }: GroupReadingOptions): ReadItems => {
  if (!items) return attributeItems;

  if (typeof items === 'string') {
    return (root) => Array.from(root.querySelectorAll(items));
  }

  return items;
};

/** Which items a move passes over: a selector or a test of your own, else the attribute. */
const skipTest = ({ skip }: GroupReadingOptions): IsSkipped => {
  if (!skip) return attributeSkip;

  return typeof skip === 'string' ? (element) => element.matches(skip) : skip;
};

/**
 * Whether the item focus is leaving carries the roving tab stop: one boolean
 * for the group where options name it, else the attribute's reading of that
 * item.
 */
const rovingTest = ({ rovingTabindex }: GroupReadingOptions): IsRoving =>
  rovingTabindex === undefined ? attributeRoving : () => rovingTabindex;

/**
 * The focused element as `element`'s own tree sees it. Inside a shadow root
 * the document sees only the host, so the shadow root is asked instead; focus
 * in a shadow tree further down shows up as that tree's host, which is still
 * inside whatever contains it.
 */
export const activeElementOf = (element: Element): Element | null =>
  (element.getRootNode() as Partial<DocumentOrShadowRoot>).activeElement ??
  null;

/**
 * Whether the focused element is this element or inside it — `:focus-within`,
 * asked of the tree rather than of the selector engine. Focus moves without
 * mutating the DOM, and a cached selector result can go stale where a walk
 * cannot. An item that hands its focus on to a control of its own holds it
 * too.
 */
export const holdsFocus = (element: Element): boolean => {
  const active = activeElementOf(element);

  return !!active && element.contains(active);
};

// `Node.DOCUMENT_NODE`, spelled out so reading it needs no global `Node`.
const DOCUMENT_NODE = 9;

/**
 * The element a listener sits on. A listener on the document, or the window,
 * has no element of its own, so the document element stands in: `<html>`
 * answers attribute reads and item queries like any root, with nothing set.
 *
 * A listener on a shadow root has no element to stand in: no single one
 * contains every top-level child. The shadow root is handed back as it is — a
 * fragment that answers item queries and holds focus like any root, and has
 * no attributes, so every attribute read of it is unset (see `readAttribute`).
 */
export const listenerElement = (
  listener: EventTarget | null | undefined,
): Element | null => {
  if (!listener) return null;

  // Told apart by values, not by which properties exist: a form exposes its
  // controls as named properties, so `<input name="document">` makes
  // `'document' in form` true. A control can stand in for `nodeType` or
  // `window` too, but it is an element, never 9 or the form itself.
  if ((listener as Node).nodeType === DOCUMENT_NODE) {
    return (listener as Document).documentElement;
  }
  if ((listener as Window).window === listener) {
    return (listener as Window).document.documentElement;
  }

  return listener as Element;
};

/**
 * The group an item of `root` belongs to: the nearest root above its
 * *parent*, short of `root` itself, else `root`. The resolution a focus key's
 * move uses, so an item that is itself a root belongs to the group around it.
 */
const ownerRoot = (item: Element, root: Element, isRoot: IsRoot): Element => {
  for (
    let element = item.parentElement;
    element && element !== root;
    element = element.parentElement
  ) {
    if (isRoot(element)) return element;
  }

  return root;
};

// `disabled` is the DOM's own word for an element that takes no part, and it
// means the same whichever source named the items: such an item is in no
// group's sequence, and never holds a stop.
const isDisabled = (item: Element) => item.hasAttribute('disabled');

/**
 * Gives `stop` the group's one `tabindex="0"` and every other of its roving
 * `items` `-1` — or all of them `-1` where there is no stop. Only attributes
 * that change are written, so a group already in order takes no mutations.
 */
const placeStop = (items: Element[], stop: Element | null) => {
  for (const item of items) {
    const isActive = item === stop;

    if (item.getAttribute('tabindex') !== (isActive ? '0' : '-1')) {
      toggleTabIndex({ root: item, isActive });
    }
  }
};

/**
 * Moves the roving tab stop from one item to another, and hands back how to
 * put both `tabindex` values back exactly as they were — absent included.
 */
const carryStop = (from: Element, to: Element) => {
  const before = [from, to].map(
    (element) => [element, element.getAttribute('tabindex')] as const,
  );

  toggleTabIndex({ root: from, isActive: false });
  toggleTabIndex({ root: to, isActive: true });

  return () => {
    for (const [element, value] of before) {
      if (value === null) element.removeAttribute('tabindex');
      else element.setAttribute('tabindex', value);
    }
  };
};

/**
 * Claims the key and lands focus on `to`, reporting the move.
 *
 * Call it only once a handler has decided the press is its own:
 * `preventDefault` is unconditional here, because the group owns its keys up
 * to its own boundary and the page must not scroll instead. A move made from
 * code passes no event, and has no key to claim. A missing `to`, or
 * one that is the focused item already, is a consumed no-op — focus and the
 * tab stop stay put, `onMove` stays quiet, and the result carries `to: null`.
 * Otherwise the roving tab stop follows when `isRoving` accepts the item it is
 * carried from, which `stopSource` names once the move is known to go
 * somewhere, `to` is focused, and `onMove` fires with the move that happened.
 *
 * A `to` that does not take focus — not focusable, inert, hidden — is the same
 * consumed no-op, with the tab stop put back where it was.
 */
const land = <Action extends string>(
  { e, action, from, to, onMove }: MoveArgs<Action>,
  isRoving: IsRoving,
  stopSource: () => Element | null,
): ActionResult<Action> => {
  e?.preventDefault();

  if (!to || to === from) return { action, from, to: null };

  // The stop moves before focus does: `tabindex="0"` is what makes a bare item
  // focusable in the first place.
  const stopFrom = stopSource();
  const putBack =
    stopFrom && stopFrom !== to && isRoving(stopFrom)
      ? carryStop(stopFrom, to)
      : undefined;

  (to as HTMLElement).focus();

  // `focus()` fails silently, so whether focus landed on `to` or inside it is
  // read off the tree.
  if (!holdsFocus(to)) {
    putBack?.();

    return { action, from, to: null };
  }

  const move = { action, from, to };
  onMove?.(move);

  return move;
};

/**
 * The readings every group read through one reader answers by: the four
 * resolved from options, the navigable and stop tests made of them, and the
 * way to the group of a nested root.
 */
type Readings = {
  isRoot: IsRoot;
  readItems: ReadItems;
  isRoving: IsRoving;
  isNavigable: (item: Element) => boolean;
  holdsStop: (item: Element) => boolean;
  of: (root: Element | ShadowRoot) => Group;
};

/**
 * A group, read lazily: each answer is read off the DOM the first time it is
 * asked for, and kept for the life of the call.
 *
 * A class rather than an object literal for the keydown cost: its getters and
 * methods live once on the prototype, so resolving a group allocates one
 * object, and a press turned away before anything is read pays for nothing
 * more.
 */
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
    // A shadow root is read as a root with no attributes; see
    // `listenerElement`.
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
    // The root answers first: focus outside it means no item can hold it, and
    // the walk is skipped.
    if (this.focus === undefined) {
      this.focus = holdsFocus(this.root)
        ? (this.items.find(holdsFocus) ?? null)
        : null;
    }

    return this.focus;
  }

  get own() {
    // Deliberately not `items`, which keep a nested root's items so the order
    // runs straight through them: this is the set one stop is shared across,
    // and a nested group's stop is left alone.
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
    return land(move, this.readings.isRoving, () =>
      this.stopSource(move.from, move.to),
    );
  }

  cross<Action extends string>(move: MoveArgs<Action>): ActionResult<Action> {
    return land(move, this.readings.isRoving, () => this.stop);
  }

  /**
   * The item a move from `from` to `to`, both items of this group, carries the
   * stop from: `from` within one group, and the stop of the group moved into
   * where the move goes from one group to another. `null` from outside, or
   * where the group moved into has no stop to carry.
   */
  private stopSource(
    from: Element | null,
    to: Element | null | undefined,
  ): Element | null {
    if (!from || !to) return from;

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
    // The one navigable-item rule: an item a move can land on is neither
    // skipped nor disabled.
    isNavigable: (item) => !isDisabled(item) && !isSkipped(item),
    holdsStop: (item) =>
      isRoving(item) && item.getAttribute('tabindex') === '0',
    of: (root) => new ResolvedGroup(root, readings),
  };

  return {
    at: (target, listener) => {
      for (let element = target; element; element = element.parentElement) {
        if (isRoot(element)) return readings.of(element);
      }

      const root = listenerElement(listener);

      return root ? readings.of(root) : null;
    },
    of: readings.of,
    isRoot,
  };
};

// The reader for options that name none of the four readings — most calls,
// and every call that passes no options — made once rather than per press.
const attributeReader = createReader(
  attributeRoot,
  attributeItems,
  attributeSkip,
  attributeRoving,
);

/**
 * How a handler reads its groups. The four readings — what marks a root, what
 * the items are, which a move passes over, and whether the stop roves — are
 * resolved here once, options first and the attributes where options say
 * nothing, and every group read through the result answers by them.
 */
export const readGroups = (options: GroupReadingOptions): GroupReader =>
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
