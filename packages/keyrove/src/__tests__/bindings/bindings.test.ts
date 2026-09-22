import { describe, it, expect, vi } from 'vitest';
import { buildBindings } from '../../bindings';
import type {
  BoundaryAction,
  BuildBindingsArgs,
  Layout,
  StrideAction,
} from '../../types';

const LIST: Layout = { kind: 'list', cols: 1, horizontal: false, loop: false };
const GRID: Layout = { kind: 'grid', cols: 3, horizontal: true, loop: false };

type Explicit = Partial<Record<StrideAction | BoundaryAction, string>>;

// The root's `*-key` attributes as a plain object, looked up per move the way
// `keyRove` reads them off the root.
const lookup =
  (explicit: Explicit) => (intent: StrideAction | BoundaryAction) =>
    explicit[intent];

type BuildOverrides = Partial<Omit<BuildBindingsArgs, 'explicit' | 'rtl'>> & {
  explicit?: Explicit;
  rtl?: boolean;
};

const build = ({
  explicit = {},
  rtl = false,
  ...overrides
}: BuildOverrides = {}) =>
  buildBindings({
    explicit: lookup(explicit),
    layout: LIST,
    rtl: () => rtl,
    ...overrides,
  });

const combos = (bindings: ReturnType<typeof build>) =>
  bindings.map(({ combo }) => combo);

