/**
 * The group layer, shared by every handler.
 *
 * `keyRove` and `createTypeahead` resolve the same root, read the same items
 * and position off it, and end the same way: claim the key, land focus, carry
 * the roving tab stop, report. That tail *is* the result contract consumers
 * chain on with `||`, so it is spelled out once here — which keeps the two
 * handlers' promises identical and leaves a third one nothing to re-derive.
 */

import { DEFAULT_ATTRIBUTES } from './attributes.js';
import { toggleTabIndex } from './utils.js';
import type { ActionResult, Group, MoveFocusArgs } from './types.js';

/**
 * The element a listener sits on. A listener on the document, or the window,
 * has no element of its own, so the document element stands in: `<html>`
 * answers attribute reads and item queries like any root, with nothing set.
 */
export const listenerElement = (
  listener: EventTarget | null | undefined,
): Element | null => {
  if (!listener) return null;
  if ('documentElement' in listener) {
    return (listener as Document).documentElement;
  }
  if ('document' in listener) {
    return (listener as Window).document.documentElement;
  }

  return listener as Element;
};

/**
 * The root a keypress is navigated in: the nearest `data-keyrove-root` at or
 * above `target`, else the listener's element. Resolving from the *target*
 * rather than the listener is what lets one delegated listener serve several
 * groups, and lets a root nest inside another and still win while focus is in
 * it.
 */
export const resolveRoot = (
  target: Element | null | undefined,
  listener: EventTarget | null | undefined,
): Element | null =>
  target?.closest?.(`[${DEFAULT_ATTRIBUTES.root}]`) ||
  listenerElement(listener);

/**
 * What a root governs: its navigable items in DOM order, and the one holding
 * focus. An item counts as focused when focus is anywhere inside it
 * (`:focus-within`), so an item wrapping a control is still the position after
 * Tab lands on that control.
 */
export const readGroup = (root: Element): Group => ({
  items: Array.from(
    root.querySelectorAll(`[${DEFAULT_ATTRIBUTES.item}]:not([disabled])`),
  ),
  focused: root.querySelector(`[${DEFAULT_ATTRIBUTES.item}]:focus-within`),
});

/**
 * Claims the key and lands focus on `to`, reporting the move.
 *
 * Call it only once a handler has decided the press is its own:
 * `preventDefault` is unconditional here, because the group owns its keys up
 * to its own boundary and the page must not scroll instead. A missing `to`, or
 * one that is the focused item already, is a consumed no-op — focus and the
 * tab stop stay put, `onMove` stays quiet, and the result carries `to: null`.
 * Otherwise the roving tab stop follows when the item being left carries the
 * attribute, `to` is focused, and `onMove` fires with the move that happened.
 */
export const moveFocus = <Action extends string>({
  e,
  action,
  from,
  to,
  onMove,
}: MoveFocusArgs<Action>): ActionResult<Action> => {
  e.preventDefault();

  if (!to || to === from) return { action, from, to: null };

  // Presence-based, so the bare `data-keyrove-roving-tabindex` spelling works
  // — `getAttribute` would read it as "" and silently disable roving.
  if (from?.hasAttribute(DEFAULT_ATTRIBUTES.rovingTabindex)) {
    toggleTabIndex({ root: from, isActive: false });
    toggleTabIndex({ root: to, isActive: true });
  }

  (to as HTMLElement).focus();

  const move = { action, from, to };
  onMove?.(move);

  return move;
};
