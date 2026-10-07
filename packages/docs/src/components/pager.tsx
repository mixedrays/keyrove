import { pages, readingOrder } from 'virtual:docs/site';

import { SiteLink } from '@/components/site-link.tsx';

function Side({
  route,
  label,
  align,
}: {
  route: string | undefined;
  label: string;
  align: string;
}) {
  if (route === undefined) return <span />;

  return (
    <SiteLink href={`/${route}`} className={`pager-link ${align}`}>
      <span className="pager-label">{label}</span>
      <span className="pager-title">{pages[route].title}</span>
    </SiteLink>
  );
}

/** Previous and next, in sidebar order. */
export function Pager({ route }: { route: string }) {
  const index = readingOrder.indexOf(route);
  // A page outside the sidebar — the 404 — has no siblings to page between,
  // and index -1 would otherwise offer the first page as its "next".
  if (index === -1) return null;

  const prev = readingOrder[index - 1];
  const next = readingOrder[index + 1];
  if (prev === undefined && next === undefined) return null;

  return (
    <nav className="pager" aria-label="Pagination">
      <Side route={prev} label="Previous" align="items-start" />
      <Side route={next} label="Next" align="items-end text-right" />
    </nav>
  );
}
