# keyrove Glossary

keyrove moves keyboard focus through lists, grids, and trees. These terms describe its groups and items, actions and keys, keypress outcomes, roving tab stops, and typeahead, and mark where the application's widget takes over.

## Groups and items

**Group**:
A root's item sequence together with the root's settings. Every group is a list or a grid.
In keyrove, a group is a navigation unit, not the ARIA `group` role; one widget can contain several groups.
_Avoid_: Collection, widget, root

**Root**:
The element whose items and settings define a group. For a keypress, it is the nearest root at or above the event target, otherwise the listener.
_Avoid_: Container, wrapper

**Listener**:
The element a keyrove handler is attached to, which can serve several roots. It is the fallback root and bounds the reach of focus keys and exit.
_Avoid_: Handler, root

**Nested root**:
A root inside another root's group, whose own group has separate key bindings and a separate roving tab stop. The outer group's item sequence still runs through the nested root's items.
_Avoid_: Child group, subgroup, isolated group

**Item**:
An element designated for a group's navigation. Designation alone does not make it navigable or able to receive focus.
In keyrove, an item is defined by designation, not by its ARIA role.
_Avoid_: Option, node, entry

**Item sequence**:
A group's items in navigation order, with disabled items removed and skipped items kept in place. The order is document order unless a function supplies the items in another order.
In keyrove, the item sequence ignores visual layout, so CSS reordering does not change it.
_Avoid_: Tab order, visual order, item list

**Own item**:
An item in a group's item sequence that does not belong to a nested root; an item that is itself a nested root belongs to the group around it. Roving tab stops and boundary actions use own items, while stride actions use the whole item sequence.
_Avoid_: Direct child, child item

**Navigable item**:
An item that is neither skipped nor disabled, and so can be the destination of an action. Being navigable does not guarantee that the element can receive focus.
_Avoid_: Focusable item, enabled item

**Skipped item**:
An item that keeps its place in the item sequence but is not navigable. Skipping alone does not take the item out of the Tab order.
_Avoid_: Disabled item, hidden item, removed item

**Disabled item**:
An item carrying the `disabled` attribute, which removes it from the item sequence and from focus-key destinations.
In keyrove, `aria-disabled` alone does not make a disabled item.
_Avoid_: Skipped item, inactive item, unavailable item

**Focused item**:
The first item in the item sequence that contains browser focus, on itself or on a descendant. Where items nest, the outer item is therefore the focused item.
In keyrove, the focused item differs from the focused element when focus is on a control inside an item.
_Avoid_: Current item, active item, selected item, position

## Layout

**List**:
A group with a column count of one, in either orientation.
_Avoid_: Vertical group, one-dimensional group

**Grid**:
A group with a column count above one, whose item sequence fills consecutive rows of that many items.
In keyrove, "grid" means a column count above one, which a CSS grid can supply; neither the ARIA `grid` role nor on-screen geometry makes a group a grid.
_Avoid_: Matrix, table, spatial navigation

**Column count**:
The number of items per row of a group's item sequence, either fixed or counted from the root's CSS grid columns. A column count of one makes a list.
_Avoid_: Row length, width

**Orientation**:
The vertical or horizontal axis of a list's default bindings for next and previous item.
In keyrove, orientation applies only to lists and never reorders the item sequence; a grid's next and previous item actions always run along its rows.
_Avoid_: Direction, flow

**Reading direction**:
The left-to-right or right-to-left text direction at a group's root, which decides the horizontal default bindings for next and previous item.
In keyrove, reading direction affects only default bindings; an explicit key binding keeps its literal key.
_Avoid_: Text direction, RTL mode

**Page length**:
The distance of a page jump: that many items in a list, or rows in a grid. Skipped items count toward it, though a page jump never lands on one.
In keyrove, page length is a fixed count, not the number of items visible in a scrolled viewport.
_Avoid_: Page size, visible-page size

**Looping**:
A list setting under which next and previous item actions continue past one end of the item sequence to the navigable item at the other end.
In keyrove, only lists loop, and only for next and previous item; "cycle" is reserved for typeahead's cycle mode.
_Avoid_: Wrapping, cycling, circular navigation

## Actions and moves

**Action**:
The navigation operation a keypress or a call from code resolves to: a stride action, a boundary action, a jump to a focus key's destination, or a typeahead match.
In keyrove, an action is what was requested; a move is what happened.
_Avoid_: Intent, command

**Move**:
A transfer of browser focus, made by keyrove, that lands on or inside its destination.
In keyrove, "move" means focus actually transferred; an action that ends as a consumed no-op is not a move.
_Avoid_: Navigation, focus change

**Stride action**:
An action through a group's item sequence: next or previous item, next or previous row, the ends of the group or row, or a page jump. Row actions exist only in grids and keep the column, while next and previous item actions continue across rows.
_Avoid_: Arrow action, step

**Group entry**:
A move into a group while none of its items holds focus. By keypress, only next and previous item or row actions and focus keys can make one.
In keyrove, group entry is distinct from enter, the boundary action into a nested root.
_Avoid_: Enter, focus-in

**Boundary action**:
An action between a nested root's group and the group around it: enter or exit. Neither has a default binding.
_Avoid_: Drill-down, tree expansion

**Enter**:
The boundary action from the focused item into the first nested root inside it, landing on that group's roving tab stop when navigable, otherwise on its first navigable own item.
In keyrove, enter names this action, never the Enter key, which stays unbound for activation.
_Avoid_: Drill in, expand, open

