/**
 * The docs chrome: the mobile sidebar drawer, the "On this page" rail, and the
 * button that hands the page's markdown to the clipboard.
 *
 * All three are progressive enhancements over markup that is already complete —
 * the sidebar is a plain nav, the rail is a list of anchors, and the copy
 * button sits beside a link to the same file.
 */

import {
  type KeyCombo,
  followFocus,
  initRovingTabindex,
  keyRove,
  matchesCombo,
} from '@mixedrays/keyrove';

const sidebarGroup = {
  root: '#docs-sidebar, .toc',
  items: '.sidebar-link, .toc-link',
  loop: true,
  rovingTabindex: true,
};

// Rendered and not `visibility: hidden` — what `checkVisibility({
// visibilityProperty: true })` answers, which Safari only has from 17.4.
const isShown = (element: Element) =>
  element.getClientRects().length > 0 &&
  getComputedStyle(element).visibility !== 'hidden';

const APPLE_KEYS = new Map([
  ['Alt', '⌥'],
  ['Shift', '⇧'],
]);

/**
 * The hint beside a sidebar's first heading: its shortcut, and the arrows
 * that move within it. The shortcut is printed as the keycaps are — `⌥ ⇧ E` on
 * Apple keyboards, `Alt Shift E` elsewhere — the way the search chip is. The
 * stylesheet decides when it shows; screen readers get `aria-keyshortcuts`.
 */
const renderKeysHint = (root: HTMLElement, label: string) => {
  const apple = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const keys = label
    .split('+')
    .map((key) => (apple && APPLE_KEYS.get(key)) || key);
  const kbd = (text: string, className = '') => {
    const element = document.createElement('kbd');
    element.className = className;
    element.textContent = text;
    return element;
  };

  const hint = document.createElement('span');
  hint.className = 'sidebar-keys';
  hint.setAttribute('aria-hidden', 'true');
  hint.append(kbd('↑ ↓', 'sidebar-keys-move'), kbd(keys.join(' ')));
  root.querySelector('.sidebar-heading, .toc-heading')?.before(hint);
};

/**
 * Arrow keys within a sidebar, and a shortcut to its tab stop from anywhere on
 * the page. The shortcuts are Alt+Shift chords because browsers claim most
 * Ctrl+Shift letters — Ctrl+Shift+I is DevTools — and Firefox gives Alt+Shift
 * to the page's own access keys. `aria-keyshortcuts` and the visible hint are
 * added here, not in the markup, so nothing advertises a shortcut without a
 * handler behind it.
 */
const mountSidebarKeys = (
  root: HTMLElement,
  shortcut: { combo: KeyCombo; label: string },
  reveal?: () => void,
) => {
  initRovingTabindex(root, {
    ...sidebarGroup,
    initial: root.querySelector('[aria-current="page"], [data-active]'),
  });
  root.addEventListener('keydown', (event) => keyRove(event, sidebarGroup));
  root.addEventListener('focusin', (event) => followFocus(event, sidebarGroup));
  root.setAttribute('aria-keyshortcuts', shortcut.label);
  renderKeysHint(root, shortcut.label);

  document.addEventListener('keydown', (event) => {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      !matchesCombo(event, shortcut.combo) ||
      document.querySelector('dialog[open]')
    )
      return;
    reveal?.();
    if (!isShown(root)) return;
    const target = root.querySelector<HTMLElement>('[tabindex="0"]');
    if (target)
      keyRove(event, {
        ...sidebarGroup,
        focusKeys: { [shortcut.combo]: target },
      });
  });
};

