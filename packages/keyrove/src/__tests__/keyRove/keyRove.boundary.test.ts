import { describe, it, expect, afterEach } from 'vitest';
import { keyRove } from '../../keyRove';
import type { Move, MoveResult, Options } from '../../types';
import { activeId, pressKey, resetTestState } from './testUtils';

afterEach(resetTestState);

/**
 * Markup under one delegated listener, as a page wires it. Every result and
 * every `onMove` is kept, with elements named by id.
 */
const render = (html: string, options: Options = {}) => {
  const listener = document.createElement('div');
  listener.id = 'listener';
  listener.innerHTML = html;
  document.body.appendChild(listener);
  const results: (ReturnType<typeof named> | null)[] = [];
  const moves: ReturnType<typeof named>[] = [];
  listener.addEventListener('keydown', (e) => {
    results.push(
      named(
        keyRove(e, {
          ...options,
          onMove: (move: Move) => moves.push(named(move)),
        }),
      ),
    );
  });

  return { listener, results, moves };
};

const named = (result: MoveResult | null) =>
  result && {
    action: result.action,
    from: result.from?.id ?? null,
    to: result.to?.id ?? null,
  };

const byId = (id: string) => document.getElementById(id)!;

const focus = (id: string) => byId(id).focus();

const tabindexes = (...ids: string[]) =>
  Object.fromEntries(ids.map((id) => [id, byId(id).getAttribute('tabindex')]));

/** Presses a key on the focused element and says whether it was claimed. */
const press = (code: string) => pressKey(code).defaultPrevented;

// The nested demo's shape: a row of reactions that is a root of its own, a
// sibling of the outer list's items rather than one of them.
const REACTIONS = `
  <div id="row" data-keyrove-root data-keyrove-exit-key="Escape">
    <button id="r0" data-keyrove-item tabindex="0">👍</button>
    <button id="r1" data-keyrove-item tabindex="0">❤️</button>
  </div>
  <div id="reply" data-keyrove-item tabindex="0">Reply</div>
  <div id="copy" data-keyrove-item tabindex="0">Copy link</div>
`;

// A list whose items each hold a group of their own.
const MESSAGES = (attrs = '') => `
  <div id="m0" data-keyrove-item data-keyrove-roving-tabindex tabindex="0">
    <div id="g0" data-keyrove-root ${attrs}>
      <button id="a0" data-keyrove-item data-keyrove-roving-tabindex tabindex="0">a0</button>
      <button id="a1" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">a1</button>
    </div>
  </div>
  <div id="m1" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">
    <div id="g1" data-keyrove-root ${attrs}>
      <button id="b0" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">b0</button>
      <button id="b1" data-keyrove-item data-keyrove-roving-tabindex tabindex="0">b1</button>
    </div>
  </div>
`;

