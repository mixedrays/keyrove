---
# Live page: https://keyrove.pages.dev/docs/examples/focus-keys
title: Focus keys
description: Assign shortcuts that focus items or panels across groups, including from editable fields.
titleTag: Keyboard shortcuts that focus an element — keyrove
group: Examples
order: 19
---

Set `data-keyrove-focus-key` on an element to focus it with a shortcut from
anywhere under the listener.

<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Shift</kbd>+<kbd class="kbd">1</kbd>, <kbd class="kbd">2</kbd> or <kbd class="kbd">3</kbd> focuses a panel in this demo. Try a shortcut from the text
area: focus keys with <kbd class="kbd">Ctrl</kbd>, <kbd class="kbd">Alt</kbd> or <kbd class="kbd">Meta</kbd> also work inside editable fields.

<div data-demo="panes" data-demo-label="editor panes"></div>

```ts
document
  .querySelector('#editor-panes')
  .addEventListener('keydown', (e) => keyRove(e));
```

The panels are not navigation items, so arrows do not move between them.
Each panel has its own [combo](/docs/api#combos). A bare code also works:
`data-keyrove-focus-key="KeyE"` focuses an element with <kbd class="kbd">E</kbd> outside editable
fields.

The move reports `action: 'focus'` to `onMove` and in the
[return value](/docs/api#return-value).

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

An element can have both `data-keyrove-item` and a focus key. This palette
supports arrow navigation and direct shortcuts to tools.

<div data-demo="tools" data-demo-label="drawing tools"></div>

```ts
document.querySelector('#tools').addEventListener('keydown', (e) => keyRove(e));
```

Press <kbd class="kbd">P</kbd> for the pen, then <kbd class="kbd">↓</kbd>: the
arrow steps on from wherever the key landed, because the pen is a stop in the
same order the arrows walk. The readout tells the two apart, `focus` for the jump
and `next` for the step. Then <kbd class="kbd">Tab</kbd> out of the palette and
<kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd> back: focus returns to
the tool you last reached, whichever way you reached it, because the
[roving tab stop](/docs/examples/roving-tabindex) follows a jump as it follows
an arrow.

Focus keys use the bindings you choose: <kbd class="kbd">V</kbd> for Move, <kbd class="kbd">O</kbd> for Ellipse, <kbd class="kbd">I</kbd> for
Eyedropper. [Typeahead](/docs/examples/typeahead) instead matches labels.

Each tool also has `aria-keyshortcuts`. The demo uses it to display the shortcut
beside the label; see [telling users about it](#telling-users-about-it).

A focus key only moves focus. To select or activate the tool, add your own
logic, for example in `onMove` using the destination `to`.

## Item or not

A focus key needs no `data-keyrove-item`, and whether its element has one
decides what else reaches it:

- **An item**, like a tool in the palette, stays in its group's order, so the
  arrows reach it too, and the key is a shortcut to a place they already go.
  The jump is a move in that group: `from` is the item focus left, or `null`
  from outside the group, and a
  [roving tab stop](/docs/examples/roving-tabindex) moves when focus leaves a
  roving item. Attach `followFocus` to `focusin` to update the stop when the
  shortcut enters from outside the group.
- **Any other element**, like the panels, is reached by its key alone. No arrow
  lands on it. A jump to it reports `from: null` and moves no group tab stop.
  If focus is already inside it, `from` is that element and `to` is `null`.

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

Movement bindings leave [editable targets](/docs/examples/editable-targets)
their editing keys. Focus shortcuts are the exception:

- A combo holding <kbd class="kbd">Ctrl</kbd>, <kbd class="kbd">Alt</kbd> or
  <kbd class="kbd">Meta</kbd> fires from inside a field.
- A bare combo, or one holding only <kbd class="kbd">Shift</kbd>, does not.

In the demo, `ctrl+shift+Digit1` reaches out of the text area; a bare `Digit1`
would type a "1" there and focus the panel from everywhere else.

Choose shortcuts that do not conflict with editing commands or text input.
For example, <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">B</kbd> can mean bold; <kbd class="kbd">Alt</kbd>+letter can type accented characters on
macOS; and Windows can report <kbd class="kbd">AltGr</kbd> as <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Alt</kbd>. A `ctrl+alt+` focus shortcut
can therefore fire during text entry. No focus key runs while `isComposing`
is true.

## Precedence and ties

Focus keys take precedence over explicit movement bindings and defaults.
For example, an element's `Home` focus key overrides the usual <kbd class="kbd">Home</kbd> action.

When two elements declare the same combo, the first in DOM order wins.
The attribute scan excludes skipped and disabled targets. An explicit
`focusKeys` map replaces that scan and bypasses skip checks, but still excludes
disabled targets; see
[configuration differences](/docs/attributes-and-options#configuration-differences).

If a target is excluded, another binding may handle the key. If none matches,
the browser keeps it. Consider the listener's scope when assigning shortcuts:
a bare letter on a document listener applies across the page.

## Telling users about it

Add
[`aria-keyshortcuts`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-keyshortcuts)
to expose a shortcut to assistive technology. keyrove does not set it for you.
ARIA uses key names, while keyrove uses physical codes:
`data-keyrove-focus-key="ctrl+shift+KeyE"` pairs with
`aria-keyshortcuts="Control+Shift+E"`.
