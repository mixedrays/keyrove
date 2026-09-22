/**
 * Standalone helpers behind keyRove's navigation.
 *
 * Everything here is pure with respect to keyrove's own concepts: helpers take
 * an event, an element or an attribute *name*, never keyrove's own constants,
 * so they can be reasoned about and tested without a DOM tree wired to a nav
 * root.
 */

import type { KeyRoveEvent, ToggleTabIndexArgs } from './types.js';

const isMacLike = () =>
  typeof navigator !== 'undefined' &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform);

const MODIFIERS = ['ctrl', 'alt', 'shift', 'meta'] as const;

type Modifier = (typeof MODIFIERS)[number];

// A plain `includes` (not `in` on the flags object) so inherited property
// names like "constructor" cannot pass as modifiers.
const isModifier = (name: string): name is Modifier =>
  (MODIFIERS as readonly string[]).includes(name);

// The longer spellings of the same flags — what the keys are called on their
// caps and in most shortcut notations. A `Map` rather than an object so a
// lookup can never land on an inherited property name.
const MODIFIER_ALIASES = new Map<string, Modifier>([
  ['control', 'ctrl'],
  ['option', 'alt'],
  ['cmd', 'meta'],
  ['command', 'meta'],
]);

/**
 * Whether the event matches a key combo like `"ctrl+ArrowDown"` or `"KeyJ"`.
 *
 * Grammar: zero or more of `mod+` / `ctrl+` / `alt+` / `shift+` / `meta+`
 * (any order, any case) followed by a `KeyboardEvent.code`. `mod` resolves to
 * `meta` on Apple platforms and `ctrl` elsewhere; `control`, `option`, `cmd`
 * and `command` are the longer spellings of `ctrl`, `alt` and `meta`.
 *
 * Matching is exact: every declared modifier must be held and every undeclared
 * one must not be, so a bare `"ArrowDown"` means "ArrowDown with no modifiers"
 * and leaves shortcuts like Ctrl+ArrowDown alone. The code is matched on
 * `e.code` — the physical key, independent of keyboard layout.
 *
 * A combo with no code — empty, blank, or ending in a dangling `+` — matches
 * nothing, not even an event whose own code is empty, as Android's virtual
 * keyboards send.
 */
export const matchesCombo = (e: KeyRoveEvent, combo: string): boolean => {
  const parts = combo.split('+');
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
 * Whether Ctrl, Alt or Meta is held: a command rather than typing. Shift on
 * its own is typing — it is how capitals are entered — so it does not count.
 */
export const hasCommandModifier = (e: KeyRoveEvent): boolean =>
  !!(e.ctrlKey || e.altKey || e.metaKey);

// An editable target owns the keys keyrove binds: arrows and Home/End move
// the caret there, and printable keys type. `closest` rather than `matches`,
// so descendants of a `contenteditable` region count as inside it — and the
// nearest `contenteditable` attribute decides, mirroring `isContentEditable`,
// so a `contenteditable="false"` island opts back out even inside an editable
// region.
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]';

// Input types on which every key keyrove binds is natively inert — no caret,
// no value stepping, no radio-group movement — so navigating from them takes
// nothing away. Unknown and future types stay guarded.
const INERT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'reset',
  'submit',
]);

/** Whether keys arriving from this target belong to it rather than to keyrove. */
export const isEditableTarget = (target: Element | null) => {
  const editable = target?.closest?.(EDITABLE_SELECTOR);

  if (!editable) return false;

  if (editable.tagName === 'INPUT') {
    return !INERT_INPUT_TYPES.has((editable as HTMLInputElement).type);
  }

  return editable.getAttribute('contenteditable')?.toLowerCase() !== 'false';
};

/**
 * Sets `tabindex` to `0` / `-1` on `root`.
 *
 * Descendant `tabindex` values are deliberately left alone — they belong to the
 * consumer. Roving tabindex only needs the item itself to carry the tab stop.
 */
export const toggleTabIndex = ({ root, isActive }: ToggleTabIndexArgs) => {
  if (!root) return;

  root.setAttribute('tabindex', isActive ? '0' : '-1');
};

/**
 * Reads a positive integer attribute off an element, falling back when absent,
 * unparseable, or below 1 — a count of columns or items is never zero or
 * negative, and a negative page length would flip the direction of a jump.
 */
export const parseAttributeInt = (
  element: Element,
  attribute: string,
  fallback: number,
): number => {
  const value = parseInt(element.getAttribute(attribute) ?? '');

  return value >= 1 ? value : fallback;
};

/** Whether a presence-style attribute is enabled, including its bare form. */
export const hasEnabledAttribute = (element: Element, attribute: string) =>
  element.hasAttribute(attribute) &&
  element.getAttribute(attribute)?.trim().toLowerCase() !== 'false';
