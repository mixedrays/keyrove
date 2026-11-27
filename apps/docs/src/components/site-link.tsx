import { Link } from '@tanstack/react-router';
import type { ComponentProps } from 'react';

import { addresses } from '@/addresses.ts';

// The router has nothing to render for `/llms.txt` or `/docs/api.md`.
const isFile = (path: string) => /\.\w+$/.test(path);

/** Prefixes the deploy base, once. Files stay plain links. */
export function SiteLink({
  href,
  ...props
}: { href: string } & Omit<ComponentProps<'a'>, 'href'>) {
  const [path, hash] = href.split('#');

  if (!href.startsWith('/') || isFile(path)) {
    return (
      <a href={href.startsWith('/') ? addresses.href(href) : href} {...props} />
    );
  }

  return (
    <Link
      to={path}
      hash={hash}
      // `aria-current` only on a link to exactly where the reader is.
      activeOptions={{ exact: true, includeHash: hash !== undefined }}
      // Styled off `aria-current`, not the `active` class.
      activeProps={{}}
      {...props}
    />
  );
}
