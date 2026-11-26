import { keyRove } from '@mixedrays/keyrove';

import { focusOnArrival } from './demos.ts';
import { createReadout } from './readout.ts';

// Not stamped from content/_demos: the live list has icons and counts its
// HTML tab omits. tests/content.test.ts keeps the two in step.
export const mountHero = (root: HTMLElement, signal: AbortSignal) => {
  const list = root.querySelector<HTMLElement>('[data-hero-list]');
  if (!list) throw new Error('[docs] the hero has no [data-hero-list].');

  focusOnArrival(root, list.querySelector<HTMLElement>('[data-keyrove-item]'));

  const readout = createReadout(root, list, signal, { easterEggs: true });

  list.addEventListener(
    'keydown',
    (e) => readout.keydown(e, keyRove(e, { onMove: readout.move })),
    { signal },
  );
};
