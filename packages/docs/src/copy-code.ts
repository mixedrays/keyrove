/**
 * "Copy code" — the button on a demo's source and on any block whose fence
 * asks for one (see build/markdown.ts).
 *
 * It copies the block's own text, rather than a second copy of it held in an
 * attribute, so what lands on the clipboard is what is on screen. The button
 * sits beside the code in one container; where that container is a tabbed
 * panel, the block is whichever tab is showing, so it is looked up on the
 * click rather than once.
 */
export const mountCopyCode = () => {
  const buttons =
    document.querySelectorAll<HTMLButtonElement>('[data-copy-code]');

  for (const button of buttons) {
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    button.addEventListener('click', async () => {
      const code = Array.from(
        button.parentElement?.querySelectorAll('pre') ?? [],
      ).find((pre) => !pre.closest('[hidden]'));
      if (!code) return;

      try {
        await navigator.clipboard.writeText(code.textContent ?? '');
      } catch {
        // Clipboard access can be refused outright; the code is on the page
        // either way, so there is nothing to fall back to.
        return;
      }

      // Both glyphs are already in the button; `data-copied` is what picks
      // between them, so confirming a copy costs no DOM construction.
      button.toggleAttribute('data-copied', true);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(
        () => button.removeAttribute('data-copied'),
        2000,
      );
    });
  }
};
