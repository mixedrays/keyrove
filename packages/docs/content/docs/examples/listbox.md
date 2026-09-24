---
# Live page: https://keyrove.pages.dev/docs/examples/listbox
title: Listbox
description: Build a single-select listbox with keyboard navigation, typeahead, roving tabindex and explicit selection, while your widget supplies the ARIA roles.
keywords: [listbox, single select, aria-selected, typeahead, roving tabindex]
titleTag: Accessible listbox with keyboard navigation — keyrove
group: Examples
order: 23
---

This single-select listbox combines navigation, roving tabindex and typeahead.
The widget supplies ARIA roles, selection and click handling.

<kbd class="kbd">Tab</kbd> into it and arrow around, type a first letter to
jump, then press <kbd class="kbd">Enter</kbd> to pick. <kbd class="kbd">Space</kbd> also selects
when typeahead is inactive; wait 500 ms after typing to use it. Clicking picks
too. <kbd class="kbd">Tab</kbd> away and back, and focus returns to where you
left it.

<div data-demo="listbox" data-demo-label="assignee"></div>

```ts
import {
  createTypeahead,
  followFocus,
  keyRove,
  matchesCombo,
} from '@mixedrays/keyrove';

const listbox = document.querySelector('#assignee');
const typeahead = createTypeahead();

const select = (option) => {
  for (const each of listbox.querySelectorAll('[role="option"]')) {
    each.setAttribute('aria-selected', String(each === option));
  }
};

const pick = (e) => {
  if (!matchesCombo(e, 'Space, Enter')) return null;

  const option = e.target.closest('[role="option"]');
  if (!option) return null;

  e.preventDefault();
  select(option);

  return option;
};

listbox.addEventListener('keydown', (e) => {
  keyRove(e) || typeahead(e) || pick(e);
});

listbox.addEventListener('focusin', (e) => followFocus(e));

listbox.addEventListener('click', (e) => {
  const option = e.target.closest('[role="option"]');
  if (option) select(option);
});
```

The readout tells selection from focus movement by its verb:
<kbd class="kbd">↓</kbd> from _Ada Lovelace_ reads _next → Alan Turing_, and
<kbd class="kbd">Enter</kbd> then reads _selected → Alan Turing_.

## The pieces

- **The markup.** `role="listbox"` on the list, `role="option"` and
  `aria-selected` on every item, `aria-label` on the widget. This is what makes
  it a listbox to assistive technology, and keyrove neither reads nor writes
  any of it: roles and states are
  [left to you](/docs/introduction#what-it-leaves-to-you) because what they
  should say depends on the widget.
- **Navigation.** `data-keyrove-item` on every option and `keyRove` first in
  the chain. The arrows, <kbd class="kbd">Home</kbd>, <kbd class="kbd">End</kbd>
  and the page keys come with the [basic list](/docs/examples/basic), and they
  are the keys the
  [APG listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
  asks for. A listbox does not wrap, so there is no `data-keyrove-loop`.
- **One tab stop.** `data-keyrove-roving-tabindex` on every option,
  `tabindex="0"` on the selected one and `-1` on the rest, so
  <kbd class="kbd">Tab</kbd> treats the whole list as one control.
  [Roving tabindex](/docs/examples/roving-tabindex) is the arrangement the APG
  describes for a composite widget, and keyrove carries the stop from here on.
  Options rendered from data can leave the `tabindex` out and have
  `initRovingTabindex` set the stop from the selection instead:
  `initRovingTabindex(listbox, { initial: listbox.querySelector('[aria-selected="true"]') })`.
- **Typeahead.** `createTypeahead()` second in the chain, after navigation and
  before the widget's own keys, so a letter jumps and a bound key never becomes
  typing. See [typeahead](/docs/examples/typeahead).
- **Picking.** `pick` runs after navigation and typeahead. It uses
  `matchesCombo` for exact <kbd class="kbd">Space</kbd>/<kbd class="kbd">Enter</kbd> matching, so <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Space</kbd> remains
  unhandled. It returns `null` for other keys, allowing another handler to
  follow it. Typeahead consumes <kbd class="kbd">Space</kbd> when it extends a matching prefix;
  otherwise, `pick` handles it.
- **The mouse.** `followFocus` updates the roving stop on `focusin`, including
  focus from clicks or code. The click handler then selects the option.

## Selection that follows focus

To select each option as keyboard navigation or typeahead focuses it, pass
`onMove` to both handlers. Replace the keydown chain above with:

```ts
const onMove = ({ to }) => select(to);

const typeahead = createTypeahead({ onMove });

listbox.addEventListener('keydown', (e) => {
  keyRove(e, { onMove }) || typeahead(e);
});
```

Use selection on focus for cheap, reversible changes such as filtering or
sorting. Keep explicit selection when it submits a form or loads a page.
`onMove` covers these handlers' moves; the separate click and `focusin`
listeners still handle pointer selection and the tab stop.

## Variations

- **Multi-select.** Add `aria-multiselectable="true"` to the list and make
  `pick` toggle the focused option's `aria-selected` instead of moving a single
  selection. Nothing about navigation changes.
- **A grid of options.** `data-keyrove-cols` adds
  [grid navigation](/docs/examples/grid). For an ARIA grid, use `role="grid"`
  with rows and cells (`role="row"` and `role="gridcell"`) and implement
  selection for those cells. The key handler chain can stay the same.
- **`aria-activedescendant`.** The other listbox model keeps DOM focus on the
  container and moves a virtual cursor with `aria-activedescendant`. keyrove
  moves real focus, so it does not implement that model; the roving stop above
  is its equivalent.
