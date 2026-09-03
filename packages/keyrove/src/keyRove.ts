import { DEFAULT_ATTRIBUTES } from './attributes.js';
import { buildBindings } from './bindings.js';
import { listenerElement, moveFocus, readGroup, resolveRoot } from './group.js';
import { resolveTarget } from './position.js';
import {
  hasCommandModifier,
  isEditableTarget,
  matchesCombo,
  parseAttributeInt,
} from './utils.js';
import type {
  Attributes,
  ExplicitBindings,
  FocusKey,
  KeyRoveEvent,
  Layout,
  MoveResult,
  Options,
} from './types.js';

// Individual constants, so consumers can spread them into markup without
// reaching into the map — which stays internal; see `attributes.ts`.
export const KEYROVE_ATTR_ITEM = DEFAULT_ATTRIBUTES.item;
export const KEYROVE_ATTR_SKIP = DEFAULT_ATTRIBUTES.skip;
export const KEYROVE_ATTR_ROOT = DEFAULT_ATTRIBUTES.root;
export const KEYROVE_ATTR_NEXT_KEY = DEFAULT_ATTRIBUTES.nextKey;
export const KEYROVE_ATTR_PREV_KEY = DEFAULT_ATTRIBUTES.prevKey;
export const KEYROVE_ATTR_NEXT_ROW_KEY = DEFAULT_ATTRIBUTES.nextRowKey;
export const KEYROVE_ATTR_PREV_ROW_KEY = DEFAULT_ATTRIBUTES.prevRowKey;
export const KEYROVE_ATTR_HOME_KEY = DEFAULT_ATTRIBUTES.homeKey;
export const KEYROVE_ATTR_END_KEY = DEFAULT_ATTRIBUTES.endKey;
export const KEYROVE_ATTR_HOME_ROW_KEY = DEFAULT_ATTRIBUTES.homeRowKey;
export const KEYROVE_ATTR_END_ROW_KEY = DEFAULT_ATTRIBUTES.endRowKey;
export const KEYROVE_ATTR_PAGE_UP_KEY = DEFAULT_ATTRIBUTES.pageUpKey;
export const KEYROVE_ATTR_PAGE_DOWN_KEY = DEFAULT_ATTRIBUTES.pageDownKey;
export const KEYROVE_ATTR_FOCUS_KEY = DEFAULT_ATTRIBUTES.focusKey;
export const KEYROVE_ATTR_PAGE_LENGTH = DEFAULT_ATTRIBUTES.pageLength;
export const KEYROVE_ATTR_COLS = DEFAULT_ATTRIBUTES.cols;
export const KEYROVE_ATTR_ROVING_TABINDEX = DEFAULT_ATTRIBUTES.rovingTabindex;
export const KEYROVE_ATTR_LOOP = DEFAULT_ATTRIBUTES.loop;
export const KEYROVE_ATTR_ORIENTATION = DEFAULT_ATTRIBUTES.orientation;
export const KEYROVE_ATTR_TYPEAHEAD = DEFAULT_ATTRIBUTES.typeahead;

// Reading direction for an inline axis. The nearest `dir` attribute
// decides, mirroring how the DOM resolves direction (and working in jsdom,
// which has no layout); `dir="auto"` — content-dependent, so only the
// browser can resolve it — and a missing attribute fall through to the
// computed style, guarded for environments without `getComputedStyle`.
const isRtl = (root: Element): boolean => {
  const dir = root.closest('[dir]')?.getAttribute('dir')?.toLowerCase();

  if (dir === 'rtl' || dir === 'ltr') return dir === 'rtl';

  return (
    typeof getComputedStyle !== 'undefined' &&
    getComputedStyle(root).direction === 'rtl'
  );
};

/**
 * Reads the group's layout off its root. A list is one column; `cols` above 1
 * makes a grid, which has no orientation of its own — its `next`/`prev` axis is
 * sideways by nature — and never wraps, per the APG grid pattern.
 */
const readLayout = (root: Element, attributes: Attributes): Layout => {
  const cols = parseAttributeInt(root, attributes.cols, 1);

  if (cols > 1) return { kind: 'grid', cols, horizontal: true, loop: false };

  return {
    kind: 'list',
    cols: 1,
    // `orientation="horizontal"` redirects only the *default* keys — an
    // explicit binding still wins in the table. Nothing but the literal value
    // "horizontal" switches anything.
    horizontal: root.getAttribute(attributes.orientation) === 'horizontal',
    // Presence-based (`hasAttribute`), so the bare `data-keyrove-loop`
    // spelling works; `getAttribute` truthiness would read it as "" and
    // silently disable it.
    loop: root.hasAttribute(attributes.loop),
  };
};

/**
 * The combos bound on the root, one per move — `null` where the attribute is
 * unset and the move keeps its default key. Read unfiltered: the binding table
 * consults only the moves its layout has, so a row key set on a list is never
 * looked at.
 */
