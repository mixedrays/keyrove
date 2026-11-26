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

// Copies the block's own text, looked up on click since a tabbed panel's
// visible block changes.
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
      // Refused clipboard: the code is on the page anyway.
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
      // Refused clipboard: the command is on the page anyway.
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
