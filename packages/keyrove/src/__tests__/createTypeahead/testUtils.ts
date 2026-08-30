import { vi } from 'vitest';
import { createTypeahead } from '../../createTypeahead';
import {
  keyRove,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_SKIP,
  KEYROVE_ATTR_ROVING_TABINDEX,
  KEYROVE_ATTR_TYPEAHEAD,
} from '../../keyRove';

export type ItemSpec = {
  skip?: boolean;
  disabled?: boolean;
  roving?: boolean;
  tabindex?: string;
  typeahead?: string;
};

export const createItem = (id: string, label: string, spec: ItemSpec = {}) => {
  const el = document.createElement('div');
  el.id = id;
  el.textContent = label;
  el.setAttribute(KEYROVE_ATTR_ITEM, 'true');
  el.setAttribute('tabindex', spec.tabindex ?? '0');

  if (spec.skip) el.setAttribute(KEYROVE_ATTR_SKIP, 'true');
  if (spec.disabled) el.setAttribute('disabled', 'true');
  if (spec.roving) el.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, 'true');
  if (spec.typeahead !== undefined) {
    el.setAttribute(KEYROVE_ATTR_TYPEAHEAD, spec.typeahead);
  }

  return el;
};

export type RenderOptions = {
  containerAttrs?: Record<string, string>;
  options?: Parameters<typeof createTypeahead>[0];
  /** Chains keyRove in front, as consumers are told to: keyRove(e) || typeahead(e). */
  chainKeyRove?: boolean;
};

/** Builds a list container wired to a fresh typeahead handler. */
export const renderList = (
  items: HTMLElement[],
  { containerAttrs = {}, options, chainKeyRove }: RenderOptions = {},
) => {
  const typeahead = createTypeahead(options);
  const results: Array<
    ReturnType<typeof typeahead> | ReturnType<typeof keyRove>
  > = [];
  const container = document.createElement('div');

  Object.entries(containerAttrs).forEach(([key, value]) =>
    container.setAttribute(key, value),
  );
  items.forEach((item) => container.appendChild(item));

  document.body.appendChild(container);
  container.addEventListener('keydown', (e) => {
    results.push(chainKeyRove ? keyRove(e) || typeahead(e) : typeahead(e));
  });

  return { container, results };
};

/** Dispatches a keydown carrying a `key` (and optionally a `code`) from a focused element. */
export const pressKey = (
  key: string,
  {
    code = '',
    from = document.activeElement as Element,
    ...modifiers
  }: Pick<KeyboardEventInit, 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'> & {
    code?: string;
    from?: Element;
  } = {},
) => {
  const event = new KeyboardEvent('keydown', {
    key,
    code,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  from.dispatchEvent(event);

  return event;
};

export const activeId = () => document.activeElement?.id;

export const mailbox = () => [
  createItem('a', 'Drafts'),
  createItem('b', 'Dashboard'),
  createItem('c', 'Sent'),
];

export const resetTestState = () => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
};
