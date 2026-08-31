---
title: About
description: What keyrove is, who maintains it, and which version of these docs you are reading.
group: Guide
order: 4
---

keyrove is a framework-agnostic library for keyboard navigation in lists and
grids. You mark the navigable elements with `data-*` attributes and forward
keydown events to one function; it works out which element should receive focus
next and moves it there. It renders nothing, owns no state, and has no
dependencies.

It is developed in the open under the MIT licence, and issues and pull requests
are welcome.

## This site

<div data-about></div>

Every page is also available as markdown — append `.md` to any URL, or use
**View as Markdown** in the right-hand rail. The pages are generated from the
files under `packages/docs/content` in the same repository, which is what the
**View source** link on each page opens.
