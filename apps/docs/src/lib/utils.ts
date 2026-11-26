import { useEffect, useRef, useState } from 'react';

/** Apple keyboards print their modifiers as glyphs: `⌘ K` rather than `Ctrl K`. */
export const isApple = () => /Mac|iPhone|iPad|iPod/.test(navigator.platform);

/** Falls back to `idle` two seconds after `flash`. */
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

/** `checkVisibility({ visibilityProperty: true })`, which Safari lacks before 17.4. */
export const isShown = (element: Element) =>
  element.getClientRects().length > 0 &&
  getComputedStyle(element).visibility !== 'hidden';
