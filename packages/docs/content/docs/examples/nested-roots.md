---
title: Nested roots
description: Give nested groups their own bindings and provide a way to return to the outer group.
titleTag: Nested keyboard navigation groups — keyrove
group: Examples
order: 18
---

Put `data-keyrove-root` on an inner group to give it its own keys, columns
and page size.

In this menu, Up/Down move between actions. Up from _Reply_ enters the
reaction row, where Left/Right move between reactions. The demo's Escape
handler returns focus to the menu.

<div data-demo="nested"></div>

```ts
document
  .querySelector('#message-actions')
  .addEventListener('keydown', (e) => keyRove(e));
```

The outer list has one listener. Events bubble to it, and keyrove finds the
root from the event target. The outer list needs no root attribute because it
is the listener's element. If you move the listener to a panel or `document`,
mark the outer list with `data-keyrove-root` too.

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

This lets outer navigation enter the inner group. To keep the groups'
attribute-selected item sequences separate, place them in sibling roots.

## Getting back out

Inside a nested root, only that root's movement bindings apply. Unbound keys
do not fall through to the outer group. In the reaction row, Down is unhandled
(grey in the log); Left at the first reaction is consumed without moving
(amber).

Provide a way to leave the inner group:

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

Use nested roots when outer navigation should reach the inner items. For
independent groups, place sibling roots under a shared listener. See
[several groups, one listener](/docs/installation#several-groups-one-listener).