const intents = (bindings: ReturnType<typeof build>) =>
  bindings.map(({ intent }) => intent);

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
      expect(combos(bindings)).not.toContain('ArrowDown');
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

    it("lets an explicit binding take another move's default key", () => {
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

  describe('focus keys', () => {
    const item = (id: string) => {
      const el = document.createElement('div');
      el.id = id;
      return el;
    };

    it('puts focus keys ahead of every explicit binding and default', () => {
      const target = item('a');
      const bindings = build({
        explicit: { next: 'KeyJ' },
        focus: [{ combo: 'KeyX', target }],
      });

      expect(bindings[0]).toEqual({
        combo: 'KeyX',
        intent: 'focus',
        enters: true,
        target,
      });
      expect(bindings[1]).toEqual({
        combo: 'KeyJ',
        intent: 'next',
        enters: true,
      });
    });

    it('keeps focus keys in the order given, so the first of two on one combo wins', () => {
      const [a, b] = [item('a'), item('b')];
      const bindings = build({
        focus: [
          { combo: 'KeyX', target: a },
          { combo: 'KeyX', target: b },
        ],
      });

      expect(bindings.slice(0, 2)).toEqual([
        { combo: 'KeyX', intent: 'focus', enters: true, target: a },
        { combo: 'KeyX', intent: 'focus', enters: true, target: b },
      ]);
    });

    it('lets a focus key claim a key a default answers to, leaving the default behind it', () => {
      const target = item('a');
      const bindings = build({ focus: [{ combo: 'Home', target }] });

      expect(bindings.find(({ combo }) => combo === 'Home')).toEqual({
        combo: 'Home',
        intent: 'focus',
        enters: true,
        target,
      });
      expect(bindings.filter(({ combo }) => combo === 'Home')).toHaveLength(2);
    });

    it('drops a focus key with an empty combo, as for a bare root attribute', () => {
      expect(build({ focus: [{ combo: '', target: item('a') }] })).toEqual(
        build(),
      );
    });

    it('drops a focus key with a blank combo', () => {
      expect(build({ focus: [{ combo: '  ', target: item('a') }] })).toEqual(
        build(),
      );
    });

    it('drops a focus key whose combo lists nothing but commas', () => {
      expect(build({ focus: [{ combo: ' , ', target: item('a') }] })).toEqual(
        build(),
      );
    });
  });

  describe('rebinding every move', () => {
    it('rebinds Home, End and the page keys on a list', () => {
      const bindings = build({
        explicit: {
          home: 'KeyG',
          end: 'shift+KeyG',
          pageUp: 'ctrl+KeyU',
          pageDown: 'ctrl+KeyD',
        },
      });

      expect(bindings).toEqual([
        { combo: 'KeyG', intent: 'home', enters: false },
        { combo: 'shift+KeyG', intent: 'end', enters: false },
        { combo: 'ctrl+KeyU', intent: 'pageUp', enters: false },
        { combo: 'ctrl+KeyD', intent: 'pageDown', enters: false },
        { combo: 'ArrowUp', intent: 'prev', enters: true },
        { combo: 'ArrowDown', intent: 'next', enters: true },
      ]);
    });

    it('rebinds the row ends and the whole-grid ends independently', () => {
      const bindings = build({
        layout: GRID,
        explicit: { homeRow: 'KeyA', endRow: 'KeyE', home: 'Home', end: 'End' },
      });

      // bare Home now means the grid's first cell; the row end moved to KeyA
      expect(bindings.find(({ combo }) => combo === 'Home')).toEqual({
        combo: 'Home',
        intent: 'home',
        enters: false,
      });
      expect(bindings.find(({ combo }) => combo === 'KeyA')).toEqual({
        combo: 'KeyA',
        intent: 'homeRow',
        enters: false,
      });
      // the replaced ctrl+ defaults are gone
      expect(combos(bindings)).not.toContain('ctrl+Home');
      expect(combos(bindings)).not.toContain('ctrl+End');
    });

    it('keeps a rebound move from entering the group', () => {
      const bindings = build({ explicit: { home: 'ArrowUp' } });

      expect(bindings.find(({ combo }) => combo === 'ArrowUp')).toEqual({
        combo: 'ArrowUp',
        intent: 'home',
        enters: false,
      });
    });
  });

  describe('unbinding with none', () => {
    it.each([
      ['a list', LIST, ['next', 'prev', 'home', 'end', 'pageUp', 'pageDown']],
      [
        'a grid',
        GRID,
        [
          'next',
          'prev',
          'nextRow',
          'prevRow',
          'home',
          'end',
          'homeRow',
          'endRow',
          'pageUp',
          'pageDown',
        ],
      ],
    ] as const)(
      'drops each move of %s from the table, key and all',
      (_, layout, moves) => {
        const full = build({ layout });

        for (const intent of moves) {
          const bindings = build({ layout, explicit: { [intent]: 'none' } });
          const freed = full.find((binding) => binding.intent === intent)!;

          expect(intents(bindings)).not.toContain(intent);
          expect(combos(bindings)).not.toContain(freed.combo);
          expect(bindings).toEqual(full.filter((b) => b !== freed));
        }
      },
    );

    it('reads the value trimmed and in any case', () => {
      expect(
        intents(build({ explicit: { pageDown: ' NONE ', pageUp: 'None' } })),
      ).toEqual(['prev', 'next', 'home', 'end']);
    });

    it('leaves the other side of an RTL axis on its flipped default', () => {
      const rtl = vi.fn(() => true);
      const bindings = buildBindings({
        explicit: lookup({ next: 'none' }),
        layout: { ...LIST, horizontal: true },
        rtl,
      });

      expect(rtl).toHaveBeenCalled();
      expect(bindings.find(({ intent }) => intent === 'prev')).toEqual({
        combo: 'ArrowRight',
        intent: 'prev',
        enters: true,
      });
      expect(intents(bindings)).not.toContain('next');
    });

    it('drops a focus key named none, which has no default to take away', () => {
      const target = document.createElement('div');

      expect(build({ focus: [{ combo: 'none', target }] })).toEqual(build());
    });
  });

  describe('layout', () => {
    it('ignores grid-only moves on a list', () => {
      const bindings = build({
        explicit: {
          nextRow: 'KeyJ',
          prevRow: 'KeyK',
          homeRow: 'KeyA',
          endRow: 'KeyE',
        },
      });

      expect(bindings.some(({ intent }) => intent.endsWith('Row'))).toBe(false);
      expect(combos(bindings).some((combo) => combo.startsWith('Key'))).toBe(
        false,
      );
    });

    it('reads direction only when an unbound horizontal default could flip', () => {
      const rtl = vi.fn(() => true);

      buildBindings({ explicit: lookup({}), layout: LIST, rtl });
      buildBindings({
        explicit: lookup({ next: 'KeyL', prev: 'KeyH' }),
        layout: GRID,
        rtl,
      });
      expect(rtl).not.toHaveBeenCalled();

      buildBindings({ explicit: lookup({ next: 'KeyL' }), layout: GRID, rtl });
      expect(rtl).toHaveBeenCalledTimes(1);
    });

    it('looks up only the moves the layout has, and the boundary moves', () => {
      const explicit = vi.fn(lookup({}));

      buildBindings({ explicit, layout: LIST, rtl: () => false });

      expect(explicit.mock.calls.map(([intent]) => intent).sort()).toEqual(
        [
          'end',
          'enter',
          'exit',
          'home',
          'next',
          'pageDown',
          'pageUp',
          'prev',
        ].sort(),
      );
    });
  });

  describe('boundary moves', () => {
    it('leaves exit and enter out of the table unless a root binds them', () => {
      expect(intents(build())).not.toContain('exit');
      expect(intents(build())).not.toContain('enter');
      expect(
        intents(build({ explicit: { exit: 'none', enter: ' NONE ' } })),
      ).toEqual(intents(build()));
    });

    it('puts bound exit and enter among the explicit bindings, ahead of the defaults', () => {
      const bindings = build({
        explicit: { next: 'KeyJ', exit: 'Escape', enter: 'Enter, ArrowRight' },
      });

      expect(bindings.slice(0, 3)).toEqual([
        { combo: 'KeyJ', intent: 'next', enters: true },
        { combo: 'Escape', intent: 'exit', enters: false },
        { combo: 'Enter, ArrowRight', intent: 'enter', enters: false },
      ]);
    });
  });
});
