---
title: Focus keys
description: Give an element a key of its own, so one press focuses it from anywhere under the listener — another group, a nested root, even a text field.
titleTag: Keyboard shortcuts that focus an element — keyrove
group: Examples
order: 19
---

Every move so far is relative: next, previous, a row, a page, an end, each
starts from wherever focus is. A focus key is absolute. Put
`data-keyrove-focus-key` with a combo on an element, and one press focuses that
element from anywhere the keydown reaches the listener. Use it for anything a
user should be able to jump to, not only walk to: the panels of an editor-like
layout, the tabs of a strip, the tools of a palette.

<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Shift</kbd>+<kbd class="kbd">1</kbd>,
<kbd class="kbd">2</kbd> and <kbd class="kbd">3</kbd> pick a panel here, each
panel carrying its own. Click into the text area first and press one anyway:
the chord still lands, because a press holding <kbd class="kbd">Ctrl</kbd> is a
command, not typing.

<div data-demo="panes"></div>

```ts
document
  .querySelector('#editor-panes')
  .addEventListener('keydown', (e) => keyRove(e));
```

The panels are laid out the way an editor lays them out, which is the case a
focus key is for. There is no "down" from a sidebar that spans both rows, and
nothing an arrow could call next that a reader would predict: a relative move
needs an order to be relative to, and this layout does not have one. Naming
the panel is all that is left, so the panels are not items at all, and no arrow
walks between them.