**Exit**:
The boundary action from a nested root to a navigable own item of the group around it: the item containing the nested root, otherwise the nearest one after it, otherwise the nearest one before it. Exit never leaves the listener.
In keyrove, exit names this action, never the Escape key or a loss of focus.
_Avoid_: Back out, collapse, escape

**Programmatic action**:
A stride action requested by name from code rather than by a keypress, independent of key bindings. It acts from the focused item, otherwise from the roving tab stop, otherwise as a group entry.
In keyrove, app code that focuses an element directly makes programmatic focus, not a programmatic action.
_Avoid_: Programmatic move, synthetic keypress

## Keys

**Combo**:
A physical key code with an exact set of modifiers: declared modifiers must be held and undeclared ones must not. The platform modifier means Command on Apple platforms and Control elsewhere.
In keyrove, a combo names a physical key, never a typed character.
_Avoid_: Chord, keystroke, hotkey

**Key binding**:
The combos a stride or boundary action of a group answers to: its explicit binding where one is set, otherwise its default binding. An explicit binding replaces the default rather than adding to it, and a disabled binding answers to no combo.
_Avoid_: Shortcut, keymap, key mapping

**Default binding**:
The combo a stride action answers to without an explicit key binding, chosen by whether the group is a list or a grid, its orientation, and its reading direction. Boundary actions have no default binding.
_Avoid_: Built-in key, fallback key

**Focus key**:
A combo assigned to one destination element, item or not, rather than to a stride or boundary action. It takes precedence over key bindings and reaches any root within the listener.
_Avoid_: Focus shortcut, access key, jump key

**Editable target**:
An event target inside a text field, select, editable content, or another input whose native behavior uses the keys keyrove binds. From an editable target, only focus keys pressed with Control, Alt, or Meta act.
In keyrove, buttons, checkboxes, and similar inputs are not editable targets, so navigation works from them.
_Avoid_: Input, form field, text input

## Keypress outcomes

**Consumed key**:
A keypress keyrove claims by preventing its browser default, whether or not a move follows.
In keyrove, consuming a key never stops its propagation.
_Avoid_: Handled key, captured key, swallowed key

**Consumed no-op**:
A consumed key that produces no move, such as an action at the end of a list or toward a destination that cannot receive focus.
_Avoid_: Failed move, ignored key

**Untouched key**:
A keypress keyrove leaves to the browser and other handlers, including one whose default an earlier handler already prevented.
_Avoid_: Unhandled key, ignored key, passed-through key

## Roving tabindex

**Roving tabindex**:
A focus arrangement in which a group's roving items share one tab stop that travels with focus. Each nested root keeps its own roving tab stop.
_Avoid_: Roving focus, focus trap

**Roving item**:
An item that takes part in roving tabindex, whether or not it holds the roving tab stop. Participation is set per item or for the whole group.
_Avoid_: Tab-stop holder, stop item

**Roving tab stop**:
The one roving item among a group's own items that Tab reaches when moving into the group. It stays on that item when focus leaves the group, so Tab returns there.
_Avoid_: Tab entry point, anchor item

## Typeahead

**Typeahead**:
Navigation to a navigable item by typing the start of its typeahead label. Matching uses typed characters, not combos.
In keyrove, typeahead only moves focus; it never filters or hides items.
_Avoid_: Type-to-select, find-as-you-type, autocomplete, filtering

**Typeahead label**:
The text an item is matched by during typeahead, set explicitly or taken from the item's text content.
In keyrove, the typeahead label need not match the item's accessible name.
_Avoid_: Accessible name, search text

**Typeahead buffer**:
The typed prefix accumulated for the current typeahead match, cleared after a pause or when the root changes. An unmatched character stays in the buffer until it is cleared.
_Avoid_: Search query, search string

**Prefix mode**:
The typeahead mode in which every character extends the typeahead buffer and the destination is the first matching navigable item in the item sequence.
_Avoid_: Search mode, substring matching

**Cycle mode**:
The typeahead mode in which repeating a single character steps through matching navigable items after the focused item, continuing from the start of the item sequence. A different character extends the typeahead buffer as in prefix mode.
_Avoid_: Looping, repeat mode

**Diacritic folding**:
Typeahead matching that ignores accents and other combining marks in both the typeahead label and the typeahead buffer. Letters without a decomposition, such as ø and ß, stay distinct.
In keyrove, case is always ignored; diacritic folding is a separate setting.
_Avoid_: Accent stripping, transliteration, case folding

## Widgets

**Widget**:
An application component, such as a menu, listbox, or tree, built on one or more groups. The widget owns selection, activation, and expansion; keyrove owns only focus and roving tab stops.
_Avoid_: Component, control

**Selection**:
A widget's record of chosen items, separate from the focused item and the roving tab stop.
In keyrove, selection never follows focus on its own; a widget that wants it to updates selection after each move.
_Avoid_: Focus, highlight

**Activation**:
A widget's response to the user acting on an item, such as opening a file or toggling a branch.
In keyrove, Enter and Space stay unbound, so activation keys belong to the widget.
_Avoid_: Selection, invocation

**Tree navigation**:
List navigation through a tree widget's visible rows, with branch expansion owned by the widget. The widget marks rows inside collapsed branches as skipped items.
In keyrove, a tree is one list, not a nested root per branch.
_Avoid_: Hierarchical navigation, tree traversal
