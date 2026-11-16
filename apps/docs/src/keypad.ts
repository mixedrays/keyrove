/**
 * The keypad: on-screen keys under a live demo, for a reader with no keyboard.
 *
 * The demos answer to keys, and a phone has none. The keypad is shown only
 * where no fine pointer is present (see demo-panel.css), and each of its
 * buttons sends the demo the keydown a real key would, so the demo's own
 * listener, readout included, runs as it does for a keyboard.
 *
 * The build stamps the markup (see build/demos.ts), as it does the readout;
 * nothing here is imported from keyrove, so the build can read it too.
 */

const KEYS = [
  ['ArrowLeft', '←', 'Left arrow'],
  ['ArrowUp', '↑', 'Up arrow'],
  ['ArrowDown', '↓', 'Down arrow'],
  ['ArrowRight', '→', 'Right arrow'],
  ['Home', 'Home', 'Home'],
  ['End', 'End', 'End'],
] as const;

/**
 * The keypad's markup. Out of the Tab order: a keyboard has the real keys,
 * and the buttons must not take focus from the item they act on.
 */
export const KEYPAD_HTML =
  `<div class="demo-keypad" role="group" aria-label="On-screen keys">` +
  KEYS.map(
    ([key, glyph, name]) =>
      `<button type="button" tabindex="-1" value="${key}" aria-label="${name}">${glyph}</button>`,
  ).join('') +
  `</div>`;

/**
 * Wires the keypad inside `root` to the demo `surface`. A tap while focus is
 * outside the demo brings it to `first` and moves nothing, as the first key
 * of a keyboard does; after that each tap is a keydown on the focused item.
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
