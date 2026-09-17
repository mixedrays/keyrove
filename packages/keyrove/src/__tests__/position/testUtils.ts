import { KEYROVE_ATTR_SKIP } from '../../attributes';

/** Builds a detached list of elements, marking the given indices as skipped. */
export const buildElements = (count: number, skipped: number[] = []) =>
  Array.from({ length: count }, (_, i) => {
    const el = document.createElement('div');
    el.id = `e${i}`;
    if (skipped.includes(i)) el.setAttribute(KEYROVE_ATTR_SKIP, 'true');
    return el;
  });

export const idOf = (el: Element | null | undefined) => el?.id;
