/**
 * Buttons that put a command on the clipboard — the install line on the
 * landing page.
 *
 * The command is written out beside the button, so this only saves the
 * selecting: with scripting off, or the clipboard refused, it can still be
 * copied by hand.
 */
export const mountCopyCommands = () => {
  const buttons = document.querySelectorAll<HTMLButtonElement>(
    '[data-copy-command]',
  );

  for (const button of buttons) {
    const idle = button.textContent;
    const command = button.dataset.copyCommand ?? '';
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    const flash = (text: string) => {
      button.textContent = text;

      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        button.textContent = idle;
      }, 2000);
    };

    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(command);
        flash('copied');
      } catch {
        flash('failed');
      }
    });
  }
};
