import type { KeyCombo, KeyRoveEvent, ToggleTabIndexArgs } from './types.js';

const isMacLike = () =>
  typeof navigator !== 'undefined' &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform);

const MODIFIERS = ['ctrl', 'alt', 'shift', 'meta'] as const;

type Modifier = (typeof MODIFIERS)[number];

// Not `in`, so inherited names like "constructor" can't pass as modifiers.
const isModifier = (name: string): name is Modifier =>
  (MODIFIERS as readonly string[]).includes(name);

// A `Map` so a lookup can never land on an inherited property name.
const MODIFIER_ALIASES = new Map<string, Modifier>([
  ['control', 'ctrl'],
  ['option', 'alt'],
  ['cmd', 'meta'],
  ['command', 'meta'],
]);

// An entry with no code matches nothing, not even an event with an empty
// code, as Android's virtual keyboards send.
const matchesEntry = (e: KeyRoveEvent, entry: string): boolean => {
  const parts = entry.split('+');
  const code = parts.pop()?.trim();
  const declared = { ctrl: false, alt: false, shift: false, meta: false };

  if (!code) return false;

  for (const part of parts) {
    const name = part.trim().toLowerCase();
    const modifier =
      name === 'mod'
        ? isMacLike()
          ? 'meta'
          : 'ctrl'
        : (MODIFIER_ALIASES.get(name) ?? name);

    if (!isModifier(modifier)) return false;

    declared[modifier] = true;
  }

  return (
    e.code === code &&
    !!e.ctrlKey === declared.ctrl &&
    !!e.altKey === declared.alt &&
    !!e.shiftKey === declared.shift &&
    !!e.metaKey === declared.meta
  );
};

/**
 * Whether the event matches a key combo like `"ctrl+ArrowDown"` or `"KeyJ"`,
 * or any of a comma-separated list of them: `"ArrowDown, KeyJ"`.
 *
 * Grammar: zero or more of `mod+` / `ctrl+` / `alt+` / `shift+` / `meta+`
 * (any order, any case) followed by a `KeyboardEvent.code`. `mod` resolves to
 * `meta` on Apple platforms and `ctrl` elsewhere; `control`, `option`, `cmd`
 * and `command` are the longer spellings of `ctrl`, `alt` and `meta`. No code
 * contains a comma — the comma key is `Comma` — so it is free to separate
 * entries.
 *
 * Matching is exact: every declared modifier must be held and every undeclared
 * one must not be, so a bare `"ArrowDown"` means "ArrowDown with no modifiers"
 * and leaves shortcuts like Ctrl+ArrowDown alone. The code is matched on
 * `e.code` — the physical key, independent of keyboard layout.
 *
 * Each entry of a list is matched on its own: an empty entry, or one naming an
 * unknown modifier, matches nothing and does not stop the others matching.
 */
export const matchesCombo = (e: KeyRoveEvent, combo: KeyCombo): boolean =>
  combo.split(',').some((entry) => matchesEntry(e, entry));

/** An empty, blank or comma-only value is unset. */
export const isComboSet = (value: string | null | undefined): value is string =>
  !!value && /[^\s,]/.test(value);

/**
 * Shift is typing, so it doesn't count. Nor does AltGr, which Windows reports
 * as Ctrl+Alt yet types "@" or "€" on a German layout.
 */
export const hasCommandModifier = (e: KeyRoveEvent): boolean =>
  !e.getModifierState?.('AltGraph') && !!(e.ctrlKey || e.altKey || e.metaKey);

// `closest` so a `contenteditable` region's descendants count, and the nearest
// attribute decides, so a `contenteditable="false"` island opts back out.
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]';

// Types where every key keyrove binds is inert. Unknown types stay guarded.
const INERT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'reset',
  'submit',
]);

const isEditableTarget = (target: EventTarget | null) => {
  const editable = (target as Element | null)?.closest?.(EDITABLE_SELECTOR);

  if (!editable) return false;

  if (editable.tagName === 'INPUT') {
    return !INERT_INPUT_TYPES.has((editable as HTMLInputElement).type);
  }

  return editable.getAttribute('contenteditable')?.toLowerCase() !== 'false';
};

// Outside a shadow root `target` is the host; the path starts inside. React's
// synthetic events lack a path. A path read after dispatch is empty.
const originOf = (e: KeyRoveEvent): EventTarget | null =>
  e.composedPath?.()[0] ?? e.nativeEvent?.composedPath?.()[0] ?? e.target;

/**
 * Checks both the origin and `target`: `closest` stops at a shadow root, so
 * neither alone covers a field in a shadow tree and a shadow tree inside a
 * light-DOM `contenteditable`.
 */
export const isEditablePress = (e: KeyRoveEvent): boolean => {
  if (isEditableTarget(e.target)) return true;

  const origin = originOf(e);

  return origin !== e.target && isEditableTarget(origin);
};

/**
 * Sets `tabindex` to `0` / `-1` on `root`.
 *
 * Descendant `tabindex` values are deliberately left alone — they belong to the
 * consumer. Roving tabindex only needs the item itself to carry the tab stop.
 *
 * @deprecated For a roving group, `initRovingTabindex` keeps its one tab stop
 * and `followFocus` moves it with focus. For a stop you manage yourself, set
 * `element.tabIndex`. `toggleTabIndex` will be removed in the next major
 * version.
 */
export const toggleTabIndex = ({ root, isActive }: ToggleTabIndexArgs) => {
  if (!root) return;

  root.setAttribute('tabindex', isActive ? '0' : '-1');
};

/** A shadow root has no `getAttribute`, so every read of it is `null`. */
export const readAttribute = (
  element: Element,
  attribute: string,
): string | null => element.getAttribute?.(attribute) ?? null;

/** Falls back below 1: a negative page length would flip a jump. */
export const parseAttributeInt = (
  element: Element,
  attribute: string,
  fallback: number,
): number => {
  const value = parseInt(readAttribute(element, attribute) ?? '');

  return value >= 1 ? value : fallback;
};

/** A bare attribute is enabled; only "false" disables it. */
export const hasEnabledAttribute = (element: Element, attribute: string) => {
  const value = readAttribute(element, attribute);

  return value !== null && value.trim().toLowerCase() !== 'false';
};
