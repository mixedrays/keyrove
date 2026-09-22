import type { GroupOptions, KeyAttributeName } from './types.js';

/** The same move-to-attribute spelling for readers and builders. */
export const keyAttribute = (
  intent: keyof NonNullable<GroupOptions['keys']>,
): KeyAttributeName =>
  `data-keyrove-${intent.replace(/[A-Z]/g, '-$&').toLowerCase()}-key` as KeyAttributeName;
