---
title: Editable targets
description: Fields inside items keep their keys — arrows move the caret, letters type, a slider slides — and navigation resumes the moment focus leaves them.
group: Examples
order: 21
---

Items are not always plain text. A settings row holds a checkbox or a text
field; a task row has a title to rename in place. keyrove tells the two kinds
of keypress apart by where the press lands: inside an editable element nothing
is handled, whatever the key is bound to. The arrows and
<kbd class="kbd">Home</kbd> belong to the caret there, and a `KeyJ` binding
does not swallow a typed "j".

Arrow down the rows, then <kbd class="kbd">Tab</kbd> into the control on one.
In _Display name_ and _Signature_, <kbd class="kbd">↓</kbd> moves the caret; on
_Font size_ it nudges the slider; on a checkbox it moves rows again, because
there it does nothing natively.

<div data-demo="editable"></div>

```ts
document
  .querySelector('#settings')
  .addEventListener('keydown', (e) => keyRove(e));
```

The call is the one every other page makes; the exemption is keyrove's, not
something the listener arranges. Each row is the item, and an item counts as
focused while focus is anywhere inside it, so after <kbd class="kbd">Tab</kbd>
lands on a control the row is still the position: the moment a key is handled
again, it counts from there.

## Which elements are editable

The test is on the event's target and its ancestors:

- a `textarea` or a `select`;
- a `[contenteditable]` element and everything inside it, except a
  `contenteditable="false"` island, which opts back out;
- an `input` of any type other than `button`, `checkbox`, `color`, `file`,
  `image`, `reset` and `submit`.

The input list is drawn by what the bound keys do natively. Arrows move a
caret in a text field, step a `number`, slide a `range` and move between
`radio` buttons; on a checkbox or a button they do nothing, so navigating from
one takes nothing away. That is why <kbd class="kbd">↓</kbd> on
_Email notifications_ moves rows while <kbd class="kbd">↓</kbd> on _Font size_
nudges the slider.

## By target, not by key

The exemption is decided by where the press landed, never by which key it was.
Whatever a move is bound to, a letter, a chord, a function key, it is left
alone inside a field: bind next to `ctrl+ArrowRight` and the caret's word jump
still works in a text field inside an item; bind it to `KeyJ` and "j" still
types there. Editing is the one context where every key is the user's own.
`keyRove` returns `null` for all of them, so a handler chained after it sees
the press too.

## The one exception

A [focus key](/docs/examples/focus-keys) whose combo holds
<kbd class="kbd">Ctrl</kbd>, <kbd class="kbd">Alt</kbd> or
<kbd class="kbd">Meta</kbd> fires from inside a field. That press is a command
rather than typing, and a focus key points _out_ of the field, so it is the way
to leave one without reaching for the mouse. A bare focus key, or one holding
only <kbd class="kbd">Shift</kbd>, stays typing.
[Typeahead](/docs/examples/typeahead) draws the same line from the other side:
it never buffers a letter typed into a field.

## While an input method composes

An input method editor, for Chinese, Japanese or Korean, turns keystrokes into
candidates before any text lands, and the arrows walk its candidate list. While
a composition is in progress, `isComposing` on the event, nothing is handled,
chord or not; every key stays with the input method until the text is
committed.

## Rows as tab stops

Each row here carries `tabindex="0"` so it can be focused apart from its
control, which is what lets a row be the position before
<kbd class="kbd">Tab</kbd> reaches the control inside. It also doubles the tab
stops. Put [roving tabindex](/docs/examples/roving-tabindex) on the rows and
the list costs one stop, with the controls keeping theirs. Or make the controls
the items, `<input data-keyrove-item type="checkbox">`, and the rule reads the
same way round: the checkboxes navigate, the text fields do not.
