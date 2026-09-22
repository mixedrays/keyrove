import MiniSearch from 'minisearch';
import { searchOptions, type SearchDocument } from './search-model.ts';

export const loadSearch = async (serialized: string) => {
  const index = await MiniSearch.loadJSONAsync<SearchDocument>(
    serialized,
    searchOptions,
  );
  return (query: string): SearchDocument[] =>
    index
      .search(query)
      .slice(0, 12)
      .map((result) => ({
        id: String(result.id),
        title: result.title,
        heading: result.heading,
        text: result.text,
        url: `${import.meta.env.BASE_URL}${result.url.slice(1)}`,
      }));
};
