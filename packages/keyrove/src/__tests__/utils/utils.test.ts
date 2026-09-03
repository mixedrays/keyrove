import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  findFirst,
  findGridNeighbor,
  findLast,
  findNext,
  findPageTarget,
  findPrev,
  hasCommandModifier,
  matchesCombo,
  parseAttributeInt,
  toggleTabIndex,
} from '../../utils';
import type { KeyRoveEvent } from '../../types';
import { SKIP, buildElements, idOf } from './testUtils';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('parseAttributeInt', () => {
  const withAttribute = (value: string | null) => {
    const el = document.createElement('div');
    if (value !== null) el.setAttribute('data-n', value);
    return el;
  };

  it('reads an integer attribute', () => {
    expect(parseAttributeInt(withAttribute('7'), 'data-n', 1)).toBe(7);
  });

  it('falls back when the attribute is absent', () => {
    expect(parseAttributeInt(withAttribute(null), 'data-n', 3)).toBe(3);
  });

  it('falls back when the attribute is unparseable', () => {
    expect(parseAttributeInt(withAttribute('abc'), 'data-n', 4)).toBe(4);
  });

  it('falls back when the attribute parses to zero', () => {
    expect(parseAttributeInt(withAttribute('0'), 'data-n', 5)).toBe(5);
  });
});

describe('findFirst / findLast', () => {
  it('finds the outermost navigable elements', () => {
    const elements = buildElements(4);

    expect(idOf(findFirst(elements, SKIP))).toBe('e0');
    expect(idOf(findLast(elements, SKIP))).toBe('e3');
  });

  it('steps past skipped elements at either end', () => {
    const elements = buildElements(4, [0, 3]);

    expect(idOf(findFirst(elements, SKIP))).toBe('e1');
    expect(idOf(findLast(elements, SKIP))).toBe('e2');
  });

  it('falls back to the real ends when everything is skipped', () => {
    const elements = buildElements(3, [0, 1, 2]);

    expect(idOf(findFirst(elements, SKIP))).toBe('e0');
    expect(idOf(findLast(elements, SKIP))).toBe('e2');
  });

  it('returns undefined for an empty list', () => {
    expect(findFirst([], SKIP)).toBeUndefined();
    expect(findLast([], SKIP)).toBeUndefined();
  });
});

describe('findNext / findPrev', () => {
  it('moves one position', () => {
    const elements = buildElements(4);

    expect(
      idOf(findNext({ elements, fromIndex: 1, skipAttribute: SKIP })),
    ).toBe('e2');
    expect(
      idOf(findPrev({ elements, fromIndex: 1, skipAttribute: SKIP })),
    ).toBe('e0');
  });

  it('steps over skipped elements', () => {
    const elements = buildElements(4, [1, 2]);

    expect(
      idOf(findNext({ elements, fromIndex: 0, skipAttribute: SKIP })),
    ).toBe('e3');
    expect(
      idOf(findPrev({ elements, fromIndex: 3, skipAttribute: SKIP })),
    ).toBe('e0');
  });

  it('holds at the ends rather than wrapping', () => {
    const elements = buildElements(3);

    expect(
      idOf(findNext({ elements, fromIndex: 2, skipAttribute: SKIP })),
    ).toBe('e2');
    expect(
      idOf(findPrev({ elements, fromIndex: 0, skipAttribute: SKIP })),
    ).toBe('e0');
  });

  it('enters the list from nothing focused', () => {
    const elements = buildElements(3);

    expect(
      idOf(findNext({ elements, fromIndex: -1, skipAttribute: SKIP })),
    ).toBe('e0');
    expect(
      idOf(findPrev({ elements, fromIndex: -1, skipAttribute: SKIP })),
    ).toBe('e0');
  });

  it('wraps around the ends when loop is set', () => {
    const elements = buildElements(3);

    expect(
      idOf(
        findNext({ elements, fromIndex: 2, skipAttribute: SKIP, loop: true }),
      ),
    ).toBe('e0');
    expect(
      idOf(
        findPrev({ elements, fromIndex: 0, skipAttribute: SKIP, loop: true }),
      ),
    ).toBe('e2');
  });

  it('wraps to the first and last non-skipped element', () => {
    const elements = buildElements(4, [0, 3]);

    expect(
      idOf(
        findNext({ elements, fromIndex: 2, skipAttribute: SKIP, loop: true }),
      ),
    ).toBe('e1');
    expect(
      idOf(
        findPrev({ elements, fromIndex: 1, skipAttribute: SKIP, loop: true }),
      ),
    ).toBe('e2');
  });

  it('enters from nothing focused at the first (next) or last (prev) when looping', () => {
    const elements = buildElements(3);

    expect(
      idOf(
        findNext({ elements, fromIndex: -1, skipAttribute: SKIP, loop: true }),
      ),
    ).toBe('e0');
    expect(
      idOf(
        findPrev({ elements, fromIndex: -1, skipAttribute: SKIP, loop: true }),
      ),
    ).toBe('e2');
  });

  it('does not wrap while a target still exists ahead', () => {
    const elements = buildElements(3);

    expect(
      idOf(
        findNext({ elements, fromIndex: 0, skipAttribute: SKIP, loop: true }),
      ),
    ).toBe('e1');
    expect(
      idOf(
        findPrev({ elements, fromIndex: 2, skipAttribute: SKIP, loop: true }),
      ),
    ).toBe('e1');
  });
});

