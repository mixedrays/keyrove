export * from './keyRove.js';
export { matchesCombo, toggleTabIndex } from './utils.js';
// Named rather than `export *`, so the internal types in `types.ts` stay
// internal and the public surface is visible at a glance.
export type {
  KeyRoveCode,
  KeyRoveEvent,
  Move,
  MoveAction,
  MoveResult,
  Options,
} from './types.js';
