import { useState } from 'react';

import { Icon } from '@/components/icon.tsx';
import { Button } from '@/components/ui/button.tsx';

/**
 * The header theme toggle.
 *
 * The button ships both glyphs and style.css shows one per theme, so this only
 * has to move `data-theme` on <html> — there is no icon to swap, and nothing to
 * render before the first paint. The inline script in the root route applies
 * the stored choice before the page paints; this handles clicks.
 */

const THEME_KEY = 'keyrove-theme';

/**
 * Restores an explicit theme choice before the first paint. Inline and
 * render-blocking on purpose: waiting for the bundle would show a frame of the
 * system theme first. No stored value means "follow the system", which
 * style.css already handles, so there is nothing to set. Storage can be
 * unavailable (Safari private mode), in which case the system theme stands.
 *
 * Written compact, since it is inlined into every page's head: there is no
 * minifier between this string and the HTML.
 */
export const THEME_SCRIPT = `try{const t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}`;

/** Storage throws rather than no-ops when a browser has it switched off. */
const storeTheme = (value: string) => {
  try {
    localStorage.setItem(THEME_KEY, value);
  } catch {
    // The choice still applies to this page; it just will not outlive it.
  }
};

/** What the page is showing now: the explicit choice, else the system's. */
const currentTheme = () =>
  document.documentElement.dataset.theme ??
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export function ThemeToggle() {
  const [label, setLabel] = useState('Switch between light and dark theme');

  const toggle = () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';

    document.documentElement.dataset.theme = next;
    storeTheme(next);

    // The icon is decorative, so the label is what carries the state — and the
    // state it moves to, since one button cycling both is not self-evident.
    setLabel(
      `Theme: ${next}. Switch to ${next === 'dark' ? 'light' : 'dark'}.`,
    );
  };

  // Both glyphs ship; style.css shows one per theme. Picking in script would
  // mean an empty button until the bundle ran, and the theme is not known
  // until the inline head script has run anyway.
  return (
    <Button variant="icon" aria-label={label} onClick={toggle}>
      <Icon name="sun" className="size-4 icon-light" />
      <Icon name="moon" className="size-4 icon-dark" />
    </Button>
  );
}
