import { findBinding } from './bindings.js';
import { crossBoundary } from './boundary.js';
import { readConfig, readFocusKeys } from './config.js';
import { holdsFocus, readGroups, walkOn } from './group.js';
import { listenerElement } from './nesting.js';
import { walkTargets } from './position.js';
import { hasCommandModifier, isEditablePress } from './utils.js';
import type { KeyRoveEvent, KeyRoveOptions, MoveResult } from './types.js';

/**
 * Handles keyboard navigation within the provided event's current target.
 * @param e - The keydown event, native or framework-synthetic.
 * @param options - The group's settings, where you would rather name them here
 * than in markup, and `onMove`. Every setting falls back on its own to the
 * `data-keyrove-*` attribute it stands for, so passing none navigates a
 * marked-up group exactly as before; see {@link KeyRoveOptions}.
 * @param options.onMove - Fired after focus moved — only when it actually did.
 * @returns `null` when the key was left untouched, which includes a press an
 * earlier handler already claimed with `preventDefault()`; `{ action, from,
 * to }` when it was consumed, with `to: null` for a consumed no-op at an edge.
 * A non-null result means the key is claimed, so handlers chain with `||`:
 * `keyRove(e) || myOwnHandler(e)`.
 */
export const keyRove = (
  e: KeyRoveEvent,
  options: KeyRoveOptions = {},
): MoveResult | null => {
  // A press another handler has claimed is spent: a keyRove further up the
  // tree would otherwise read the focus the first one just moved, and move
  // again. Propagation is left alone for listeners that only observe.
  if (e.defaultPrevented) return null;

  // Mid-composition, every press belongs to the input method: arrows walk its
  // candidate list and a chord can be part of the conversion. Composition
  // happens only in an editable host, so past the typing guard below this
  // reaches just the chorded focus key — which must not tear focus out of a
  // half-converted word.
  if (e.isComposing) return null;

  // A press from a field inside a shadow root reaches a listener outside it
  // retargeted to the host, so the guard reads where the press began; the
  // group is still found from the host, in the listener's own tree.
  const eventTarget = e.target as Element | null;
  const editable = isEditablePress(e);

  // Typing. An editable target keeps every press that could be text or caret
  // movement, and nothing keyrove binds fires from one without a command
  // modifier — so there is nothing to look up.
  if (editable && !hasCommandModifier(e)) return null;

  // The group is resolved before anything else is read: its root is what the
  // rest of the settings are read off.
  const groups = readGroups(options);
  const pressed = groups.at(eventTarget, e.currentTarget);

  if (!pressed) return null;

  // A move is relative to the root focus is in; a focus key names its element
  // outright and is heard as far as the listener reaches — across sibling
  // groups and out of nested roots — so its lookup spans the listener's
  // element, not the root.
  const scope = listenerElement(e.currentTarget) ?? pressed.root;
  const config = readConfig(pressed, options);
  const { onMove } = options;

  // First match wins: one keypress resolves to at most one action, and the
  // table's order is the precedence — an element's own key over the explicit
  // bindings over the defaults. The layout is read only for a press that
  // could be a move, so a key nothing binds never reads the page's layout.
  const binding = findBinding(e, {
    explicit: config.explicit,
    focus: readFocusKeys(scope, options),
    layout: () => config.layout,
    rtl: config.rtl,
  });

  if (!binding) return null;

  // A chorded press from inside a field reaches only a focus key, which points
  // out of the field. A move keeps the caret's keys however it is bound.
  if (editable && binding.intent !== 'focus') return null;

  // An item's focus row moves in the item's own group — the nearest root above
  // it, else the listener's element — so `from` is the sibling holding focus,
  // the roving stop stays within one group, and a key pressed while focus is
  // already inside its item is a consumed no-op. It is the group *around* the
  // item: a panel is often itself the root of the list inside it, and its
  // group is the one above. An element outside the listener's reach — one
  // `focusKeys` names outright — is in no group of keyrove's.
  const group =
    binding.intent === 'focus'
      ? (groups.around(binding.target, scope) ?? groups.of(scope))
      : pressed;
  const { items: elements, focused } = group;

  // A focus key on an element that is none of that group's items names a
  // destination in no group: there is no sibling to report as `from` or to
  // take the roving stop from. Focus inside the element already makes `from`
  // the element itself — the same consumed no-op an item's key makes.
  if (binding.intent === 'focus' && !elements.includes(binding.target)) {
    return group.move({
      e,
      action: 'focus',
      from: holdsFocus(binding.target) ? binding.target : null,
      to: binding.target,
      onMove,
    });
  }

  // A boundary move lands in the group next to this one — around it, or
  // nested in the focused item — and it is that group's stop that moves. It
  // claims its key only where there is somewhere to go: the keys it suits,
  // Escape and Enter, are otherwise the page's.
  if (binding.intent === 'exit' || binding.intent === 'enter') {
    const crossing = crossBoundary(binding.intent, groups, group, scope);

    if (!crossing) return null;

    return crossing.group.cross({
      e,
      action: binding.intent,
      from: focused,
      to: crossing.to,
      onMove,
    });
  }

  // Most moves only act once focus is genuinely inside an item, whatever key
  // they are bound to: they move *within* a group, they are not a way into
  // one. The directional moves deliberately are — which is how a group is
  // entered from the keyboard — and so is a focus key, which is the point.
  if (!focused && !binding.enters) return null;

  // A focus key names its element outright: one destination, and no walk to
  // carry on should it refuse focus.
  if (binding.intent === 'focus') {
    return group.move({
      e,
      action: 'focus',
      from: focused,
      to: binding.target,
      onMove,
    });
  }

  const { intent } = binding;
  const fromIndex = focused ? elements.indexOf(focused) : -1;
  // The move's walk: its destination by the group's navigable test, and the
  // rest of it to carry on past each item that refuses focus.
  const { to: target, retarget } = walkOn(
    (isNavigable) =>
      walkTargets({
        intent,
        elements,
        fromIndex,
        layout: config.layout,
        pageLength: config.pageLength,
        isNavigable,
      }),
    group.isNavigable,
  );

  // With neither a target nor a focused item, keyrove has nothing to move
  // from or to and the key is left with its browser default rather than
  // being swallowed. Past this line the press is ours: it resolves a target,
  // or focus already sits inside the group and the move has nowhere to go (an
  // edge) — the group owns its bound keys up to its own boundary.
  if (!target && !focused) return null;

  return group.move({
    e,
    action: intent,
    from: focused,
    to: target,
    retarget,
    onMove,
  });
};
