import type { MoveResult } from '@mixedrays/keyrove';

/**
 * The readout: the line in a live demo's header saying what the last key did.
 *
 * Every demo panel has one, and so does the landing page's hero, and this is
 * the one place either is written: the markup the build stamps before the
 * first key, and every line after it. Nothing here is imported from keyrove
 * but its types, so the build (build/demos.ts) reads the markup from here
 * without loading the browser's half.
 *
 * Before the first key, the line says what to do instead: "click to focus"
 * while focus is anywhere but the demo, and "listening…" once it is in. It
 * goes back to the first whenever focus leaves, so a line left over from an
 * earlier visit never sits over a demo that is no longer listening.
 */

const BLURRED = 'click to focus';
const LISTENING = 'listening…';

/**
 * The readout before the first key. The build stamps it into every panel, and
 * into the hero for the placeholder `<output data-demo-readout></output>`.
 */
export const READOUT_HTML = `<output class="demo-readout" data-demo-readout data-state="blurred"><span aria-hidden="true">${BLURRED}</span></output>`;

/**
 * What the readout is told, by whatever drives the demo. A keydown's handlers
 * report their own doing as they act, and the keydown itself last, with
 * whatever the chain answered it with.
 */
export type Readout = {
  /** A move that happened, in the shape `onMove` hands it over. */
  move: (move: { action: string; to: Element }) => void;
  /**
   * The widget's own doing, which keyrove has no part in: the listbox's pick,
   * the tree opening a folder or stepping out of one. `key` is empty when the
   * pointer did it, and `phrase` is what happened to `target`.
   */
  widget: (target: Element, key: string, phrase: string) => void;
  /** A finished keydown, with whatever the handler chain answered it with. */
  keydown: (e: KeyboardEvent, claimed: unknown) => void;
};

/** The glyphs the docs write for keys, so a line reads as the page does. */
const KEY_GLYPHS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  ' ': 'Space',
};

/** Held on their own, these are not yet a keypress — and not yet a line. */
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

/**
 * The key as the readout labels it: the chord, ending in the key's own glyph.
 *
 * `key` rather than `code`, because this is read rather than bound — what the
 * reader pressed is what their layout produced, and the bindings keyrove
 * matches are documented on the pages themselves.
 */
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

/**
 * An item's name: its text, with whitespace collapsed the way rendering
 * collapses it, so a row that wraps a control reads as its label rather than
 * as its markup.
 */
const nameOf = (item: Element) =>
  item.textContent?.replace(/\s+/g, ' ').trim() || '—';

/** Whether a handler in the chain answered with a move rather than an element. */
const isMoveResult = (value: unknown): value is MoveResult =>
  typeof value === 'object' && value !== null && 'action' in value;

/**
 * ↑ ↑ ↓ ↓ ← → ← → B A, as `e.key` spells each press. A keyboard navigation
 * library owes the reader this much. A list claims the arrows and leaves the
 * rest to the browser, so all ten reach the readout as ordinary lines until
 * the last one.
 */
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

/**
 * Presses in a row at an end before the readout stops saying "moved nothing"
 * and names where focus has been all along.
 */
const STUCK_AFTER = 5;

/**
 * Wires the readout inside `root` to the demo `surface`.
 *
 * `easterEggs` is for the hero, the first thing a reader tries: the code
 * above, and a line for pressing on at an end. Listeners come off when
 * `signal` aborts. Throws if `root` has no readout, which is markup the build
 * did not stamp.
 */
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

  // The last ten keys, for the code above, and how many presses in a row
  // have hit an end.
  let recent: string[] = [];
  let stuck = 0;

  const show = (state: string, key: string, message: string) => {
    line.dataset.state = state;
    const label = document.createElement('span');
    label.className = 'demo-readout-target';
    label.textContent = message;
    // Hidden from the readout's live region: a screen reader already says
    // where focus went, and has no use for being told to click.
    if (state === 'blurred' || state === 'listening') {
      label.setAttribute('aria-hidden', 'true');
    }
    line.replaceChildren(label);
    if (key) {
      const cap = document.createElement('kbd');
      cap.textContent = key;
      line.prepend(cap);
    }

    // Restarted on every change, so a run of presses reads as a run of
    // updates rather than one line that changed once.
    line.classList.remove('demo-readout-fresh');
    void line.offsetWidth;
    line.classList.add('demo-readout-fresh');
  };

  // Every move inside the demo is a focusout and a focusin too; only focus
  // arriving from outside, or leaving for outside, changes the line.
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
      if (!surface.contains(e.relatedTarget as Node | null)) {
        show('blurred', '', BLURRED);
      }
    },
    { signal },
  );

  // Read back rather than left to the focusin above: focus may have arrived
  // before it was listening, and a page opened in a background tab gets its
  // focus event late, or not at all.
  if (surface.contains(document.activeElement)) {
    show('listening', '', LISTENING);
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
