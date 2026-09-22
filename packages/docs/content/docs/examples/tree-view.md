---
title: Tree view
description: Navigate visible tree rows and add branch controls, roving tabindex and typeahead.
titleTag: Accessible tree view with keyboard navigation — keyrove
group: Examples
order: 15.5
---

Use keyrove to navigate a tree's visible rows. Your widget handles opening
and closing branches and excludes hidden rows from navigation.

This sidebar uses attributes. <kbd class="kbd">↑</kbd>/<kbd class="kbd">↓</kbd> move between visible rows, <kbd class="kbd">→</kbd> opens a
folder, and <kbd class="kbd">←</kbd> closes it. Folders are buttons, so <kbd class="kbd">Enter</kbd>, <kbd class="kbd">Space</kbd> and clicks
also toggle them.

<div data-demo="sidebar"></div>

```ts
import { keyRove, matchesCombo } from '@mixedrays/keyrove';

const nav = document.querySelector('#docs-nav');

const setOpen = (folder, open) => {
  folder.setAttribute('aria-expanded', String(open));
  folder.nextElementSibling.hidden = !open;

  for (const item of nav.querySelectorAll('[data-keyrove-item]')) {
    item.toggleAttribute('data-keyrove-skip', !!item.closest('[hidden]'));
  }
};

const fold = (e) => {
  const open = matchesCombo(e, 'ArrowRight');
  if (!open && !matchesCombo(e, 'ArrowLeft')) return null;
  if (e.target.getAttribute('aria-expanded') !== String(!open)) return null;

  e.preventDefault();
  setOpen(e.target, open);

  return e.target;
};

nav.addEventListener('keydown', (e) => keyRove(e) || fold(e));

nav.addEventListener('click', (e) => {
  const folder = e.target.closest('[aria-expanded]');
  if (folder) setOpen(folder, folder.getAttribute('aria-expanded') === 'false');
});
```

Mark each row's button with `data-keyrove-item`. Avoid marking a `<li>` that
contains child items: when items nest, keyrove treats the first item in DOM
order that contains focus as the current item.

Hidden rows remain in the DOM. `setOpen` updates `data-keyrove-skip` after
each toggle so navigation passes over rows inside hidden lists. See
[skipped items](/docs/examples/skipped-items).

`fold` handles <kbd class="kbd">←</kbd>/<kbd class="kbd">→</kbd> only when they change a folder's state. On a page,
or when the folder is already in the requested state, it returns `null` and
leaves the key to the browser.

## Why <kbd class="kbd">←</kbd> and <kbd class="kbd">→</kbd> are not keyrove's

