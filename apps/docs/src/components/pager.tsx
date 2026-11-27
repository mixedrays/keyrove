import { pages, readingOrder } from 'virtual:docs/site';

import { pagePath } from '../../build/addresses.ts';
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
    <SiteLink href={pagePath(route)} className={`pager-link ${align}`}>
      <span className="pager-label">{label}</span>
      <span className="pager-title">{pages[route].title}</span>
    </SiteLink>
  );
}

export function Pager({ route }: { route: string }) {
  const index = readingOrder.indexOf(route);
  // The 404 is outside the sidebar; -1 would offer the first page as "next".
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
