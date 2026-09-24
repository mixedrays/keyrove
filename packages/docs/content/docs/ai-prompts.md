---
# Live page: https://keyrove.pages.dev/docs/ai-prompts
title: AI prompts
description: Copy-ready prompts that point a coding assistant at these docs, from adding keyrove to a project to building a playground.
keywords: [ai prompts, coding assistant, llms.txt]
titleTag: Prompts for AI coding assistants — keyrove
group: Guide
order: 2.5
---

An assistant may not know keyrove's current API. Each prompt below first
points the assistant at [llms.txt](/llms.txt) and the Markdown version of the
pages it needs, so it works from the current docs.

Paste a prompt into an assistant that can fetch URLs and, for work in an
existing project, read your files. Replace anything in `[brackets]` first. If
the assistant cannot fetch URLs, open the pages the prompt names and paste
them in with **Copy page**, under each page's title.

## Get started

### Add keyrove to your project

The assistant surveys the codebase, proposes where keyrove fits, and waits for
you to choose before it changes anything.

```text copy
I want to add keyboard navigation to this project with keyrove
(@mixedrays/keyrove). Before writing code, read the docs index at
https://keyrove.pages.dev/llms.txt, then
https://keyrove.pages.dev/docs/introduction.md and
https://keyrove.pages.dev/docs/installation.md. Use those pages, not memory,
for API names and behavior.

1. Work out the framework, package manager and component conventions this
   project uses.
2. Find components where arrow-key navigation would help: menus, lists,
   toolbars, tab lists, card grids, trees, sidebars, and any keydown
   handlers that already move focus by hand. List them with file paths and
   the keyrove pattern each would use: list, grid, roving tabindex, nested
   roots or typeahead.
3. Stop and let me pick one before changing anything.
4. For the one I pick, install the package with the project's package
   manager, add the handler and item markers, and keep the existing roles,
   ARIA attributes and click behavior. keyrove only moves focus; roles,
   selection and activation stay with the component.
5. Tell me which keys now work and how to try them.
```

### Build a playground

A throwaway app with one demo per feature and a log of every move. The React
version is a Vite project; the single-file version runs straight from disk
with no install and needs an internet connection to load keyrove from a CDN.

```text title="React" copy
Build me a playground for trying keyrove (@mixedrays/keyrove), a keyboard
navigation library. Read https://keyrove.pages.dev/llms.txt first, then
https://keyrove.pages.dev/docs/installation.md and
https://keyrove.pages.dev/docs/api.md. Use only APIs those pages document.

Make it a Vite + React + TypeScript app: one page, with a section per demo,
each captioned with the keys to press.

- A vertical list with the arrows, Home and End
- A looping list
- A horizontal toolbar
- A grid with a fixed column count, and a CSS grid using cols "auto"
- A list with skipped and disabled items
- A roving-tabindex list with typeahead, using initRovingTabindex,
  followFocus and createTypeahead
- A nested group with enter and exit keys

Add a settings panel for loop, orientation, columns and custom next/prev
keys, applied to the demos with rootAttributes so a change takes effect on
the next keypress. Log every move from onMove (action, from, to) in a panel
at the bottom. Keep the styling plain, with a clearly visible focus ring.

Finish with the commands to install and run it.
```

```text title="One HTML file" copy
Build a single HTML file for trying keyrove (@mixedrays/keyrove), a keyboard
navigation library, with a CDN dependency and no build step.
Read https://keyrove.pages.dev/llms.txt first, then
https://keyrove.pages.dev/docs/introduction.md and
https://keyrove.pages.dev/docs/api.md. Use only APIs those pages document.

Import the package as an ES module from a CDN such as
https://esm.sh/@mixedrays/keyrove, in a <script type="module">. Put one
demo per section, each captioned with the keys to press:

- A vertical list with the arrows, Home and End
- A looping list
- A grid with a fixed column count
- A roving-tabindex list with typeahead
- A nested group with enter and exit keys

Configure the demos with data-keyrove-* attributes, and log every move from
onMove (action, from, to) in a panel at the bottom. Keep the styling plain,
with a clearly visible focus ring.
```

