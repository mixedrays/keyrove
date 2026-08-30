/**
 * Type-to-focus for keyrove groups.
 *
 * A factory rather than a plain handler on purpose: typeahead is stateful by
 * nature — the character buffer and its reset clock live in the returned
 * closure — and keeping that state here keeps `keyRove` itself stateless
 * per event. Timing is compared against `Date.now()` on each press instead
 * of running a timer, so the handler owns no lifecycle to clean up.
 */

import { isEditableTarget, toggleTabIndex } from './utils.js';
import {
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_ROVING_TABINDEX,
  KEYROVE_ATTR_SKIP,
  KEYROVE_ATTR_TYPEAHEAD,
} from './keyRove.js';
import type {
  KeyRoveEvent,
  TypeaheadOptions,
  TypeaheadResult,
} from './types.js';

// `||` rather than `??`, so a bare or empty attribute falls back to the text
// instead of making the item silently unmatchable — the same trap as reading
// bare `data-keyrove-roving-tabindex` via `getAttribute` truthiness. The text
// collapses interior whitespace the way rendering does, so a label split
// across source lines still matches the single spaces a user types.
const getLabel = (item: Element) =>
  item.getAttribute(KEYROVE_ATTR_TYPEAHEAD) ||
  item.textContent?.replace(/\s+/g, ' ').trim() ||
  '';

/**
 * Creates a keydown handler that focuses items as their labels are typed.
 *
 * Printable characters accumulate in a buffer (reset after `resetMs` of
 * silence), and focus moves to the first navigable item whose label — the
 * `data-keyrove-typeahead` attribute, falling back to trimmed `textContent`
 * — starts with it, case-insensitively. Typing inside editable elements is
 * never captured, and modified presses (Ctrl/Alt/Meta) are left to their
 * shortcuts.
 * @param options.resetMs - Buffer lifetime between keystrokes. Default 500.
 * @param options.onMove - Fired after focus moved — only when it actually did.
 * @returns A handler with the `keyRove` contract: `null` when the key was
 * left untouched; `{ action: 'typeahead', from, to }` when it was consumed,
 * with `to: null` when the match is the item already focused. Chain it after
 * navigation so bound keys win: `keyRove(e) || typeahead(e)`.
 */
export const createTypeahead = ({
  resetMs = 500,
  onMove,
}: TypeaheadOptions = {}) => {
  let buffer = '';
  let lastPressTime = 0;
  let lastRoot: Element | null = null;

  return (e: KeyRoveEvent): TypeaheadResult | null => {
    // A single-character `key` is the produced character itself — exactly the
    // printable keys. Navigation and function keys ("ArrowDown", "F6") are
    // longer names, and an event without `key` cannot typeahead at all.
    // Ctrl/Alt/Meta presses are shortcuts, not typing (Shift stays: it is how
    // capitals are typed).
    if (e.key?.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return null;

    const eventTarget = e.target as Element | null;

    if (isEditableTarget(eventTarget)) return null;

    const closestRoot = eventTarget?.closest?.(`[${KEYROVE_ATTR_ROOT}]`);
    const root = (closestRoot || e.currentTarget) as Element | null;

    if (!root) return null;

    // The buffer expires with silence and never survives a change of group —
    // one delegated listener may serve several. Both are resolved *before*
    // the leading-space guard below, so a stale buffer cannot make a fresh
    // space look mid-match.
    const now = Date.now();

    if (root !== lastRoot || now - lastPressTime > resetMs) buffer = '';

    lastRoot = root;

    // A leading space is never captured — it scrolls the page and activates
    // buttons. Mid-buffer it types on, so multi-word labels stay reachable.
    if (e.key === ' ' && !buffer) return null;

    lastPressTime = now;
    buffer += e.key.toLowerCase();

    const items = Array.from(
      root.querySelectorAll(`[${KEYROVE_ATTR_ITEM}]:not([disabled])`),
    );
    const target = items.find(
      (item) =>
        !item.hasAttribute(KEYROVE_ATTR_SKIP) &&
        getLabel(item).toLowerCase().startsWith(buffer),
    );

    // No match leaves the key untouched — the character still joined the
    // buffer, so a mistyped prefix goes quiet until the reset clears it.
    if (!target) return null;

    e.preventDefault();

    const focused = root.querySelector(`[${KEYROVE_ATTR_ITEM}]:focus-within`);

    // The buffer grew but still names the focused item: consumed, no move,
    // matching keyRove's edge no-ops.
    if (target === focused) {
      return { action: 'typeahead', from: focused, to: null };
    }

    if (focused?.hasAttribute(KEYROVE_ATTR_ROVING_TABINDEX)) {
      toggleTabIndex({ root: focused, isActive: false });
      toggleTabIndex({ root: target, isActive: true });
    }

    (target as HTMLElement).focus();

    const move = { action: 'typeahead' as const, from: focused, to: target };
    onMove?.(move);

    return move;
  };
};
