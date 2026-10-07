/**
 * The light/dark choice, without a framework: the docs' React toggle and the
 * benchmark's plain page (packages/bench) both flip the theme through this,
 * so a choice made on one holds on the other when both share an origin.
 *
 * Both glyphs ship in the button and style.css shows one per theme, so a
 * toggle only has to move `data-theme` on <html> — there is no icon to swap.
 */

const THEME_KEY = 'keyrove-theme';

type Theme = 'light' | 'dark';

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
const storeTheme = (value: Theme) => {
  try {
    localStorage.setItem(THEME_KEY, value);
  } catch {
    // The choice still applies to this page; it just will not outlive it.
  }
};

/** What the page is showing now: the explicit choice, else the system's. */
const currentTheme = (): Theme =>
  (document.documentElement.dataset.theme as Theme | undefined) ??
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

/** Switches the page to the other theme and keeps the choice. */
export const toggleTheme = (): Theme => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';

  document.documentElement.dataset.theme = next;
  storeTheme(next);
  return next;
};

/**
 * The toggle's label once `theme` is showing. The icon is decorative, so the
 * label is what carries the state — and the state it moves to, since one
 * button cycling both is not self-evident.
 */
export const themeLabel = (theme: Theme) =>
  `Theme: ${theme}. Switch to ${theme === 'dark' ? 'light' : 'dark'}.`;
