---
# Live page: https://keyrove.pages.dev/docs/examples/editable-targets
title: Editable targets
description: Mix keyboard navigation with text fields, selects and sliders. Editable controls keep their native keys while the arrows move between the rows around them.
titleTag: Keyboard navigation with input fields — keyrove
group: Examples
order: 21
---

Movement bindings leave editable fields their native keys. Arrows can move a
caret or change a value, and letter bindings do not capture typed text. Modified
focus shortcuts are the [exception](#the-one-exception).

Arrow between the demo's rows, then <kbd class="kbd">Tab</kbd> into a control. Text fields keep their
editing behavior, _Font size_ keeps its slider keys, and <kbd class="kbd">↓</kbd> on the checkbox
moves to the next row. The readout shows navigation in indigo and keys left to
the browser in gray.

<div data-demo="editable" data-demo-label="settings"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

document
  .querySelector('#settings')
  .addEventListener('keydown', (e) => keyRove(e));
```

No extra configuration is needed. A row remains the current item while focus
is inside one of its controls. When navigation resumes, it starts from that row.

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

The target determines whether movement keys are handled. In a text field,
`ctrl+ArrowRight` still moves by word and `KeyJ` still types "j", even when
those combos are bound to navigation. `keyRove` returns `null`, so any handler
chained after it also receives the event.

## The one exception

A [focus key](/docs/examples/focus-keys) with <kbd class="kbd">Ctrl</kbd>, <kbd class="kbd">Alt</kbd> or <kbd class="kbd">Meta</kbd> can move focus
from an editable field. Bare keys and <kbd class="kbd">Shift</kbd>-only combinations remain available
for typing. Choose shortcuts carefully: some modifiers also produce text,
including <kbd class="kbd">AltGr</kbd> reported as <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Alt</kbd>.

[Typeahead](/docs/examples/typeahead) never captures typing inside a field.

## While an input method composes

While `isComposing` is true, keyrove leaves every key to the input method,
including modified focus shortcuts. This lets users navigate candidates and
finish entering text.

## Rows as tab stops

Each row here carries `tabindex="0"` so it can be focused apart from its
control, which is what lets a row be the position before
<kbd class="kbd">Tab</kbd> reaches the control inside. It also doubles the tab
stops. Put [roving tabindex](/docs/examples/roving-tabindex) on the rows and
the list costs one stop, with the controls keeping theirs. Or make the controls
the items, `<input data-keyrove-item type="checkbox">`, and the rule reads the
same way round: the checkboxes navigate, the text fields do not.
