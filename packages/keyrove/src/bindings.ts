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

import { isComboSet, matchesCombo } from './utils.js';
import type {
  Binding,
  BoundaryAction,
  BuildBindingsArgs,
  ExplicitBinding,
  FindBindingArgs,
  FocusKey,
  KeyRoveEvent,
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

// Every row a default table holds, in every layout and direction: a grid both
// ways round, which binds every arrow, and a list, which binds bare Home/End.
const EVERY_ROW = (
  [
    { kind: 'grid', cols: 2, horizontal: true, loop: false },
    { kind: 'list', cols: 1, horizontal: false, loop: false },
  ] satisfies Layout[]
).flatMap((layout) =>
  [false, true].flatMap((flip) => defaultTable(layout, flip)),
);

// What a press must match before any layout could make it a move: a key some
// default table binds, with or without its modifiers, or the combo a root
// binds any move to.
const DEFAULT_CODES = new Set<string>(
  EVERY_ROW.map(([, combo]) => combo.split('+').pop()!),
);
const MOVES = [...new Set(EVERY_ROW.map(([intent]) => intent)), ...BOUNDARY];

/**
 * Whether a press could be a move in some layout. Every table's moves are
 * among the defaults and bindings tried here, so a press matching none of
 * them can be claimed by nothing but a focus key, whatever the layout. The
 * test may say yes where the table then matches nothing, never the other way
 * round: a default key counts by its code alone, and a bound combo is parsed
 * only where its text holds the press's code.
 */
const couldMove = (e: KeyRoveEvent, explicit: ExplicitBinding) =>
  DEFAULT_CODES.has(e.code) ||
  MOVES.some((intent) => {
    const combo = explicit(intent);

    return !!combo && combo.includes(e.code) && matchesCombo(e, combo);
  });

/**
 * The focus keys as bindings, in DOM order. A combo naming nothing is unset,
 * as it is for the root keys, and so is `none`: an element has no default key
 * to take away.
 */
const focusBindings = (focus: readonly FocusKey[]): Binding[] =>
  focus
    .filter(({ combo }) => isComboSet(combo) && !isNone(combo))
    .map(({ combo, target }) => ({
      combo,
      intent: 'focus',
      enters: true,
      target,
    }));

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
  // naming one combo resolve to the first in DOM order.
  return [...focusBindings(focus), ...rebound, ...defaults];
};

/**
 * The binding a press resolves to: the first entry of the group's table that
 * matches it. The layout, which `auto` reads off the page, is asked for only
 * when the press could be a move in some layout. Any other press can match
 * nothing but a focus key, and those head every table, so it is resolved
 * among them without the rest of the table.
 */
export const findBinding = (
  e: KeyRoveEvent,
  { explicit, focus = [], layout, rtl }: FindBindingArgs,
): Binding | undefined => {
  const matches = ({ combo }: Binding) => matchesCombo(e, combo);

  if (!couldMove(e, explicit)) return focusBindings(focus).find(matches);

  return buildBindings({ explicit, focus, layout: layout(), rtl }).find(
    matches,
  );
};
