import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  itemAttributes,
  keyRove,
  matchesCombo,
  rootAttributes,
  rove,
} from '../../index';
import type {
  GroupOptions,
  KeyCombo,
  KeyRoveCode,
  KeyRoveEvent,
  KeyRoveOptions,
  Options,
} from '../../index';

// Checked by the typecheck; the runtime assertions only keep vitest honest.
describe('public type names', () => {
  it('names the handler options KeyRoveOptions, and keeps Options as the same type', () => {
    expectTypeOf<Options>().toEqualTypeOf<KeyRoveOptions>();
    expectTypeOf(keyRove)
      .parameter(1)
      .toEqualTypeOf<KeyRoveOptions | undefined>();
    expectTypeOf(rove).parameter(2).toEqualTypeOf<KeyRoveOptions | undefined>();
  });

  it('types bindings as KeyCombo: plain codes, modifiers, lists and none', () => {
    const next: KeyCombo = 'ArrowDown, ctrl+KeyJ';
    const options: KeyRoveOptions = {
      keys: { next, prev: 'KeyK', home: 'mod+ArrowUp', pageDown: 'none' },
    };

    expectTypeOf<NonNullable<GroupOptions['keys']>['next']>().toEqualTypeOf<
      KeyCombo | 'none' | undefined
    >();
    // A binding read from an attribute or outside data is a plain string.
    expectTypeOf<string>().toExtend<KeyCombo>();
    expectTypeOf(matchesCombo).parameter(1).toEqualTypeOf<KeyCombo>();
    expect(rootAttributes(options)['data-keyrove-next-key']).toBe(
      'ArrowDown, ctrl+KeyJ',
    );
    expect(itemAttributes({ focusKey: 'ctrl+shift+KeyE' })).toMatchObject({
      'data-keyrove-focus-key': 'ctrl+shift+KeyE',
    });
  });

  it('keeps KeyRoveCode for the physical key an event carries', () => {
    expectTypeOf<KeyRoveEvent['code']>().toEqualTypeOf<KeyRoveCode>();
    expectTypeOf<string>().toExtend<KeyRoveCode>();
  });
});
