/**
 * Attribute names keyrove reads from the DOM, one constant per attribute.
 *
 * Flat constants rather than a map keyed by role, for the bundle: a bundler
 * drops the constants a build never reads, and a minifier renames a constant
 * but never an object key, so a map would ship every name and every key to
 * every consumer. These are public surface — `keyRove.ts` re-exports them —
 * and have a module of their own so the group layer and the typeahead handler
 * can read them without importing the handler.
 */
export const KEYROVE_ATTR_ITEM = 'data-keyrove-item';
export const KEYROVE_ATTR_SKIP = 'data-keyrove-skip';
export const KEYROVE_ATTR_ROOT = 'data-keyrove-root';
export const KEYROVE_ATTR_NEXT_KEY = 'data-keyrove-next-key';
export const KEYROVE_ATTR_PREV_KEY = 'data-keyrove-prev-key';
export const KEYROVE_ATTR_NEXT_ROW_KEY = 'data-keyrove-next-row-key';
export const KEYROVE_ATTR_PREV_ROW_KEY = 'data-keyrove-prev-row-key';
export const KEYROVE_ATTR_HOME_KEY = 'data-keyrove-home-key';
export const KEYROVE_ATTR_END_KEY = 'data-keyrove-end-key';
export const KEYROVE_ATTR_HOME_ROW_KEY = 'data-keyrove-home-row-key';
export const KEYROVE_ATTR_END_ROW_KEY = 'data-keyrove-end-row-key';
export const KEYROVE_ATTR_PAGE_UP_KEY = 'data-keyrove-page-up-key';
export const KEYROVE_ATTR_PAGE_DOWN_KEY = 'data-keyrove-page-down-key';
export const KEYROVE_ATTR_FOCUS_KEY = 'data-keyrove-focus-key';
export const KEYROVE_ATTR_EXIT_KEY = 'data-keyrove-exit-key';
export const KEYROVE_ATTR_ENTER_KEY = 'data-keyrove-enter-key';
export const KEYROVE_ATTR_PAGE_LENGTH = 'data-keyrove-page-length';
export const KEYROVE_ATTR_COLS = 'data-keyrove-cols';
export const KEYROVE_ATTR_ROVING_TABINDEX = 'data-keyrove-roving-tabindex';
export const KEYROVE_ATTR_LOOP = 'data-keyrove-loop';
export const KEYROVE_ATTR_ORIENTATION = 'data-keyrove-orientation';
export const KEYROVE_ATTR_TYPEAHEAD = 'data-keyrove-typeahead';
