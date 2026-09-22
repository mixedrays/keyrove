import { buildBindings } from './bindings.js';
import { crossBoundary } from './boundary.js';
import { readConfig, readFocusKeys, rootTest } from './config.js';
import {
  attributeRoot,
  holdsFocus,
  listenerElement,
  moveFocus,
  readGroup,
  resolveRoot,
} from './group.js';
import { resolveTarget } from './position.js';
import { hasCommandModifier, isEditableTarget, matchesCombo } from './utils.js';
import type { KeyRoveEvent, MoveResult, Options } from './types.js';

// The attribute constants ship alongside the handler that reads them, so
// consumers can spread them into markup; see `attributes.ts`.
export * from './attributes.js';

/**
 * Handles keyboard navigation within the provided event's current target.
 * @param e - The keydown event, native or framework-synthetic.
 * @param options - The group's settings, where you would rather name them here
 * than in markup, and `onMove`. Every setting falls back on its own to the
 * `data-keyrove-*` attribute it stands for, so passing none navigates a
 * marked-up group exactly as before; see {@link Options}.
 * @param options.onMove - Fired after focus moved — only when it actually did.
 * @returns `null` when the key was left untouched; `{ action, from, to }` when
 * it was consumed, with `to: null` for a consumed no-op at an edge. A non-null
 * result means the key is claimed, so handlers chain with `||`:
 * `keyRove(e) || myOwnHandler(e)`.
 */
export const keyRove = (
  e: KeyRoveEvent,
  options: Options = {},
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

  // What marks a root is the one setting read before the root is known: it is
  // what finds it.
  const isRoot = rootTest(options);
  const root = resolveRoot(eventTarget, e.currentTarget, isRoot);

  if (!root) return null;

  // A move is relative to the root focus is in; a focus key names its element
  // outright and is heard as far as the listener reaches — across sibling
  // groups and out of nested roots — so its lookup spans the listener's
  // element, not the root.
  const scope = listenerElement(e.currentTarget) ?? root;
  const config = readConfig(root, options);
  const { onMove } = options;

  // First match wins: one keypress resolves to at most one action, and the
  // table's order is the precedence — an element's own key over the explicit
  // bindings over the defaults.
  const binding = buildBindings({
    explicit: config.explicit,
    focus: readFocusKeys(scope, options),
    layout: config.layout,
    rtl: config.rtl,
  }).find(({ combo }) => matchesCombo(e, combo));

  if (!binding) return null;

  // A chorded press from inside a field reaches only a focus key, which points
  // out of the field. A move keeps the caret's keys however it is bound.
  if (editable && binding.intent !== 'focus') return null;

  // An item's focus row moves in the item's own group — the nearest root above
  // it, else the listener's element — so `from` is the sibling holding focus,
  // the roving stop stays within one group, and a key pressed while focus is
  // already inside its item is a consumed no-op. The search starts at the
  // item's *parent*: a panel is often itself the root of the list inside it,
  // and its group is the one above.
  const group =
    binding.intent === 'focus'
      ? (resolveRoot(binding.target.parentElement, scope, isRoot) ?? scope)
      : root;
  const { items: elements, focused } = readGroup(group, config.readItems);

  // A focus key on an element that is none of that group's items names a
  // destination in no group: there is no sibling to report as `from` or to
  // take the roving stop from. Focus inside the element already makes `from`
  // the element itself — the same consumed no-op an item's key makes.
  if (binding.intent === 'focus' && !elements.includes(binding.target)) {
    return moveFocus({
      e,
      action: 'focus',
      from: holdsFocus(binding.target) ? binding.target : null,
      to: binding.target,
      isRoving: config.isRoving,
      onMove,
    });
  }

  // A boundary move lands in the group next to this one — around it, or
  // nested in the focused item — and it is that group's stop that moves. It
  // claims its key only where there is somewhere to go: the keys it suits,
  // Escape and Enter, are otherwise the page's.
  if (binding.intent === 'exit' || binding.intent === 'enter') {
    const crossing = crossBoundary(
      binding.intent,
      root,
      scope,
      focused,
      config,
      isRoot ?? attributeRoot,
    );

    if (!crossing) return null;

    return moveFocus({
      e,
      action: binding.intent,
      from: focused,
      to: crossing.to,
      isRoving: config.isRoving,
      stopFrom: crossing.stopFrom,
      onMove,
    });
  }

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
          layout: config.layout,
          pageLength: config.pageLength,
          isSkipped: config.isSkipped,
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
    isRoving: config.isRoving,
    onMove,
  });
};
