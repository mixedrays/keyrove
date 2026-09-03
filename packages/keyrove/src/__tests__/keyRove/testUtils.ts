import { vi } from 'vitest';
import {
  keyRove,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_SKIP,
  KEYROVE_ATTR_COLS,
  KEYROVE_ATTR_FOCUS_KEY,
  KEYROVE_ATTR_ROVING_TABINDEX,
} from '../../keyRove';

export type RoveResult = ReturnType<typeof keyRove>;

export type ItemSpec = {
  skip?: boolean;
  disabled?: boolean;
  roving?: boolean;
  tabindex?: string;
  focusKey?: string;
};

export const createItem = (id: string, spec: ItemSpec = {}) => {
  const el = document.createElement('div');
  el.id = id;
  el.setAttribute(KEYROVE_ATTR_ITEM, 'true');
  el.setAttribute('tabindex', spec.tabindex ?? '0');

  if (spec.skip) el.setAttribute(KEYROVE_ATTR_SKIP, 'true');
  if (spec.disabled) el.setAttribute('disabled', 'true');
  if (spec.roving) el.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, 'true');
  if (spec.focusKey !== undefined) {
    el.setAttribute(KEYROVE_ATTR_FOCUS_KEY, spec.focusKey);
  }

  return el;
};

export type RenderOptions = {
  containerAttrs?: Record<string, string>;
  options?: Parameters<typeof keyRove>[1];
  onResult?: (result: RoveResult) => void;
};

/** Builds a list container wired to keyRove and appends it to the document. */
export const renderList = (
  items: HTMLElement[],
  { containerAttrs = {}, options, onResult }: RenderOptions = {},
) => {
  const container = document.createElement('div');

  Object.entries(containerAttrs).forEach(([key, value]) =>
    container.setAttribute(key, value),
  );
  items.forEach((item) => container.appendChild(item));

  document.body.appendChild(container);
  container.addEventListener('keydown', (e) => {
    const result = keyRove(e, options);
    onResult?.(result);
  });

  return container;
};

/**
 * Builds a grid of `count` items with numeric ids laid out in DOM order,
 * e.g. 9 items over 3 columns:
 *   0 1 2
 *   3 4 5
 *   6 7 8
 */
export const renderGrid = (
  count: number,
  columns: number,
  { containerAttrs = {}, ...renderOptions }: RenderOptions = {},
) =>
  renderList(
    Array.from({ length: count }, (_, i) => createItem(`${i}`)),
    {
      containerAttrs: {
        [KEYROVE_ATTR_COLS]: String(columns),
        ...containerAttrs,
      },
      ...renderOptions,
    },
  );

/** Dispatches a keydown that bubbles up to the list container from a focused element. */
export const pressKey = (
  code: string,
  from: Element = document.activeElement as Element,
  modifiers: Pick<
    KeyboardEventInit,
    'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'
  > = {},
) => {
  const event = new KeyboardEvent('keydown', {
    code,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  from.dispatchEvent(event);

  return event;
};

export const activeId = () => document.activeElement?.id;

export const resetTestState = () => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
};
