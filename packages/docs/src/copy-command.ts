/**
 * Buttons that put a command on the clipboard — the install line on the
 * landing page.
 *
 * The command is written out beside the button, so this only saves the
 * selecting: with scripting off, or the clipboard refused, it can still be
 * copied by hand.
 *
 * The button is drawn as the code blocks' copy button is, a copy glyph that
 * turns into a tick, so the page has one way of saying "copied" rather than
 * two. Both glyphs are already in the markup and `data-copied` picks between
 * them, exactly as src/copy-code.ts does.
 */
export const mountCopyCommands = () => {
  const buttons = document.querySelectorAll<HTMLButtonElement>(
    '[data-copy-command]',
  );

  for (const button of buttons) {
    const command = button.dataset.copyCommand ?? '';
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(command);
      } catch {
        // Clipboard access can be refused outright; the command is on the
        // page either way, so there is nothing to fall back to.
        return;
      }

      button.toggleAttribute('data-copied', true);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(
        () => button.removeAttribute('data-copied'),
        2000,
      );
    });
  }
};