Expanding a branch and moving to a parent require knowledge of the tree's
structure. Add those actions in your widget's handler, as the listbox adds
[selection](/docs/examples/listbox#the-pieces).

A vertical list leaves <kbd class="kbd">←</kbd>/<kbd class="kbd">→</kbd> unbound. `keyRove` returns `null` for them,
so `keyRove(e) || fold(e)` passes them to your handler.

## A full tree view

The file explorer adds `role="tree"`, roving tabindex, typeahead and branch
navigation from the [APG tree pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/).
It uses [options](/docs/examples/javascript-options) to select rows and skip
hidden descendants directly from the DOM.

- <kbd class="kbd">↑</kbd>/<kbd class="kbd">↓</kbd> move between visible rows; <kbd class="kbd">Home</kbd>/<kbd class="kbd">End</kbd> move to the first/last.
- <kbd class="kbd">→</kbd> opens a closed folder or enters an open folder's first row.
- <kbd class="kbd">←</kbd> closes an open folder or moves to the parent folder.
- Typing finds a row by name. Clicking a folder toggles it.

<div data-demo="tree"></div>

```ts
import {
  createTypeahead,
  keyRove,
  matchesCombo,
  toggleTabIndex,
} from '@mixedrays/keyrove';

const tree = document.querySelector('#files');

const config = {
  items: '[role="treeitem"]',
  skip: '[hidden] [role="treeitem"]',
  rovingTabindex: true,
};

const typeahead = createTypeahead(config);

const groupOf = (item) =>
  document.getElementById(item.getAttribute('aria-owns'));

const parentOf = (item) =>
  item.closest('[role="group"]')?.previousElementSibling;

const toggle = (item, open) => {
  item.setAttribute('aria-expanded', String(open));
  groupOf(item).hidden = !open;
};

const moveTo = (from, to) => {
  toggleTabIndex({ root: from, isActive: false });
  toggleTabIndex({ root: to, isActive: true });
  to.focus();
};

const branch = (e) => {
  const item = e.target.closest('[role="treeitem"]');
  if (!item) return null;

  const expanded = item.getAttribute('aria-expanded'); // null on a file
  const parent = parentOf(item);

  if (matchesCombo(e, 'ArrowRight') && expanded === 'false') {
    toggle(item, true);
  } else if (matchesCombo(e, 'ArrowRight') && expanded === 'true') {
    moveTo(item, groupOf(item).querySelector('[role="treeitem"]'));
  } else if (matchesCombo(e, 'ArrowLeft') && expanded === 'true') {
    toggle(item, false);
  } else if (matchesCombo(e, 'ArrowLeft') && parent) {
    moveTo(item, parent);
  } else {
    return null;
  }

  e.preventDefault();

  return item;
};

tree.addEventListener('keydown', (e) => {
  keyRove(e, config) || typeahead(e) || branch(e);
});

tree.addEventListener('click', (e) => {
  const item = e.target.closest('[role="treeitem"]');
  if (!item) return;

  moveTo(tree.querySelector('[tabindex="0"]'), item);

  const expanded = item.getAttribute('aria-expanded');
  if (expanded) toggle(item, expanded === 'false');
});
```

The log shows keyrove moves in green and tree actions in indigo.

### The pieces

- **The markup.** `role="tree"` on the list, `role="treeitem"` on every row,
  `role="group"` on each folder's rows, and `role="none"` on the `<li>`
  elements between them, so their list semantics do not compete with the
  tree's. A folder carries `aria-expanded`, and a closed folder's group is
  `hidden`. The roles and states are
  [left to you](/docs/introduction#what-it-leaves-to-you); keyrove reads them
  here only because the config names the rows by their role.
- **Rows, not list items, are the treeitems.** For the reason the sidebar's
  buttons are its items, each row is a treeitem of its own, with its folder's
  group beside it rather than inside it. `aria-owns` ties the two together for
  assistive technology. That is the shape of the APG's
  [navigation treeview](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/examples/treeview-navigation/).
- **Navigation.** `items` names the rows, and `skip` passes over any row inside
  a `hidden` group. A closed folder's rows are still in the DOM, so they are
  still items; `skip` keeps <kbd class="kbd">↓</kbd>,
  <kbd class="kbd">End</kbd> and the page keys on the rows that are on screen.
  The selector is asked on every keypress, so opening a folder puts its rows in
  the order with nothing to call. See
  [skipped items](/docs/examples/skipped-items).
- **One tab stop.** `rovingTabindex: true`, with `tabindex="0"` on the first
  row and `-1` on the rest, so <kbd class="kbd">Tab</kbd> treats the tree as
  one control and comes back to the row you left. See
  [roving tabindex](/docs/examples/roving-tabindex).
- **Typeahead.** `createTypeahead` gets the same `config`, so it skips the
  hidden rows too. With _components_ closed, <kbd class="kbd">T</kbd> lands on
  _tsconfig.json_; open it, and <kbd class="kbd">T</kbd> finds _Tabs.tsx_
  first. See [typeahead](/docs/examples/typeahead).
- **Opening and closing.** `branch`, third in the chain, is the widget's own.
  It covers the four cases the APG gives the two arrows, and returns `null` for
  a key it leaves alone:
  <kbd class="kbd">→</kbd> on a file, or <kbd class="kbd">←</kbd> on a closed
  folder at the top. The browser keeps those keys, and a fourth handler could
  chain on.
- **The mouse.** A click focuses a row natively, but it leaves the tab stop
  where the keyboard last put it. The click handler moves the stop with
  `moveTo`, then opens or closes the folder it landed on.

## Variations

- **<kbd class="kbd">Enter</kbd>.** The APG has <kbd class="kbd">Enter</kbd> perform a row's default
  action: open the file, or open or close the folder. In the full tree that is
  one more case in `branch`, on `matchesCombo(e, 'Enter')`; the sidebar's
  buttons have it already.
- **Selection.** Add `aria-selected` to selectable rows and a selection
  handler like the [listbox's](/docs/examples/listbox#the-pieces). For multiple
  selection, add `aria-multiselectable="true"` and implement toggling each
  row's selection.
- **Rows loaded on open.** Fill a folder's group before un-hiding it. The rows
  are read on every keypress, so rows that arrive join the order with nothing
  to call.
- **<kbd class="kbd">\*</kbd> to open siblings.** The APG's optional
  <kbd class="kbd">\*</kbd> opens every folder beside the focused row: call
  `toggle(folder, true)` on each folder in the same group.
