import type { Attributes } from './types.js';

/**
 * Attribute names keyrove reads from the DOM.
 *
 * Internal on purpose: making these configurable is a deliberate non-goal for
 * now, and exporting the map would freeze its shape before that feature is
 * designed. The individual `KEYROVE_ATTR_*` constants in `keyRove.ts` are the
 * public surface. The map has a module of its own so the group layer and the
 * typeahead handler can read it without importing the handler that exports
 * those constants.
 */
export const DEFAULT_ATTRIBUTES = {
  item: 'data-keyrove-item',
  skip: 'data-keyrove-skip',
  root: 'data-keyrove-root',
  nextKey: 'data-keyrove-next-key',
  prevKey: 'data-keyrove-prev-key',
  nextRowKey: 'data-keyrove-next-row-key',
  prevRowKey: 'data-keyrove-prev-row-key',
  homeKey: 'data-keyrove-home-key',
  endKey: 'data-keyrove-end-key',
  homeRowKey: 'data-keyrove-home-row-key',
  endRowKey: 'data-keyrove-end-row-key',
  pageUpKey: 'data-keyrove-page-up-key',
  pageDownKey: 'data-keyrove-page-down-key',
  pageLength: 'data-keyrove-page-length',
  cols: 'data-keyrove-cols',
  rovingTabindex: 'data-keyrove-roving-tabindex',
  loop: 'data-keyrove-loop',
  orientation: 'data-keyrove-orientation',
  typeahead: 'data-keyrove-typeahead',
} as const satisfies Attributes;
