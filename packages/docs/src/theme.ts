/**
 * The header theme toggle.
 *
 * The button ships both glyphs and style.css shows one per theme, so this only
 * has to move `data-theme` on <html> — there is no icon to swap, and nothing to
 * render before the first paint. The inline script in index.html applies the
 * stored choice; this handles clicks.
 */

const THEME_KEY = 'keyrove-theme';

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

export const mountThemeToggle = () => {
  const toggle = document.querySelector<HTMLButtonElement>(
    '[data-theme-toggle]',
  );
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';

    document.documentElement.dataset.theme = next;
    storeTheme(next);

    // The icon is decorative, so the label is what carries the state — and the
    // state it moves to, since one button cycling both is not self-evident.
    toggle.setAttribute(
      'aria-label',
      `Theme: ${next}. Switch to ${next === 'dark' ? 'light' : 'dark'}.`,
    );
  });
};
