/**
 * The key → intent layer: which combo means which move for a given group.
 *
 * This is the only place layout and reading direction are allowed to matter.
 * Direction affects nothing but which *default* physical key fills an unset
 * inline-axis binding; explicit bindings are literal — never flipped, never
 * remapped. Everything downstream (the position model) is direction-blind.
 */

import type {
  Binding,
  BuildBindingsArgs,
  DirectionalIntent,
  KnownCode,
  Layout,
} from './types.js';

// Named so the tables below are checked against `KnownCode` instead of
// comparing against bare literals that TypeScript cannot vet.
const KEY = {
  arrowUp: 'ArrowUp',
  arrowDown: 'ArrowDown',
  arrowLeft: 'ArrowLeft',
  arrowRight: 'ArrowRight',
  home: 'Home',
  end: 'End',
  pageUp: 'PageUp',
  pageDown: 'PageDown',
} as const satisfies Record<string, KnownCode>;

type FixedKey = Pick<Binding, 'combo' | 'intent'>;

const LIST_INTENTS = [
  'prev',
  'next',
] as const satisfies readonly DirectionalIntent[];
const ROW_INTENTS = [
  'prevRow',
  'nextRow',
] as const satisfies readonly DirectionalIntent[];

/**
 * What each layout binds, in table order: the directional intents that take a
 * default key when left unbound, then that layout's fixed keys. The page keys
 * are shared and follow both.
 */
const LAYOUT_KEYS: Record<
  Layout['kind'],
  { directional: readonly DirectionalIntent[]; fixed: readonly FixedKey[] }
> = {
  list: {
    directional: LIST_INTENTS,
    fixed: [
      { combo: KEY.home, intent: 'home' },
      { combo: KEY.end, intent: 'end' },
    ],
  },
  grid: {
    directional: [...LIST_INTENTS, ...ROW_INTENTS],
    fixed: [
      { combo: KEY.home, intent: 'homeRow' },
      { combo: KEY.end, intent: 'endRow' },
      { combo: `ctrl+${KEY.home}`, intent: 'home' },
      { combo: `ctrl+${KEY.end}`, intent: 'end' },
    ],
  },
};

const PAGE_KEYS: readonly FixedKey[] = [
  { combo: KEY.pageUp, intent: 'pageUp' },
  { combo: KEY.pageDown, intent: 'pageDown' },
];

/**
 * Builds the ordered binding table for a group. The first entry that matches
 * a keypress claims it, so order *is* precedence: explicit bindings, then
 * direction-aware defaults for the intents left unbound, then the fixed keys.
 *
 * A replaced default is not re-added — the freed key goes back to its browser
 * behaviour — and an explicit combo colliding with a default or fixed key wins
 * by sitting earlier in the table.
 */
export const buildBindings = ({
  explicit,
  layout,
  rtl,
}: BuildBindingsArgs): Binding[] => {
  const { directional, fixed } = LAYOUT_KEYS[layout.kind];
  const unbound = directional.filter((intent) => !explicit[intent]);

  // Direction is read only when a default that could flip is in play: an
  // unbound side of a horizontal `next`/`prev` axis. The row axis is vertical
  // and never flips.
  const flip = layout.horizontal && !(explicit.next && explicit.prev) && rtl();
  const defaults: Record<DirectionalIntent, KnownCode> = {
    next: layout.horizontal
      ? flip
        ? KEY.arrowLeft
        : KEY.arrowRight
      : KEY.arrowDown,
    prev: layout.horizontal
      ? flip
        ? KEY.arrowRight
        : KEY.arrowLeft
      : KEY.arrowUp,
    nextRow: KEY.arrowDown,
    prevRow: KEY.arrowUp,
  };

  const bindings: Binding[] = [];

  for (const intent of directional) {
    const combo = explicit[intent];

    if (combo) bindings.push({ combo, intent, enters: true });
  }

  for (const intent of unbound) {
    bindings.push({ combo: defaults[intent], intent, enters: true });
  }

  for (const { combo, intent } of [...fixed, ...PAGE_KEYS]) {
    bindings.push({ combo, intent, enters: false });
  }

  return bindings;
};
