export * from './keyRove.js';
export * from './createTypeahead.js';
export { followFocus } from './followFocus.js';
export { initRovingTabindex } from './initRovingTabindex.js';
export { matchesCombo, toggleTabIndex } from './utils.js';
// Named rather than `export *`, so the internal types in `types.ts` stay
// internal and the public surface is visible at a glance.
export type {
  GroupOptions,
  InitRovingTabindexOptions,
  KeyRoveCode,
  KeyRoveEvent,
  Move,
  MoveAction,
  MoveResult,
  Options,
  RovingTabindexOptions,
  StrideAction,
  TypeaheadMove,
  TypeaheadOptions,
  TypeaheadResult,
} from './types.js';
