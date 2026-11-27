// Framework-free, so apps/bench shares it and a choice holds across both.

const THEME_KEY = 'keyrove-theme';

type Theme = 'light' | 'dark';

/**
 * Inline and render-blocking, so no frame shows the system theme first.
 * Written compact: no minifier runs between this string and the HTML.
 */
export const THEME_SCRIPT = `try{const t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}`;

/** Storage throws rather than no-ops when a browser has it switched off. */
const storeTheme = (value: Theme) => {
  try {
    localStorage.setItem(THEME_KEY, value);
  } catch {
    // Still applies to this page.
  }
};

const currentTheme = (): Theme =>
  (document.documentElement.dataset.theme as Theme | undefined) ??
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export const toggleTheme = (): Theme => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';

  document.documentElement.dataset.theme = next;
  storeTheme(next);
  return next;
};

/** Names the state it moves to: one button cycling both isn't self-evident. */
export const themeLabel = (theme: Theme) =>
  `Theme: ${theme}. Switch to ${theme === 'dark' ? 'light' : 'dark'}.`;
