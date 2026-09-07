# Changelog

## [2.0.0](https://github.com/mixedrays/keyrove/compare/v1.0.0...v2.0.0) (2026-09-07)

### ⚠ BREAKING CHANGES

* data-keyrove-cols-length is renamed to data-keyrove-cols
  (KEYROVE_ATTR_COLS_LENGTH → KEYROVE_ATTR_COLS). In a grid, next-key/prev-key
  now move one cell instead of one row — bind next-row-key/prev-row-key for
  row moves. MoveAction gains nextRow, prevRow, homeRow and endRow; grid row
  moves report nextRow/prevRow instead of next/prev. Default cell arrows flip
  under RTL, and bare Home/End in a grid are row-relative.

### Features

* accept control, option, cmd and command as modifier names ([e2f741b](https://github.com/mixedrays/keyrove/commit/e2f741b8d45bd9f53535b9ee6574846a6d7dea2c))
* focus an item from anywhere with its own data-keyrove-focus-key ([607c54d](https://github.com/mixedrays/keyrove/commit/607c54d58fb957f751f19203efa3e5d79e6ace3b))
* implement logic to focus the first item in demos on page load ([f9f0a3d](https://github.com/mixedrays/keyrove/commit/f9f0a3d2761a35806d9dd63b3f852ce2c2e82e39))
* leave a press alone while an IME composition is in progress ([8ac90ad](https://github.com/mixedrays/keyrove/commit/8ac90ad0956368741f6bb24768f344eee5064776))
* make every move rebindable through its own *-key attribute ([7becd56](https://github.com/mixedrays/keyrove/commit/7becd56ef3c35e32ed21c8d8fce3af16f7f27494))
* unify list and grid navigation on a folded-sequence model ([657e09c](https://github.com/mixedrays/keyrove/commit/657e09ce006b8113cc881cd93c1a2334c58ab874))

### Bug Fixes

* share the group layer across handlers and survive a document-level listener ([c05a0d1](https://github.com/mixedrays/keyrove/commit/c05a0d1a7e3a8b195f4e3fe20294daeb6aca1cd9))

## [1.0.0](https://github.com/mixedrays/keyrove/compare/v0.1.0...v1.0.0) (2026-08-30)

### ⚠ BREAKING CHANGES

* the callbacks option and the Callbacks type are gone; use
  onMove ({ action, from, to }) and the MoveAction/MoveResult/Move types.

### Features

* add createTypeahead type-to-focus ([18e93e5](https://github.com/mixedrays/keyrove/commit/18e93e5e9c5d9f3694f991bb076e6879748f9e29))
* add list loop wrapping and RTL-aware horizontal orientation ([120cb7e](https://github.com/mixedrays/keyrove/commit/120cb7e7ca74f3072918e53641a7706e1061f420))
* match keys as combos with exact modifier matching ([88ab1eb](https://github.com/mixedrays/keyrove/commit/88ab1eb6d91ea31483c9d6a833ff81491658bc24))
* replace callbacks with onMove and a structured return value ([c659a71](https://github.com/mixedrays/keyrove/commit/c659a713628e4540b0bb5da01a79134b769fd6ba))
* skip key handling inside editable targets ([161fa4f](https://github.com/mixedrays/keyrove/commit/161fa4f8c580aa2bf4ca10e3d69d3ab3bdcb6778))

### Bug Fixes

* preventDefault only once a navigation target resolves ([1d059f3](https://github.com/mixedrays/keyrove/commit/1d059f31efc9c67e53d533cd2c7ffecdb2f5cb50))

## [0.1.0](https://github.com/mixedrays/keyrove/compare/v0.0.1...v0.1.0) (2026-08-26)

### Features

* introduce types for keyrove's internal structure and enhance utility functions with type safety ([#4](https://github.com/mixedrays/keyrove/issues/4)) ([26d0e64](https://github.com/mixedrays/keyrove/commit/26d0e64098992a7e45dff626f6e83542d9ba59f4))

## 0.0.1 (2026-08-25)

### Bug Fixes

* remove unreleased section from README.md ([9b73d1a](https://github.com/mixedrays/keyrove/commit/9b73d1adbf0fcb191ea63e436619b08ed51b38bc))
