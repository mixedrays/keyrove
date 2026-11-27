// On-screen keys for readers with no keyboard; each sends a real keydown.
// Imports nothing from keyrove, so the build can stamp the markup.

const KEYS = [
  ['ArrowLeft', '←', 'Left arrow'],
  ['ArrowUp', '↑', 'Up arrow'],
  ['ArrowDown', '↓', 'Down arrow'],
  ['ArrowRight', '→', 'Right arrow'],
  ['Home', 'Home', 'Home'],
  ['End', 'End', 'End'],
] as const;

/** Out of the Tab order, so buttons never take focus from the item. */
export const KEYPAD_HTML =
  `<div class="demo-keypad" role="group" aria-label="On-screen keys">` +
  KEYS.map(
    ([key, glyph, name]) =>
      `<button type="button" tabindex="-1" value="${key}" aria-label="${name}">${glyph}</button>`,
  ).join('') +
  `</div>`;

/**
 * A tap with focus outside the demo only focuses `first`, as a first key does.
 * Listeners come off when `signal` aborts.
 */
export const wireKeypad = (
  root: HTMLElement,
  surface: HTMLElement,
  first: () => HTMLElement | null,
  signal: AbortSignal,
) => {
  const pad = root.querySelector<HTMLElement>('.demo-keypad');
  if (!pad) return;

  // Keeps focus on the item: a pressed button would otherwise take it.
  const keepFocus = (e: Event) => e.preventDefault();
  pad.addEventListener('pointerdown', keepFocus, { signal });
  pad.addEventListener('mousedown', keepFocus, { signal });

  pad.addEventListener(
    'click',
    (e) => {
      const key = (e.target as Element).closest('button')?.value;
      if (!key) return;

      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !surface.contains(active)) {
        first()?.focus();
        return;
      }

      active.dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          code: key,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    { signal },
  );
};
