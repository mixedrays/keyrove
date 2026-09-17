import {
  KEYROVE_ATTR_COLS,
  KEYROVE_ATTR_FOCUS_KEY,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_LOOP,
  KEYROVE_ATTR_ORIENTATION,
  KEYROVE_ATTR_PAGE_LENGTH,
  KEYROVE_ATTR_SKIP,
} from './attributes.js';
import { buildBindings } from './bindings.js';
import { listenerElement, moveFocus, readGroup, resolveRoot } from './group.js';
import { resolveTarget } from './position.js';
import {
  hasCommandModifier,
  hasEnabledAttribute,
  isEditableTarget,
  matchesCombo,
  parseAttributeInt,
} from './utils.js';
import type {
  ExplicitBinding,
  FocusKey,
  KeyRoveEvent,
  Layout,
  MoveResult,
  Options,
} from './types.js';

// The attribute constants ship alongside the handler that reads them, so
// consumers can spread them into markup; see `attributes.ts`.
export * from './attributes.js';

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
const readLayout = (root: Element): Layout => {
  const cols = parseAttributeInt(root, KEYROVE_ATTR_COLS, 1);

  if (cols > 1) return { kind: 'grid', cols, horizontal: true, loop: false };

  return {
    kind: 'list',
    cols: 1,
    // `orientation="horizontal"` redirects only the *default* keys — an
    // explicit binding still wins in the table. Nothing but the literal value
    // "horizontal" switches anything.
    horizontal: root.getAttribute(KEYROVE_ATTR_ORIENTATION) === 'horizontal',
    loop: hasEnabledAttribute(root, KEYROVE_ATTR_LOOP),
  };
};

/**
 * The combo bound on the root for a move — `null` where the attribute is unset
 * and the move keeps its default key. Every move's attribute is named after
 * it, so the name is derived rather than listed: `nextRow` reads
 * `data-keyrove-next-row-key`, the value of `KEYROVE_ATTR_NEXT_ROW_KEY`. Read
 * on demand: the binding table asks only for the moves its layout has, so a
 * row key set on a list is never looked at.
 */
const readExplicitBinding =
  (root: Element): ExplicitBinding =>
  (intent) =>
    root.getAttribute(
      `data-keyrove-${intent.replace(/[A-Z]/g, '-$&').toLowerCase()}-key`,
    );

/**
 * The focus keys in reach of a keypress: every navigable item under `scope`
 * that names one, in DOM order. Skipped and disabled items are not
 * destinations, so theirs are not read — the key falls through as though it
 * were undeclared.
 */
const readFocusKeys = (scope: Element): FocusKey[] =>
  Array.from(
    scope.querySelectorAll(
      `[${KEYROVE_ATTR_ITEM}][${KEYROVE_ATTR_FOCUS_KEY}]:not([disabled])`,
    ),
  )
    .filter((target) => hasEnabledAttribute(target, KEYROVE_ATTR_ITEM))
    .filter((target) => !hasEnabledAttribute(target, KEYROVE_ATTR_SKIP))
    .map((target) => ({
      combo: target.getAttribute(KEYROVE_ATTR_FOCUS_KEY) ?? '',
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
  // Mid-composition, every press belongs to the input method: arrows walk its
  // candidate list and a chord can be part of the conversion. Composition
  // happens only in an editable host, so past the typing guard below this
  // reaches just the chorded focus key — which must not tear focus out of a
  // half-converted word.
  if (e.isComposing) return null;

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
  const layout = readLayout(root);

  // First match wins: one keypress resolves to at most one action, and the
  // table's order is the precedence — an item's own key over the root's
  // explicit bindings over the defaults.
  const binding = buildBindings({
    explicit: readExplicitBinding(root),
    focus: readFocusKeys(scope),
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
          pageLength: parseAttributeInt(root, KEYROVE_ATTR_PAGE_LENGTH, 10),
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
