import MiniSearch from 'minisearch';

import { searchOptions, type SearchDocument } from '../src/search-model.ts';
import type { Page } from './content.ts';
import { expandDemos, type Demos } from './demos.ts';
import { collectSearchSections } from './markdown.ts';
import { expandMeta } from './meta.ts';

export const toSearchIndex = (pages: Page[], demos: Demos): string => {
  const documents: SearchDocument[] = pages
    .filter((page) => page.layout === 'docs' && !page.noindex)
    .flatMap((page) =>
      collectSearchSections(
        expandMeta(expandDemos(page.body, demos, 'markdown')),
      ).map((section) => {
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
