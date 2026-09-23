---
# Live page: https://keyrove.pages.dev/docs/examples/roving-tabindex
title: Roving tabindex
description: Give a group one tab stop, initialize it after rendering, and keep it with keyboard, pointer and programmatic focus.
group: Examples
order: 16
---

With the default bindings, <kbd class="kbd">Tab</kbd> visits every item with `tabindex="0"`. Roving
tabindex gives the group one tab stop; the navigation keys move between items.

- Put `data-keyrove-roving-tabindex` on every item, or pass
  `{ rovingTabindex: true }` for the group.
- Give one navigable item `tabindex="0"` and the rest `tabindex="-1"`.
  Choose the first item or the widget's selected item, excluding skipped and
  disabled items.
- On a move from a roving item, keyrove sets the previous item to `-1` and the
  destination to `0`.
- Each nested root keeps its own stop. A move onto a nested root's item moves
  that root's stop to it and leaves the outer group's stop in place.

Arrow to an item, then <kbd class="kbd">Tab</kbd> away and <kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd> back. Focus returns to that item.

<div data-demo="roving" data-demo-label="status"></div>

## Setting the initial tab stop

`keyRove` does not initialize the group's tab stop. Set it in the markup or
call `initRovingTabindex` after rendering:

```ts
import { initRovingTabindex } from '@mixedrays/keyrove';

initRovingTabindex(list);
```

An existing navigable roving item with `tabindex="0"` keeps the stop. If there
are several, the first in DOM order wins. If there are none, the first roving
item that is neither skipped nor disabled gets `0`. All other roving items
get `-1`.

Call the helper after a render that may replace items. It preserves a valid
stop or repairs a missing one. Nested roots keep their own stops; initialize
each root separately.

Where the item that should start with the stop is known to your code but not
marked in the DOM, such as a tab list's active tab, name it in `initial`:

```ts
initRovingTabindex(tabs, {
  initial: tabs.querySelector('[aria-selected="true"]'),
});
```

A valid `initial` overrides the existing stop. Use it for first setup or an
intentional selection change, and omit it during routine render updates.
A null, skipped, disabled or non-roving item is ignored.

If no item has `tabindex="0"`, <kbd class="kbd">Tab</kbd> cannot enter through the items. Keep one
stop whenever the group has a navigable roving item.

## Focus that keyrove did not move

Attach `followFocus` to `focusin` to update the stop after a click, a call to
`element.focus()`, or <kbd class="kbd">Tab</kbd> entering a control inside an item. It also handles
entry from outside the group, where keyrove has no previous item to take the
stop from:

```ts
import { followFocus, keyRove } from '@mixedrays/keyrove';

list.addEventListener('keydown', (e) => keyRove(e));
list.addEventListener('focusin', (e) => followFocus(e));
```

It reads the group the way `keyRove` does, so it leaves a nested group's stop
alone, gives no stop to a skipped item, and takes the same options object
where the group is described in JavaScript. The
[listbox](/docs/examples/listbox) uses it for clicks.

The [complete roving setup](/docs/installation#complete-roving-setup) wires
initialization, navigation, focus tracking and typeahead to one
configuration object.

## Choosing between the two

Choose the tab order that fits the widget:

|                            | Plain tab stops             | Roving tabindex                            |
| -------------------------- | --------------------------- | ------------------------------------------ |
| <kbd class="kbd">Tab</kbd> | Steps through every item    | Steps past the whole group                 |
| Bound keys                 | Move between items          | Move between items                         |
| Cost to the page           | One stop per item           | One stop per group                         |
| Setup                      | `tabindex="0"` on each item | One `0`, the rest `-1`, plus the attribute |

Use plain tab stops when each item should be a separate destination in the
page's tab order. Use roving tabindex for a composite control such as a
[listbox](/docs/examples/listbox), [tree](/docs/examples/tree-view), grid or
tab list. See the
[ARIA keyboard practices](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
for widget-specific guidance. With roving tabindex,
[<kbd class="kbd">Tab</kbd> can leave a nested group](/docs/examples/nested-roots#getting-back-out)
without an extra exit handler.
