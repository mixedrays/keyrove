import type { MouseEvent, ReactNode } from 'react';

import { Icon } from '@/components/icon.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useFlash } from '@/lib/utils.ts';

/** The copy glyph and the tick it turns into; style.css shows one at a time. */
const Glyphs = () => (
  <>
    <Icon name="copy" className="size-3.5 icon-idle" />
    <Icon name="check" className="size-3.5 icon-done" />
  </>
);

/**
 * "Copy code" — the button on a demo's source and on any block whose fence
 * asks for one (see build/markdown.ts).
 *
 * It copies the block's own text, rather than a second copy of it held in a
 * prop, so what lands on the clipboard is what is on screen. The button sits
 * beside the code in one container; where that container is a tabbed panel,
 * the block is whichever tab is showing, so it is looked up on the click
 * rather than once.
 */
export function CopyCodeButton({ label }: { label: string }) {
  const [copied, flash] = useFlash(false);

  const copy = async (e: MouseEvent<HTMLButtonElement>) => {
    const code = Array.from(
      e.currentTarget.parentElement?.querySelectorAll('pre') ?? [],
    ).find((pre) => !pre.closest('[hidden]'));
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code.textContent ?? '');
    } catch {
      // Clipboard access can be refused outright; the code is on the page
      // either way, so there is nothing to fall back to.
      return;
    }

    flash(true);
  };

  return (
    <Button
      variant="copy"
      aria-label={label}
      data-copied={copied ? '' : undefined}
      onClick={copy}
    >
      <Glyphs />
    </Button>
  );
}

/**
 * A button that puts a command on the clipboard — the install line on the
 * landing page.
 *
 * The command is written out beside the button, so this only saves the
 * selecting: with scripting off, or the clipboard refused, it can still be
 * copied by hand. It is drawn as the code blocks' copy button is, a copy
 * glyph that turns into a tick, so the page has one way of saying "copied".
 */
export function CopyCommandButton({
  command,
  label,
  children,
}: {
  command: string;
  label: string;
  children: ReactNode;
}) {
  const [copied, flash] = useFlash(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // Clipboard access can be refused outright; the command is on the
      // page either way, so there is nothing to fall back to.
      return;
    }

    flash(true);
  };

  return (
    <Button
      aria-label={label}
      data-copied={copied ? '' : undefined}
      onClick={copy}
    >
      {children}
    </Button>
  );
}
