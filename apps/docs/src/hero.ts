import { keyRove } from '@mixedrays/keyrove';

import { focusOnArrival } from './demos.ts';
import { wireKeypad } from './keypad.ts';
import { createReadout } from './readout.ts';

/**
 * The landing page's hero demo: the mail folders, and the readout over them.
 *
 * It is not one of the demos stamped from content/_demos. The live list wears
 * icons and folder counts that its HTML tab leaves out, so its markup is
 * written into the page itself, and tests/content.test.ts holds the two to
 * the same folders. Its readout is the panels' own (see src/readout.ts), with
 * the easter eggs only the hero has. The code strip under the list is the
 * page's ordinary code tabs, and needs nothing from here.
 *
 * The list takes the page's first arrow, as a page's opening demo does, so
 * the first key the reader presses lands on something in view.
 */
export const mountHero = (root: HTMLElement, signal: AbortSignal) => {
  const list = root.querySelector<HTMLElement>('[data-hero-list]');
  if (!list) throw new Error('[docs] the hero has no [data-hero-list].');

  const first = () => list.querySelector<HTMLElement>('[data-keyrove-item]');
  focusOnArrival(root, first(), signal);

  const readout = createReadout(root, list, signal, { easterEggs: true });
  wireKeypad(root, list, first, signal);

  list.addEventListener(
    'keydown',
    (e) => readout.keydown(e, keyRove(e, { onMove: readout.move })),
    { signal },
  );
};
