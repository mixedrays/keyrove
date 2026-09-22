import {
  KEYROVE_ATTR_COLS,
  KEYROVE_ATTR_FOCUS_KEY,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_LOOP,
  KEYROVE_ATTR_ORIENTATION,
  KEYROVE_ATTR_PAGE_LENGTH,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_ROVING_TABINDEX,
  KEYROVE_ATTR_SKIP,
  KEYROVE_ATTR_TYPEAHEAD,
} from './attributes.js';
import { keyAttribute } from './keyAttribute.js';
import type {
  ItemAttributeOptions,
  ItemAttributes,
  RootAttributeOptions,
  RootAttributes,
} from './types.js';

// These lookups belong only to the builders; handlers still import flat
// constants, so consumers who do not build attributes pay for neither map.
const rootNames = {
  cols: KEYROVE_ATTR_COLS,
  loop: KEYROVE_ATTR_LOOP,
  orientation: KEYROVE_ATTR_ORIENTATION,
  pageLength: KEYROVE_ATTR_PAGE_LENGTH,
} satisfies Record<
  Exclude<keyof RootAttributeOptions, 'keys'>,
  keyof RootAttributes
>;

const itemNames = {
  skip: KEYROVE_ATTR_SKIP,
  rovingTabindex: KEYROVE_ATTR_ROVING_TABINDEX,
  focusKey: KEYROVE_ATTR_FOCUS_KEY,
  typeahead: KEYROVE_ATTR_TYPEAHEAD,
} satisfies Record<keyof ItemAttributeOptions, keyof ItemAttributes>;

/**
 * Mark a root and serialize its settings for a JSX spread, Vue v-bind,
 * Svelte spread, or setAttribute. Undefined settings are omitted.
 */
export const rootAttributes = (
  options: RootAttributeOptions = {},
): RootAttributes => {
  const attributes: RootAttributes = { [KEYROVE_ATTR_ROOT]: 'true' };

  for (const [field, name] of Object.entries(rootNames)) {
    const value = options[field as keyof typeof rootNames];
    if (value !== undefined) attributes[name] = String(value);
  }

  for (const [intent, value] of Object.entries(options.keys ?? {})) {
    if (value !== undefined) {
      attributes[
        keyAttribute(intent as keyof NonNullable<RootAttributeOptions['keys']>)
      ] = value;
    }
  }

  return attributes;
};

/** Mark an item and serialize its per-item settings, omitting undefined. */
export const itemAttributes = (
  options: ItemAttributeOptions = {},
): ItemAttributes => {
  const attributes: ItemAttributes = { [KEYROVE_ATTR_ITEM]: 'true' };

  for (const [field, name] of Object.entries(itemNames)) {
    const value = options[field as keyof typeof itemNames];
    if (value !== undefined) attributes[name] = String(value);
  }

  return attributes;
};
