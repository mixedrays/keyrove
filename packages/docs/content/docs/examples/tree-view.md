---
title: Tree view
description: A collapsible tree menu — keyrove walks the rows that are showing, and a few lines of your own open and close folders on Left and Right, first from attributes, then as a full ARIA tree view.
titleTag: Accessible tree view with keyboard navigation — keyrove
group: Examples
order: 15.5
---

A tree is a list whose rows can hold more rows: a docs sidebar, a file
explorer, a settings menu with sections that fold away. keyrove walks it the
way it walks any list, over the rows that are showing. Opening and closing a
folder changes which rows those are, and that part is yours.

The smallest tree is a sidebar described in attributes, like the
[basic list](/docs/examples/basic). <kbd class="kbd">↑</kbd>
<kbd class="kbd">↓</kbd> walk the rows on screen, <kbd class="kbd">→</kbd> opens
a folder and <kbd class="kbd">←</kbd> closes it. A folder is a button, so
<kbd class="kbd">Enter</kbd>, <kbd class="kbd">Space</kbd> and a click open and
close it too.

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

Every row is a `data-keyrove-item`, folder or page, so the arrows walk them in
document order as they would a flat list. The item is the row's button rather
than its `<li>`: keyrove counts an item as focused while focus is anywhere
inside it, and where items nest, the outer one wins, so an `<li>` wrapping a
folder's pages would hold the position for every one of them.

A closed folder's pages are still in the document, so they are still items.
`data-keyrove-skip` is what the arrows pass them over by — the attribute
[skipped items](/docs/examples/skipped-items) uses for headings — and `setOpen`
keeps it in step: after a folder opens or closes, every row inside a `hidden`
list is skipped and every other row is not.

`fold` claims <kbd class="kbd">←</kbd> and <kbd class="kbd">→</kbd> only on a
folder they would change. On a page, or on a folder that is already open or
closed, it returns `null` and the browser keeps the key.

## Why ← and → are not keyrove's

keyrove's moves are strides along one sequence: the next item, the previous
one, an end, a page. Opening a folder does not move along the sequence; it
changes the sequence. Stepping out to a parent, which the full tree below adds,
jumps back over however many rows the folder is showing. Neither is a stride,
so neither is a binding. They belong to the widget, like the listbox's
[pick](/docs/examples/listbox#the-pieces).

A vertical list binds <kbd class="kbd">↑</kbd> and <kbd class="kbd">↓</kbd>
and leaves <kbd class="kbd">←</kbd> and <kbd class="kbd">→</kbd> alone, which
is why they reach your handler at all: `keyRove` returns `null` for them, and
the `||` passes them on.

## A full tree view

The sidebar is a list of buttons that happen to fold. A tree view is one
control to assistive technology as well as to the keyboard: `role="tree"`, one
tab stop, typeahead, and arrows that also step into a folder and back out of
it, as the [APG tree pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)
describes. The file explorer below is that widget. Its group is described in
[options](/docs/examples/javascript-options) rather than attributes, so a
row's skip is read off the tree's own state instead of kept in step with it.

<kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> walk the rows on screen, and
<kbd class="kbd">Home</kbd> and <kbd class="kbd">End</kbd> jump to the first
and last. <kbd class="kbd">→</kbd> opens a closed folder, and on an open one
steps into its first row. <kbd class="kbd">←</kbd> closes an open folder, and
anywhere else steps out to the folder around it. Type a letter to jump to a
name, and click a folder to open or close it.

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

The log under the demo tells the two kinds of key apart. A green row is
keyrove's move, and an indigo row is the tree's own: a folder opening or
closing, or a step to a parent or into a child.

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

- **Enter.** The APG has <kbd class="kbd">Enter</kbd> perform a row's default
  action: open the file, or open or close the folder. In the full tree that is
  one more case in `branch`, on `matchesCombo(e, 'Enter')`; the sidebar's
  buttons have it already.
- **Selection.** A tree that selects carries `aria-selected` on its rows, and
  picking one is the [listbox](/docs/examples/listbox)'s `pick`, unchanged.
  Add `aria-multiselectable="true"` to the tree to select more than one row.
- **Rows loaded on open.** Fill a folder's group before un-hiding it. The rows
  are read on every keypress, so rows that arrive join the order with nothing
  to call.
- **<kbd class="kbd">\*</kbd> to open siblings.** The APG's optional
  <kbd class="kbd">\*</kbd> opens every folder beside the focused row: call
  `toggle(folder, true)` on each folder in the same group.