describe('findGridNeighbor', () => {
  // 3 columns over 9 elements: e0 e1 e2 / e3 e4 e5 / e6 e7 e8
  it('moves a whole row', () => {
    const elements = buildElements(9);

    expect(
      idOf(
        findGridNeighbor({
          elements,
          fromIndex: 4,
          step: 3,
          skipAttribute: SKIP,
        }),
      ),
    ).toBe('e7');
    expect(
      idOf(
        findGridNeighbor({
          elements,
          fromIndex: 4,
          step: -3,
          skipAttribute: SKIP,
        }),
      ),
    ).toBe('e1');
  });

  it('moves one cell', () => {
    const elements = buildElements(9);

    expect(
      idOf(
        findGridNeighbor({
          elements,
          fromIndex: 4,
          step: 1,
          skipAttribute: SKIP,
        }),
      ),
    ).toBe('e5');
    expect(
      idOf(
        findGridNeighbor({
          elements,
          fromIndex: 4,
          step: -1,
          skipAttribute: SKIP,
        }),
      ),
    ).toBe('e3');
  });

  it('steps further in the same direction over a skipped cell', () => {
    // 12 elements over 3 columns, so index 10 exists to step on to
    const elements = buildElements(12, [7]);

    expect(
      idOf(
        findGridNeighbor({
          elements,
          fromIndex: 4,
          step: 3,
          skipAttribute: SKIP,
        }),
      ),
    ).toBe('e10');
  });

  it('returns null when every cell beyond the skipped one is off the end', () => {
    const elements = buildElements(9, [7]);

    expect(
      findGridNeighbor({
        elements,
        fromIndex: 4,
        step: 3,
        skipAttribute: SKIP,
      }),
    ).toBeNull();
  });

  it('returns null at the edge instead of wrapping', () => {
    const elements = buildElements(9);

    expect(
      findGridNeighbor({
        elements,
        fromIndex: 7,
        step: 3,
        skipAttribute: SKIP,
      }),
    ).toBeNull();
    expect(
      findGridNeighbor({
        elements,
        fromIndex: 1,
        step: -3,
        skipAttribute: SKIP,
      }),
    ).toBeNull();
  });

  it('returns null when nothing is focused', () => {
    const elements = buildElements(9);

    expect(
      findGridNeighbor({
        elements,
        fromIndex: -1,
        step: 1,
        skipAttribute: SKIP,
      }),
    ).toBeNull();
  });
});

