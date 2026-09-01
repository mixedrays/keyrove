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
  KnownCode,
  MoveAction,
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

type DirectionalIntent = 'prev' | 'next' | 'prevRow' | 'nextRow';

const LIST_INTENTS = ['prev', 'next'] as const satisfies DirectionalIntent[];
const GRID_INTENTS = [
  'prev',
  'next',
  'prevRow',
  'nextRow',
] as const satisfies DirectionalIntent[];

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
  isGrid,
  horizontal,
  rtl,
}: BuildBindingsArgs): Binding[] => {
  // The inline axis reads sideways in a horizontal list and in every grid, so
  // its default arrows follow the reading direction; the row axis is vertical
  // and never flips.
  const inline = isGrid || horizontal;
  const defaults: Record<DirectionalIntent, string> = {
    next: inline ? (rtl ? KEY.arrowLeft : KEY.arrowRight) : KEY.arrowDown,
    prev: inline ? (rtl ? KEY.arrowRight : KEY.arrowLeft) : KEY.arrowUp,
    nextRow: KEY.arrowDown,
    prevRow: KEY.arrowUp,
  };

  const directional: readonly DirectionalIntent[] = isGrid
    ? GRID_INTENTS
    : LIST_INTENTS;
  const bindings: Binding[] = [];

  for (const intent of directional) {
    const combo = explicit[intent];

    if (combo) bindings.push({ combo, intent });
  }

  for (const intent of directional) {
    if (!explicit[intent]) bindings.push({ combo: defaults[intent], intent });
  }

  const fixed: Binding[] = isGrid
    ? [
        { combo: KEY.home, intent: 'homeRow' },
        { combo: KEY.end, intent: 'endRow' },
        { combo: `ctrl+${KEY.home}`, intent: 'home' },
        { combo: `ctrl+${KEY.end}`, intent: 'end' },
      ]
    : [
        { combo: KEY.home, intent: 'home' },
        { combo: KEY.end, intent: 'end' },
      ];

  bindings.push(
    ...fixed,
    { combo: KEY.pageUp, intent: 'pageUp' },
    { combo: KEY.pageDown, intent: 'pageDown' },
  );

  return bindings;
};

/**
 * The intents that enter a group from outside — pressed while no item holds
 * focus, they land on the first navigable item. The fixed keys move only
 * within a group, never into one.
 */
export const ENTERING_INTENTS: ReadonlySet<MoveAction> = new Set([
  'next',
  'prev',
  'nextRow',
  'prevRow',
]);
