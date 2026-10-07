import { Link } from '@tanstack/react-router';
import type { ComponentProps } from 'react';

import { createHrefResolver } from '../../build/paths.ts';

const resolveHref = createHrefResolver(import.meta.env.BASE_URL);

/**
 * A file the site serves rather than a page — `/llms.txt`, `/docs/api.md` —
 * which the router has nothing to render for.
 */
const isFile = (path: string) => /\.\w+$/.test(path);

/**
 * A site-absolute link, the way content and chrome both write them:
 * `/docs/api#followfocus`.
 *
 * A page goes through the router, so following it swaps the page in place and
 * hovering it loads the page ahead of the click. A file stays a plain link the
 * browser fetches. Either way the deploy base is prefixed here, once.
 */
export function SiteLink({
  href,
  ...props
}: { href: string } & Omit<ComponentProps<'a'>, 'href'>) {
  const [path, hash] = href.split('#');

  if (!href.startsWith('/') || isFile(path)) {
    return (
      <a href={href.startsWith('/') ? resolveHref(href) : href} {...props} />
    );
  }

  return (
    <Link
      to={path}
      hash={hash}
      // The router marks an active link with `aria-current="page"`. Only one
      // that leads to exactly where the reader is should say so: the page
      // itself, or — for a link to a section — that section of it.
      activeOptions={{ exact: true, includeHash: hash !== undefined }}
      // Nothing styles the router's default `active` class; `aria-current` is
      // what the sidebar's current page is drawn from.
      activeProps={{}}
      {...props}
    />
  );
}
