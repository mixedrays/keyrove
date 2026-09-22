# Changelog

## [2.5.0](https://github.com/mixedrays/keyrove/compare/v2.4.0...v2.5.0) (2026-09-22)

### Features

* accept a comma-separated list of combos per move ([1f51379](https://github.com/mixedrays/keyrove/commit/1f51379e3f8cecb4f98bcb4e9ccf238c55e39976))
* add exit and enter keys to move between nested roots ([aeb7599](https://github.com/mixedrays/keyrove/commit/aeb7599b8975996871b00ad9a4e47fc4be450a43))
* add followFocus to move the roving tab stop on focusin ([60f63b0](https://github.com/mixedrays/keyrove/commit/60f63b008753e430fb6a95f324f75a52de8bdf1a))
* add initRovingTabindex to give a roving group one tab stop ([ab5f153](https://github.com/mixedrays/keyrove/commit/ab5f15371733ec0c5f55b0fd4907962ba6c5da64))
* add rove to make a move from code without a keypress ([9a20785](https://github.com/mixedrays/keyrove/commit/9a20785ac4d05fe88026af9f9498f7626cb86e4d))
* count a CSS grid's columns with data-keyrove-cols="auto" ([ae9672d](https://github.com/mixedrays/keyrove/commit/ae9672dec7a4f535fa181cb8902033001839cf68))
* export KeyRoveOptions and KeyCombo type names ([b0ef55d](https://github.com/mixedrays/keyrove/commit/b0ef55d6cf17a3b4e75b28a01878020c4d91635b))
* ignore accents in typeahead matching ([cb1ea71](https://github.com/mixedrays/keyrove/commit/cb1ea71688189f7f9060ade916f1f40273516505))
* implement attribute builders for root and item settings with type-checking ([05fab60](https://github.com/mixedrays/keyrove/commit/05fab609782b132a500bfc4b093c910120569255))
* let initRovingTabindex take the item to hold the tab stop ([683e361](https://github.com/mixedrays/keyrove/commit/683e36174c32f17f92b4b12f086d09ab8422b955))
* never land on a skipped item, even when every item is skipped ([ca715cb](https://github.com/mixedrays/keyrove/commit/ca715cb6a0d2d7b182353bb8877a924b684e823e))
* switch a move off with 'none' value, from its attribute or the keys option ([ebfdb14](https://github.com/mixedrays/keyrove/commit/ebfdb143cae2925ead0b47a077bec8d88a281b61))

### Bug Fixes

* find the focused item inside a shadow root ([25624b9](https://github.com/mixedrays/keyrove/commit/25624b9483e723b15ef1dd6d47e804b781edc200))
* keep each nested group's roving tab stop when navigation crosses into it ([7f6603f](https://github.com/mixedrays/keyrove/commit/7f6603f6dbf1b3c25dc3e2d44b93b2c45c7cabd5))
* never match a combo with no code, and read blank bindings as unset ([2f0580a](https://github.com/mixedrays/keyrove/commit/2f0580ac22f06ecc10d642fe822128a8a77382a8))
* report no move when the target does not take focus ([fccaf3e](https://github.com/mixedrays/keyrove/commit/fccaf3ed3d73ede5c8683fbe83270f943e321201))
* skip keydown events another handler already consumed ([d187688](https://github.com/mixedrays/keyrove/commit/d187688060a73ef303c48015596d7a7646f6c777))
* tell a document or window listener apart by value, not by name ([fff9e67](https://github.com/mixedrays/keyrove/commit/fff9e67547a5d416c2959e1455f8b5fd4785a684))

## [2.4.0](https://github.com/mixedrays/keyrove/compare/v2.3.0...v2.4.0) (2026-09-20)

### Features

* let one object configure typeahead beside navigation ([f067030](https://github.com/mixedrays/keyrove/commit/f0670305e77f32d8e8136ca4d50eaaedfe253b45))
* name a group's settings in options as well as in markup ([9c0b5f9](https://github.com/mixedrays/keyrove/commit/9c0b5f91a0fa6b5d26eaf37ed30f1139db2bfb16))
* read a group's position from its own items ([9fa0f13](https://github.com/mixedrays/keyrove/commit/9fa0f135cefd77b0999b04d70cd5b9b2b7e89631))
* take a group's items, root, skips and roving as parameters ([78ecf9c](https://github.com/mixedrays/keyrove/commit/78ecf9c28e336a7714b701767d9cff8c2757fe40))

## [2.3.0](https://github.com/mixedrays/keyrove/compare/v2.2.0...v2.3.0) (2026-09-19)

### Features

* accept a focus key on any element, not only an item, add additional demo for focus key example ([35acf5d](https://github.com/mixedrays/keyrove/commit/35acf5d52a9ac1ad0f5391aa4c72edb247ca0031))

## [2.2.0](https://github.com/mixedrays/keyrove/compare/v2.1.0...v2.2.0) (2026-09-17)

### Features

* add cycle matching mode for typeahead functionality ([6d3488e](https://github.com/mixedrays/keyrove/commit/6d3488e45a3bc73f4e96f2c78b8761481886b488))

### Bug Fixes

* cycle typeahead from the focused item on every press ([ec80b63](https://github.com/mixedrays/keyrove/commit/ec80b6381ebe44547c9c286685ff594960c0dff6))
* ensure .tmp is ignored in the repository ([7423d9e](https://github.com/mixedrays/keyrove/commit/7423d9e9cb64c37b9b9cc18fd4ebbc000dd799fa))
* fall back to the default when cols or page-length is below 1 ([24410d7](https://github.com/mixedrays/keyrove/commit/24410d7a8915acbbb80c3a3ffd156641a07e0317))

### Performance Improvements

* derive key attribute names and compact the default binding table ([9ed3e00](https://github.com/mixedrays/keyrove/commit/9ed3e008abfa455ebbae1683ff35a7764d0f2aa7))
* resolve every move with one skip-aware walk ([b56507b](https://github.com/mixedrays/keyrove/commit/b56507bc11af7a027f8f786350ab3a8f79c29469))
* split the attribute map into flat constants to shrink the bundle ([e12685d](https://github.com/mixedrays/keyrove/commit/e12685d3dc46191ccb7c5b8b7614f56c4f203a57))

## [2.1.0](https://github.com/mixedrays/keyrove/compare/v2.0.0...v2.1.0) (2026-09-16)

### Features

* add support for explicit false values for boolean attributes ([d6bb99e](https://github.com/mixedrays/keyrove/commit/d6bb99e9369a3f9931850b2a51c6fc8a94bea564))
* optimize Open Graph card generation and caching strategy ([df3b3e5](https://github.com/mixedrays/keyrove/commit/df3b3e5e588cf305033bd94d26b8b99dfc86ffee))

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
