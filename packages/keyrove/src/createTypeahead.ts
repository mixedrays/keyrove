/**
 * Type-to-focus for keyrove groups.
 *
 * A factory rather than a plain handler on purpose: typeahead is stateful by
 * nature — the character buffer and its reset clock live in the returned
 * closure — and keeping that state here keeps `keyRove` itself stateless
 * per event. Timing is compared against `Date.now()` on each press instead
 * of running a timer, so the handler owns no lifecycle to clean up.
 */

import { KEYROVE_ATTR_TYPEAHEAD } from './attributes.js';
import { itemsReader, rootTest, skipTest, rovingTest } from './config.js';
import { moveFocus, readGroup, resolveRoot } from './group.js';
import { hasCommandModifier, isEditableTarget } from './utils.js';
import type {
  KeyRoveEvent,
  TypeaheadOptions,
  TypeaheadResult,
} from './types.js';

// `||` rather than `??` throughout, so a reading that comes back empty falls
// to the next instead of making the item silently unmatchable — a `label` with
// nothing to say about this item, or a bare attribute, the same trap as
// reading bare `data-keyrove-roving-tabindex` via `getAttribute` truthiness.
// The text collapses interior whitespace the way rendering does, so a label
// split across source lines still matches the single spaces a user types.
const getLabel = (item: Element, label?: (item: Element) => string) =>
  label?.(item) ||
  item.getAttribute(KEYROVE_ATTR_TYPEAHEAD) ||
  item.textContent?.replace(/\s+/g, ' ').trim() ||
  '';

/**
 * Creates a keydown handler that focuses items as their labels are typed.
 *
 * Printable characters accumulate in a buffer (reset after `resetMs` of
 * silence), and focus moves to the first navigable item whose label — the
 * `label` option, falling back to the `data-keyrove-typeahead` attribute and
 * then to trimmed `textContent` — starts with it, case-insensitively. Typing
 * inside editable elements is never captured, and modified presses
 * (Ctrl/Alt/Meta) are left to their shortcuts. In `cycle` mode a single
 * character moves to the next match after the focused item instead, wrapping,
 * and repeating it cycles through those matches rather than growing the
 * buffer.
 *
 * Which elements are items, which of them are passed over, what scopes a group
 * and whether it carries one tab stop are settings of the group rather than of
 * typeahead: they are named here exactly as they are for `keyRove`, and fall
 * back to the same attributes, so one object can configure both handlers.
 * @param options.label - The text an item is matched by.
 * @param options.resetMs - Buffer lifetime between keystrokes. Default 500.
 * @param options.matchMode - Whether repeated characters extend the prefix
 * (`'prefix'`) or cycle through its matches (`'cycle'`). Default `'prefix'`.
 * @param options.onMove - Fired after focus moved — only when it actually did.
 * @returns A handler with the `keyRove` contract: `null` when the key was
 * left untouched; `{ action: 'typeahead', from, to }` when it was consumed,
 * with `to: null` when the match is the item already focused. Chain it after
 * navigation so bound keys win: `keyRove(e) || typeahead(e)`.
 */
export const createTypeahead = ({
  label,
  resetMs = 500,
  matchMode = 'prefix',
  onMove,
  ...group
}: TypeaheadOptions = {}) => {
  // The group's settings cannot change for the life of the handler, so they
  // are resolved once here rather than on every keystroke.
  const isRoot = rootTest(group);
  const readItems = itemsReader(group);
  const isSkipped = skipTest(group);
  const isRoving = rovingTest(group);
  let buffer = '';
  let lastPressTime = 0;
  let lastRoot: Element | null = null;

  return (e: KeyRoveEvent): TypeaheadResult | null => {
    // A single-character `key` is the produced character itself — exactly the
    // printable keys. Navigation and function keys ("ArrowDown", "F6") are
    // longer names, and an event without `key` cannot typeahead at all. A
    // command modifier makes a press a shortcut, not typing (Shift stays: it
    // is how capitals are typed).
    if (e.key?.length !== 1 || hasCommandModifier(e)) return null;

    const eventTarget = e.target as Element | null;

    if (isEditableTarget(eventTarget)) return null;

    const root = resolveRoot(eventTarget, e.currentTarget, isRoot);

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
    const character = e.key.toLowerCase();

    // Cycling keeps a repeated character a one-character prefix instead of
    // growing the buffer, so "s", "s" goes on naming the S items.
    if (matchMode !== 'cycle' || buffer !== character) buffer += character;

    const { items, focused } = readGroup(root, readItems);

    // A one-character prefix in cycle mode searches from just past the focused
    // item and wraps, so every press — fresh or repeated, quick or slow — lands
    // on the next match, counted in DOM order even when focus sits on an item
    // that does not match. Longer prefixes, and prefix mode, match from the top.
    const start =
      matchMode === 'cycle' && buffer.length === 1 && focused
        ? items.indexOf(focused) + 1
        : 0;
    const target = [...items.slice(start), ...items.slice(0, start)].find(
      (item) =>
        !isSkipped(item) &&
        getLabel(item, label).toLowerCase().startsWith(buffer),
    );

    // No match leaves the key untouched — the character still joined the
    // buffer, so a mistyped prefix goes quiet until the reset clears it.
    if (!target) return null;

    // A match that is the focused item already is a consumed no-op, matching
    // keyRove's edge no-ops; otherwise the roving stop moves with focus.
    return moveFocus({
      e,
      action: 'typeahead',
      from: focused,
      to: target,
      isRoving,
      onMove,
    });
  };
};
