import type { Options } from 'minisearch';

export type SearchDocument = {
  id: string;
  title: string;
  heading: string;
  text: string;
  url: string;
};

/** Shared by the build-time index and the lazily loaded browser engine. */
export const searchOptions: Options<SearchDocument> = {
  fields: ['title', 'heading', 'text'],
  storeFields: ['title', 'heading', 'text', 'url'],
  searchOptions: {
    boost: { title: 4, heading: 6 },
    prefix: true,
    fuzzy: (term) => (term.length > 3 ? 0.2 : false),
    combineWith: 'AND',
  },
};
