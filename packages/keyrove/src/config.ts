/**
 * The configuration layer: one group's settings, resolved for one keypress.
 *
 * A setting has two possible sources — an options object at the call site and
 * the root's `data-keyrove-*` attributes — and they are read field by field,
 * options first. Neither source answers for the other's fields, so a group
 * described in markup can take a single option, a group described entirely in
 * JavaScript takes none of the attributes, and the handler that passes no
 * options reads exactly the markup it always did.
 *
 * Nothing here decides anything. The readings land in one object, and the
 * layers below never learn which source answered.
 */

import {
  KEYROVE_ATTR_COLS,
  KEYROVE_ATTR_FOCUS_KEY,
  KEYROVE_ATTR_LOOP,
  KEYROVE_ATTR_ORIENTATION,
  KEYROVE_ATTR_PAGE_LENGTH,
} from './attributes.js';
import { attributeItems, attributeRoving } from './group.js';
import { attributeSkip } from './position.js';
import { hasEnabledAttribute, isComboSet, parseAttributeInt } from './utils.js';
import type {
  ExplicitBinding,
  FocusKey,
  GroupConfig,
  GroupOptions,
  IsRoot,
  IsRoving,
  IsSkipped,
  Layout,
  ReadItems,
} from './types.js';

// Reading direction for an inline axis. The nearest `dir` attribute
// decides, mirroring how the DOM resolves direction (and working in jsdom,
// which has no layout); `dir="auto"` — content-dependent, so only the
// browser can resolve it — and a missing attribute fall through to the
// computed style, guarded for environments without `getComputedStyle`.
const isRtl = (root: Element): boolean => {
  const dir = root.closest('[dir]')?.getAttribute('dir')?.toLowerCase();

  if (dir === 'rtl' || dir === 'ltr') return dir === 'rtl';

  return (
    typeof getComputedStyle !== 'undefined' &&
    getComputedStyle(root).direction === 'rtl'
  );
};

/** A selector or a test of your own, as one test. */
const asTest = (source: string | IsSkipped): IsSkipped =>
  typeof source === 'string' ? (element) => element.matches(source) : source;

/**
 * A count an option names, where it names a usable one: whole, and at least 1.
 * Anything else falls through to the attribute, as an unusable attribute falls
 * through to the default — a group is never zero columns wide, and a fractional
 * stride would step between items.
 */
const count = (value: number | undefined): number | undefined => {
  const whole = Math.floor(value ?? NaN);

  return whole >= 1 ? whole : undefined;
};

// A track in a resolved `grid-template-columns`: a size in pixels.
const TRACK = /^\d*\.?\d+px$/;

/**
 * The columns a grid container lays out: the tracks of its resolved
 * `grid-template-columns`, which lists every track as a pixel size however the
 * rule was written, `repeat(auto-fill, …)` included. Named lines
 * (`[full-start]`) are not tracks.
 *
 * A value that is not a list of pixel sizes counts nothing — `none` on a root
 * that is no grid, or the declared value where nothing is laid out — and
 * neither does an environment without `getComputedStyle`: the group is then a
 * list.
 */
const countTracks = (root: Element): number => {
  if (typeof getComputedStyle === 'undefined') return 1;

  const tracks = getComputedStyle(root)
    .getPropertyValue('grid-template-columns')
    .replace(/\[[^\]]*\]/g, ' ')
    .trim()
    .split(/\s+/);

  return tracks.every((track) => TRACK.test(track)) ? tracks.length : 1;
};

/**
 * The group's column count. `auto`, from either source and in any case in the
 * attribute, counts the tracks on screen on every keypress; a number is taken
 * as it stands, where it is usable.
 */
const readColumns = (root: Element, cols: GroupOptions['cols']): number => {
  if (cols === 'auto') return countTracks(root);

  const option = count(cols);

  if (option) return option;

  if (root.getAttribute(KEYROVE_ATTR_COLS)?.trim().toLowerCase() === 'auto') {
    return countTracks(root);
  }

  return parseAttributeInt(root, KEYROVE_ATTR_COLS, 1);
};

/**
 * Whether an element is a group's root, where a `root` selector names one.
 * Undefined otherwise, which leaves `resolveRoot` reading the attribute.
 *
 * Resolved apart from the rest: it is what finds the root the rest is read
 * from.
 */
export const rootTest = ({ root }: GroupOptions): IsRoot | undefined =>
  root ? (element) => element.matches(root) : undefined;

/**
 * How the group folds its sequence. A list is one column; more than one makes
 * a grid, which has no orientation of its own — its `next`/`prev` axis is
 * sideways by nature — and never wraps, per the APG grid pattern.
 */
