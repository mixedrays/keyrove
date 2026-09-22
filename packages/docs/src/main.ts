import { mountCodeTabs } from './code-tabs.ts';
import { mountCopyCommands } from './copy-command.ts';
import { mountDemos } from './demos.ts';
import {
  mountCopyMarkdown,
  mountSidebar,
  mountTableOfContents,
} from './nav.ts';
import { mountThemeToggle } from './theme.ts';
import { mountSearch } from './search.ts';

/**
 * One entry for every page.
 *
 * The pages themselves are generated from markdown at build time (see
 * vite-plugin-docs.ts), so this file only enhances markup that already
 * rendered: it wires the chrome and builds whichever demos the current page
 * embedded. Each mount is a no-op when its markup is absent, which is what lets
 * the landing page and a docs page share one bundle.
 *
 * Icons are inlined into the HTML at build time, so none of them wait on this.
 *
 * The stylesheet is linked from the page rather than imported here, so that it
 * blocks the first paint in dev as well as in the build.
 */

mountThemeToggle();
mountSearch();
mountSidebar();
mountTableOfContents();
mountCopyMarkdown();
mountCodeTabs();
mountCopyCommands();
mountDemos();
