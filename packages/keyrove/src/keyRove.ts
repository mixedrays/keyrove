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
  // Otherwise a keyRove further up would read the focus just moved, and move
  // again. Propagation is left alone for listeners that only observe.
  if (e.defaultPrevented) return null;

  // Mid-composition, arrows walk the IME's candidate list, and a chorded focus
  // key must not tear focus out of a half-converted word.
  if (e.isComposing) return null;

  const eventTarget = e.target as Element | null;
  const editable = isEditablePress(e);

  // Without a command modifier, nothing keyrove binds fires from a field.
  if (editable && !hasCommandModifier(e)) return null;

  const groups = readGroups(options);
  const pressed = groups.at(eventTarget, e.currentTarget);

  if (!pressed) return null;

  // Focus keys are heard as far as the listener reaches, across sibling
  // groups and out of nested roots.
  const scope = listenerElement(e.currentTarget) ?? pressed.root;
  const config = readConfig(pressed, options);
  const { onMove } = options;

  const binding = findBinding(e, {
    explicit: config.explicit,
    focus: readFocusKeys(scope, options),
    layout: () => config.layout,
    rtl: config.rtl,
  });

  if (!binding) return null;

  // From a field only a focus key fires; moves leave the caret's keys alone.
  if (editable && binding.intent !== 'focus') return null;

  // The group *around* the target: a panel is often itself the root of the
  // list inside it.
  const group =
    binding.intent === 'focus'
      ? (groups.around(binding.target, scope) ?? groups.of(scope))
      : pressed;
  const { items: elements, focused } = group;

  // A non-item target has no sibling to report as `from` or take the stop
  // from. Focus already inside it makes the move a consumed no-op.
  if (binding.intent === 'focus' && !elements.includes(binding.target)) {
    return group.move({
      e,
      action: 'focus',
      from: holdsFocus(binding.target) ? binding.target : null,
      to: binding.target,
      onMove,
    });
  }

  // Claims its key only where there is somewhere to go: Escape and Enter are
  // otherwise the page's.
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

  // Only directional moves and focus keys enter a group from outside.
  if (!focused && !binding.enters) return null;

  // One destination, so no walk to carry on if it refuses focus.
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

  // Past here the press is ours, even at an edge: the group owns its bound
  // keys up to its boundary.
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
