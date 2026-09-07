import {
  KEYROVE_ATTR_COLS,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_SKIP,
  keyRove,
  matchesCombo,
  type Move,
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
const reportMoves =
  (log: HTMLElement) =>
  ({ action, to }: Move) => {
    log.textContent = `${action} → ${to.textContent?.trim() ?? '—'}`;
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
      if (!matchesCombo(e, 'Escape')) return;

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

/**
 * The item a demo opens on: the first one a key would move away from.
 *
 * Items inside a nested root are passed over while the surface has items of
 * its own, so the nested demo opens on the menu rather than inside the
 * reaction row — the inner group answers to keys the page has not introduced
 * yet. Where every item lives in a nested root, as in the responsive grid,
 * the first of those is the first item.
 */
const firstItem = (surface: HTMLElement) => {
  const items = Array.from(
    surface.querySelectorAll<HTMLElement>(
      `[${KEYROVE_ATTR_ITEM}]:not([${KEYROVE_ATTR_SKIP}]):not([disabled])`,
    ),
  );

  const isNested = (item: HTMLElement) => {
    const root = item.closest(`[${KEYROVE_ATTR_ROOT}]`);

    return root !== null && root !== surface;
  };

  return items.find((item) => !isNested(item)) ?? items[0];
};

/**
 * Columns decided by CSS.
 *
 * The responsive demo lets a container query choose its column count and
 * publishes it as `--cols` on the grid. keyrove reads `data-keyrove-cols`, so
 * the attribute is brought level with the property right before each keypress
 * — the line the page's own snippet shows — rather than watched for resizes.
 * The grid is a descendant of the surface rather than the surface itself
 * because the query needs a container above the element it lays out.
 */
const syncColumns = (surface: HTMLElement) => {
  const grids = surface.querySelectorAll<HTMLElement>(`[${KEYROVE_ATTR_COLS}]`);

  for (const grid of grids) {
    const cols = getComputedStyle(grid).getPropertyValue('--cols');
    if (cols) grid.setAttribute(KEYROVE_ATTR_COLS, cols);
  }
};

/** Wires every demo on the current page. */
export const mountDemos = () => {
  const demos = Array.from(document.querySelectorAll<HTMLElement>('.demo'));

  demos.forEach((demo, index) => {
    wireCopy(demo);

    const surface = demo.querySelector<HTMLElement>(
      ':scope > .demo-preview > .demo-surface',
    );
    const log = demo.querySelector<HTMLElement>('.log');
    if (!surface || !log) return;

    const onMove = reportMoves(log);
    // One listener for the demo, nested roots included: the event bubbles here
    // and keyrove resolves the root from its target, not from this element.
    surface.addEventListener('keydown', (e) => {
      syncColumns(surface);
      keyRove(e, { onMove });
    });
    wireGroupExit(surface);

    // The demo a docs page opens with starts focused, so the keys it documents
    // work on arrival rather than after a Tab or a click. Only the first one:
    // focus is single, and a page's opening demo is the one it is about. The
    // landing page is left alone — its copy invites the Tab, and its demo sits
    // far enough down the page that taking focus there on load would move the
    // reader before they have scrolled. `preventScroll` keeps arrival at the
    // top of the page either way.
    if (index === 0 && !demo.closest('.landing')) {
      firstItem(surface)?.focus({ preventScroll: true });
    }
  });
};
