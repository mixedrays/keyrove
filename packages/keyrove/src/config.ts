// Each setting is read field by field, options first, then the root's
// attribute, so markup and options mix freely.

import {
  KEYROVE_ATTR_COLS,
  KEYROVE_ATTR_FOCUS_KEY,
  KEYROVE_ATTR_LOOP,
  KEYROVE_ATTR_ORIENTATION,
  KEYROVE_ATTR_PAGE_LENGTH,
} from './attributes.js';
import { attributeSkip, isDisabled } from './group.js';
import { keyAttribute } from './keyAttribute.js';
import {
  hasEnabledAttribute,
  isComboSet,
  parseAttributeInt,
  readAttribute,
} from './utils.js';
import type {
  ExplicitBinding,
  FocusKey,
  GroupConfig,
  GroupOptions,
  Layout,
} from './types.js';

// `items` is read only by `auto` columns, so pass it as a lazy getter.
type ConfigGroup = {
  readonly root: Element;
  readonly items: readonly Element[];
};

// `Node.DOCUMENT_FRAGMENT_NODE`, spelled out so reading it needs no global
// `Node`.
const DOCUMENT_FRAGMENT_NODE = 11;

// A shadow root has no box or style; its children lay out as the host's.
const boxOf = (root: Element): Element =>
  root.nodeType === DOCUMENT_FRAGMENT_NODE
    ? (root as unknown as ShadowRoot).host
    : root;

// `dir` first, as the DOM resolves it and jsdom can read it; `dir="auto"`
// needs the browser, so it falls through to the computed style.
const isRtl = (root: Element): boolean => {
  const box = boxOf(root);
  const dir = box.closest('[dir]')?.getAttribute('dir')?.toLowerCase();

  if (dir === 'rtl' || dir === 'ltr') return dir === 'rtl';

  return (
    typeof getComputedStyle !== 'undefined' &&
    getComputedStyle(box).direction === 'rtl'
  );
};

// Unusable counts fall through to the attribute: a group is never zero
// columns wide, and a fractional stride would step between items.
const count = (value: number | undefined): number | undefined => {
  const whole = Math.floor(value ?? NaN);

  return whole >= 1 ? whole : undefined;
};

const TRACK = /^\d*\.?\d+px$/;

// The resolved value lists every track in px, `repeat(auto-fill, …)`
// included. Anything else (`none`, or unresolved with no layout) counts 1.
const countTracks = (root: Element): number => {
  if (typeof getComputedStyle === 'undefined') return 1;

  const tracks = getComputedStyle(boxOf(root))
    .getPropertyValue('grid-template-columns')
    .replace(/\[[^\]]*\]/g, ' ')
    .trim()
    .split(/\s+/);

  return tracks.every((track) => TRACK.test(track)) ? tracks.length : 1;
};

// Stops at the first item starting below the first item's bottom, so items of
// different heights centred on one line count as that line. An item with no
// box (`display: none`, jsdom) ends the count.
const countFirstLine = (items: readonly Element[]): number => {
  const firstBox = (item: Element): DOMRect | undefined =>
    item.getClientRects()[0];
  const first = items[0] && firstBox(items[0]);

  if (!first || first.height === 0) return 1;

  let columns = 1;

  while (
    columns < items.length &&
    (firstBox(items[columns])?.top ?? Infinity) < first.bottom
  ) {
    columns++;
  }

  return columns;
};

const countColumns = (group: ConfigGroup): number => {
  const tracks = countTracks(group.root);

  return tracks > 1 ? tracks : countFirstLine(group.items);
};

const readColumns = (
  group: ConfigGroup,
  cols: GroupOptions['cols'],
): number => {
  if (cols === 'auto') return countColumns(group);

  const option = count(cols);

  if (option) return option;

  const { root } = group;

  if (readAttribute(root, KEYROVE_ATTR_COLS)?.trim().toLowerCase() === 'auto') {
    return countColumns(group);
  }

  return parseAttributeInt(root, KEYROVE_ATTR_COLS, 1);
};

// A grid's `next`/`prev` axis is sideways, and it never wraps (APG grid).
const readLayout = (
  group: ConfigGroup,
  { cols, orientation, loop }: GroupOptions,
): Layout => {
  const { root } = group;
  const columns = readColumns(group, cols);

  if (columns > 1) {
    return { kind: 'grid', cols: columns, horizontal: true, loop: false };
  }

  return {
    kind: 'list',
    cols: 1,
    horizontal:
      (orientation ??
        readAttribute(root, KEYROVE_ATTR_ORIENTATION)?.trim().toLowerCase()) ===
      'horizontal',
    loop: loop ?? hasEnabledAttribute(root, KEYROVE_ATTR_LOOP),
  };
};

// Move by move, so a `keys` object naming `next` leaves every other move to
// its attribute.
const readExplicitBinding =
  (root: Element, { keys }: GroupOptions): ExplicitBinding =>
  (intent) => {
    const option = keys?.[intent];

    if (isComboSet(option)) return option;

    const attribute = readAttribute(root, keyAttribute(intent));

    return isComboSet(attribute) ? attribute : undefined;
  };

/**
 * A `focusKeys` map replaces the attribute scan. Disabled targets and
 * selectors matching nothing drop out. The scan honours the skip attribute;
 * an element a map names ignores the group's `skip`.
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
    (key): key is FocusKey => !!key.target && !isDisabled(key.target),
  );
};

// Focus keys are read apart (`readFocusKeys`): they span the listener's
// reach, not the root.
export const readConfig = (
  group: ConfigGroup,
  options: GroupOptions,
): GroupConfig => {
  let layout: Layout | undefined;

  return {
    // Lazy: `auto` reads the page's layout, which most presses never need.
    get layout() {
      return (layout ??= readLayout(group, options));
    },
    explicit: readExplicitBinding(group.root, options),
    rtl: () => isRtl(group.root),
    pageLength:
      count(options.pageLength) ??
      parseAttributeInt(group.root, KEYROVE_ATTR_PAGE_LENGTH, 10),
  };
};
