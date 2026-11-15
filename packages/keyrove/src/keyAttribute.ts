import type { GroupOptions, KeyAttributeName } from './types.js';

type Move = keyof NonNullable<GroupOptions['keys']>;

// Spelled once per move: a keypress reads every move's attribute.
const spelled = new Map<Move, KeyAttributeName>();

/** The same move-to-attribute spelling for readers and builders. */
export const keyAttribute = (intent: Move): KeyAttributeName => {
  let name = spelled.get(intent);

  if (!name) {
    name =
      `data-keyrove-${intent.replace(/[A-Z]/g, '-$&').toLowerCase()}-key` as KeyAttributeName;
    spelled.set(intent, name);
  }

  return name;
};