const readExplicitBindings = (
  root: Element,
  attributes: Attributes,
): Required<ExplicitBindings> => ({
  next: root.getAttribute(attributes.nextKey),
  prev: root.getAttribute(attributes.prevKey),
  nextRow: root.getAttribute(attributes.nextRowKey),
  prevRow: root.getAttribute(attributes.prevRowKey),
  home: root.getAttribute(attributes.homeKey),
  end: root.getAttribute(attributes.endKey),
  homeRow: root.getAttribute(attributes.homeRowKey),
  endRow: root.getAttribute(attributes.endRowKey),
  pageUp: root.getAttribute(attributes.pageUpKey),
  pageDown: root.getAttribute(attributes.pageDownKey),
});

/**
 * The focus keys in reach of a keypress: every navigable item under `scope`
 * that names one, in DOM order. Skipped and disabled items are not
 * destinations, so theirs are not read — the key falls through as though it
 * were undeclared.
 */
const readFocusKeys = (scope: Element, attributes: Attributes): FocusKey[] =>
  Array.from(
    scope.querySelectorAll(
      `[${attributes.item}][${attributes.focusKey}]:not([disabled]):not([${attributes.skip}])`,
    ),
  ).map((target) => ({
    combo: target.getAttribute(attributes.focusKey) ?? '',
    target,
  }));

/**
 * Handles keyboard navigation within the provided event's current target.
 * @param e - The keydown event, native or framework-synthetic.
 * @param options.onMove - Fired after focus moved — only when it actually did.
 * @returns `null` when the key was left untouched; `{ action, from, to }` when
 * it was consumed, with `to: null` for a consumed no-op at an edge. A non-null
 * result means the key is claimed, so handlers chain with `||`:
 * `keyRove(e) || myOwnHandler(e)`.
 */
export const keyRove = (
  e: KeyRoveEvent,
  { onMove }: Options = {},
): MoveResult | null => {
  const attributes = DEFAULT_ATTRIBUTES;
  const eventTarget = e.target as Element | null;
  const editable = isEditableTarget(eventTarget);

  // Typing. An editable target keeps every press that could be text or caret
  // movement, and nothing keyrove binds fires from one without a command
  // modifier — so there is nothing to look up.
  if (editable && !hasCommandModifier(e)) return null;

  const root = resolveRoot(eventTarget, e.currentTarget);

  if (!root) return null;

  // A move is relative to the root focus is in; a focus key names its item
  // outright and is heard as far as the listener reaches — across sibling
  // groups and out of nested roots — so its lookup spans the listener's
  // element, not the root.
  const scope = listenerElement(e.currentTarget) ?? root;
  const layout = readLayout(root, attributes);

  // First match wins: one keypress resolves to at most one action, and the
  // table's order is the precedence — an item's own key over the root's
  // explicit bindings over the defaults.
  const binding = buildBindings({
    explicit: readExplicitBindings(root, attributes),
    focus: readFocusKeys(scope, attributes),
    layout,
    rtl: () => isRtl(root),
  }).find(({ combo }) => matchesCombo(e, combo));

  if (!binding) return null;

  // A chorded press from inside a field reaches only a focus key, which points
  // out of the field. A move keeps the caret's keys however it is bound.
  if (editable && binding.intent !== 'focus') return null;

  // A focus row's move happens in its target's own group — the nearest root
  // above the item, else the listener's element — so `from` is the sibling
  // holding focus, the roving stop stays within one group, and a key pressed
  // while focus is already inside its item is a consumed no-op. The search
  // starts at the item's *parent*: a panel is often itself the root of the
  // list inside it, and its group is the one above.
  const group =
    binding.intent === 'focus'
      ? (resolveRoot(binding.target.parentElement, scope) ?? scope)
      : root;
  const { items: elements, focused } = readGroup(group);

  // Most moves only act once focus is genuinely inside an item, whatever key
  // they are bound to: they move *within* a group, they are not a way into
  // one. The directional moves deliberately are — which is how a group is
  // entered from the keyboard — and so is a focus key, which is the point.
  if (!focused && !binding.enters) return null;

  const target =
    binding.intent === 'focus'
      ? binding.target
      : resolveTarget({
          intent: binding.intent,
          elements,
          fromIndex: focused ? elements.indexOf(focused) : -1,
          layout,
          pageLength: parseAttributeInt(root, attributes.pageLength, 10),
          skipAttribute: attributes.skip,
        });

  // With neither a target nor a focused item, keyrove has nothing to move
  // from or to and the key is left with its browser default rather than
  // being swallowed. Past this line the press is ours: it resolves a target,
  // or focus already sits inside the group and the move has nowhere to go (an
  // edge) — the group owns its bound keys up to its own boundary.
  if (!target && !focused) return null;

  return moveFocus({
    e,
    action: binding.intent,
    from: focused,
    to: target,
    onMove,
  });
};
