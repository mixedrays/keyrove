// A factory so the buffer lives in a closure and `keyRove` stays stateless.
// `Date.now()` per press instead of a timer leaves nothing to clean up.

import { KEYROVE_ATTR_TYPEAHEAD } from './attributes.js';
import { readGroups, walkOn } from './group.js';
import { hasCommandModifier, isEditablePress } from './utils.js';
import type {
  KeyRoveEvent,
  TypeaheadOptions,
  TypeaheadResult,
} from './types.js';

// `||`, not `??`: an empty reading falls through instead of making the item
// unmatchable. Whitespace collapses as rendered, so wrapped labels match.
const getLabel = (item: Element, label?: (item: Element) => string) =>
  label?.(item) ||
  item.getAttribute(KEYROVE_ATTR_TYPEAHEAD) ||
  item.textContent?.replace(/\s+/g, ' ').trim() ||
  '';

// Lower-cased before NFD, since lower-casing can add a mark: "İ" becomes "i"
// plus a dot above. Letters with no decomposition (ø, ł, ß) stay.
const lowerCase = (text: string) => text.toLowerCase();
const foldMarks = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

/**
 * Creates a keydown handler that focuses items as their labels are typed.
 *
 * Printable characters accumulate in a buffer (reset after `resetMs` of
 * silence), and focus moves to the first navigable item whose label — the
 * `label` option, falling back to the `data-keyrove-typeahead` attribute and
 * then to trimmed `textContent` — starts with it, ignoring case and, by
 * default, accents and other combining marks. Typing inside editable elements
 * is never captured, modified presses (Ctrl/Alt/Meta, unless AltGr is held)
 * are left to their shortcuts, and a press an earlier handler already claimed
 * with `preventDefault()` is left alone, buffer included. In `cycle` mode a
 * single character moves to the next match after the focused item instead,
 * wrapping, and repeating it cycles through those matches rather than growing
 * the buffer.
 *
 * The group settings (`items`, `root`, `skip`, `rovingTabindex`) are the same
 * as `keyRove`'s, so one object can configure both handlers.
 * @param options.label - The text an item is matched by.
 * @param options.resetMs - Buffer lifetime between keystrokes. Default 500.
 * @param options.matchMode - Whether repeated characters extend the prefix
 * (`'prefix'`) or cycle through its matches (`'cycle'`). Default `'prefix'`.
 * @param options.foldDiacritics - Whether accents and other combining marks
 * are ignored on both sides, so "e" matches "Émilie". Default `true`.
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
  foldDiacritics = true,
  onMove,
  ...settings
}: TypeaheadOptions = {}) => {
  const fold = foldDiacritics ? foldMarks : lowerCase;

  const groups = readGroups(settings);
  let buffer = '';
  let lastPressTime = 0;
  let lastRoot: Element | null = null;

  return (e: KeyRoveEvent): TypeaheadResult | null => {
    if (e.defaultPrevented) return null;

    // Printable keys have a one-character `key`; "ArrowDown", "F6" don't.
    if (e.key?.length !== 1 || hasCommandModifier(e)) return null;

    if (isEditablePress(e)) return null;

    const group = groups.at(e.target as Element | null, e.currentTarget);

    if (!group) return null;

    const { root } = group;

    // Reset before the leading-space guard, so a stale buffer can't make a
    // fresh space look mid-match. One listener may serve several groups.
    const now = Date.now();

    if (root !== lastRoot || now - lastPressTime > resetMs) buffer = '';

    lastRoot = root;

    // A leading space scrolls and activates buttons; mid-buffer it types on.
    if (e.key === ' ' && !buffer) return null;

    // A lone combining mark folds to nothing, which would match every label.
    const character = fold(e.key);

    if (!character) return null;

    lastPressTime = now;

    if (matchMode !== 'cycle' || buffer !== character) buffer += character;

    const { items, focused } = group;

    const start =
      matchMode === 'cycle' && buffer.length === 1 && focused
        ? items.indexOf(focused) + 1
        : 0;
    const rotation = [...items.slice(start), ...items.slice(0, start)];
    const { to: target, retarget } = walkOn(function* (
      isNavigable,
    ): Generator<Element, undefined> {
      for (const item of rotation) {
        if (
          isNavigable(item) &&
          fold(getLabel(item, label)).startsWith(buffer)
        ) {
          yield item;
        }
      }
    }, group.isNavigable);

    // The character stays buffered, so a mistyped prefix goes quiet until
    // the reset.
    if (!target) return null;

    return group.move({
      e,
      action: 'typeahead',
      from: focused,
      to: target,
      retarget,
      onMove,
    });
  };
};