const readLayout = (
  root: Element,
  { cols, orientation, loop }: GroupOptions,
): Layout => {
  const columns = readColumns(root, cols);

  if (columns > 1) {
    return { kind: 'grid', cols: columns, horizontal: true, loop: false };
  }

  return {
    kind: 'list',
    cols: 1,
    // `horizontal` redirects only the *default* keys — an explicit binding
    // still wins in the table. Nothing but the literal value "horizontal"
    // switches anything, from either source.
    horizontal:
      (orientation ?? root.getAttribute(KEYROVE_ATTR_ORIENTATION)) ===
      'horizontal',
    loop: loop ?? hasEnabledAttribute(root, KEYROVE_ATTR_LOOP),
  };
};

/**
 * The combo bound to a move, or nullish where the move keeps its default key.
 * Asked move by move, so each one falls back on its own: a `keys` object
 * naming `next` leaves every other move to its attribute. Every move's
 * attribute is named after it, so the name is derived rather than listed —
 * `nextRow` reads `data-keyrove-next-row-key`.
 *
 * A value naming no combo is unset in either source: an empty, blank or
 * comma-only option falls through to the attribute, and such an attribute to
 * the default.
 */
const readExplicitBinding =
  (root: Element, { keys }: GroupOptions): ExplicitBinding =>
  (intent) =>
    [
      keys?.[intent],
      root.getAttribute(
        `data-keyrove-${intent.replace(/[A-Z]/g, '-$&').toLowerCase()}-key`,
      ),
    ].find(isComboSet);

/**
 * The focus keys in reach of a keypress: the `focusKeys` map where one is
 * given, else every element under `scope` naming a key of its own, in DOM
 * order. A map replaces the scan rather than adding to it, so one declaration
 * answers for the whole group.
 *
 * A destination need not be an item — a panel reached by its key alone stays
 * out of every arrow order — but it must be reachable: a disabled element is
 * no destination, and neither is a selector matching nothing, so those keys
 * fall through as though undeclared. The scan reads the skip attribute too,
 * declared as it is on the element beside the key; an element a map names is
 * named outright, and the group's `skip` has no say over it.
 */
export const readFocusKeys = (
  scope: Element,
  { focusKeys }: GroupOptions,
): FocusKey[] => {
  const declared: { combo: string; target: Element | null }[] = focusKeys
    ? Object.entries(focusKeys).map(([combo, target]) => ({
        combo,
        target:
          typeof target === 'string' ? scope.querySelector(target) : target,
      }))
    : Array.from(scope.querySelectorAll(`[${KEYROVE_ATTR_FOCUS_KEY}]`))
        .filter((target) => !attributeSkip(target))
        .map((target) => ({
          combo: target.getAttribute(KEYROVE_ATTR_FOCUS_KEY) ?? '',
          target,
        }));

  return declared.filter(
    (key): key is FocusKey =>
      !!key.target && !key.target.hasAttribute('disabled'),
  );
};

/** How the group's items are found: a selector run in the root, a reading of your own, or the attribute. */
export const itemsReader = ({ items }: GroupOptions): ReadItems => {
  if (!items) return attributeItems;

  if (typeof items === 'string') {
    return (root) => Array.from(root.querySelectorAll(items));
  }

  return items;
};

/** Which items a move passes over: the option where one is named, else the attribute. */
export const skipTest = ({ skip }: GroupOptions): IsSkipped =>
  skip ? asTest(skip) : attributeSkip;

/**
 * Whether the item focus is leaving carries the roving tab stop: one boolean
 * for the group where options name it, else the attribute's reading of that
 * item.
 */
export const rovingTest = ({ rovingTabindex }: GroupOptions): IsRoving =>
  rovingTabindex === undefined ? attributeRoving : () => rovingTabindex;

/**
 * Every setting one move needs, read once for the root it resolved in. The
 * focus keys are read apart, by {@link readFocusKeys}: they span the
 * listener's reach rather than the root, and only a keypress looks them up.
 */
export const readConfig = (
  root: Element,
  options: GroupOptions,
): GroupConfig => ({
  layout: readLayout(root, options),
  explicit: readExplicitBinding(root, options),
  // Resolved on demand: read only when an unbound `next`/`prev` default on a
  // horizontal axis could flip, never otherwise.
  rtl: () => isRtl(root),
  pageLength:
    count(options.pageLength) ??
    parseAttributeInt(root, KEYROVE_ATTR_PAGE_LENGTH, 10),
  readItems: itemsReader(options),
  isSkipped: skipTest(options),
  isRoving: rovingTest(options),
});
