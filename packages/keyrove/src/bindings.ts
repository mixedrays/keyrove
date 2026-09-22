/**
 * The key → intent layer: which combo means which move for a given group.
 *
 * This is the only place layout and reading direction are allowed to matter.
 * Direction affects nothing but which *default* physical key fills an unset
 * inline-axis binding; explicit bindings are literal — never flipped, never
 * remapped. Everything downstream (the position model) is direction-blind.
 * Focus keys — an element's own combo — join the table here too, so the whole
 * precedence of a keypress is one ordered list.
 */

import { isComboSet } from './utils.js';
import type {
  Binding,
  BoundaryAction,
  BuildBindingsArgs,
  KnownCode,
  Layout,
  StrideAction,
} from './types.js';

// A row of the default table: a move, and the key it answers to when left
// unbound. A tuple rather than an object, so the table minifies to its values;
// the combo is still typed, so a misspelt key is a compile error.
type DefaultRow = [
  intent: StrideAction,
  combo: KnownCode | `ctrl+${KnownCode}`,
];

// The strides that enter a group from outside: the four directional moves,
// `next`/`prev` and their row forms. Every other stride moves only within one.
const ENTERING = /^(next|prev)/;

// The moves across a nested root's boundary. They have no default key, so
// they are in the table only where a root binds them.
const BOUNDARY: BoundaryAction[] = ['exit', 'enter'];

// The value that binds a move to no key. It is no `KeyboardEvent.code`, so it
// can never stand for a real key, and it reads as a boolean attribute's value
// does: trimmed, in any case.
const isNone = (combo: string) => combo.trim().toLowerCase() === 'none';

// The rows between the item and page moves: a grid adds its row moves and
// takes bare Home/End for the row ends, leaving ctrl+ for the whole grid's.
const GRID_ROWS: DefaultRow[] = [
  ['prevRow', 'ArrowUp'],
  ['nextRow', 'ArrowDown'],
  ['homeRow', 'Home'],
  ['endRow', 'End'],
  ['home', 'ctrl+Home'],
  ['end', 'ctrl+End'],
];
const LIST_ROWS: DefaultRow[] = [
  ['home', 'Home'],
  ['end', 'End'],
];

/**
 * The default table for a layout — the documented keys table: every move the
 * layout has, in table order, with the key it answers to when left unbound.
 * `flip` is the RTL swap of the `next`/`prev` arrows on a horizontal axis; the
 * row axis never flips.
 */
const defaultTable = (
  { kind, horizontal }: Layout,
  flip: boolean,
): DefaultRow[] => [
  ['prev', horizontal ? (flip ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp'],
  ['next', horizontal ? (flip ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown'],
  ...(kind === 'grid' ? GRID_ROWS : LIST_ROWS),
  ['pageUp', 'PageUp'],
  ['pageDown', 'PageDown'],
];

/**
 * Builds the ordered binding table for a group. The first entry that matches
 * a keypress claims it, so order *is* precedence: the focus keys first, then
 * every explicit root binding, then the defaults of the moves left unbound.
 *
 * A replaced default is not re-added — the freed key goes back to its browser
 * behaviour — and an explicit combo colliding with another move's default wins
 * by sitting earlier in the table. `none` replaces a default with nothing: the
 * move leaves the table and its key is freed. A move the layout lacks (a row
 * move on a list) is not in its table, so binding it does nothing.
 */
export const buildBindings = ({
  explicit,
  focus = [],
  layout,
  rtl,
}: BuildBindingsArgs): Binding[] => {
  // Direction is read only when a default that could flip is in play: a side
  // of a horizontal `next`/`prev` axis with no explicit value. A side set to
  // `none` has no key to flip.
  const flip =
    layout.horizontal && !(explicit('next') && explicit('prev')) && rtl();
  const rebound: Binding[] = [];
  const defaults: Binding[] = [];

  for (const [intent, fallback] of defaultTable(layout, flip)) {
    const combo = explicit(intent);
    const enters = ENTERING.test(intent);

    if (!combo) defaults.push({ combo: fallback, intent, enters });
    else if (!isNone(combo)) rebound.push({ combo, intent, enters });
  }

  for (const intent of BOUNDARY) {
    const combo = explicit(intent);

    if (combo && !isNone(combo)) {
      rebound.push({ combo, intent, enters: false });
    }
  }

  // An element's own key names one element, where a root's names a group and
  // a default names nothing in particular: the most specific declaration in
  // the table, so it sits first — it wins any collision, and two elements
  // naming one combo resolve to the first in DOM order. A combo naming nothing
  // is unset, as it is for the root keys, and so is `none`: an element has no
  // default key to take away.
  const named: Binding[] = focus
    .filter(({ combo }) => isComboSet(combo) && !isNone(combo))
    .map(({ combo, target }) => ({
      combo,
      intent: 'focus',
      enters: true,
      target,
    }));

  return [...named, ...rebound, ...defaults];
};
