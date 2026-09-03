---
title: Focus keys
description: Give an item a key of its own, so one press focuses it from anywhere under the listener — another group, a nested root, even a text field.
group: Examples
order: 17
---

Every move so far is relative. Next and previous, a row, a page, an end — each
is defined from wherever focus is. `data-keyrove-focus-key` is the absolute
kind: put a combo on an item and that item is one press away from anywhere the
keydown reaches the listener. The panels of an editor-like layout, the tabs of
a strip, the tools of a palette — anything a user should be able to name rather
than walk to.

<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Shift</kbd>+<kbd class="kbd">1</kbd>,
<kbd class="kbd">2</kbd> and <kbd class="kbd">3</kbd> pick a panel here. Click
into the text area first and press one anyway: the chord still lands, because a
press holding <kbd class="kbd">Ctrl</kbd> is a command, not typing.

<div data-demo="focus"></div>

```ts
document
  .querySelector('#workspace')
  .addEventListener('keydown', (e) => keyRove(e));
```

The call is the one every other page makes. The value is a combo by the same
grammar as every `*-key` attribute — any
[`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code),
with or without `mod+` / `ctrl+` / `alt+` / `shift+` / `meta+` — and a bare
code works too: `data-keyrove-focus-key="KeyE"` makes <kbd class="kbd">E</kbd>
pick the item wherever the letter would not be typing. The move reports
`'focus'` to `onMove` and in the [return value](/docs/api#return-value), so a
consumer can tell a jump from a step.

## As far as the listener hears

A move is resolved in the nearest root, because a move is relative to a
position and a root is what gives it one. A focus key names its destination
outright, so it needs no position — only to be heard. keyrove looks for focus
keys across everything under the listener's element, which makes the listener's
placement the one scope control:

- On a panel, the keys work inside that panel.
- On `document`, they work page-wide.
- From inside a [nested root](/docs/examples/nested-roots), a focus key on an
  item of the group around it still fires. Focus keys are the third way out of
  a nested group, after <kbd class="kbd">Tab</kbd> and a key of your own.

The move itself happens in the target's group: `from` is the item of that group
focus is leaving — the panel it was inside, not the row of a list inside the
panel — or `null` when focus was outside the group entirely. Pressing a panel's
key while focus is already somewhere inside that panel is a consumed no-op: the
key is claimed, focus stays where it is.

## From inside a text field

Every move is kept out of `input`, `textarea`, `select` and `contenteditable`
targets, whatever it is bound to, because arrows and <kbd class="kbd">Home</kbd>
have caret meanings there and letters type. A focus key is different in kind —
it points _out_ of the field — so the rule for it is the one typeahead already
draws: a combo holding <kbd class="kbd">Ctrl</kbd>, <kbd class="kbd">Alt</kbd>
or <kbd class="kbd">Meta</kbd> fires from a field; a bare or
<kbd class="kbd">Shift</kbd>-only one does not. `ctrl+shift+KeyE` reaches out of
the text area in the demo; `KeyE` would type an "e" there and focus the item
from everywhere else.

That leaves collisions with the field's own commands to you:
<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">B</kbd> means bold in a rich-text
editor, and <kbd class="kbd">Alt</kbd>+letter types accented characters on
macOS. Chords with two modifiers, like the demo's, tend to be free.

## Precedence and ties

An item's key names one element, where a root's `*-key` names a whole group and
a default names nothing in particular, so focus keys sit ahead of both in the
table and win any collision: an item bound to `Home` takes
<kbd class="kbd">Home</kbd> and the default stands down, exactly as a root
binding would. That is a deliberate choice of a loud failure over a quiet one —
an outer item's key losing to an inner root's rebinding of the same combo would
fail only sometimes, and silently.

Two items naming the same combo resolve to the first in DOM order; the second is
unreachable by that key. Items carrying `data-keyrove-skip` or `disabled` are
not destinations, so a focus key on one is inert and the key keeps its browser
default. As with every binding, the wider the listener, the more a bare-letter
key can shadow; a chord is the safer choice on a `document` listener.

## Roving tabindex

A focus key moves the tab stop exactly as an arrow does, within the target's
group: the item focus leaves steps down to `tabindex="-1"` and the target takes
`0`, provided the leaving item carries `data-keyrove-roving-tabindex`. A nested
group's stop is untouched, so <kbd class="kbd">Tab</kbd> back into that group
still lands where it was.

## Telling users about it

keyrove reads the combo; it does not announce it. The
[`aria-keyshortcuts`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-keyshortcuts)
attribute exists for exactly that, and it is worth setting alongside the focus
key so assistive technology can say the shortcut out loud. The two use different
spellings — ARIA names keys, keyrove names physical codes — so
`data-keyrove-focus-key="ctrl+shift+KeyE"` pairs with
`aria-keyshortcuts="Control+Shift+E"`.
