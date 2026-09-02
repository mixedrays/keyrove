import { describe, it, expect, vi } from 'vitest';
import { buildBindings } from '../../bindings';
import type { BuildBindingsArgs, Layout } from '../../types';

const LIST: Layout = { kind: 'list', cols: 1, horizontal: false, loop: false };
const GRID: Layout = { kind: 'grid', cols: 3, horizontal: true, loop: false };

type BuildOverrides = Partial<Omit<BuildBindingsArgs, 'rtl'>> & {
  rtl?: boolean;
};

const build = ({ rtl = false, ...overrides }: BuildOverrides = {}) =>
  buildBindings({ explicit: {}, layout: LIST, rtl: () => rtl, ...overrides });

describe('buildBindings', () => {
  describe('default tables (the documented keys tables)', () => {
    it('binds a vertical list', () => {
      expect(build()).toEqual([
        { combo: 'ArrowUp', intent: 'prev', enters: true },
        { combo: 'ArrowDown', intent: 'next', enters: true },
        { combo: 'Home', intent: 'home', enters: false },
        { combo: 'End', intent: 'end', enters: false },
        { combo: 'PageUp', intent: 'pageUp', enters: false },
        { combo: 'PageDown', intent: 'pageDown', enters: false },
      ]);
    });

    it('binds a horizontal list, LTR', () => {
      expect(build({ layout: { ...LIST, horizontal: true } })).toEqual([
        { combo: 'ArrowLeft', intent: 'prev', enters: true },
        { combo: 'ArrowRight', intent: 'next', enters: true },
        { combo: 'Home', intent: 'home', enters: false },
        { combo: 'End', intent: 'end', enters: false },
        { combo: 'PageUp', intent: 'pageUp', enters: false },
        { combo: 'PageDown', intent: 'pageDown', enters: false },
      ]);
    });

    it('binds a horizontal list, RTL — the inline arrows flip', () => {
      expect(
        build({ layout: { ...LIST, horizontal: true }, rtl: true }),
      ).toEqual([
        { combo: 'ArrowRight', intent: 'prev', enters: true },
        { combo: 'ArrowLeft', intent: 'next', enters: true },
        { combo: 'Home', intent: 'home', enters: false },
        { combo: 'End', intent: 'end', enters: false },
        { combo: 'PageUp', intent: 'pageUp', enters: false },
        { combo: 'PageDown', intent: 'pageDown', enters: false },
      ]);
    });

    it('binds a grid, LTR', () => {
      expect(build({ layout: GRID })).toEqual([
        { combo: 'ArrowLeft', intent: 'prev', enters: true },
        { combo: 'ArrowRight', intent: 'next', enters: true },
        { combo: 'ArrowUp', intent: 'prevRow', enters: true },
        { combo: 'ArrowDown', intent: 'nextRow', enters: true },
        { combo: 'Home', intent: 'homeRow', enters: false },
        { combo: 'End', intent: 'endRow', enters: false },
        { combo: 'ctrl+Home', intent: 'home', enters: false },
        { combo: 'ctrl+End', intent: 'end', enters: false },
        { combo: 'PageUp', intent: 'pageUp', enters: false },
        { combo: 'PageDown', intent: 'pageDown', enters: false },
      ]);
    });

    it('binds a grid, RTL — the cell arrows flip, the row arrows do not', () => {
      expect(build({ layout: GRID, rtl: true })).toEqual([
        { combo: 'ArrowRight', intent: 'prev', enters: true },
        { combo: 'ArrowLeft', intent: 'next', enters: true },
        { combo: 'ArrowUp', intent: 'prevRow', enters: true },
        { combo: 'ArrowDown', intent: 'nextRow', enters: true },
        { combo: 'Home', intent: 'homeRow', enters: false },
        { combo: 'End', intent: 'endRow', enters: false },
        { combo: 'ctrl+Home', intent: 'home', enters: false },
        { combo: 'ctrl+End', intent: 'end', enters: false },
        { combo: 'PageUp', intent: 'pageUp', enters: false },
        { combo: 'PageDown', intent: 'pageDown', enters: false },
      ]);
    });
  });

  describe('precedence', () => {
    it('puts explicit bindings ahead of every default', () => {
      const bindings = build({ explicit: { next: 'KeyJ' } });

      expect(bindings[0]).toEqual({
        combo: 'KeyJ',
        intent: 'next',
        enters: true,
      });
      // the replaced default is gone — ArrowDown is no longer in the table
      expect(bindings.some(({ combo }) => combo === 'ArrowDown')).toBe(false);
      // the unbound side keeps its default
      expect(bindings).toContainEqual({
        combo: 'ArrowUp',
        intent: 'prev',
        enters: true,
      });
    });

    it('lets an explicit binding claim a key a default also names', () => {
      const bindings = build({ explicit: { next: 'ArrowUp' } });

      // first match wins, so the explicit next takes ArrowUp over the
      // default prev that follows it
      expect(bindings.find(({ combo }) => combo === 'ArrowUp')).toEqual({
        combo: 'ArrowUp',
        intent: 'next',
        enters: true,
      });
    });

    it('keeps a fixed key reachable by an explicit binding', () => {
      const bindings = build({ explicit: { next: 'Home' } });

      expect(bindings.find(({ combo }) => combo === 'Home')).toEqual({
        combo: 'Home',
        intent: 'next',
        enters: true,
      });
    });

    it('never flips explicit bindings under RTL', () => {
      const bindings = build({
        layout: GRID,
        rtl: true,
        explicit: { next: 'ArrowRight', prev: 'ArrowLeft' },
      });

      expect(bindings[0]).toEqual({
        combo: 'ArrowLeft',
        intent: 'prev',
        enters: true,
      });
      expect(bindings[1]).toEqual({
        combo: 'ArrowRight',
        intent: 'next',
        enters: true,
      });
    });
  });

  describe('layout', () => {
    it('ignores row keys on a list', () => {
      const bindings = build({
        explicit: { nextRow: 'KeyJ', prevRow: 'KeyK' },
      });

      expect(bindings.some(({ intent }) => intent.endsWith('Row'))).toBe(false);
      expect(bindings.some(({ combo }) => combo.startsWith('Key'))).toBe(false);
    });

    it('reads direction only when an unbound horizontal default could flip', () => {
      const rtl = vi.fn(() => true);

      buildBindings({ explicit: {}, layout: LIST, rtl });
      buildBindings({
        explicit: { next: 'KeyL', prev: 'KeyH' },
        layout: GRID,
        rtl,
      });
      expect(rtl).not.toHaveBeenCalled();

      buildBindings({ explicit: { next: 'KeyL' }, layout: GRID, rtl });
      expect(rtl).toHaveBeenCalledTimes(1);
    });
  });
});