## Build something

### An accessible widget

keyrove moves focus; the widget still needs its roles, states and selection.
This prompt asks for both, following the ARIA pattern for the widget.

```text copy
Build a [listbox | menu | tab list | toolbar | tree view | grid | command
palette] for [what it holds, e.g. "choosing a project"], using keyrove
(@mixedrays/keyrove) for focus movement. Read
https://keyrove.pages.dev/llms.txt first, then
https://keyrove.pages.dev/docs/api.md and the closest example:

- Listboxes and menus: https://keyrove.pages.dev/docs/examples/listbox.md
- Trees: https://keyrove.pages.dev/docs/examples/tree-view.md
- Grids: https://keyrove.pages.dev/docs/examples/grid.md
- Anything with a text field:
  https://keyrove.pages.dev/docs/examples/editable-targets.md

Follow the matching WAI-ARIA Authoring Practices pattern for roles, states
and keys. keyrove does not write roles or aria-* states, and it leaves
selection, expanding and activation to you: add those handlers and chain
them after keyRove with ||, as the listbox example does.

Choose the focus model appropriate to the widget. Use roving tabindex for
groups that move DOM focus between items. A search-based command palette
using the combobox pattern may need focus to stay in the input, with
aria-activedescendant tracking the active result; keyrove does not implement
that model. Explain any behavior keyrove cannot provide.

Write it as [a React component | a Vue component | a Svelte component |
plain HTML and TypeScript] that follows this project's conventions, and list
the keys it supports.
```

### A shared hook or component

