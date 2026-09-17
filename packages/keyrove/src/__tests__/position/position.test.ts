import { describe, it, expect } from 'vitest';
import { resolveTarget } from '../../position';
import type { Layout, ResolveTargetArgs } from '../../types';
import { buildElements, idOf } from './testUtils';

const LIST: Layout = { kind: 'list', cols: 1, horizontal: false, loop: false };
const LOOP: Layout = { ...LIST, loop: true };
const GRID: Layout = { kind: 'grid', cols: 3, horizontal: true, loop: false };

type ResolveArgs = Pick<ResolveTargetArgs, 'intent' | 'fromIndex'> &
  Partial<ResolveTargetArgs>;

/** Resolves on a 4-item list with the default page length, unless overridden. */
const resolve = (args: ResolveArgs) =>
  resolveTarget({
    elements: buildElements(4),
    layout: LIST,
    pageLength: 10,
    ...args,
  });

describe('resolveTarget', () => {
  describe('entry', () => {
    it('enters at the first element from nothing focused', () => {
      expect(idOf(resolve({ intent: 'next', fromIndex: -1 }))).toBe('e0');
      expect(idOf(resolve({ intent: 'prev', fromIndex: -1 }))).toBe('e0');
    });

    it('enters at the first (next) or last (prev) element when looping', () => {
      const layout = LOOP;

      expect(idOf(resolve({ intent: 'next', fromIndex: -1, layout }))).toBe(
        'e0',
      );
      expect(idOf(resolve({ intent: 'prev', fromIndex: -1, layout }))).toBe(
        'e3',
      );
    });

    it('enters past skipped elements', () => {
      const elements = buildElements(4, [0]);

      expect(idOf(resolve({ intent: 'next', fromIndex: -1, elements }))).toBe(
        'e1',
      );
    });

    it('enters a grid at its first cell, whatever the move', () => {
      const elements = buildElements(9);
      const layout = GRID;

      expect(
        idOf(resolve({ intent: 'prevRow', fromIndex: -1, elements, layout })),
      ).toBe('e0');
    });

    it('returns undefined for an empty group', () => {
      expect(
        resolve({ intent: 'next', fromIndex: -1, elements: [] }),
      ).toBeUndefined();
      expect(
        resolve({ intent: 'prev', fromIndex: -1, elements: [], layout: LOOP }),
      ).toBeUndefined();
    });
  });

  describe('home / end', () => {
    it('lands on the outermost navigable elements', () => {
      expect(idOf(resolve({ intent: 'home', fromIndex: 1 }))).toBe('e0');
      expect(idOf(resolve({ intent: 'end', fromIndex: 1 }))).toBe('e3');
    });

    it('steps past skipped elements at either end', () => {
      const elements = buildElements(4, [0, 3]);

      expect(idOf(resolve({ intent: 'home', fromIndex: 1, elements }))).toBe(
        'e1',
      );
      expect(idOf(resolve({ intent: 'end', fromIndex: 1, elements }))).toBe(
        'e2',
      );
    });

    it('falls back to the real ends when everything is skipped', () => {
      const elements = buildElements(3, [0, 1, 2]);

      expect(idOf(resolve({ intent: 'home', fromIndex: 1, elements }))).toBe(
        'e0',
      );
      expect(idOf(resolve({ intent: 'end', fromIndex: 1, elements }))).toBe(
        'e2',
      );
    });
  });

  describe('next / prev in a list', () => {
    it('moves one position', () => {
      expect(idOf(resolve({ intent: 'next', fromIndex: 1 }))).toBe('e2');
      expect(idOf(resolve({ intent: 'prev', fromIndex: 1 }))).toBe('e0');
    });

    it('steps over skipped elements', () => {
      const elements = buildElements(4, [1, 2]);

      expect(idOf(resolve({ intent: 'next', fromIndex: 0, elements }))).toBe(
        'e3',
      );
      expect(idOf(resolve({ intent: 'prev', fromIndex: 3, elements }))).toBe(
        'e0',
      );
    });

    it('holds at the ends rather than wrapping', () => {
      expect(idOf(resolve({ intent: 'next', fromIndex: 3 }))).toBe('e3');
      expect(idOf(resolve({ intent: 'prev', fromIndex: 0 }))).toBe('e0');
    });

    it('wraps around the ends when looping', () => {
      const layout = LOOP;

      expect(idOf(resolve({ intent: 'next', fromIndex: 3, layout }))).toBe(
        'e0',
      );
      expect(idOf(resolve({ intent: 'prev', fromIndex: 0, layout }))).toBe(
        'e3',
      );
    });

    it('wraps to the first and last non-skipped element', () => {
      const elements = buildElements(4, [0, 3]);
      const layout = LOOP;

      expect(
        idOf(resolve({ intent: 'next', fromIndex: 2, elements, layout })),
      ).toBe('e1');
      expect(
        idOf(resolve({ intent: 'prev', fromIndex: 1, elements, layout })),
      ).toBe('e2');
    });

    it('does not wrap while a target still exists ahead', () => {
      const layout = LOOP;

      expect(idOf(resolve({ intent: 'next', fromIndex: 0, layout }))).toBe(
        'e1',
      );
      expect(idOf(resolve({ intent: 'prev', fromIndex: 3, layout }))).toBe(
        'e2',
      );
    });
  });

  describe('grid moves', () => {
    // 3 columns over 9 elements: e0 e1 e2 / e3 e4 e5 / e6 e7 e8
    const inGrid = (args: ResolveArgs) =>
      idOf(resolve({ elements: buildElements(9), layout: GRID, ...args }));

    it('moves a whole row', () => {
      expect(inGrid({ intent: 'nextRow', fromIndex: 4 })).toBe('e7');
      expect(inGrid({ intent: 'prevRow', fromIndex: 4 })).toBe('e1');
    });

    it('moves one cell, flowing across row ends', () => {
      expect(inGrid({ intent: 'next', fromIndex: 4 })).toBe('e5');
      expect(inGrid({ intent: 'prev', fromIndex: 4 })).toBe('e3');
      expect(inGrid({ intent: 'next', fromIndex: 2 })).toBe('e3');
    });

    it('steps further in the same direction over a skipped cell', () => {
      // 12 elements over 3 columns, so index 10 exists to step on to
      const elements = buildElements(12, [7]);

      expect(inGrid({ intent: 'nextRow', fromIndex: 4, elements })).toBe('e10');
    });

    it('returns null when every cell beyond the skipped one is off the end', () => {
      const elements = buildElements(9, [7]);

      expect(
        resolve({ intent: 'nextRow', fromIndex: 4, elements, layout: GRID }),
      ).toBeNull();
    });

    it('returns null at the edge instead of wrapping', () => {
      const edge = (args: ResolveArgs) =>
        resolve({ elements: buildElements(9), layout: GRID, ...args });

      expect(edge({ intent: 'nextRow', fromIndex: 7 })).toBeNull();
      expect(edge({ intent: 'prevRow', fromIndex: 1 })).toBeNull();
      expect(edge({ intent: 'next', fromIndex: 8 })).toBeNull();
      expect(edge({ intent: 'prev', fromIndex: 0 })).toBeNull();
    });

    it('lands on the first and last non-skipped cell of the row', () => {
      const elements = buildElements(9, [3]);

      expect(inGrid({ intent: 'homeRow', fromIndex: 5, elements })).toBe('e4');
      expect(inGrid({ intent: 'endRow', fromIndex: 4, elements })).toBe('e5');
    });

    it('returns null for a row end when the whole row is skipped', () => {
      const elements = buildElements(9, [3, 4, 5]);
      const layout = GRID;

      expect(
        resolve({ intent: 'homeRow', fromIndex: 4, elements, layout }),
      ).toBeNull();
      expect(
        resolve({ intent: 'endRow', fromIndex: 4, elements, layout }),
      ).toBeNull();
    });
  });

  describe('page moves', () => {
    it('moves a full page', () => {
      const elements = buildElements(10);
      const pageLength = 3;

      expect(
        idOf(
          resolve({ intent: 'pageDown', fromIndex: 0, elements, pageLength }),
        ),
      ).toBe('e3');
      expect(
        idOf(resolve({ intent: 'pageUp', fromIndex: 6, elements, pageLength })),
      ).toBe('e3');
    });

    it('pages a grid by rows', () => {
      const elements = buildElements(12);

      expect(
        idOf(
          resolve({
            intent: 'pageDown',
            fromIndex: 1,
            elements,
            layout: GRID,
            pageLength: 2,
          }),
        ),
      ).toBe('e7');
    });

    it('clamps to the last element when it overshoots the end', () => {
      expect(idOf(resolve({ intent: 'pageDown', fromIndex: 2 }))).toBe('e3');
    });

    it('clamps to the first element when it overshoots the start', () => {
      expect(idOf(resolve({ intent: 'pageUp', fromIndex: 1 }))).toBe('e0');
    });

    it('clamps past skipped elements at the edge', () => {
      const elements = buildElements(5, [4]);

      expect(
        idOf(resolve({ intent: 'pageDown', fromIndex: 0, elements })),
      ).toBe('e3');
    });

    it('steps over a skipped element it would have landed on', () => {
      const elements = buildElements(6, [3]);

      expect(
        idOf(
          resolve({
            intent: 'pageDown',
            fromIndex: 0,
            elements,
            pageLength: 3,
          }),
        ),
      ).toBe('e4');
    });

    it('clamps when only skipped elements lie from the landing onward', () => {
      const elements = buildElements(6, [4, 5]);

      expect(
        idOf(
          resolve({
            intent: 'pageDown',
            fromIndex: 0,
            elements,
            pageLength: 4,
          }),
        ),
      ).toBe('e3');
    });
  });
});