/** Sidebar drawer. Below `lg` the aside is off-canvas until this opens it. */
export const mountSidebar = () => {
  const toggle = document.querySelector<HTMLButtonElement>(
    '[data-sidebar-toggle]',
  );
  const sidebar = document.querySelector<HTMLElement>('#docs-sidebar');
  const backdrop = document.querySelector<HTMLElement>('[data-sidebar-close]');
  if (!toggle || !sidebar || !backdrop) return;

  const setOpen = (open: boolean) => {
    const wasOpen = document.documentElement.hasAttribute('data-sidebar-open');
    document.documentElement.toggleAttribute('data-sidebar-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    backdrop.hidden = !open;
    toggle.setAttribute(
      'aria-label',
      open ? 'Close navigation' : 'Open navigation',
    );
    // A closed drawer is hidden, and focus inside it would go with it. Only on
    // an actual close, so the call at mount leaves early focus where it is.
    if (
      wasOpen &&
      !open &&
      sidebar.contains(document.activeElement) &&
      isShown(toggle)
    )
      toggle.focus();
  };

  toggle.addEventListener('click', () => {
    setOpen(!document.documentElement.hasAttribute('data-sidebar-open'));
  });

  backdrop.addEventListener('click', () => setOpen(false));

  // Navigating within the drawer should not leave it covering the page it just
  // moved to — which matters most for same-page anchors, where nothing reloads.
  sidebar.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) setOpen(false);
  });

  // Escape closes the top layer only: with search open over the drawer, the
  // dialog takes the press and hands focus back to the drawer it came from.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.querySelector('dialog[open]'))
      setOpen(false);
  });

  setOpen(false);
  mountSidebarKeys(
    sidebar,
    { combo: 'alt+shift+KeyE', label: 'Alt+Shift+E' },
    () => {
      if (isShown(toggle)) setOpen(true);
    },
  );
};

/**
 * Highlights the rail entry for the section currently under the header.
 *
 * A scroll position read beats `IntersectionObserver` here: the answer is
 * "which heading did we last pass", and short trailing sections never grow tall
 * enough to satisfy an observer threshold at all.
 */
export const mountTableOfContents = () => {
  const toc = document.querySelector<HTMLElement>('.toc');
  if (!toc) return;
  const links = [...toc.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')];
  if (links.length === 0) return;

  const targets = links
    .map((link) => ({
      link,
      heading: document.querySelector<HTMLElement>(
        `#${CSS.escape(link.hash.slice(1))}`,
      ),
    }))
    .filter(
      (entry): entry is { link: HTMLAnchorElement; heading: HTMLElement } =>
        Boolean(entry.heading),
    );
  if (targets.length === 0) return;

  // Clears the sticky header plus a little breathing room, so a heading counts
  // as current from the moment it settles under the bar.
  const OFFSET = 96;

  const update = () => {
    const scrolledToBottom =
      window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;

    // The last section can be too short to ever reach the offset, so the bottom
    // of the page selects it outright.
    const active = scrolledToBottom
      ? targets[targets.length - 1]
      : ([...targets]
          .reverse()
          .find(
            ({ heading }) => heading.getBoundingClientRect().top <= OFFSET,
          ) ?? targets[0]);

    for (const { link } of targets) {
      link.toggleAttribute('data-active', link === active.link);
    }

    // The tab stop follows the highlight, so Tab and the shortcut land on the
    // section in view — until focus is in the rail, where it is the reader's.
    if (!toc.contains(document.activeElement))
      initRovingTabindex(toc, { ...sidebarGroup, initial: active.link });
  };

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  update();
  mountSidebarKeys(toc, { combo: 'alt+shift+KeyO', label: 'Alt+Shift+O' });
};

/**
 * "Copy page" — fetches the page's own `.md` twin and puts it on the clipboard.
 *
 * Fetching rather than serialising the DOM means what lands on the clipboard is
 * the same document an agent would get from the URL, not a reconstruction of it.
 */
export const mountCopyMarkdown = () => {
  const button = document.querySelector<HTMLButtonElement>(
    '[data-copy-markdown]',
  );
  const label = button?.querySelector('[data-copy-label]');
  if (!button || !label) return;

  const href = button.dataset.copyMarkdown ?? '';
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  // Both glyphs are already in the button; `data-copied` is what picks between
  // them, so confirming a copy costs no DOM construction.
  const flash = (text: string, copied: boolean) => {
    label.textContent = text;
    button.toggleAttribute('data-copied', copied);

    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      label.textContent = 'Copy page';
      button.removeAttribute('data-copied');
    }, 2000);
  };

  button.addEventListener('click', async () => {
    try {
      const response = await fetch(href);
      if (!response.ok) throw new Error(String(response.status));

      await navigator.clipboard.writeText(await response.text());
      flash('Copied', true);
    } catch {
      // Clipboard access can be refused outright; the link beside this button
      // still gets the reader to the same file.
      flash('Copy failed', false);
    }
  });
};
