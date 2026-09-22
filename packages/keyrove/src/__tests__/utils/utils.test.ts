import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  hasCommandModifier,
  matchesCombo,
  parseAttributeInt,
  toggleTabIndex,
} from '../../utils';
import type { KeyRoveEvent } from '../../types';

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

  it('falls back when the attribute is empty', () => {
    expect(parseAttributeInt(withAttribute(''), 'data-n', 2)).toBe(2);
  });

  it('falls back when the attribute parses to zero', () => {
    expect(parseAttributeInt(withAttribute('0'), 'data-n', 5)).toBe(5);
  });

  it('falls back when the attribute is negative', () => {
    expect(parseAttributeInt(withAttribute('-2'), 'data-n', 6)).toBe(6);
  });

  it('reads a value with leading whitespace', () => {
    expect(parseAttributeInt(withAttribute(' 3'), 'data-n', 1)).toBe(3);
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

  it.each([
    ['control', 'ctrl', { ctrlKey: true }],
    ['option', 'alt', { altKey: true }],
    ['cmd', 'meta', { metaKey: true }],
    ['command', 'meta', { metaKey: true }],
  ])('accepts %s as the longer spelling of %s', (alias, _, modifiers) => {
    expect(matchesCombo(keyEvent('KeyA', modifiers), `${alias}+KeyA`)).toBe(
      true,
    );
    expect(matchesCombo(keyEvent('KeyA'), `${alias}+KeyA`)).toBe(false);
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

  // Android's virtual keyboards send keydowns with an empty code.
  it.each([
    ['empty', '', {}],
    ['blank', ' ', {}],
    ['a lone "+"', '+', {}],
    ['a dangling "ctrl+"', 'ctrl+', { ctrlKey: true }],
  ])(
    'never matches a combo with no code, %s, even an event with no code',
    (_, combo, modifiers) => {
      expect(matchesCombo(keyEvent('', modifiers), combo)).toBe(false);
    },
  );

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
