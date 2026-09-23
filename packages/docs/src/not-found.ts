import { keyRove } from '@mixedrays/keyrove';

/**
 * The 404's list of places to go instead, on the arrows like everything else.
 *
 * The list is written in markdown, which cannot mark its links as items, so
 * the `items` option names them instead — the case that option is for.
 * Nothing takes focus on arrival: the heading saying the page is missing is
 * what a screen reader should reach first, so the hint under the list says
 * how to get in.
 */
export const mountNotFound = () => {
  const links = document.querySelector<HTMLElement>('[data-not-found-links]');
  links?.addEventListener('keydown', (e) => keyRove(e, { items: 'a' }));
};
