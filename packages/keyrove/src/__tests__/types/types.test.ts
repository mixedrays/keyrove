import { describe, expect, expectTypeOf, it } from 'vitest';
import * as attributes from '../../attributes';
import * as entry from '../../index';
import {
  createTypeahead,
  itemAttributes,
  keyRove,
  matchesCombo,
  rootAttributes,
  rove,
} from '../../index';
import type {
  AnyMove,
  BoundaryAction,
  GroupOptions,
  KeyCombo,
  KeyRoveCode,
  KeyRoveEvent,
  KeyRoveOptions,
  Move,
  MoveAction,
  Options,
  RovingTabindexOptions,
  StrideAction,
  TypeaheadMove,
  TypeaheadOptions,
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

  it('accepts native events and React-style synthetic ones, path included', () => {
    type SyntheticKeyboardEvent = {
      code: string;
      target: EventTarget;
      currentTarget: Element;
      preventDefault: () => void;
      nativeEvent: KeyboardEvent;
      // React's parameter is a union of modifier names, narrower than the
      // DOM's `string`.
      getModifierState(key: 'Alt' | 'AltGraph' | 'Control' | 'Shift'): boolean;
    };

    expectTypeOf<KeyboardEvent>().toExtend<KeyRoveEvent>();
    expectTypeOf<SyntheticKeyboardEvent>().toExtend<KeyRoveEvent>();
  });

  it('types one onMove for keyRove, rove and createTypeahead with AnyMove', () => {
    expectTypeOf<AnyMove>().toEqualTypeOf<Move | TypeaheadMove>();

    const moves: AnyMove[] = [];
    const config = {
      items: '[role="menuitem"]',
      loop: true,
      onMove: (move: AnyMove) => moves.push(move),
    };

    // Both calls type-check with the one object; neither runs a move here.
    const typeahead = createTypeahead(config);
    keyRove(
      { code: 'KeyA', target: null, currentTarget: null, preventDefault() {} },
      config,
    );
    expectTypeOf<typeof config>().toExtend<KeyRoveOptions>();
    expectTypeOf<typeof config>().toExtend<TypeaheadOptions>();
    expect(typeof typeahead).toBe('function');
    expect(moves).toEqual([]);
  });

  it('names the boundary moves BoundaryAction, for typing a keys map', () => {
    expectTypeOf<BoundaryAction>().toEqualTypeOf<'exit' | 'enter'>();
    expectTypeOf<MoveAction>().toEqualTypeOf<
      StrideAction | BoundaryAction | 'focus'
    >();
    expectTypeOf<keyof NonNullable<GroupOptions['keys']>>().toEqualTypeOf<
      StrideAction | BoundaryAction
    >();

    const keys: Partial<Record<BoundaryAction, KeyCombo>> = { exit: 'Escape' };
    const options: KeyRoveOptions = { keys };

    expect(options.keys?.exit).toBe('Escape');
  });

  it('builds the typeahead options on the roving tabindex options', () => {
    expectTypeOf<RovingTabindexOptions>().toEqualTypeOf<
      Pick<GroupOptions, 'items' | 'root' | 'skip' | 'rovingTabindex'>
    >();
    expectTypeOf<TypeaheadOptions>().toExtend<RovingTabindexOptions>();
    expectTypeOf<
      Pick<TypeaheadOptions, keyof RovingTabindexOptions>
    >().toEqualTypeOf<RovingTabindexOptions>();
  });
});

describe('public constants', () => {
  it('exports every attribute constant from the package entry', () => {
    expect(
      Object.keys(entry).filter((name) => name.startsWith('KEYROVE_ATTR_')),
    ).toEqual(expect.arrayContaining(Object.keys(attributes)));
    expect(Object.keys(attributes)).toHaveLength(22);
  });
});
