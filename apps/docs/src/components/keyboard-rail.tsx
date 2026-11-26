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

// Alt+Shift chords: browsers claim most Ctrl+Shift letters (DevTools), and
// Firefox gives Alt+Shift to the page's access keys.

export type RailShortcut = { combo: KeyCombo; label: string };

export type KeyboardRail = {
  items: string;
  /** The chord that jumps to its tab stop, and the keys its hint prints. */
  shortcut: RailShortcut;
  /** The current page or section in view, so Tab lands where the reader is. */
  stop: string;
  /** For an off-screen rail: returns `true` once opened; it focuses itself. */
  reveal?: () => boolean;
};

const APPLE_KEYS = new Map([
  ['Alt', '⌥'],
  ['Shift', '⇧'],
]);

// Drawn only once the bundle runs, so no chord is advertised without a
// handler. Screen readers get `aria-keyshortcuts` instead.
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

/** Spread `props` on the root, put `hint` by the first heading. */
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
  // Subscribed so navigation re-renders the rail and moves its stop.
  useLocation({ select: (location) => location.pathname });

  const group = useMemo<KeyRoveOptions>(
    () => ({ items, loop: true, rovingTabindex: true }),
    [items],
  );

  // Left alone while focus is inside, where the stop is the reader's.
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

  // A drawer's links exist only while open, so the stop is set as they arrive.
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

  // Not over search, which keeps every key while open.
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
