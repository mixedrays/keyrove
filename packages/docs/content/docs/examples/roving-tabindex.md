---
title: Roving tabindex
description: Opt a group into being a single tab stop, so Tab moves past it rather than through it — and what happens if you do not.
group: Examples
order: 12
---

keyrove never interferes with <kbd class="kbd">Tab</kbd>, so by default a group
behaves exactly as its markup says: every item with `tabindex="0"` is a tab stop
the browser walks through, and the bound keys move between the same items. Two
navigation models over one list, neither aware of the other.

That default is right for a short group and wrong for a long one — twenty items
should not be twenty stops on the way through a page. The roving tabindex
pattern gives the group exactly one tab stop and moves it to whichever item was
last focused.

It is opt-in, per item. Items carrying `data-keyrove-roving-tabindex` join in:
when focus moves, keyrove sets `tabindex="-1"` on the item leaving and
`tabindex="0"` on the one arriving. Items without the attribute keep whatever
`tabindex` you gave them.

The group holds one `tabindex="0"` to begin with, on the first navigable item;
every other item starts at `-1`. <kbd class="kbd">Tab</kbd> into the list, arrow
to an item, then <kbd class="kbd">Tab</kbd> away and back — focus returns to
where you left it.

<div data-demo="roving"></div>

## Setting the initial tab stop

keyrove moves an existing tab stop; it does not create one. If the list is
rendered from data, set the first one yourself — either in the template, or with
the exported helper:

```ts
import { toggleTabIndex } from '@mixedrays/keyrove';

const [first] = list.querySelectorAll('[data-keyrove-item]');
toggleTabIndex({ root: first, isActive: true });
```

The same call restores the tab stop after a re-render drops it, which is the
usual reason a roving group stops being reachable by <kbd class="kbd">Tab</kbd>.

A group with every item at `tabindex="-1"` is unreachable by keyboard entirely —
which is the one way this pattern can leave a page _less_ navigable than the
plain tab order it replaced. Exactly one `0` per group, always.

## Skipped items and the first stop

`data-keyrove-skip` keeps an item out of the navigation order, so the initial
tab stop belongs on the first item that is _not_ skipped. Putting it on a
skipped heading leaves <kbd class="kbd">Tab</kbd> landing somewhere the
navigation keys will immediately move away from.

## Choosing between the two

Neither is more correct; they answer different questions.

|                            | Plain tab stops             | Roving tabindex                            |
| -------------------------- | --------------------------- | ------------------------------------------ |
| <kbd class="kbd">Tab</kbd> | Steps through every item    | Steps past the whole group                 |
| Bound keys                 | Move between items          | Move between items                         |
| Cost to the page           | One stop per item           | One stop per group                         |
| Setup                      | `tabindex="0"` on each item | One `0`, the rest `-1`, plus the attribute |

Reach for plain tab stops when the items are few, or when each one is a
destination a user might reasonably tab to — a row of three toolbar buttons, a
short menu. Reach for roving tabindex when the group is long, or when it is one
control conceptually rather than many: a listbox, a grid, a tab list. The
[ARIA authoring practices](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
describe the second arrangement for composite widgets, and it is also what makes
[nested groups](/docs/examples/nested-roots) escapable —
<kbd class="kbd">Tab</kbd> moves from the inner group to the next thing without
any code of yours.
