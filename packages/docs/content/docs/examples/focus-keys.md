---
title: Focus keys
description: Give an item a key of its own, so one press focuses it from anywhere under the listener — another group, a nested root, even a text field.
group: Examples
order: 17
---

Every move so far is relative: next, previous, a row, a page, an end, each
starts from wherever focus is. A focus key is absolute. Put
`data-keyrove-focus-key` with a combo on an item, and one press focuses that
item from anywhere the keydown reaches the listener. Use it for anything a user
should be able to jump to rather than walk to: the panels of an editor-like
layout, the tabs of a strip, the tools of a palette.

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

The call is the one every other page makes. The value is a
[combo](/docs/api#combos) like any `*-key` attribute's, and a bare code works
too: `data-keyrove-focus-key="KeyE"` makes <kbd class="kbd">E</kbd> pick the
item wherever the letter would not be typing. The move reports `'focus'` to
`onMove` and in the [return value](/docs/api#return-value), so a consumer can
tell a jump from a step.

## As far as the listener hears

keyrove looks for focus keys on every item under the listener's element, not
just in the nearest root, so where you attach the listener is the only scope
control:

- On a panel, the keys work inside that panel.
- On `document`, they work page-wide.
- From inside a [nested root](/docs/examples/nested-roots), a focus key on an
  item of the group around it still fires. Focus keys are the third way out of
  a nested group, after <kbd class="kbd">Tab</kbd> and a key of your own.

The move is reported in the target's group: `from` is the panel focus left, or
`null` when focus was outside the group. Pressing a panel's key while focus is
already inside that panel is a consumed no-op: the key is claimed, and focus
stays where it is. The [API reference](/docs/api#focus-keys) has the exact
rules, including how the roving tab stop follows.

## From inside a text field

Moves are never handled inside `input`, `textarea`, `select` or
`contenteditable` targets, whatever they are bound to: arrows and
<kbd class="kbd">Home</kbd> move the caret there, and letters type. A focus key
points _out_ of the field, so it gets the line typeahead draws between a command
and typing:

- A combo holding <kbd class="kbd">Ctrl</kbd>, <kbd class="kbd">Alt</kbd> or
  <kbd class="kbd">Meta</kbd> fires from inside a field.
- A bare combo, or one holding only <kbd class="kbd">Shift</kbd>, does not.

In the demo, `ctrl+shift+Digit1` reaches out of the text area; a bare `Digit1`
would type a "1" there and focus the panel from everywhere else.

That leaves collisions with the field's own commands to you:
<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">B</kbd> means bold in a rich-text
editor, and <kbd class="kbd">Alt</kbd>+letter types accented characters on
macOS. Chords with two modifiers, like the demo's, tend to be free.

## Precedence and ties

A focus key is the most specific binding there is: it names one element, where a
root's `*-key` names a whole group and a default names nothing in particular. So
focus keys sit first in the [binding table](/docs/api#precedence) and win any
collision. An item bound to `Home` takes <kbd class="kbd">Home</kbd> and the
default stands down, just as a root binding would. Had an inner root's rebinding
of the same combo won instead, the outer item's key would have failed only while
focus was inside that root, and silently; fixed precedence makes a collision
show up every time.

Two items naming the same combo resolve to the first in DOM order; the second is
unreachable by that key. Items carrying `data-keyrove-skip` or `disabled` are
not destinations, so a focus key on one is inert and the key keeps its browser
default. As with every binding, the wider the listener, the more a bare-letter
key can shadow; a chord is the safer choice on a `document` listener.

## Telling users about it

keyrove reads the combo; it does not announce it. The
[`aria-keyshortcuts`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-keyshortcuts)
attribute exists for that, and it is worth setting alongside the focus key so
assistive technology can say the shortcut out loud. The two use different
spellings, ARIA names keys where keyrove names physical codes, so
`data-keyrove-focus-key="ctrl+shift+KeyE"` pairs with
`aria-keyshortcuts="Control+Shift+E"`.