describe('findPageTarget', () => {
  it('moves a full stride', () => {
    const elements = buildElements(10);

    expect(
      idOf(
        findPageTarget({
          elements,
          fromIndex: 0,
          direction: 1,
          stride: 3,
          skipAttribute: SKIP,
        }),
      ),
    ).toBe('e3');
    expect(
      idOf(
        findPageTarget({
          elements,
          fromIndex: 6,
          direction: -1,
          stride: 3,
          skipAttribute: SKIP,
        }),
      ),
    ).toBe('e3');
  });

  it('clamps to the last element when it overshoots the end', () => {
    const elements = buildElements(5);

    expect(
      idOf(
        findPageTarget({
          elements,
          fromIndex: 3,
          direction: 1,
          stride: 10,
          skipAttribute: SKIP,
        }),
      ),
    ).toBe('e4');
  });

  it('clamps to the first element when it overshoots the start', () => {
    const elements = buildElements(5);

    expect(
      idOf(
        findPageTarget({
          elements,
          fromIndex: 1,
          direction: -1,
          stride: 10,
          skipAttribute: SKIP,
        }),
      ),
    ).toBe('e0');
  });

  it('clamps past skipped elements at the edge', () => {
    const elements = buildElements(5, [4]);

    expect(
      idOf(
        findPageTarget({
          elements,
          fromIndex: 0,
          direction: 1,
          stride: 10,
          skipAttribute: SKIP,
        }),
      ),
    ).toBe('e3');
  });

  it('steps over a skipped element it would have landed on', () => {
    const elements = buildElements(6, [3]);

    expect(
      idOf(
        findPageTarget({
          elements,
          fromIndex: 0,
          direction: 1,
          stride: 3,
          skipAttribute: SKIP,
        }),
      ),
    ).toBe('e4');
  });

  it('returns null when nothing is focused', () => {
    const elements = buildElements(5);

    expect(
      findPageTarget({
        elements,
        fromIndex: -1,
        direction: 1,
        stride: 2,
        skipAttribute: SKIP,
      }),
    ).toBeNull();
  });
});

describe('matchesCombo', () => {
  type Modifiers = Pick<
    KeyRoveEvent,
    'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'
  >;

  const keyEvent = (code: string, modifiers: Modifiers = {}) => ({
    code,
    target: null,
    currentTarget: null,
    preventDefault: () => {},
    ...modifiers,
  });

  const mockPlatform = (platform: string) =>
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('matches a bare code with no modifiers held', () => {
    expect(matchesCombo(keyEvent('ArrowDown'), 'ArrowDown')).toBe(true);
  });

  it('rejects a bare code when any modifier is held', () => {
    expect(
      matchesCombo(keyEvent('ArrowDown', { ctrlKey: true }), 'ArrowDown'),
    ).toBe(false);
    expect(
      matchesCombo(keyEvent('ArrowDown', { altKey: true }), 'ArrowDown'),
    ).toBe(false);
    expect(
      matchesCombo(keyEvent('ArrowDown', { shiftKey: true }), 'ArrowDown'),
    ).toBe(false);
    expect(
      matchesCombo(keyEvent('ArrowDown', { metaKey: true }), 'ArrowDown'),
    ).toBe(false);
  });

  it('rejects a different code', () => {
    expect(matchesCombo(keyEvent('ArrowUp'), 'ArrowDown')).toBe(false);
  });

  it('requires every declared modifier', () => {
    expect(
      matchesCombo(keyEvent('ArrowDown', { ctrlKey: true }), 'ctrl+ArrowDown'),
    ).toBe(true);
    expect(matchesCombo(keyEvent('ArrowDown'), 'ctrl+ArrowDown')).toBe(false);
  });

  it('forbids undeclared modifiers', () => {
    expect(
      matchesCombo(
        keyEvent('ArrowDown', { ctrlKey: true, shiftKey: true }),
        'ctrl+ArrowDown',
      ),
    ).toBe(false);
  });

  it('matches multiple declared modifiers in any order', () => {
    const event = keyEvent('KeyS', { ctrlKey: true, shiftKey: true });

    expect(matchesCombo(event, 'ctrl+shift+KeyS')).toBe(true);
    expect(matchesCombo(event, 'shift+ctrl+KeyS')).toBe(true);
  });

  it('treats modifier case as insignificant', () => {
    expect(matchesCombo(keyEvent('Home', { altKey: true }), 'ALT+Home')).toBe(
      true,
    );
  });

  it('matches the code case-sensitively', () => {
    expect(matchesCombo(keyEvent('KeyA'), 'keya')).toBe(false);
  });

  it('never matches an unknown modifier', () => {
    expect(
      matchesCombo(keyEvent('KeyA', { ctrlKey: true }), 'hyper+KeyA'),
    ).toBe(false);
  });

  it('never matches inherited object property names as modifiers', () => {
    expect(matchesCombo(keyEvent('ArrowDown'), 'constructor+ArrowDown')).toBe(
      false,
    );
    expect(matchesCombo(keyEvent('ArrowDown'), '__proto__+ArrowDown')).toBe(
      false,
    );
  });

  it('never matches a combo with an empty code, like "ctrl++"', () => {
    expect(matchesCombo(keyEvent('Equal', { ctrlKey: true }), 'ctrl++')).toBe(
      false,
    );
    expect(matchesCombo(keyEvent('Equal', { ctrlKey: true }), 'ctrl + +')).toBe(
      false,
    );
  });

  it('tolerates whitespace around combo parts', () => {
    expect(
      matchesCombo(
        keyEvent('ArrowLeft', { ctrlKey: true }),
        ' ctrl + ArrowLeft ',
      ),
    ).toBe(true);
  });

  it('resolves mod to meta on Apple platforms', () => {
    mockPlatform('MacIntel');

    expect(matchesCombo(keyEvent('KeyK', { metaKey: true }), 'mod+KeyK')).toBe(
      true,
    );
    expect(matchesCombo(keyEvent('KeyK', { ctrlKey: true }), 'mod+KeyK')).toBe(
      false,
    );
  });

  it('resolves mod to ctrl elsewhere', () => {
    mockPlatform('Win32');

    expect(matchesCombo(keyEvent('KeyK', { ctrlKey: true }), 'mod+KeyK')).toBe(
      true,
    );
    expect(matchesCombo(keyEvent('KeyK', { metaKey: true }), 'mod+KeyK')).toBe(
      false,
    );
  });
});