describe('keyRove', () => {
  describe('exit', () => {
    it('leaves a nested root for the outer item after it', () => {
      const { results, moves } = render(REACTIONS);
      focus('r1');

      expect(press('Escape')).toBe(true);

      expect(activeId()).toBe('reply');
      expect(results).toEqual([{ action: 'exit', from: 'r1', to: 'reply' }]);
      expect(moves).toEqual(results);
    });

    it('lands on the outer item containing the root, before the one after it', () => {
      render(MESSAGES('data-keyrove-exit-key="Escape"'));
      focus('a1');

      press('Escape');

      expect(activeId()).toBe('m0');
    });

    it('falls back to the nearest outer item before the root', () => {
      render(`
        <div id="o0" data-keyrove-item tabindex="0">o0</div>
        <div id="o1" data-keyrove-item tabindex="0">o1</div>
        <div data-keyrove-root data-keyrove-exit-key="Escape">
          <button id="i0" data-keyrove-item tabindex="0">i0</button>
        </div>
      `);
      focus('i0');

      press('Escape');

      expect(activeId()).toBe('o1');
    });

    it('passes over skipped and disabled outer items, and the items of other nested roots', () => {
      render(`
        <div data-keyrove-root data-keyrove-exit-key="Escape">
          <button id="i0" data-keyrove-item tabindex="0">i0</button>
        </div>
        <div id="skipped" data-keyrove-item data-keyrove-skip tabindex="0">skipped</div>
        <div id="disabled" data-keyrove-item disabled tabindex="0">disabled</div>
        <div data-keyrove-root>
          <button id="j0" data-keyrove-item tabindex="0">j0</button>
        </div>
        <div id="o0" data-keyrove-item tabindex="0">o0</div>
      `);
      focus('i0');

      press('Escape');

      expect(activeId()).toBe('o0');
    });

    it('lands in the nearest root around it, not the listener', () => {
      render(`
        <div id="l0" data-keyrove-item tabindex="0">l0</div>
        <div data-keyrove-root>
          <div id="a0" data-keyrove-item tabindex="0">a0</div>
          <div data-keyrove-root data-keyrove-exit-key="Escape">
            <button id="i0" data-keyrove-item tabindex="0">i0</button>
          </div>
          <div id="a1" data-keyrove-item tabindex="0">a1</div>
        </div>
      `);
      focus('i0');

      press('Escape');

      expect(activeId()).toBe('a1');
    });

    it('exits from the root itself, with no item to report as from', () => {
      const { results } = render(`
        <div id="row" data-keyrove-root data-keyrove-exit-key="Escape" tabindex="-1">
          <button id="r0" data-keyrove-item tabindex="0">r0</button>
        </div>
        <div id="reply" data-keyrove-item tabindex="0">Reply</div>
      `);
      focus('row');

      press('Escape');

      expect(results).toEqual([{ action: 'exit', from: null, to: 'reply' }]);
    });

    it('moves the outer stop and leaves the inner one for the way back', () => {
      render(`
        <div id="o0" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">o0</div>
        <div data-keyrove-root data-keyrove-exit-key="Escape">
          <button id="i0" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">i0</button>
          <button id="i1" data-keyrove-item data-keyrove-roving-tabindex tabindex="0">i1</button>
        </div>
        <div id="o1" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">o1</div>
        <div id="o2" data-keyrove-item data-keyrove-roving-tabindex tabindex="0">o2</div>
      `);
      focus('i1');

      press('Escape');

      expect(activeId()).toBe('o1');
      expect(tabindexes('o0', 'o1', 'o2', 'i0', 'i1')).toEqual({
        o0: '-1',
        o1: '0',
        o2: '-1',
        i0: '-1',
        i1: '0',
      });
    });

    it('works from the keys option', () => {
      render(REACTIONS.replace('data-keyrove-exit-key="Escape"', ''), {
        keys: { exit: 'Escape' },
      });
      focus('r0');

      press('Escape');

      expect(activeId()).toBe('reply');
    });

    it('leaves the key alone where there is no group around', () => {
      const { results } = render(REACTIONS, { keys: { exit: 'Escape' } });
      focus('copy');

      expect(press('Escape')).toBe(false);
      expect(results).toEqual([null]);
      expect(activeId()).toBe('copy');
    });

    it('leaves the key alone on a root that is an item of the group around it, focused itself', () => {
      render(`
        <div id="panel" data-keyrove-item data-keyrove-root data-keyrove-exit-key="Escape" tabindex="0">
          <button id="p0" data-keyrove-item tabindex="0">p0</button>
        </div>
        <div id="o0" data-keyrove-item tabindex="0">o0</div>
      `);
      focus('panel');

      expect(press('Escape')).toBe(false);

      focus('p0');
      press('Escape');
      expect(activeId()).toBe('panel');
    });

    it('is unbound by default', () => {
      const { results } = render(
        REACTIONS.replace('data-keyrove-exit-key="Escape"', ''),
      );
      focus('r0');

      expect(press('Escape')).toBe(false);
      expect(results).toEqual([null]);
    });

    it('can be switched off with none', () => {
      render(REACTIONS, { keys: { exit: 'none' } });
      focus('r0');

      expect(press('Escape')).toBe(false);
    });

    it('leaves the key to a text field inside the group', () => {
      render(`
        <div data-keyrove-root data-keyrove-exit-key="Escape">
          <div data-keyrove-item><input id="field" /></div>
        </div>
        <div id="o0" data-keyrove-item tabindex="0">o0</div>
      `);
      focus('field');

      expect(press('Escape')).toBe(false);
      expect(activeId()).toBe('field');
    });
  });

  describe('enter', () => {
    it('enters the group nested in the focused item, at its stop', () => {
      const { listener, results, moves } = render(MESSAGES());
      listener.setAttribute('data-keyrove-enter-key', 'Enter');
      focus('m1');

      expect(press('Enter')).toBe(true);

      expect(activeId()).toBe('b1');
      expect(results).toEqual([{ action: 'enter', from: 'm1', to: 'b1' }]);
      expect(moves).toEqual(results);
    });

    it('keeps both stops where they are', () => {
      const { listener } = render(MESSAGES());
      listener.setAttribute('data-keyrove-enter-key', 'Enter');
      focus('m0');

      press('Enter');

      expect(activeId()).toBe('a0');
      expect(tabindexes('m0', 'm1', 'a0', 'a1', 'b0', 'b1')).toEqual({
        m0: '0',
        m1: '-1',
        a0: '0',
        a1: '-1',
        b0: '-1',
        b1: '0',
      });
    });

    it('enters at the first navigable item where the stop is on none', () => {
      const { listener } = render(`
        <div id="m0" data-keyrove-item tabindex="0">
          <div data-keyrove-root>
            <div id="h" data-keyrove-item data-keyrove-skip data-keyrove-roving-tabindex tabindex="0">heading</div>
            <button id="i0" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">i0</button>
            <button id="i1" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">i1</button>
          </div>
        </div>
      `);
      listener.setAttribute('data-keyrove-enter-key', 'Enter');
      focus('m0');

      press('Enter');

      expect(activeId()).toBe('i0');
      expect(tabindexes('h', 'i0', 'i1')).toEqual({
        h: '-1',
        i0: '0',
        i1: '-1',
      });
    });

    it('works from the keys option, and exit brings focus back', () => {
      const { results } = render(MESSAGES(), {
        keys: { enter: 'Enter', exit: 'Escape' },
      });
      focus('m1');

      press('Enter');
      press('ArrowUp');
      press('Escape');
      press('Enter');

      expect(results).toEqual([
        { action: 'enter', from: 'm1', to: 'b1' },
        { action: 'prev', from: 'b1', to: 'b0' },
        { action: 'exit', from: 'b0', to: 'm1' },
        { action: 'enter', from: 'm1', to: 'b0' },
      ]);
    });

    it('recognises the nested root by the root option', () => {
      const markup = `
        <div id="m0" data-keyrove-item tabindex="0">
          <div class="group">
            <button id="i0" data-keyrove-item tabindex="0">i0</button>
          </div>
        </div>
      `;
      render(markup, { keys: { enter: 'Enter' } });
      focus('m0');

      expect(press('Enter')).toBe(false);

      document.body.innerHTML = '';
      render(markup, { root: '.group', keys: { enter: 'Enter' } });
      focus('m0');

      expect(press('Enter')).toBe(true);
      expect(activeId()).toBe('i0');
    });

    it('leaves the key alone on an item with no group inside', () => {
      const { results } = render(REACTIONS, { keys: { enter: 'Enter' } });
      focus('reply');

      expect(press('Enter')).toBe(false);
      expect(results).toEqual([null]);
    });

    it('leaves the key alone with no item focused, or nothing inside to land on', () => {
      const { listener, results } = render(`
        <div id="m0" data-keyrove-item tabindex="0">
          <div data-keyrove-root>
            <button id="d" data-keyrove-item disabled>d</button>
          </div>
        </div>
      `);
      listener.setAttribute('data-keyrove-enter-key', 'Enter');
      listener.setAttribute('tabindex', '-1');

      focus('m0');
      expect(press('Enter')).toBe(false);
      focus('listener');
      expect(press('Enter')).toBe(false);
      expect(results).toEqual([null, null]);
    });

    it('is unbound by default', () => {
      render(MESSAGES());
      focus('m0');

      expect(press('Enter')).toBe(false);
      expect(activeId()).toBe('m0');
    });
  });
});
