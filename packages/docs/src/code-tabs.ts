import { keyRove } from '@mixedrays/keyrove';

/**
 * Code panels with a tab per block.
 *
 * The tabs are markup already — build/markdown.ts stamps the tab list and the
 * panels, one of them selected — so this only switches between them. The
 * landing page's layout switcher is written in the same markup by hand, a
 * live demo per panel, and is switched here too.
 *
 * The arrows are keyrove's own: the tab list is a horizontal group with a tab
 * per item, and a move selects the tab it lands on, which is the selection
 * following focus that the ARIA tabs pattern describes. The one tab stop moves
 * with the selection, so Tab leaves the list for the panel it shows.
 */
export const mountCodeTabs = () => {
  const groups = document.querySelectorAll<HTMLElement>('[data-code-tabs]');

  for (const group of groups) {
    const list = group.querySelector<HTMLElement>(':scope > [role="tablist"]');
    if (!list) continue;

    const tabs = Array.from(
      list.querySelectorAll<HTMLElement>(':scope > [role="tab"]'),
    );

    const select = (selected: Element) => {
      for (const tab of tabs) {
        const isSelected = tab === selected;
        tab.setAttribute('aria-selected', String(isSelected));
        tab.tabIndex = isSelected ? 0 : -1;

        const panel = document.getElementById(
          tab.getAttribute('aria-controls') ?? '',
        );
        panel?.toggleAttribute('hidden', !isSelected);
      }
    };

    list.addEventListener('keydown', (e) =>
      keyRove(e, { onMove: ({ to }) => select(to) }),
    );

    list.addEventListener('click', (e) => {
      const tab = (e.target as Element).closest('[role="tab"]');
      if (tab) select(tab);
    });
  }
};
