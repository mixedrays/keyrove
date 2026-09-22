---
title: Roving tabindex
description: Opt a group into being a single tab stop, so Tab moves past it rather than through it — and what happens if you do not.
group: Examples
order: 16
---

keyrove never interferes with <kbd class="kbd">Tab</kbd>, so by default a group
behaves as its markup says: every item with `tabindex="0"` is a tab stop the
browser walks through, and the bound keys move between the same items. Two
navigation models over one list, neither aware of the other.

That default is right for a short group and wrong for a long one: twenty items
should not be twenty stops on the way through a page. The roving tabindex
pattern gives the group exactly one tab stop and moves it to whichever item was
last focused. It takes three rules:

- Put `data-keyrove-roving-tabindex` on every item in the group. Items without
  it keep whatever `tabindex` you gave them.
- Give exactly one item `tabindex="0"` and every other item `tabindex="-1"`.
  The `0` belongs on the first item that is not skipped; on a skipped heading
  it would take <kbd class="kbd">Tab</kbd> somewhere the arrows leave at once.
- keyrove then moves the `0` with focus: `-1` on the item leaving, `0` on the
  one arriving.

<kbd class="kbd">Tab</kbd> into the list, arrow to an item, then
<kbd class="kbd">Tab</kbd> away and back: focus returns to where you left it.

<div data-demo="roving"></div>

## Setting the initial tab stop

keyrove moves an existing tab stop; it does not create one. If the list is
rendered from data, give it one once it renders:

```ts
import { initRovingTabindex } from '@mixedrays/keyrove';

initRovingTabindex(list);
```

The first item that is neither skipped nor disabled gets `tabindex="0"`, and
every other roving item gets `-1`.

Call it again after every render that may have replaced items. A re-render
that drops the item holding the stop is the usual reason a roving group stops
being reachable by <kbd class="kbd">Tab</kbd>. The call repairs rather than
resets: while the item holding the stop is still there and navigable, the stop
stays on it, so <kbd class="kbd">Tab</kbd> away and back still returns to where
the user left off. Only when that item is gone does the stop go to the first
item. A template that renders `tabindex="0"` on the selected item keeps it the
same way. A [nested group](/docs/examples/nested-roots) keeps its own stop,
untouched; call the function on its root to set that one up.

Where the item that should start with the stop is known to your code but not
marked in the DOM, such as a tab list's active tab, name it in `initial`:

```ts
initRovingTabindex(tabs, {
  initial: tabs.querySelector('[aria-selected="true"]'),
});
```

It takes the stop even from an item that already holds it, so pass it when you
mean to place the stop, not on every render. An `initial` that is `null`,
skipped, disabled or not in the group is passed over, and the call behaves as
if it were not there.

A group with every item at `tabindex="-1"` cannot be reached with
<kbd class="kbd">Tab</kbd> at all, which is the one way this pattern can leave a
page _less_ navigable than the plain tab order it replaced. Exactly one `0` per
group, always.

## Focus that keyrove did not move

keyrove carries the stop on the moves it makes. Focus arrives other ways too:
a click on an item, which `tabindex="-1"` allows, `element.focus()` from your
code, and <kbd class="kbd">Tab</kbd> onto a link or a field inside an item.
Each of those leaves the stop where it was, so <kbd class="kbd">Tab</kbd> away
and back returns to the old item rather than the one the user was on.
`followFocus` on `focusin` moves the stop to wherever focus lands:

```ts
import { followFocus, keyRove } from '@mixedrays/keyrove';

list.addEventListener('keydown', (e) => keyRove(e));
list.addEventListener('focusin', (e) => followFocus(e));
```

It reads the group the way `keyRove` does, so it leaves a nested group's stop
alone, gives no stop to a skipped item, and takes the same options object
where the group is described in JavaScript. The
[listbox](/docs/examples/listbox) uses it for clicks.

## Choosing between the two

Neither is more correct; they answer different questions.

|                            | Plain tab stops             | Roving tabindex                            |
| -------------------------- | --------------------------- | ------------------------------------------ |
| <kbd class="kbd">Tab</kbd> | Steps through every item    | Steps past the whole group                 |
| Bound keys                 | Move between items          | Move between items                         |
| Cost to the page           | One stop per item           | One stop per group                         |
| Setup                      | `tabindex="0"` on each item | One `0`, the rest `-1`, plus the attribute |

Reach for plain tab stops when the items are few, or when each one is a
destination a user might reasonably tab to: a row of three toolbar buttons, a
short menu. Reach for roving tabindex when the group is long, or when it is one
control conceptually rather than many: a [listbox](/docs/examples/listbox), a
[tree](/docs/examples/tree-view), a grid, a tab list. The
[ARIA authoring practices](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
describe the second arrangement for composite widgets, and it is also what makes
[nested groups](/docs/examples/nested-roots) escapable:
<kbd class="kbd">Tab</kbd> moves from the inner group to the next thing without
any code of yours.
