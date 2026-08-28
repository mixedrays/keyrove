import {
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_SKIP,
  keyRove,
  type Callbacks,
} from '@mixedrays/keyrove';

/**
 * The live half of the demos embedded in the docs.
 *
 * Nothing here builds DOM. Every demo's markup is stamped into the page at
 * build time from the file under `content/_demos` that the source block below
 * it shows (see build/demos.ts), so this only wires the behaviour markup cannot
 * carry: the keydown listener, the log, and the copy button.
 */

/** Reports each move into the demo's log, so the key that fired is visible. */
const reportKeys = (log: HTMLElement): Callbacks => {
  const announce =
    (action: string) =>
    ({ focused }: { focused: Element | null }) => {
      log.textContent = `${action} → ${focused?.textContent?.trim() ?? '—'}`;
    };

  return {
    next: announce('next'),
    prev: announce('prev'),
    home: announce('home'),
    end: announce('end'),
    pageUp: announce('pageUp'),
    pageDown: announce('pageDown'),
  };
};

/**
 * Escape, out of a nested group.
 *
 * Navigation stops at the nearest root, so no key pressed inside a nested group
 * reaches the group around it — getting back out is the app's job. This is the
 * smallest version of it: hand focus to the item beside the group.
 */
const wireGroupExit = (surface: HTMLElement) => {
  const groups = surface.querySelectorAll<HTMLElement>(
    `[${KEYROVE_ATTR_ROOT}]`,
  );

  for (const group of groups) {
    group.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape') return;

      const exit = [
        group.nextElementSibling,
        group.previousElementSibling,
      ].find(
        (el): el is HTMLElement =>
          el instanceof HTMLElement &&
          el.hasAttribute(KEYROVE_ATTR_ITEM) &&
          !el.hasAttribute(KEYROVE_ATTR_SKIP),
      );

      exit?.focus();
    });
  }
};

/**
 * "Copy markup" — the source block's own text, rather than a second copy of it
 * held in an attribute, so what lands on the clipboard is what is on screen.
 */
const wireCopy = (demo: HTMLElement) => {
  const button = demo.querySelector<HTMLButtonElement>('[data-copy-code]');
  const code = demo.querySelector('.demo-code pre');
  if (!button || !code) return;

  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.textContent ?? '');
    } catch {
      // Clipboard access can be refused outright; the markup is on the page
      // either way, so there is nothing to fall back to.
      return;
    }

    // Both glyphs are already in the button; `data-copied` is what picks
    // between them, so confirming a copy costs no DOM construction.
    button.toggleAttribute('data-copied', true);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => button.removeAttribute('data-copied'), 2000);
  });
};

/** Wires every demo on the current page. */
export const mountDemos = () => {
  for (const demo of document.querySelectorAll<HTMLElement>('.demo')) {
    wireCopy(demo);

    const surface = demo.querySelector<HTMLElement>(
      ':scope > .demo-preview > .demo-surface',
    );
    const log = demo.querySelector<HTMLElement>('.log');
    if (!surface || !log) continue;

    const callbacks = reportKeys(log);
    // One listener for the demo, nested roots included: the event bubbles here
    // and keyrove resolves the root from its target, not from this element.
    surface.addEventListener('keydown', (e) => keyRove(e, { callbacks }));
    wireGroupExit(surface);
  }
};