Wraps the setup from [complete roving setup](/docs/installation#complete-roving-setup)
once, so every list in a design system gets the same behavior.

```text copy
Wrap keyrove (@mixedrays/keyrove) for this project's design system. Read
https://keyrove.pages.dev/llms.txt, then the "Complete roving setup" section
of https://keyrove.pages.dev/docs/installation.md, and
https://keyrove.pages.dev/docs/api.md.

Create [a React hook | a Vue composable | a Svelte action | a web component]
that sets up a navigable group: keyRove on keydown, optional typeahead, and
optional roving tabindex with initRovingTabindex after each render and
followFocus on focusin. Accept the options keyRove takes and pass them
through unchanged rather than renaming them. Preserve the typeahead handler
across ordinary renders so its buffer survives between keypresses. Ensure
handlers use current options and callbacks without accumulating listeners.
Remove the listeners on unmount.

Then move [component names] onto it, add tests for the arrow keys, Home/End
and the single tab stop, and document it wherever this project documents
shared components.
```

### App-wide shortcuts

Vim-style movement, shortcuts that jump between regions, and keys to step
into and out of a row's controls.

```text copy
Add keyboard shortcuts to [the page or app area] with keyrove
(@mixedrays/keyrove). Read https://keyrove.pages.dev/llms.txt first, then
https://keyrove.pages.dev/docs/examples/custom-keys.md,
https://keyrove.pages.dev/docs/examples/focus-keys.md and
https://keyrove.pages.dev/docs/examples/nested-roots.md.

I want:
- J and K to move through [the main list], alongside the arrows
- [shortcut] to focus [the search field / sidebar / main panel]
- Enter to move into a row's actions, and Escape to move back out
- [anything else]

Before using a binding, check it against browser and screen reader
shortcuts and flag any conflict. Text fields must keep typing normally.
Keep bare-letter shortcuts active only while their component has focus, or
provide a way to disable them or remap them to include Ctrl, Alt or Meta.
Expose each shortcut with aria-keyshortcuts, and list them somewhere users
can find them.
```

## Improve existing code

### Replace hand-written arrow-key code

Finds focus-management code that keyrove could replace and reports the cost of
each swap before touching it.

```text copy
Find the keyboard navigation this codebase implements by hand: keydown
handlers that switch on ArrowUp, ArrowDown, Home or End, focused-index
state, calls to .focus() on siblings, and any roving-tabindex or focus
management libraries. Read https://keyrove.pages.dev/llms.txt,
https://keyrove.pages.dev/docs/introduction.md and
https://keyrove.pages.dev/docs/api.md first.

For each one, tell me whether keyrove (@mixedrays/keyrove) can replace it,
which behavior would change (looping, Home/End, page keys, skipped items,
right-to-left, text fields), and roughly how much code would go. Don't
change anything yet.

When I approve one, replace it. Keep its current keys unless I say
otherwise, and keep or add tests for every key it handled before.
```

### Audit keyboard access

A review with no edits: what a keyboard user meets today, ranked by impact.

```text copy
Audit keyboard access in [this app / the files under src/...]. Read
https://keyrove.pages.dev/llms.txt and
https://keyrove.pages.dev/docs/introduction.md first, so you know what
keyrove (@mixedrays/keyrove) covers and what it leaves to the component.

Go through the composite widgets: menus, listboxes, tabs, toolbars, grids,
trees and lists of cards. For each, report:
- how Tab moves through it now, and whether it should be one tab stop
- the arrow, Home/End and typeahead behavior users would expect
- missing roles, labels or states
- focus that is trapped, invisible, or lost after a delete or re-render

Where browser access is available, exercise the widgets with the keyboard.
Separate reproduced findings from suspected issues, give reproduction steps,
and state what could not be verified.

Rank the findings by impact, with file paths, and mark which ones keyrove
would fix and which need work it does not do. Don't edit any code.
```

### Test keyboard navigation

Tests that press real keys and check where focus lands.

```text copy
Write tests for the keyboard navigation in [component or file]. It uses
keyrove (@mixedrays/keyrove); read https://keyrove.pages.dev/llms.txt and
https://keyrove.pages.dev/docs/api.md for the behavior to expect.

Use the test tools this project already has, such as Testing Library's
user-event or Playwright. Cover:
- each bound key produces the expected movement or no-op, including at
  boundaries
- looping, skipped and disabled items, where the group uses them
- Tab enters and leaves the group, with one tab stop if it roves
- text fields inside the group keep their editing keys
- unbound keys remain unhandled by keyrove, and events an earlier handler
  already prevented cause no navigation
- onMove fires only when focus actually changes, with the expected side
  effects, such as selection that follows focus

Assert on document.activeElement and tabindex attributes, not on internal
state. A grid with cols "auto" reads CSS layout, so test it in a real
browser rather than jsdom.
```

### Debug a group that does not move

Walks the assistant through the usual causes before it changes any code.

```text copy
Keyboard navigation with keyrove (@mixedrays/keyrove) is not working in
[component or file]: [what happens, e.g. "ArrowDown does nothing" or "focus
jumps to the wrong list"]. Read https://keyrove.pages.dev/llms.txt and
https://keyrove.pages.dev/docs/api.md, especially the sections on roots,
precedence, consumed and untouched keys, and editable targets.

Check, in this order:
- the keydown listener is on an element that contains the items
- the items match data-keyrove-item or the items option, and can take focus
- the nearest data-keyrove-root above the target is the intended one
- another handler calls preventDefault first, or a binding overrides the key
- focus is in a text field, select or contenteditable element
- the items are hidden, skipped or disabled

Log keyRove's return value to see whether it consumed the key, and explain
the cause before changing any code.
```

## Writing your own

The prompts above share a few habits worth keeping in your own:

- **Point at the docs.** Start with `https://keyrove.pages.dev/llms.txt` and
  name the pages that matter. Any page's Markdown is at its URL plus `.md`.
- **Say what keyrove leaves out.** Roles, ARIA states, selection and
  activation are the component's job, so ask for them explicitly. See
  [what it leaves to you](/docs/introduction#what-it-leaves-to-you).
- **Ask for a plan first.** For changes across a codebase, have the assistant
  list what it would change and wait for your choice.
