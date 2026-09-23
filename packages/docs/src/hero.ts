import { keyRove, type MoveResult } from '@mixedrays/keyrove';

import { keyLabel, MODIFIER_KEYS } from './demos.ts';

/**
 * The landing page's hero demo: the mail folders, and one line saying what the
 * last key did.
 *
 * It is not one of the demos src/demos.ts wires. Those carry a history beside
 * the control, which is what an example page is for; the hero is the first
 * thing a reader sees, and asks only that the list be tried. So the markup
 * lives in the page itself, and the history is cut down to its newest row, in
 * the panel's header. The code strip under the list is the page's ordinary
 * code tabs, and needs nothing from here.
 *
 * Before the first key, the line says what to do instead: "click to focus"
 * while focus is anywhere but the list, and "listening…" once it is in. It
 * goes back to the first whenever focus leaves, so a line left over from an
 * earlier visit never sits under a list that is no longer listening.
 *
 * The list opens focused, as a page's opening demo does, so the first arrow
 * the reader presses moves something in view. It is mounted before the demos
 * for that reason: the first of those takes focus only when nothing has it.
 */

/** Whether keyRove answered with a move, found or not, rather than null. */
const isMoveResult = (value: unknown): value is MoveResult =>
  typeof value === 'object' && value !== null && 'action' in value;

const span = (text: string, className?: string) => {
  const element = document.createElement('span');
  element.textContent = text;
  if (className) element.className = className;
  return element;
};

export const mountHero = () => {
  const list = document.querySelector<HTMLElement>('[data-hero-list]');
  const readout = document.querySelector<HTMLElement>('[data-hero-readout]');
  if (!list || !readout) return;

  const show = (state: string, ...parts: Node[]) => {
    readout.dataset.state = state;
    readout.replaceChildren(...parts);

    // Restarted on every change, so a run of presses reads as a run of
    // updates rather than one line that changed once.
    readout.classList.remove('demo-readout-fresh');
    void readout.offsetWidth;
    readout.classList.add('demo-readout-fresh');
  };

  // Hidden from the readout's live region: a screen reader already says
  // where focus went, and has no use for being told to click.
  const instruct = (focused: boolean) => {
    const text = span(focused ? 'listening…' : 'click to focus');
    text.setAttribute('aria-hidden', 'true');
    show(focused ? 'listening' : 'blurred', text);
  };

  // The three outcomes the demos' history tells apart, in one line: focus
  // moved, a key keyrove claimed with nowhere to go, and a key it left alone.
  const report = (e: KeyboardEvent, result: unknown) => {
    const key = document.createElement('kbd');
    key.textContent = keyLabel(e);

    if (isMoveResult(result) && result.to) {
      show(
        'moved',
        key,
        span(result.action),
        span('→'),
        span(result.to.textContent?.trim() ?? '', 'demo-readout-target'),
      );
    } else if (isMoveResult(result)) {
      show('edge', key, span(result.action), span('moved nothing'));
    } else {
      show('passed', key, span('left to the browser'));
    }
  };

  list.addEventListener('keydown', (e) => {
    const result = keyRove(e);
    if (!MODIFIER_KEYS.has(e.key)) report(e, result);
  });

  // Every move inside the list is a focusout and a focusin too; only focus
  // arriving from outside, or leaving for outside, changes the line.
  const fromOutside = (e: FocusEvent) =>
    !list.contains(e.relatedTarget as Node | null);

  list.addEventListener('focusin', (e) => {
    if (fromOutside(e)) instruct(true);
  });

  list.addEventListener('focusout', (e) => {
    if (fromOutside(e)) instruct(false);
  });

  list
    .querySelector<HTMLElement>('[data-keyrove-item]')
    ?.focus({ preventScroll: true });

  // Read back rather than left to the focusin above: a page opened in a
  // background tab gets its focus event late, or not at all.
  instruct(list.contains(document.activeElement));
};
