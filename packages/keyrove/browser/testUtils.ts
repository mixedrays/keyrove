import { userEvent } from 'vitest/browser';

let mounted: Element[] = [];

/** Puts markup on the page, between a `#before` and an `#after` button. */
export const mount = (html: string) => {
  const container = document.createElement('div');
  container.innerHTML = `
    <button id="before">before</button>
    ${html}
    <button id="after">after</button>
  `;
  document.body.appendChild(container);
  mounted.push(container);

  return container;
};

export const unmount = () => {
  for (const container of mounted) container.remove();
  mounted = [];
};

export const byId = (id: string) => document.getElementById(id)!;

/** The focused element, looked for through every shadow root on the way. */
export const active = (): Element | null => {
  let element = document.activeElement;

  while (element?.shadowRoot?.activeElement) {
    element = element.shadowRoot.activeElement;
  }

  return element;
};

export const activeId = () => active()?.id;

/**
 * Presses keys as a user does, through the browser's own input pipeline:
 * `press('{Tab}')`, `press('{Shift>}{Tab}{/Shift}')`, `press('{ArrowDown}')`.
 */
export const press = (keys: string) => userEvent.keyboard(keys);

export const tab = () => press('{Tab}');
export const shiftTab = () => press('{Shift>}{Tab}{/Shift}');

export const tabindexes = (...elements: Element[]) =>
  elements.map((element) => element.getAttribute('tabindex'));

type Result = { action: string; from: Element | null; to: Element | null };

/** A result by ids, for reading in an assertion. */
export const named = (result: Result | null) =>
  result && {
    action: result.action,
    from: result.from?.id ?? null,
    to: result.to?.id ?? null,
  };
