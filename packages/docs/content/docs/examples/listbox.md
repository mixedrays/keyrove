---
title: Listbox
description: A complete widget — a single-select listbox with roving tabindex, typeahead, Space and Enter to pick, and the ARIA keyrove leaves to you.
titleTag: Accessible listbox with keyboard navigation — keyrove
group: Examples
order: 22
---

Every page so far shows one attribute at a time. This one puts them together
into a widget a user would actually meet: a listbox that picks one person from
a team. keyrove moves focus inside it; the role, the selection and the click are
the widget's own, and the snippet under the demo is all of them.

<kbd class="kbd">Tab</kbd> into it and arrow around, type a first letter to
jump, then press <kbd class="kbd">Space</kbd> or <kbd class="kbd">Enter</kbd>
to pick. Clicking picks too. <kbd class="kbd">Tab</kbd> away and back, and
focus returns to where you left it.

<div data-demo="listbox"></div>

```ts
import {
  createTypeahead,
  keyRove,
  matchesCombo,
  toggleTabIndex,
} from '@mixedrays/keyrove';

const listbox = document.querySelector('#assignee');
const typeahead = createTypeahead();

const select = (option) => {
  for (const each of listbox.querySelectorAll('[role="option"]')) {
    each.setAttribute('aria-selected', String(each === option));
  }
};

const pick = (e) => {
  if (!matchesCombo(e, 'Space') && !matchesCombo(e, 'Enter')) return null;

  const option = e.target.closest('[role="option"]');
  if (!option) return null;

  e.preventDefault();
  select(option);

  return option;
};

listbox.addEventListener('keydown', (e) => {
  keyRove(e) || typeahead(e) || pick(e);
});

listbox.addEventListener('click', (e) => {
  const option = e.target.closest('[role="option"]');
  if (!option) return;

  const stop = listbox.querySelector('[tabindex="0"]');
  toggleTabIndex({ root: stop, isActive: false });
  toggleTabIndex({ root: option, isActive: true });
  select(option);
});
```

The log under the demo reports a pick beside the moves, so the two kinds of
key can be told apart.

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
- **Typeahead.** `createTypeahead()` second in the chain, after navigation and
  before the widget's own keys, so a letter jumps and a bound key never becomes
  typing. See [typeahead](/docs/examples/typeahead).
- **Picking.** Third in the chain, and the first piece that is the widget's
  rather than keyrove's. `matchesCombo` is the matcher behind every binding,
  exported for exactly this; it is exact, so
  <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Space</kbd> keeps its browser
  default. `pick` keeps the contract of the two handlers before it, `null` for
  a key it left alone, so a fourth handler could chain on.
- **The mouse.** A click focuses an option natively, which `tabindex="-1"`
  allows, but it leaves the tab stop where the keyboard last put it, and
  <kbd class="kbd">Tab</kbd> away and back would return to the wrong option.
  keyrove moves the stop only on the moves it makes, so the click handler moves
  it with `toggleTabIndex` and then picks.

## Selection that follows focus

The APG allows a single-select listbox to select the focused option as focus
moves. `onMove` is the hook, on both handlers, and the picking handler goes:

```ts
const onMove = ({ to }) => select(to);

const typeahead = createTypeahead({ onMove });

listbox.addEventListener('keydown', (e) => {
  keyRove(e, { onMove }) || typeahead(e);
});
```

Choose it when picking is cheap and reversible, a filter or a sort order. When
a pick submits a form or loads a page, keep the explicit key: an arrow press
should be safe to make.

## Variations

- **Multi-select.** Add `aria-multiselectable="true"` to the list and make
  `pick` toggle the focused option's `aria-selected` instead of moving a single
  selection. Nothing about navigation changes.
- **A grid of options.** `data-keyrove-cols` on the list turns the same options
  into a [grid](/docs/examples/grid), with `role="grid"` and
  `role="gridcell"` taking over from the listbox roles. The chain is unchanged.
- **`aria-activedescendant`.** The other listbox model keeps DOM focus on the
  container and moves a virtual cursor with `aria-activedescendant`. keyrove
  moves real focus, so it does not implement that model; the roving stop above
  is its equivalent.
