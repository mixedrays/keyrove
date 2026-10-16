import type { Page } from '../build/content.ts';

/** A docs page that exists only in a test, with the fields a content file would set. */
export const page = (
  route: string,
  body: string,
  fields: Partial<Page> = {},
): Page => ({
  route,
  body,
  noindex: false,
  title: 'Guide',
  description: '',
  layout: 'docs',
  file: '',
  titleTag: null,
  group: null,
  order: 0,
  keywords: [],
  lastModified: null,
  ...fields,
});
