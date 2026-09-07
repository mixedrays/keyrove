/**
 * The key → intent layer: which combo means which move for a given group.
 *
 * This is the only place layout and reading direction are allowed to matter.
 * Direction affects nothing but which *default* physical key fills an unset
 * inline-axis binding; explicit bindings are literal — never flipped, never
 * remapped. Everything downstream (the position model) is direction-blind.
 * Focus keys — an item's own combo — join the table here too, so the whole
 * precedence of a keypress is one ordered list.
 */

import type {
  Binding,
  BuildBindingsArgs,
  KnownCode,
  Layout,
  StrideAction,
} from './types.js';

// The rows the default table is made of: strides only, so `explicit` — keyed
// by stride — can be looked up by a row's intent without narrowing at each use.
type StrideBinding = Extract<Binding, { intent: StrideAction }>;

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

/**
 * The default table for a layout — the documented keys table: every move the
 * layout has, in table order, with the key it answers to when left unbound and
 * whether it enters a group from outside. `flip` is the RTL swap of the
 * `next`/`prev` arrows on a horizontal axis; the row axis never flips.
 */
const defaultTable = (
  layout: Layout,
  flip: boolean,
): readonly StrideBinding[] => {
  const [prev, next] = layout.horizontal
    ? flip
      ? [KEY.arrowRight, KEY.arrowLeft]
      : [KEY.arrowLeft, KEY.arrowRight]
    : [KEY.arrowUp, KEY.arrowDown];
  const items: StrideBinding[] = [
    { combo: prev, intent: 'prev', enters: true },
    { combo: next, intent: 'next', enters: true },
  ];
  const pages: StrideBinding[] = [
    { combo: KEY.pageUp, intent: 'pageUp', enters: false },
    { combo: KEY.pageDown, intent: 'pageDown', enters: false },
  ];

  if (layout.kind === 'grid') {
    return [
      ...items,
      { combo: KEY.arrowUp, intent: 'prevRow', enters: true },
      { combo: KEY.arrowDown, intent: 'nextRow', enters: true },
      { combo: KEY.home, intent: 'homeRow', enters: false },
      { combo: KEY.end, intent: 'endRow', enters: false },
      { combo: `ctrl+${KEY.home}`, intent: 'home', enters: false },
      { combo: `ctrl+${KEY.end}`, intent: 'end', enters: false },
      ...pages,
    ];
  }

  return [
    ...items,
    { combo: KEY.home, intent: 'home', enters: false },
    { combo: KEY.end, intent: 'end', enters: false },
    ...pages,
  ];
};

/**
 * Builds the ordered binding table for a group. The first entry that matches
 * a keypress claims it, so order *is* precedence: the focus keys first, then
 * every explicit root binding, then the defaults of the moves left unbound.
 *
 * A replaced default is not re-added — the freed key goes back to its browser
 * behaviour — and an explicit combo colliding with another move's default wins
 * by sitting earlier in the table. A move the layout lacks (a row move on a
 * list) is not in its table, so binding it does nothing.
 */
export const buildBindings = ({
  explicit,
  focus = [],
  layout,
  rtl,
}: BuildBindingsArgs): Binding[] => {
  // Direction is read only when a default that could flip is in play: an
  // unbound side of a horizontal `next`/`prev` axis.
  const flip = layout.horizontal && !(explicit.next && explicit.prev) && rtl();
  const rebound: Binding[] = [];
  const defaults: Binding[] = [];

  for (const row of defaultTable(layout, flip)) {
    const combo = explicit[row.intent];

    if (combo) rebound.push({ ...row, combo });
    else defaults.push(row);
  }

  // An item's own key names one element, where a root's names a group and a
  // default names nothing in particular: the most specific declaration in the
  // table, so it sits first — it wins any collision, and two items naming one
  // combo resolve to the first in DOM order. A bare attribute is unset, as it
  // is for the root keys.
  const named: Binding[] = focus
    .filter(({ combo }) => combo)
    .map(({ combo, target }) => ({
      combo,
      intent: 'focus',
      enters: true,
      target,
    }));

  return [...named, ...rebound, ...defaults];
};
