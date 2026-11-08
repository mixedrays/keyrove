export { keyRove } from './keyRove.js';
export { createTypeahead } from './createTypeahead.js';
export { rootAttributes, itemAttributes } from './attributeBuilders.js';
export { followFocus } from './followFocus.js';
export { initRovingTabindex } from './initRovingTabindex.js';
export { rove } from './rove.js';
export { matchesCombo, toggleTabIndex } from './utils.js';
// Every `KEYROVE_ATTR_*` constant: the module holds nothing else.
export * from './attributes.js';
// Named rather than `export *`, so the internal types in `types.ts` stay
// internal and the public surface is visible at a glance.
export type {
  GroupOptions,
  InitRovingTabindexOptions,
  ItemAttributeOptions,
  ItemAttributes,
  KeyCombo,
  KeyRoveCode,
  KeyRoveEvent,
  KeyRoveOptions,
  Move,
  MoveAction,
  MoveResult,
  Options,
  RootAttributeOptions,
  RootAttributes,
  RovingTabindexOptions,
  StrideAction,
  TypeaheadMove,
  TypeaheadOptions,
  TypeaheadResult,
} from './types.js';
