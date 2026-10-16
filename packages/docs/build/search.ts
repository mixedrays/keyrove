import MiniSearch from 'minisearch';

import { searchOptions, type SearchDocument } from '../src/search-model.ts';
import type { RenderedPage } from './page-render.ts';

export const toSearchIndex = (rendered: RenderedPage[]): string => {
  const documents: SearchDocument[] = rendered
    .filter(({ page }) => page.layout === 'docs' && !page.noindex)
    .flatMap(({ page, sections }) =>
      sections.map((section) => {
        const url = `/${page.route}${section.id ? `#${section.id}` : ''}`;
        return {
          id: url,
          url,
          title: page.title,
          heading: section.heading,
          text: section.id
            ? section.text
            : `${page.description} ${section.text}`.trim(),
        };
      }),
    );

  const index = new MiniSearch<SearchDocument>(searchOptions);
  index.addAll(documents);
  return JSON.stringify(index);
};
