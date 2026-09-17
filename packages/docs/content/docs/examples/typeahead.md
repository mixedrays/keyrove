---
title: Typeahead
description: Type-to-focus as a second handler chained after keyRove — letters accumulate, and focus jumps to the first item whose label starts with them.
titleTag: Type-to-focus typeahead for lists — keyrove
group: Examples
order: 20
---

Arrowing through a long list is the slow way to an item you can name.
`createTypeahead()` builds a keydown handler that focuses items as their labels
are typed: press <kbd class="kbd">S</kbd> and focus lands on _Spanish_, press
<kbd class="kbd">W</kbd> straight after and it moves on to _Swedish_. Pause for
half a second and the next letter starts a new word.

<div data-demo="typeahead" data-demo-class="max-h-60 overflow-y-auto"></div>

```ts
import { createTypeahead, keyRove } from '@mixedrays/keyrove';

const typeahead = createTypeahead();

document
  .querySelector('#languages')
  .addEventListener('keydown', (e) => keyRove(e) || typeahead(e));
```

Two handlers, one listener. `keyRove` goes first and
[returns what it did](/docs/api#return-value); a key it left alone is `null`,
and falls through to `typeahead`, which keeps the same contract. The order is
the point: with next bound to `KeyJ`, <kbd class="kbd">J</kbd> has to navigate
rather than join the buffer, and navigation going first is what settles it.

## Why a factory

Typeahead is the one thing here that has state: the letters typed so far, and
when the last one arrived. `keyRove` holds none, so the buffer lives in the
handler `createTypeahead` returns, and each listener gets a handler of its own.
There is no timer to clear and nothing to dispose of. The reset is a
comparison against the clock on the next press, and `resetMs` sets how much
silence ends a word:

```ts
const typeahead = createTypeahead({ resetMs: 800 });
```

## Cycling repeated characters

Prefix matching is the default: pressing <kbd class="kbd">S</kbd> twice looks
for a label starting with `ss`, and every prefix matches from the top of the
list. A menu can instead cycle through the items sharing one initial character,
the way a native `<select>` does:

```ts
const typeahead = createTypeahead({ matchMode: 'cycle' });
```

With that mode, a single character moves focus to the next item after the
focused one that begins with it, wrapping after the last. Pressing it again
moves on rather than growing the buffer, however slowly it is pressed, so
repeated <kbd class="kbd">S</kbd> presses alternate between _Spanish_ and
_Swedish_. A different character typed before the reset still refines the
prefix, so <kbd class="kbd">S</kbd> <kbd class="kbd">W</kbd> matches _Swedish_.
The one thing the mode gives up is a label that opens with a doubled letter:
<kbd class="kbd">A</kbd> <kbd class="kbd">A</kbd> cycles the _A_ items and
never looks for "aa".

## What counts as typing

Bindings match the physical key, `e.code`. Typeahead reads `e.key`, the
character the press produced in the user's layout, so "é" and "ß" work where
the keyboard has them. A press joins the buffer when it is typing and nothing
else:

- a single character, with none of <kbd class="kbd">Ctrl</kbd>,
  <kbd class="kbd">Alt</kbd> or <kbd class="kbd">Meta</kbd> held.
  <kbd class="kbd">Shift</kbd> is allowed; it is how capitals are typed, and
  matching ignores case anyway;
- not inside an [editable target](/docs/examples/editable-targets), so a field
  inside an item keeps its letters;
- a space only once the buffer holds a character, so the spacebar keeps
  scrolling the page and activating buttons while "do n" still reaches
  _Do not disturb_ below.

Matching is by prefix. A character that matches nothing is left to the
browser but still joins the buffer, so a mistyped prefix goes quiet until the
reset clears it rather than jumping somewhere unexpected. Items carrying
`data-keyrove-skip` or `disabled` are never matched.

## When the text is not the label

The label is the item's text, trimmed and with runs of whitespace collapsed.
When the text starts with something nobody types, an emoji, an icon's fallback
text, a code, `data-keyrove-typeahead` names the label instead:

<div data-demo="labels"></div>

<kbd class="kbd">A</kbd> is _Available_, <kbd class="kbd">A</kbd>
<kbd class="kbd">W</kbd> is _Away_, <kbd class="kbd">D</kbd> is
_Do not disturb_. The attribute is the whole label rather than a prefix added
to the text, and an empty one falls back to the text, so a template can set it
conditionally.

## What it reports

The handler returns `null` when it left the key alone and
`{ action: 'typeahead', from, to }` when it consumed it, with `to: null` when
the match is the item already focused. `onMove` fires after focus has moved
and only then.

Those are three answers, and the log beside the list gives each a row of its
own. Type "swez" in one go to see all of them: <kbd class="kbd">S</kbd> and
<kbd class="kbd">W</kbd> are green, having landed on _Spanish_ and _Swedish_;
<kbd class="kbd">E</kbd> is amber, because "swe" still names the item already
focused and there is nowhere to go, which is what `to: null` says;
<kbd class="kbd">Z</kbd> is grey, because "swez" matches nothing, so the
handler returned `null` and the browser kept the key. The letter joined the
buffer all the same — the next press is still typing "swez", and it takes the
half-second of silence to get back to a prefix that matches.

Both handlers can feed one follow-focus callback, a preview pane for one:

```ts
const onMove = ({ to }) => showPreview(to);

const typeahead = createTypeahead({ onMove });

list.addEventListener('keydown', (e) => keyRove(e, { onMove }) || typeahead(e));
```

The roving tab stop moves with the match, as it does for an arrow move.

## Several groups, one handler

The buffer clears whenever a press resolves to a different root than the one
before it, so one handler behind a delegated listener serves several groups
without carrying a prefix from one to the next. Create one handler per
listener, not per group; see
[several groups, one listener](/docs/installation#several-groups-one-listener).
