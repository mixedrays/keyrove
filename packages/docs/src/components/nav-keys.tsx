import {
  type KeyCombo,
  type KeyRoveOptions,
  type RovingTabindexOptions,
  initRovingTabindex,
  keyRove,
  matchesCombo,
} from '@mixedrays/keyrove';
import { useHydrated } from '@tanstack/react-router';
import { useEffect, type RefObject } from 'react';

import { isApple, isShown } from '@/lib/utils.ts';

/**
 * Keyboard navigation for the docs sidebar and the "On this page" rail, which
 * have no Base UI component to give them any: keyrove's arrows within each,
 * and an Alt+Shift chord to each one's tab stop from anywhere on the page.
 *
 * The chords are Alt+Shift because browsers claim most Ctrl+Shift letters —
 * Ctrl+Shift+I is DevTools — and Firefox gives Alt+Shift to the page's own
 * access keys.
 */

export type NavShortcut = { combo: KeyCombo; label: string };

/** A sidebar's group: its links, looping, with one tab stop. */
export const navGroup = (items: string): KeyRoveOptions => ({
  items,
  loop: true,
  rovingTabindex: true,
});

/**
 * Moves the group's tab stop to `initial` — the current page, the section in
 * view — whenever `key` changes, so Tab and the chord land where the reader
 * is. Left alone while focus is inside, where the stop is the reader's.
 */
export const useRovingStop = (
  root: RefObject<HTMLElement | null>,
  group: RovingTabindexOptions,
  initial: string,
  key: unknown,
) => {
  useEffect(() => {
    const element = root.current;
    if (!element || element.contains(document.activeElement)) return;
    initRovingTabindex(element, {
      ...group,
      initial: element.querySelector(initial),
    });
    // `group` is a constant per caller; `key` is what moves the stop.
  }, [root, initial, key]);
};

/**
 * The chord that jumps to a group's tab stop. `reveal` runs first, for a
 * group that is off-screen until something opens it — the mobile drawer opens
 * and focuses its own current link, so it returns `true` to say it is handled.
 */
export const useNavShortcut = (
  root: RefObject<HTMLElement | null>,
  group: KeyRoveOptions,
  shortcut: NavShortcut,
  reveal?: () => boolean,
) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        !matchesCombo(event, shortcut.combo) ||
        document.getElementById('docs-search')
      )
        return;

      if (reveal?.()) {
        event.preventDefault();
        return;
      }

      const element = root.current;
      if (!element || !isShown(element)) return;
      const target = element.querySelector<HTMLElement>('[tabindex="0"]');
      if (target) {
        keyRove(event, { ...group, focusKeys: { [shortcut.combo]: target } });
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [root, group, shortcut, reveal]);
};

const APPLE_KEYS = new Map([
  ['Alt', '⌥'],
  ['Shift', '⇧'],
]);

/**
 * The hint beside a sidebar's first heading: its chord, and the arrows that
 * move within it. Printed as the keycaps are — `⌥ ⇧ E` on Apple keyboards,
 * `Alt Shift E` elsewhere — the way the search chip is. The stylesheet decides
 * when it shows; screen readers get `aria-keyshortcuts` instead.
 *
 * Drawn only once the bundle has run, so nothing advertises a chord without a
 * handler behind it.
 */
export function KeysHint({ label }: { label: string }) {
  const hydrated = useHydrated();
  if (!hydrated) return null;

  const apple = isApple();
  const keys = label
    .split('+')
    .map((key) => (apple && APPLE_KEYS.get(key)) || key);

  return (
    <span className="sidebar-keys" aria-hidden="true">
      <kbd className="sidebar-keys-move">↑ ↓</kbd>
      <kbd>{keys.join(' ')}</kbd>
    </span>
  );
}
