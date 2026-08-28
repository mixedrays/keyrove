---
title: Roving tabindex
description: Making a whole group a single tab stop, so Tab moves past it rather than through it.
group: Examples
order: 12
---

A group of twenty items should not be twenty stops on the way through a page.
The roving tabindex pattern gives the group exactly one tab stop and moves it to
whichever item was last focused.

Items carrying `data-keyrove-roving-tabindex` opt into it: when focus moves,
keyrove sets `tabindex="-1"` on the item leaving and `tabindex="0"` on the one
arriving.

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

## Skipped items and the first stop

`data-keyrove-skip` keeps an item out of the navigation order, so the initial
tab stop belongs on the first item that is _not_ skipped. Putting it on a
skipped heading leaves <kbd class="kbd">Tab</kbd> landing somewhere the arrow
keys will immediately move away from.
