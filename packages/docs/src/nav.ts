/**
 * The docs chrome: the mobile sidebar drawer, the "On this page" rail, and the
 * button that hands the page's markdown to the clipboard.
 *
 * All three are progressive enhancements over markup that is already complete —
 * the sidebar is a plain nav, the rail is a list of anchors, and the copy
 * button sits beside a link to the same file.
 */

/** Sidebar drawer. Below `lg` the aside is off-canvas until this opens it. */
export const mountSidebar = () => {
  const toggle = document.querySelector<HTMLButtonElement>(
    '[data-sidebar-toggle]',
  );
  const sidebar = document.querySelector<HTMLElement>('#docs-sidebar');
  const backdrop = document.querySelector<HTMLElement>('[data-sidebar-close]');
  if (!toggle || !sidebar || !backdrop) return;

  const setOpen = (open: boolean) => {
    document.documentElement.toggleAttribute('data-sidebar-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    backdrop.hidden = !open;
    toggle.setAttribute(
      'aria-label',
      open ? 'Close navigation' : 'Open navigation',
    );
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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  setOpen(false);
};

/**
 * Highlights the rail entry for the section currently under the header.
 *
 * A scroll position read beats `IntersectionObserver` here: the answer is
 * "which heading did we last pass", and short trailing sections never grow tall
 * enough to satisfy an observer threshold at all.
 */
export const mountTableOfContents = () => {
  const links = [
    ...document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'),
  ];
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
