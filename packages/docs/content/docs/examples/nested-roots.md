---
# Live page: https://keyrove.pages.dev/docs/examples/nested-roots
title: Nested roots
description: Nest keyboard navigation groups, each with its own keys, columns and page size, and give users a way to enter the inner group and return to the outer one.
titleTag: Nested keyboard navigation groups — keyrove
group: Examples
order: 18
---

Put `data-keyrove-root` on an inner group to give it its own keys, columns
and page size.

In this menu, <kbd class="kbd">↑</kbd>/<kbd class="kbd">↓</kbd> move between actions. <kbd class="kbd">↑</kbd> from _Reply_ enters the
reaction row, where <kbd class="kbd">←</kbd>/<kbd class="kbd">→</kbd> move between reactions. <kbd class="kbd">Escape</kbd> returns focus to
the menu.

<div data-demo="nested" data-demo-label="message actions"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

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
do not fall through to the outer group. In the reaction row, <kbd class="kbd">↓</kbd> is unhandled
(gray in the readout, _left to the browser_); <kbd class="kbd">←</kbd> at the first reaction is
consumed without moving (amber, _prev · moved nothing_).

Provide a way to leave the inner group:

1. **<kbd class="kbd">Tab</kbd>.** keyrove never binds it, so the browser's
   focus order is always a way out. With
   [roving tabindex](/docs/examples/roving-tabindex) on each group,
   <kbd class="kbd">Tab</kbd> moves group to group and
   <kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd> back. No code.
2. **An exit key.** The demo binds <kbd class="kbd">Escape</kbd> on the
   reaction row:

   ```html
   <li
     data-keyrove-root
     data-keyrove-next-key="ArrowRight"
     data-keyrove-prev-key="ArrowLeft"
     data-keyrove-exit-key="Escape"
   >
     <button data-keyrove-item tabindex="0">👍</button>
     …
   </li>
   ```

   Exit focuses the outer item containing the root, or the nearest eligible
   item after it, then before it. Here, the reaction row has no containing
   item, so <kbd class="kbd">Escape</kbd> focuses _Reply_. Each root finds its destination from the
   DOM, so several reaction rows can use the same binding. If there is no
   destination, <kbd class="kbd">Escape</kbd> remains unhandled.

3. **A [focus key](/docs/examples/focus-keys) on an item of the outer group.**
   `data-keyrove-focus-key` works from anywhere under the listener, nested
   roots included. Use it to return to a fixed destination.

## Getting in

Outer arrow navigation can reach items inside nested roots, as in the reaction
row above. With roving tabindex, such a move updates the nested root's stop and
leaves the outer group's stop in place. When an outer item contains its own
group, bind an enter key on the outer root to focus that group's items:

```html
<ul id="messages" data-keyrove-enter-key="Enter">
  <li data-keyrove-item tabindex="0">
    Build failed
    <div data-keyrove-root data-keyrove-exit-key="Escape">
      <button data-keyrove-item tabindex="0">Retry</button>
      <button data-keyrove-item tabindex="0">View logs</button>
    </div>
  </li>
</ul>
```

<kbd class="kbd">Enter</kbd> focuses the first nested root's navigable roving tab stop, or its first
navigable item. <kbd class="kbd">Escape</kbd> returns to the containing item. Skipped and disabled
items are excluded.

To remember the last focused button, set up
[roving tabindex](/docs/examples/roving-tabindex) in each group. Enter and exit
preserve the stop in the group being left. The markup above uses ordinary tab
stops, so <kbd class="kbd">Enter</kbd> starts at _Retry_ each time.

Neither action has a default binding. You can also use
`keys: { enter: 'Enter', exit: 'Escape' }`. When no destination is found, the
key remains available to the browser and your handlers. See the
[API reference](/docs/api#exit-and-enter) for target and focus rules.

## Nesting, or two roots side by side

Use nested roots when outer navigation should reach the inner items. For
independent groups, place sibling roots under a shared listener. See
[several groups, one listener](/docs/installation#several-groups-one-listener).
