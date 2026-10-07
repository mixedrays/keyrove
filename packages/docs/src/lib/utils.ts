import { useEffect, useRef, useState } from 'react';

// Where shadcn's components look for class merging (see components.json). The
// ones in src/components/ui join the site's own classes instead, so nothing
// imports it yet and the bundle leaves it out.
export { cn } from 'cn';

/** Apple keyboards print their modifiers as glyphs: `⌘ K` rather than `Ctrl K`. */
export const isApple = () => /Mac|iPhone|iPad|iPod/.test(navigator.platform);

/**
 * A value that falls back to `idle` two seconds after `flash` sets it — a copy
 * button's tick, or the "Copied" a label reads for a moment.
 */
export const useFlash = <T>(idle: T) => {
  const [value, setValue] = useState(idle);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (next: T) => {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setValue(idle), 2000);
  };

  return [value, flash] as const;
};

/**
 * Whether `element` is rendered and not `visibility: hidden` — what
 * `checkVisibility({ visibilityProperty: true })` answers, which Safari only
 * has from 17.4.
 */
export const isShown = (element: Element) =>
  element.getClientRects().length > 0 &&
  getComputedStyle(element).visibility !== 'hidden';
