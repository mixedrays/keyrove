import type { PageInfo } from 'virtual:docs/site';

import { createHrefResolver, toMarkdownPath } from '../../build/paths.ts';
import { Icon } from '@/components/icon.tsx';
import { SiteLink } from '@/components/site-link.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useFlash } from '@/lib/utils.ts';

const resolveHref = createHrefResolver(import.meta.env.BASE_URL);

/**
 * "Copy page" — fetches the page's own `.md` twin and puts it on the clipboard.
 *
 * Fetching rather than serialising the DOM means what lands on the clipboard is
 * the same document an agent would get from the URL, not a reconstruction of it.
 */
function CopyPageButton({ href }: { href: string }) {
  const [label, flash] = useFlash('Copy page');

  const copy = async () => {
    try {
      const response = await fetch(resolveHref(href));
      if (!response.ok) throw new Error(String(response.status));

      await navigator.clipboard.writeText(await response.text());
      flash('Copied');
    } catch {
      // Clipboard access can be refused outright; the link beside this button
      // still gets the reader to the same file.
      flash('Copy failed');
    }
  };

  // Both glyphs are in the button; `data-copied` is what picks between them.
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

/**
 * The page's own source, in three forms: the markdown twin, the same file on
 * the clipboard, and the file in the repo.
 *
 * These sit between the title and the lead rather than at the foot of the "On
 * this page" rail, which is hidden below `xl` — where they used to live, a
 * narrow screen lost them along with the rail.
 *
 * Every label is wrapped, icons are not: the underline is drawn on the span so
 * it stops at the text instead of running under the glyph beside it.
 */
export function PageActions({ page }: { page: PageInfo }) {
  const markdownHref = `/${toMarkdownPath(page.route)}`;

  return (
    <div className="page-actions">
      <SiteLink href={markdownHref} className="page-action">
        <Icon name="markdown" className="size-3.5" />
        <span>View as Markdown</span>
      </SiteLink>
      <CopyPageButton href={markdownHref} />
      <a href={page.sourceUrl} className="page-action">
        <Icon name="github" className="size-3.5" />
        <span>View source</span>
      </a>
    </div>
  );
}
