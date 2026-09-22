---
title: Typeahead
description: Focus items by typing their labels, with prefix matching, repeated-character cycling and accent handling.
titleTag: Type-to-focus typeahead for lists — keyrove
group: Examples
order: 20
---

Create a typeahead handler to focus items by typing their labels. In this
list, S focuses _Spanish_ and W immediately after it focuses _Swedish_.
After a 500 ms pause, the next character starts a new prefix.

<div data-demo="typeahead" data-demo-class="max-h-60 overflow-y-auto"></div>

```ts
import { createTypeahead, keyRove } from '@mixedrays/keyrove';

const typeahead = createTypeahead();

document
  .querySelector('#languages')
  .addEventListener('keydown', (e) => keyRove(e) || typeahead(e));
```

Call `keyRove` first so navigation bindings take precedence. It returns `null`
for an unhandled key, letting `typeahead` process it. For example, a `KeyJ`
navigation binding moves focus instead of adding J to the prefix.

## Why a factory

The returned handler stores the prefix and the time of the last character.
Create it once per listener, outside the keydown callback. It checks the time
on each press, so there is no timer to clean up. Set `resetMs` to change the
pause that clears the prefix:

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

## Accented labels

Accents are ignored on both sides: <kbd class="kbd">E</kbd> reaches _Émilie_,
<kbd class="kbd">A</kbd> reaches _Ángel_, and on a keyboard that can type it,
<kbd class="kbd">É</kbd> reaches a plain _Emilie_ too. Each letter is compared
with its marks taken off, whether the label comes from the text, the attribute
or a `label` function, so no label needs folding by hand. A letter that is not
a base letter plus a mark, such as _ø_, _ł_ or _ß_, is matched as itself.

Where an accent is what tells two items apart, turn the folding off:

```ts
const typeahead = createTypeahead({ foldDiacritics: false });
```

## What it reports

The handler returns `null` when it left the key alone and
`{ action: 'typeahead', from, to }` when it consumed it, with `to: null` when
the match is already focused or cannot receive focus. `onMove` fires only
after a successful focus move.

Type "swez" quickly to see each result in the log:

- S and W are green: focus moves to _Spanish_, then _Swedish_.
- E is amber: "swe" still matches the focused item, so `to` is `null`.
- Z is grey: "swez" matches nothing, so the handler returns `null`.

The unmatched character stays in the buffer. Pause for 500 ms to start again.

Both handlers can feed one follow-focus callback, a preview pane for one:

```ts
const onMove = ({ to }) => showPreview(to);

const typeahead = createTypeahead({ onMove });

list.addEventListener('keydown', (e) => keyRove(e, { onMove }) || typeahead(e));
```

The roving tab stop moves with the match, as it does for an arrow move.

## Several groups, one handler

The buffer clears when the next typing key resolves to a different root.
One handler can therefore serve several groups under a delegated listener
without sharing prefixes between them. See
[several groups, one listener](/docs/installation#several-groups-one-listener).
