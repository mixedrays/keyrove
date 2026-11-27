import type { AnyMove, MoveResult } from '@mixedrays/keyrove';

// Imports only keyrove's types, so the build can read the markup without the
// browser half. Resets when focus leaves, so no stale line sits over the demo.

const BLURRED = 'click to focus';
/** The same, where the only pointer is a finger and the keypad shows. */
const BLURRED_TOUCH = 'tap a key below';
const LISTENING = 'listening…';

export const READOUT_HTML = `<output class="demo-readout" data-demo-readout data-state="blurred"><span aria-hidden="true">${BLURRED}</span></output>`;

/** Handlers report as they act; the keydown itself reports last. */
export type Readout = {
  move: (move: AnyMove) => void;
  /** What the widget did itself. `key` is empty for the pointer. */
  widget: (target: Element, key: string, phrase: string) => void;
  keydown: (e: KeyboardEvent, claimed: unknown) => void;
};

const KEY_GLYPHS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  ' ': 'Space',
};

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

// `key`, not `code`: this is read, not bound, so it shows what the layout
// produced.
export const keyLabel = (e: KeyboardEvent) => {
  const held = [
    e.ctrlKey && 'Ctrl',
    e.altKey && 'Alt',
    e.shiftKey && 'Shift',
    e.metaKey && 'Meta',
  ].filter((part): part is string => Boolean(part));

  const key =
    KEY_GLYPHS[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key);

  return [...held, key].join('+');
};

const nameOf = (item: Element) =>
  item.textContent?.replace(/\s+/g, ' ').trim() || '—';

const isMoveResult = (value: unknown): value is MoveResult =>
  typeof value === 'object' && value !== null && 'action' in value;

// A keyboard navigation library owes the reader this much.
const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
].join(' ');

// Presses in a row at an end before the readout names where focus is.
const STUCK_AFTER = 5;

/** `easterEggs` is for the hero. Throws if `root` has no readout. */
export const createReadout = (
  root: HTMLElement,
  surface: HTMLElement,
  signal: AbortSignal,
  { easterEggs = false }: { easterEggs?: boolean } = {},
): Readout => {
  const line = root.querySelector<HTMLElement>('[data-demo-readout]');
  if (!line) {
    throw new Error('[docs] a live demo has no [data-demo-readout].');
  }

  let movement: { action: string; to: Element } | null = null;
  let widget: { target: Element; phrase: string } | null = null;

  let recent: string[] = [];
  let stuck = 0;

  const show = (state: string, key: string, message: string) => {
    line.dataset.state = state;
    const label = document.createElement('span');
    label.className = 'demo-readout-target';
    label.textContent = message;
    // Kept out of the live region: a screen reader already says where focus is.
    if (state === 'blurred' || state === 'listening') {
      label.setAttribute('aria-hidden', 'true');
    }
    line.replaceChildren(label);
    if (key) {
      const cap = document.createElement('kbd');
      cap.textContent = key;
      line.prepend(cap);
    }

    // Restarted each change, so a run of presses reads as a run of updates.
    line.classList.remove('demo-readout-fresh');
    void line.offsetWidth;
    line.classList.add('demo-readout-fresh');
  };

  const blurred = () =>
    show(
      'blurred',
      '',
      matchMedia('(any-pointer: fine)').matches ? BLURRED : BLURRED_TOUCH,
    );

  // Only focus crossing the demo's edge changes the line.
  surface.addEventListener(
    'focusin',
    (e) => {
      if (!surface.contains(e.relatedTarget as Node | null)) {
        show('listening', '', LISTENING);
      }
    },
    { signal },
  );
  surface.addEventListener(
    'focusout',
    (e) => {
      if (!surface.contains(e.relatedTarget as Node | null)) blurred();
    },
    { signal },
  );

  // Focus may have arrived before listening, and a background tab gets its
  // focus event late or never.
  if (surface.contains(document.activeElement)) {
    show('listening', '', LISTENING);
  } else if (!matchMedia('(any-pointer: fine)').matches) {
    blurred();
  }

  return {
    move: (move) => {
      movement = move;
    },
    widget: (target, key, phrase) => {
      widget = { target, phrase };
      if (!key) {
        show('moved', '', `${phrase} → ${nameOf(target)}`);
        widget = null;
      }
    },
    keydown: (e, claimed) => {
      if (!MODIFIER_KEYS.has(e.key)) {
        const key = keyLabel(e);
        const press = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        recent = [...recent, press].slice(-10);
        stuck = isMoveResult(claimed) && !claimed.to ? stuck + 1 : 0;

        if (easterEggs && recent.join(' ') === KONAMI) {
          show('moved', key, 'cheat code accepted · +30 lives');
        } else if (widget) {
          show('moved', key, `${widget.phrase} → ${nameOf(widget.target)}`);
        } else if (movement) {
          show('moved', key, `${movement.action} → ${nameOf(movement.to)}`);
        } else if (
          easterEggs &&
          isMoveResult(claimed) &&
          claimed.from &&
          stuck >= STUCK_AFTER
        ) {
          show(
            'edge',
            key,
            `${claimed.action} → still ${nameOf(claimed.from)}`,
          );
        } else if (isMoveResult(claimed)) {
          show('edge', key, `${claimed.action} · moved nothing`);
        } else if (surface.contains(document.activeElement)) {
          show('passed', key, 'left to the browser');
        }
      }
      movement = null;
      widget = null;
    },
  };
};