The call is the one every other page makes. The value is a
[combo](/docs/api#combos) like any `*-key` attribute's, and a bare code works
too: `data-keyrove-focus-key="KeyE"` makes <kbd class="kbd">E</kbd> pick the
element wherever the letter would not be typing. The move reports `'focus'` to
`onMove` and in the [return value](/docs/api#return-value), so a consumer can
tell a jump from a step.

## As far as the listener hears

keyrove looks for focus keys on every element under the listener's element,
not just in the nearest root, so where you attach the listener is the only
scope control:

- On a panel, the keys work inside that panel.
- On `document`, they work page-wide.
- From inside a [nested root](/docs/examples/nested-roots), a focus key
  outside it still fires. Focus keys are the third way out of a nested group,
  after <kbd class="kbd">Tab</kbd> and a key of your own.

## A key and an order

The panels have no order worth walking, so they are not items. A tool palette
has both: an order, top to bottom, and a key for every tool that anyone who has
used a design app already knows. So each tool is an item _and_ carries a focus
key.

<div data-demo="tools"></div>

```ts
document.querySelector('#tools').addEventListener('keydown', (e) => keyRove(e));
```

Press <kbd class="kbd">P</kbd> for the pen, then <kbd class="kbd">↓</kbd>: the
arrow steps on from wherever the key landed, because the pen is a stop in the
same order the arrows walk. The log tells the two apart, `focus` for the jump
and `next` for the step. Then <kbd class="kbd">Tab</kbd> out of the palette and
<kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd> back: focus returns to
the tool you last reached, whichever way you reached it, because the
[roving tab stop](/docs/examples/roving-tabindex) follows a jump as it follows
an arrow.

The keys are the ones design tools use, not the tools' initials: Move is
<kbd class="kbd">V</kbd>, Ellipse is <kbd class="kbd">O</kbd>, and the
eyedropper is <kbd class="kbd">I</kbd>. That is the line between a focus key
and [typeahead](/docs/examples/typeahead): typeahead finds an item by how its
label is spelled, while a focus key binds whatever key you choose to one
element. Each tool also carries `aria-keyshortcuts`, and the cap beside its
name is drawn from that attribute rather than written a second time, so what
the palette shows is what a screen reader announces; see
[telling users about it](#telling-users-about-it).

The key only moves focus. A real palette would pick the tool as well, and that
is the app's own business: `onMove` reports the jump as `'focus'`, with the
tool as `to`, which is the place to do it.

## Item or not

A focus key needs no `data-keyrove-item`, and whether its element has one
decides what else reaches it:

- **An item**, like a tool in the palette, stays in its group's order, so the
  arrows reach it too, and the key is a shortcut to a place they already go.
  The jump is a move in that group: `from` is the item focus left, or `null`
  from outside the group, and a
  [roving tab stop](/docs/examples/roving-tabindex) follows it as it follows an
  arrow.
- **Any other element**, like the panels, is reached by its key alone. No arrow
  lands on it, and the jump belongs to no group: `from` is `null`, and no tab
  stop moves.

Either way, pressing the key while focus is already inside its element is a
consumed no-op: the key is claimed, and focus stays where it is. The
[API reference](/docs/api#focus-keys) has the exact rules.

A panel with a list inside is best made that list's root: put
`data-keyrove-root` on the panel itself. The jump leaves focus on the panel,
and an arrow pressed there then enters the panel's own list. Without the root,
the arrow belongs to the group around the panels and lands on the first item
under the listener, whichever panel that is in.

```html
<section
  data-keyrove-root
  data-keyrove-focus-key="ctrl+shift+Digit1"
  tabindex="-1"
>
  <ul>
    <li data-keyrove-item tabindex="-1">index.ts</li>
    <li data-keyrove-item tabindex="-1">README.md</li>
  </ul>
</section>
```

The panel's `tabindex="-1"` is what lets it take focus while keeping it out of
the <kbd class="kbd">Tab</kbd> order. Without it, or on any element that cannot
take focus, the key is still claimed, but focus stays where it was and
`onMove` does not fire.

## From inside a text field

Moves are never handled inside
[editable targets](/docs/examples/editable-targets), whatever they are bound
to: arrows and <kbd class="kbd">Home</kbd> move the caret there, and letters
type. A focus key
points _out_ of the field, so it gets the line typeahead draws between a command
and typing:

- A combo holding <kbd class="kbd">Ctrl</kbd>, <kbd class="kbd">Alt</kbd> or
  <kbd class="kbd">Meta</kbd> fires from inside a field.
- A bare combo, or one holding only <kbd class="kbd">Shift</kbd>, does not.

In the demo, `ctrl+shift+Digit1` reaches out of the text area; a bare `Digit1`
would type a "1" there and focus the panel from everywhere else.

That leaves collisions with the field's own commands and typing to you:
<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">B</kbd> means bold in a rich-text
editor, <kbd class="kbd">Alt</kbd>+letter types accented characters on macOS,
and on Windows <kbd class="kbd">AltGr</kbd> is reported as
<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Alt</kbd>, so a `ctrl+alt+` chord
fires while a user types € or @ on many European layouts.
<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Shift</kbd> chords, like the
demo's, tend to be free.

## Precedence and ties

A focus key is the most specific binding there is: it names one element, where a
root's `*-key` names a whole group and a default names nothing in particular. So
focus keys sit first in the [binding table](/docs/api#precedence) and win any
collision. An item bound to `Home` takes <kbd class="kbd">Home</kbd> and the
default stands down, just as a root binding would. Had an inner root's rebinding
of the same combo won instead, the outer item's key would have failed only while
focus was inside that root, and silently; fixed precedence makes a collision
show up every time.

Two elements naming the same combo resolve to the first in DOM order; the second
is unreachable by that key. Elements carrying `data-keyrove-skip` or `disabled`
are not destinations, so a focus key on one is inert and the key keeps its
browser default. As with every binding, the wider the listener, the more a bare-letter
key can shadow; a chord is the safer choice on a `document` listener.

## Telling users about it

keyrove reads the combo; it does not announce it. The
[`aria-keyshortcuts`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-keyshortcuts)
attribute exists for that, and it is worth setting alongside the focus key so
assistive technology can say the shortcut out loud. The two use different
spellings, ARIA names keys where keyrove names physical codes, so
`data-keyrove-focus-key="ctrl+shift+KeyE"` pairs with
`aria-keyshortcuts="Control+Shift+E"`.
