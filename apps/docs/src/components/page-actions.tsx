import type { PageInfo } from 'virtual:docs/site';

import { twinPath } from '../../build/addresses.ts';
import { addresses } from '@/addresses.ts';
import { Icon } from '@/components/icon.tsx';
import { SiteLink } from '@/components/site-link.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useFlash } from '@/lib/utils.ts';

// Fetches the twin rather than serialising the DOM: the same document an
// agent gets from the URL.
function CopyPageButton({ href }: { href: string }) {
  const [label, flash] = useFlash('Copy page');

  const copy = async () => {
    try {
      const response = await fetch(addresses.href(href));
      if (!response.ok) throw new Error(String(response.status));

      await navigator.clipboard.writeText(await response.text());
      flash('Copied');
    } catch {
      // Refused clipboard: the link beside still reaches the file.
      flash('Copy failed');
    }
  };

  return (
    <Button
      className="page-action"
      data-copied={label === 'Copied' ? '' : undefined}
      onClick={copy}
    >
      <Icon name="copy" className="size-3.5 icon-idle" />
      <Icon name="check" className="size-3.5 icon-done" />
      <span>{label}</span>
    </Button>
  );
}

// Not in the rail, which is hidden below `xl`. Labels are wrapped so the
// underline stops at the text, not under the glyph.
export function PageActions({ page }: { page: PageInfo }) {
  const twin = twinPath(page.route);

  return (
    <div className="page-actions">
      <SiteLink href={twin} className="page-action">
        <Icon name="markdown" className="size-3.5" />
        <span>View as Markdown</span>
      </SiteLink>
      <CopyPageButton href={twin} />
      <a href={page.sourceUrl} className="page-action">
        <Icon name="github" className="size-3.5" />
        <span>View source</span>
      </a>
    </div>
  );
}
