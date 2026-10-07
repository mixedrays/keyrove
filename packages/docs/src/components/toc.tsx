import { followFocus, keyRove } from '@mixedrays/keyrove';
import { useEffect, useRef, useState } from 'react';

import type { Heading } from '../../build/markdown.ts';
import {
  KeysHint,
  navGroup,
  useNavShortcut,
  useRovingStop,
  type NavShortcut,
} from '@/components/nav-keys.tsx';

const SHORTCUT: NavShortcut = { combo: 'alt+shift+KeyO', label: 'Alt+Shift+O' };

const group = navGroup('.toc-link');

/**
 * Clears the sticky header plus a little breathing room, so a heading counts
 * as current from the moment it settles under the bar.
 */
const OFFSET = 96;

/**
 * The "On this page" rail, which highlights the section currently under the
 * header.
 *
 * A scroll position read beats `IntersectionObserver` here: the answer is
 * "which heading did we last pass", and short trailing sections never grow tall
 * enough to satisfy an observer threshold at all.
 */
export function Toc({ headings }: { headings: Heading[] }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string>();

  useEffect(() => {
    const targets = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;

    const update = () => {
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;

      // The last section can be too short to ever reach the offset, so the
      // bottom of the page selects it outright.
      const current = scrolledToBottom
        ? targets[targets.length - 1]
        : ([...targets]
            .reverse()
            .find((target) => target.getBoundingClientRect().top <= OFFSET) ??
          targets[0]);

      setActive(current.id);
    };

    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    };

    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    update();

    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
    };
  }, [headings]);

  // The tab stop follows the highlight, so Tab and the chord land on the
  // section in view — until focus is in the rail, where it is the reader's.
  useRovingStop(root, group, '[data-active]', active);
  useNavShortcut(root, group, SHORTCUT);

  // Nothing to list on a page with no headings, and the rail carries nothing
  // else, so it is left out entirely rather than sitting empty.
  if (headings.length === 0) return null;

  return (
    <aside
      ref={root}
      className="toc"
      aria-labelledby="docs-toc-heading"
      aria-keyshortcuts={SHORTCUT.label}
      onKeyDown={(event) => keyRove(event, group)}
      onFocus={(event) => followFocus(event, group)}
    >
      <div className="toc-inner">
        <KeysHint label={SHORTCUT.label} />
        <p id="docs-toc-heading" className="toc-heading">
          On this page
        </p>
        <ul className="toc-list">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className="toc-link"
                data-level={heading.level}
                data-active={heading.id === active ? '' : undefined}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
