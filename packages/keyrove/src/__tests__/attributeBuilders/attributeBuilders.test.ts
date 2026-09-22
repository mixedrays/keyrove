import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import {
  createTypeahead,
  itemAttributes,
  keyRove,
  rootAttributes,
} from '../../index';
import type {
  GroupOptions,
  ItemAttributeOptions,
  RootAttributeOptions,
} from '../../index';
import { pressKey, resetTestState } from '../keyRove/testUtils';

afterEach(resetTestState);

const apply = (element: Element, attributes: Record<string, string>) => {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
};

const item = (options: ItemAttributeOptions = {}) => {
  const element = document.createElement('button');
  apply(element, itemAttributes(options));
  return element;
};

describe('attribute builders', () => {
  it('always emits an enabled marker, with no other defaults', () => {
    expect(rootAttributes()).toEqual({ 'data-keyrove-root': 'true' });
    expect(itemAttributes()).toEqual({ 'data-keyrove-item': 'true' });
  });

  it('serializes every root setting and move binding', () => {
    expect(
      rootAttributes({
        cols: 3,
        loop: false,
        orientation: 'horizontal',
        pageLength: 2,
        keys: {
          next: 'KeyJ, ArrowDown',
          prev: 'none',
          nextRow: 'KeyN',
          prevRow: 'KeyP',
          home: 'Home',
          end: 'End',
          homeRow: 'ctrl+KeyH',
          endRow: 'ctrl+KeyE',
          pageUp: 'PageUp',
          pageDown: 'PageDown',
          exit: 'Escape',
          enter: 'Enter',
        },
      }),
    ).toEqual({
      'data-keyrove-root': 'true',
      'data-keyrove-cols': '3',
      'data-keyrove-loop': 'false',
      'data-keyrove-orientation': 'horizontal',
      'data-keyrove-page-length': '2',
      'data-keyrove-next-key': 'KeyJ, ArrowDown',
      'data-keyrove-prev-key': 'none',
      'data-keyrove-next-row-key': 'KeyN',
      'data-keyrove-prev-row-key': 'KeyP',
      'data-keyrove-home-key': 'Home',
      'data-keyrove-end-key': 'End',
      'data-keyrove-home-row-key': 'ctrl+KeyH',
      'data-keyrove-end-row-key': 'ctrl+KeyE',
      'data-keyrove-page-up-key': 'PageUp',
      'data-keyrove-page-down-key': 'PageDown',
      'data-keyrove-exit-key': 'Escape',
      'data-keyrove-enter-key': 'Enter',
    });
    expect(rootAttributes({ cols: 'auto', loop: true })).toMatchObject({
      'data-keyrove-cols': 'auto',
      'data-keyrove-loop': 'true',
    });
  });

  it('serializes item settings, including false and empty labels', () => {
    expect(
      itemAttributes({
        skip: false,
        rovingTabindex: true,
        focusKey: 'ctrl+KeyE, KeyF',
        typeahead: '',
      }),
    ).toEqual({
      'data-keyrove-item': 'true',
      'data-keyrove-skip': 'false',
      'data-keyrove-roving-tabindex': 'true',
      'data-keyrove-focus-key': 'ctrl+KeyE, KeyF',
      'data-keyrove-typeahead': '',
    });
    expect(itemAttributes({ skip: true, rovingTabindex: false })).toMatchObject(
      {
        'data-keyrove-skip': 'true',
        'data-keyrove-roving-tabindex': 'false',
      },
    );
  });

  it('omits undefined values without omitting zero or empty bindings', () => {
    expect(
      rootAttributes({
        cols: undefined,
        loop: undefined,
        orientation: undefined,
        pageLength: undefined,
        keys: { next: undefined },
      }),
    ).toEqual(rootAttributes());
    expect(
      itemAttributes({
        skip: undefined,
        rovingTabindex: undefined,
        focusKey: undefined,
        typeahead: undefined,
      }),
    ).toEqual(itemAttributes());
    expect(
      rootAttributes({ cols: 0, pageLength: 0, keys: { next: '' } }),
    ).toEqual({
      'data-keyrove-root': 'true',
      'data-keyrove-cols': '0',
      'data-keyrove-page-length': '0',
      'data-keyrove-next-key': '',
    });
  });

  it('retains literal output keys and shares the root input with GroupOptions', () => {
    expectTypeOf<RootAttributeOptions>().toExtend<GroupOptions>();
    expectTypeOf(rootAttributes()['data-keyrove-root']).toEqualTypeOf<'true'>();
    expectTypeOf(itemAttributes()['data-keyrove-item']).toEqualTypeOf<'true'>();
    expectTypeOf(rootAttributes()['data-keyrove-next-row-key']).toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<keyof ReturnType<typeof itemAttributes>>().toEqualTypeOf<
      | 'data-keyrove-item'
      | 'data-keyrove-skip'
      | 'data-keyrove-roving-tabindex'
      | 'data-keyrove-focus-key'
      | 'data-keyrove-typeahead'
    >();
    // @ts-expect-error A misspelled option is not a root setting.
    rootAttributes({ pageLenght: 3 });
    // @ts-expect-error Orientations use the same union as GroupOptions.
    rootAttributes({ orientation: 'horizonal' });
    // @ts-expect-error The root selector is an option, not an attribute value.
    rootAttributes({ root: '.menu' });
    // @ts-expect-error Group-wide roving is not a root attribute.
    rootAttributes({ rovingTabindex: true });
    // @ts-expect-error Bindings are keyed by move names.
    rootAttributes({ keys: { nextrow: 'KeyJ' } });
    // @ts-expect-error Per-item skip is a boolean, not a group selector.
    itemAttributes({ skip: '.heading' });
  });

  it.each<{
    config: RootAttributeOptions;
    codes: string[];
    expected: number[];
  }>([
    {
      config: { loop: true },
      codes: ['End', 'ArrowDown', 'ArrowUp'],
      expected: [5, 0, 5],
    },
    { config: { loop: false }, codes: ['End', 'ArrowDown'], expected: [5, 5] },
    {
      config: { orientation: 'horizontal' },
      codes: ['ArrowDown', 'ArrowRight'],
      expected: [0, 1],
    },
    {
      config: { cols: 3, pageLength: 1 },
      codes: ['ArrowDown', 'ArrowRight', 'Home', 'PageUp'],
      expected: [3, 4, 3, 0],
    },
    {
      config: { cols: 'auto' },
      codes: ['ArrowDown', 'ArrowRight'],
      expected: [3, 4],
    },
    {
      config: { pageLength: 2, keys: { next: 'KeyJ, KeyN', prev: 'none' } },
      codes: ['KeyJ', 'KeyN', 'ArrowUp', 'PageDown'],
      expected: [1, 2, 2, 4],
    },
  ])(
    'navigates built markup like options: $config',
    ({ config, codes, expected }) => {
      const run = (markup: boolean) => {
        const root = document.createElement('div');
        root.style.gridTemplateColumns = '100px 100px 100px';
        if (markup) apply(root, rootAttributes(config));
        const items = Array.from({ length: 6 }, () => item());
        root.append(...items);
        document.body.append(root);
        root.addEventListener('keydown', (event) =>
          keyRove(event, markup ? undefined : config),
        );
        items[0].focus();
        return codes.map((code) => {
          const event = pressKey(code);
          return {
            index: items.indexOf(document.activeElement as HTMLButtonElement),
            consumed: event.defaultPrevented,
          };
        });
      };
      const markup = run(true);
      expect(markup).toEqual(run(false));
      expect(markup.map(({ index }) => index)).toEqual(expected);
    },
  );

  it('scopes nested roots under a delegated listener and binds enter and exit', () => {
    const panel = document.createElement('div');
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    const parent = document.createElement('div');
    parent.tabIndex = 0;
    apply(parent, itemAttributes());
    apply(outer, rootAttributes({ keys: { enter: 'Enter' } }));
    apply(inner, rootAttributes({ keys: { exit: 'Escape' } }));
    const child = item();
    inner.append(child);
    parent.append(inner);
    outer.append(parent);
    panel.append(outer);
    document.body.append(panel);
    panel.addEventListener('keydown', (event) => keyRove(event));
    parent.focus();
    pressKey('Enter');
    expect(document.activeElement).toBe(child);
    pressKey('Escape');
    expect(document.activeElement).toBe(parent);
  });

  it('reads built skip, roving, focus shortcuts and typeahead labels', () => {
    const root = document.createElement('div');
    apply(root, rootAttributes());
    const first = item({ skip: false, rovingTabindex: true });
    const skipped = item({ skip: true, typeahead: 'Banana' });
    const last = item({
      rovingTabindex: true,
      focusKey: 'KeyF',
      typeahead: 'Blueberry',
    });
    first.tabIndex = 0;
    last.tabIndex = -1;
    root.append(first, skipped, last);
    document.body.append(root);
    const typeahead = createTypeahead();
    root.addEventListener(
      'keydown',
      (event) => keyRove(event) || typeahead(event),
    );
    first.focus();
    pressKey('ArrowDown');
    expect(document.activeElement).toBe(last);
    expect(first.tabIndex).toBe(-1);
    expect(last.tabIndex).toBe(0);
    pressKey('Home');
    pressKey('KeyF');
    expect(document.activeElement).toBe(last);
    pressKey('Home');
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'b', code: 'KeyB', bubbles: true }),
    );
    expect(document.activeElement).toBe(last);
  });
});
