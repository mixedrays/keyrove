// The only layer where reading direction matters: it picks the default key of
// an unset inline-axis move. Explicit bindings are never flipped.

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

// A tuple rather than an object, so the table minifies to its values.
type DefaultRow = [
  intent: StrideAction,
  combo: KnownCode | `ctrl+${KnownCode}`,
];

// The strides that enter a group from outside; the rest move only within one.
const ENTERING = /^(next|prev)/;

// No default key: in the table only where a root binds them.
const BOUNDARY: BoundaryAction[] = ['exit', 'enter'];

// No `KeyboardEvent.code` is "none", so it never shadows a real key.
const isNone = (combo: string) => combo.trim().toLowerCase() === 'none';

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

// Mirrors the documented keys table. `flip` swaps the horizontal `next`/`prev`
// arrows for RTL; the row axis never flips.
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

// A grid both ways round binds every arrow; a list adds bare Home/End.
const EVERY_ROW = (
  [
    { kind: 'grid', cols: 2, horizontal: true, loop: false },
    { kind: 'list', cols: 1, horizontal: false, loop: false },
  ] satisfies Layout[]
).flatMap((layout) =>
  [false, true].flatMap((flip) => defaultTable(layout, flip)),
);

const DEFAULT_CODES = new Set<string>(
  EVERY_ROW.map(([, combo]) => combo.split('+').pop()!),
);
const MOVES = [...new Set(EVERY_ROW.map(([intent]) => intent)), ...BOUNDARY];

// May say yes where no table then matches, never the reverse: a "no" lets
// the caller skip reading the layout.
const couldMove = (e: KeyRoveEvent, explicit: ExplicitBinding) =>
  DEFAULT_CODES.has(e.code) ||
  MOVES.some((intent) => {
    const combo = explicit(intent);

    return !!combo && combo.includes(e.code) && matchesCombo(e, combo);
  });

// `none` is unset here: an element has no default key to take away.
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
 * The first entry matching a press claims it, so order is precedence: focus
 * keys, then explicit root bindings, then defaults of unbound moves. A
 * replaced default is not re-added, so its key keeps its browser behaviour.
 */
export const buildBindings = ({
  explicit,
  focus = [],
  layout,
  rtl,
}: BuildBindingsArgs): Binding[] => {
  // Direction is read only when a default could flip.
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

  // An element's own key is the most specific declaration, so it wins any
  // collision; two elements naming one combo resolve in DOM order.
  return [...focusBindings(focus), ...rebound, ...defaults];
};

// The layout, which `auto` reads off the page, is asked for only when the
// press could be a move; any other press can match only a focus key.
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