describe('hasCommandModifier', () => {
  const press = (
    modifiers: Pick<
      KeyRoveEvent,
      'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'
    > = {},
  ): KeyRoveEvent => ({
    code: 'KeyE',
    target: null,
    currentTarget: null,
    preventDefault: () => {},
    ...modifiers,
  });

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Alt', { altKey: true }],
    ['Meta', { metaKey: true }],
  ])('is true with %s held', (_, modifiers) => {
    expect(hasCommandModifier(press(modifiers))).toBe(true);
  });

  it('is false for a bare press, and for Shift alone, which is typing', () => {
    expect(hasCommandModifier(press())).toBe(false);
    expect(hasCommandModifier(press({ shiftKey: true }))).toBe(false);
  });
});

describe('toggleTabIndex', () => {
  const buildTree = () => {
    const root = document.createElement('div');
    root.setAttribute('tabindex', '-1');
    const child = document.createElement('button');
    child.setAttribute('tabindex', '-1');
    root.append(child);

    return { root, child };
  };

  it('does nothing when the root is null', () => {
    expect(() => toggleTabIndex({ root: null, isActive: true })).not.toThrow();
  });

  it('activates the root', () => {
    const { root } = buildTree();

    toggleTabIndex({ root, isActive: true });

    expect(root.getAttribute('tabindex')).toBe('0');
  });

  it('deactivates the root', () => {
    const { root } = buildTree();
    root.setAttribute('tabindex', '0');

    toggleTabIndex({ root, isActive: false });

    expect(root.getAttribute('tabindex')).toBe('-1');
  });

  it('leaves consumer tabindex on descendants untouched', () => {
    const { root, child } = buildTree();

    toggleTabIndex({ root, isActive: true });

    expect(root.getAttribute('tabindex')).toBe('0');
    expect(child.getAttribute('tabindex')).toBe('-1');
  });
});
