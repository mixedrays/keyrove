---
title: Nested roots
description: A group inside a group — the nearest root wins, so an inner list navigates by its own keys while the list around it keeps its.
group: Examples
order: 16
---

Composite widgets nest: a menu with a row of reactions along the top, a settings
list with a colour-swatch grid between two of its rows. `data-keyrove-root`
marks a group, and the root keyrove navigates by is the _nearest_ one above the
focused element — so an inner group can sit inside an outer one and keep its own
keys, columns, and page size.

<kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> walk the menu, and
<kbd class="kbd">↑</kbd> from _Reply_ steps into the reaction row. Inside it,
<kbd class="kbd">←</kbd> <kbd class="kbd">→</kbd> move between reactions and
<kbd class="kbd">Escape</kbd> returns to the menu. The inner group is a root
with its own attributes; nothing else about it is special — the same
`data-keyrove-item` marks its items.

<div data-demo="nested"></div>

```ts
document
  .querySelector('#message-actions')
  .addEventListener('keydown', (e) => keyRove(e));
```

One listener, on the outer list. The inner group needs none of its own: the
keydown bubbles up to that listener, and `keyRove` resolves the root from the
event's _target_ rather than from the element the listener sits on.

That is also why the outer list here carries no `data-keyrove-root` — it is the
listener's element, which keyrove falls back to. Move the listener further up
(to a panel, or to `document`) and the outer group needs the attribute too.

## The nearest root wins

Root attributes are read off the group focus is currently in, and nothing is
inherited across the boundary:

```html
<div id="settings" data-keyrove-root data-keyrove-page-length="5">
  <div data-keyrove-item tabindex="0">Appearance</div>

  <!-- A swatch grid: 4 columns and 2-row pages apply in here only. -->
  <div data-keyrove-root data-keyrove-cols="4" data-keyrove-page-length="2">
    <button data-keyrove-item tabindex="0">Indigo</button>
    <button data-keyrove-item tabindex="0">Teal</button>
  </div>

  <div data-keyrove-item tabindex="0">Notifications</div>
</div>
```

<kbd class="kbd">PageDown</kbd> moves five rows in the settings list and two
grid rows in the swatch grid; <kbd class="kbd">←</kbd> <kbd class="kbd">→</kbd>
move a cell inside the grid and nothing outside it. <kbd class="kbd">Home</kbd>
and <kbd class="kbd">End</kbd> follow the same rule: while focus is in the grid
they land on the ends of its focused row (<kbd class="kbd">Ctrl</kbd>-modified,
on the grid's first and last cell), never on the list's.

### The outer group still sees the inner items

`data-keyrove-item` is matched anywhere below the root, nested groups included.
The outer group's order therefore runs straight _through_ the inner one: in the
demo, <kbd class="kbd">↑</kbd> from _Reply_ lands on the last reaction rather
than skipping the row.

That is usually what you want — the outer group's keys reach the inner one
instead of it being reachable by <kbd class="kbd">Tab</kbd> alone — but an inner
group is not hidden from the list around it, and there is no attribute that
hides it. If a group should be unreachable that way, put it outside the outer
root.

## Getting back out

Once focus is inside the inner group, no key reaches the outer one. A key the
inner root does not bind — <kbd class="kbd">↓</kbd> in the reaction row above —
does nothing at all: keyrove leaves it to the browser rather than passing it on
to the group outside. Leaving is yours to wire, and there are three ways to do it.

<kbd class="kbd">Tab</kbd> is the first, and it needs no code beyond
[roving tabindex](/docs/examples/roving-tabindex). keyrove never binds
<kbd class="kbd">Tab</kbd>, so the browser's own focus order is always a way out
of a nested group — roving tabindex just makes it a tidy one. Give each group
its own roving items and each becomes a single tab stop, so
<kbd class="kbd">Tab</kbd> moves group to group and
<kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd> back — the arrangement
the
[ARIA authoring practices](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
describe for composite widgets.

The second is a key of your own. The demo above binds
<kbd class="kbd">Escape</kbd> on the reaction row, handing focus to the item
beside it:

```ts
reactions.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return;

  reactions.nextElementSibling.focus();
});
```

keyrove never acts on <kbd class="kbd">Escape</kbd>, so nothing collides — the
same holds for any code the roots involved have not bound. Which also means the
exit key is yours to choose on the same terms as the navigation keys.

The third is a [focus key](/docs/examples/focus-keys) on an item of the outer
group. `data-keyrove-focus-key` is heard as far as the listener reaches, nested
roots included, so one press lands on that item from anywhere inside the inner
group — no listener on the inner root, and no code.

## Nesting, or two roots side by side

Nest only when the inner group genuinely sits inside the outer one's flow.
Groups that are merely on the same page do not need to be nested at all: marking
each of them `data-keyrove-root` under one delegated listener keeps them fully
independent, with no group's items in another's order. See
[several groups, one listener](/docs/installation#several-groups-one-listener).
