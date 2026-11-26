import { useEffect, useState } from 'react';

import type { Heading } from '../../build/markdown.ts';
import {
  useKeyboardRail,
  type KeyboardRail,
} from '@/components/keyboard-rail.tsx';

const RAIL: KeyboardRail = {
  items: '.toc-link',
  shortcut: { combo: 'alt+shift+KeyO', label: 'Alt+Shift+O' },
  stop: '[data-active]',
};

// The sticky header plus breathing room.
const OFFSET = 96;

// Scroll position, not `IntersectionObserver`: short trailing sections never
// meet an observer threshold.
export function Toc({ headings }: { headings: Heading[] }) {
  const rail = useKeyboardRail(RAIL);
  const [active, setActive] = useState<string>();

  useEffect(() => {
    const targets = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;

    const update = () => {
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;

      // The last section can be too short to reach the offset.
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

  if (headings.length === 0) return null;

  return (
    <aside {...rail.props} className="toc" aria-labelledby="docs-toc-heading">
      <div className="toc-inner">
        {rail.hint}
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
