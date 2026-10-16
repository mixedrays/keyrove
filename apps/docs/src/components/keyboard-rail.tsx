import {
  type KeyCombo,
  type KeyRoveOptions,
  followFocus,
  initRovingTabindex,
  keyRove,
  matchesCombo,
} from '@mixedrays/keyrove';
import { useHydrated, useLocation } from '@tanstack/react-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';

import { useSearchOpen } from '@/components/search.tsx';
import { isApple, isShown } from '@/lib/utils.ts';

/**
 * Keyboard navigation for the docs sidebar and the "On this page" rail, which
 * have no Base UI component to give them any: keyrove's arrows within each,
 * one tab stop that rests where the reader is, and an Alt+Shift chord to it
 * from anywhere on the page.
 *
 * The chords are Alt+Shift because browsers claim most Ctrl+Shift letters —
 * Ctrl+Shift+I is DevTools — and Firefox gives Alt+Shift to the page's own
 * access keys.
 */

export type RailShortcut = { combo: KeyCombo; label: string };

export type KeyboardRail = {
  /** Its links, which the arrows move through and loop around. */
  items: string;
  /** The chord that jumps to its tab stop, and the keys its hint prints. */
  shortcut: RailShortcut;
  /**
   * The link its tab stop rests on — the current page, the section in view —
   * so Tab and the chord land where the reader is.
   */
  stop: string;
  /**
   * For a rail that is off-screen until something opens it: runs before the
   * chord moves focus, and returns `true` once it has opened the rail, which
   * then focuses its own stop.
   */
  reveal?: () => boolean;
};

const APPLE_KEYS = new Map([
  ['Alt', '⌥'],
  ['Shift', '⇧'],
]);

/**
 * The hint beside a rail's first heading: its chord, and the arrows that move
 * within it. Printed as the keycaps are — `⌥ ⇧ E` on Apple keyboards,
 * `Alt Shift E` elsewhere — the way the search chip is. The stylesheet decides
 * when it shows; screen readers get `aria-keyshortcuts` instead.
 *
 * Drawn only once the bundle has run, so nothing advertises a chord without a
 * handler behind it.
 */
function KeysHint({ label }: { label: string }) {
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

const findStop = (root: Element | null) =>
  root?.querySelector<HTMLElement>('[tabindex="0"]') ?? null;

/**
 * Everything a rail needs to move on the keyboard, from what it declares.
 * Spread `props` on its root, put `hint` beside its first heading, and ask
 * `findStop` for its tab stop — where a drawer that opens on it puts focus.
 */
export function useKeyboardRail({
  items,
  shortcut,
  stop,
  reveal,
}: KeyboardRail) {
  const root = useRef<HTMLElement | null>(null);
  // The link the stop was last sent to; `undefined` until the links arrive.
  const rested = useRef<Element | null | undefined>(undefined);
  const searching = useSearchOpen();
  // Read only so that a navigation renders the rail, which moves its stop to
  // the new page's link.
  useLocation({ select: (location) => location.pathname });

  const group = useMemo<KeyRoveOptions>(
    () => ({ items, loop: true, rovingTabindex: true }),
    [items],
  );

  // Sends the stop to the `stop` link whenever that changes. Left alone while
  // focus is inside, where the stop is the reader's.
  const rest = useCallback(
    (element: HTMLElement) => {
      const initial = element.querySelector(stop);
      if (initial === rested.current) return;
      rested.current = initial;
      if (element.contains(document.activeElement)) return;
      initRovingTabindex(element, { ...group, initial });
    },
    [group, stop],
  );

  // A drawer's links exist only while it is open, so the stop is set as they
  // arrive, as well as after every render.
  const ref = useCallback(
    (element: HTMLElement | null) => {
      root.current = element;
      rested.current = undefined;
      if (element) rest(element);
    },
    [rest],
  );

  useEffect(() => {
    if (root.current) rest(root.current);
  });

  // The chord, from anywhere on the page — but not over search, which keeps
  // every key while it is open.
  useEffect(() => {
    if (searching) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        !matchesCombo(event, shortcut.combo)
      )
        return;

      if (reveal?.()) {
        event.preventDefault();
        return;
      }

      const element = root.current;
      if (!element || !isShown(element)) return;
      const target = findStop(element);
      if (target) {
        keyRove(event, { ...group, focusKeys: { [shortcut.combo]: target } });
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [group, shortcut, reveal, searching]);

  return {
    props: {
      ref,
      'aria-keyshortcuts': shortcut.label,
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => keyRove(event, group),
      onFocus: (event: FocusEvent<HTMLElement>) => followFocus(event, group),
    },
    hint: <KeysHint label={shortcut.label} />,
    findStop: () => findStop(root.current),
  };
}
