---
title: Nested roots
description: A group inside a group — the nearest root wins, so an inner list navigates by its own keys while the list around it keeps its.
group: Examples
order: 17
---

Composite widgets nest: a menu with a row of reactions along the top, a settings
list with a colour-swatch grid between two of its rows. `data-keyrove-root` on
the inner group gives it its own keys, columns, and page size.

<kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> walk the menu, and
<kbd class="kbd">↑</kbd> from _Reply_ steps into the reaction row. Inside it,
<kbd class="kbd">←</kbd> <kbd class="kbd">→</kbd> move between reactions and
<kbd class="kbd">Escape</kbd> returns to the menu. The inner group is a root
with its own attributes; nothing else about it is special, and the same
`data-keyrove-item` marks its items.

<div data-demo="nested"></div>

```ts
document
  .querySelector('#message-actions')
  .addEventListener('keydown', (e) => keyRove(e));
```

One listener, on the outer list. The inner group needs none of its own: the
keydown bubbles up to that listener, and `keyRove` resolves the root from the
event's _target_ rather than from the element the listener sits on. That is also
why the outer list carries no `data-keyrove-root`: it is the listener's element,
which keyrove falls back to. Move the listener further up, to a panel or to
`document`, and the outer group needs the attribute too.

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
and <kbd class="kbd">End</kbd> follow the same rule: inside the grid they land
on the ends of its focused row, never on the list's.

### The outer group still sees the inner items

`data-keyrove-item` is matched anywhere below the root, nested groups included,
so the outer group's order runs straight _through_ the inner one. In the demo,
<kbd class="kbd">↑</kbd> from _Reply_ lands on the last reaction rather than
skipping the row.

That is usually what you want: the outer group's keys reach the inner group,
instead of <kbd class="kbd">Tab</kbd> being the only way in. But there is no
attribute that hides an inner group from the group around it. If the outer
group's keys should not reach a group, place that group outside the outer root.

## Getting back out

Once focus is inside the inner group, no key reaches the outer one. A key the
inner root does not bind, <kbd class="kbd">↓</kbd> in the reaction row above,
does nothing at all: keyrove leaves it to the browser rather than passing it on
to the group outside. Leaving is yours to wire, and there are three ways to do
it:

1. **<kbd class="kbd">Tab</kbd>.** keyrove never binds it, so the browser's
   focus order is always a way out. With
   [roving tabindex](/docs/examples/roving-tabindex) on each group,
   <kbd class="kbd">Tab</kbd> moves group to group and
   <kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd> back. No code.
2. **A key of your own.** Any code the roots have not bound is free. The demo
   binds <kbd class="kbd">Escape</kbd> on the reaction row and hands focus to
   the item beside it:

   ```ts
   reactions.addEventListener('keydown', (e) => {
     if (e.code !== 'Escape') return;

     reactions.nextElementSibling.focus();
   });
   ```

3. **A [focus key](/docs/examples/focus-keys) on an item of the outer group.**
   `data-keyrove-focus-key` is heard as far as the listener reaches, nested
   roots included, so one press lands on that item from anywhere inside the
   inner group. No listener on the inner root, and no code.

## Nesting, or two roots side by side

Nest only when the inner group sits inside the outer one's flow. Groups that are
merely on the same page do not need to be nested at all: marking each of them
`data-keyrove-root` under one delegated listener keeps them fully independent,
with no group's items in another's order. See
[several groups, one listener](/docs/installation#several-groups-one-listener).
