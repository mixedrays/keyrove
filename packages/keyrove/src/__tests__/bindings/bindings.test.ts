import { describe, it, expect } from 'vitest';
import { buildBindings } from '../../bindings';
import type { BuildBindingsArgs } from '../../types';

const build = (overrides: Partial<BuildBindingsArgs> = {}) =>
  buildBindings({
    explicit: {},
    isGrid: false,
    horizontal: false,
    rtl: false,
    ...overrides,
  });

describe('buildBindings', () => {
  describe('default tables (the documented keys tables)', () => {
    it('binds a vertical list', () => {
      expect(build()).toEqual([
        { combo: 'ArrowUp', intent: 'prev' },
        { combo: 'ArrowDown', intent: 'next' },
        { combo: 'Home', intent: 'home' },
        { combo: 'End', intent: 'end' },
        { combo: 'PageUp', intent: 'pageUp' },
        { combo: 'PageDown', intent: 'pageDown' },
      ]);
    });

    it('binds a horizontal list, LTR', () => {
      expect(build({ horizontal: true })).toEqual([
        { combo: 'ArrowLeft', intent: 'prev' },
        { combo: 'ArrowRight', intent: 'next' },
        { combo: 'Home', intent: 'home' },
        { combo: 'End', intent: 'end' },
        { combo: 'PageUp', intent: 'pageUp' },
        { combo: 'PageDown', intent: 'pageDown' },
      ]);
    });

    it('binds a horizontal list, RTL — the inline arrows flip', () => {
      expect(build({ horizontal: true, rtl: true })).toEqual([
        { combo: 'ArrowRight', intent: 'prev' },
        { combo: 'ArrowLeft', intent: 'next' },
        { combo: 'Home', intent: 'home' },
        { combo: 'End', intent: 'end' },
        { combo: 'PageUp', intent: 'pageUp' },
        { combo: 'PageDown', intent: 'pageDown' },
      ]);
    });

    it('binds a grid, LTR', () => {
      expect(build({ isGrid: true })).toEqual([
        { combo: 'ArrowLeft', intent: 'prev' },
        { combo: 'ArrowRight', intent: 'next' },
        { combo: 'ArrowUp', intent: 'prevRow' },
        { combo: 'ArrowDown', intent: 'nextRow' },
        { combo: 'Home', intent: 'homeRow' },
        { combo: 'End', intent: 'endRow' },
        { combo: 'ctrl+Home', intent: 'home' },
        { combo: 'ctrl+End', intent: 'end' },
        { combo: 'PageUp', intent: 'pageUp' },
        { combo: 'PageDown', intent: 'pageDown' },
      ]);
    });

    it('binds a grid, RTL — the cell arrows flip, the row arrows do not', () => {
      expect(build({ isGrid: true, rtl: true })).toEqual([
        { combo: 'ArrowRight', intent: 'prev' },
        { combo: 'ArrowLeft', intent: 'next' },
        { combo: 'ArrowUp', intent: 'prevRow' },
        { combo: 'ArrowDown', intent: 'nextRow' },
        { combo: 'Home', intent: 'homeRow' },
        { combo: 'End', intent: 'endRow' },
        { combo: 'ctrl+Home', intent: 'home' },
        { combo: 'ctrl+End', intent: 'end' },
        { combo: 'PageUp', intent: 'pageUp' },
        { combo: 'PageDown', intent: 'pageDown' },
      ]);
    });
  });

  describe('precedence', () => {
    it('puts explicit bindings ahead of every default', () => {
      const bindings = build({ explicit: { next: 'KeyJ' } });

      expect(bindings[0]).toEqual({ combo: 'KeyJ', intent: 'next' });
      // the replaced default is gone — ArrowDown is no longer in the table
      expect(bindings.some(({ combo }) => combo === 'ArrowDown')).toBe(false);
      // the unbound side keeps its default
      expect(bindings).toContainEqual({ combo: 'ArrowUp', intent: 'prev' });
    });

    it('lets an explicit binding claim a key a default also names', () => {
      const bindings = build({ explicit: { next: 'ArrowUp' } });

      // first match wins, so the explicit next takes ArrowUp over the
      // default prev that follows it
      expect(bindings.find(({ combo }) => combo === 'ArrowUp')).toEqual({
        combo: 'ArrowUp',
        intent: 'next',
      });
    });

    it('keeps a fixed key reachable by an explicit binding', () => {
      const bindings = build({ explicit: { next: 'Home' } });

      expect(bindings.find(({ combo }) => combo === 'Home')).toEqual({
        combo: 'Home',
        intent: 'next',
      });
    });

    it('never flips explicit bindings under RTL', () => {
      const bindings = build({
        isGrid: true,
        rtl: true,
        explicit: { next: 'ArrowRight', prev: 'ArrowLeft' },
      });

      expect(bindings[0]).toEqual({ combo: 'ArrowLeft', intent: 'prev' });
      expect(bindings[1]).toEqual({ combo: 'ArrowRight', intent: 'next' });
    });
  });
});
