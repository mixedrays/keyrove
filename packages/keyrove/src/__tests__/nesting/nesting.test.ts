import { afterEach, describe, expect, it } from 'vitest';
import { innerRoot, outerRoot, ownerRoot, rootAt } from '../../nesting';

afterEach(() => {
  document.body.innerHTML = '';
});

/** Renders markup into the document. */
const render = (html: string) => {
  document.body.innerHTML = html;
};

const byId = (id: string) => document.getElementById(id)!;

/** Roots marked by a `root` class, so every test names its own. */
const isRoot = (element: Element) => !!element.classList?.contains('root');

describe('nesting', () => {
  describe('rootAt: the root an event is in', () => {
    it('is the nearest root at or above the target', () => {
      render(`
        <div id="outer" class="root">
          <div id="inner" class="root">
            <span><button id="a"></button></span>
          </div>
        </div>
      `);

      expect(rootAt(byId('a'), document.body, isRoot)).toBe(byId('inner'));
      expect(rootAt(byId('inner'), document.body, isRoot)).toBe(byId('inner'));
    });

    it("looks past the listener's element: a root above it wins where none sits between", () => {
      render(`
        <div id="wrapper" class="root">
          <div id="listener">
            <button id="a"></button>
            <div id="inner" class="root"><button id="b"></button></div>
          </div>
        </div>
      `);

      expect(rootAt(byId('a'), byId('listener'), isRoot)).toBe(byId('wrapper'));
      expect(rootAt(byId('b'), byId('listener'), isRoot)).toBe(byId('inner'));
    });

    it("falls back to the listener's element, the document's for a document or window", () => {
      render(`<ul id="list"><li id="a"></li></ul>`);

      expect(rootAt(byId('a'), byId('list'), isRoot)).toBe(byId('list'));
      expect(rootAt(byId('a'), document, isRoot)).toBe(
        document.documentElement,
      );
      expect(rootAt(byId('a'), window, isRoot)).toBe(document.documentElement);
      expect(rootAt(null, null, isRoot)).toBeNull();
    });

    it('falls back to a shadow root it listens on, and finds no root past the shadow tree', () => {
      render(`<div class="root"><div id="host"></div></div>`);
      const shadow = byId('host').attachShadow({ mode: 'open' });
      shadow.innerHTML = `<button id="a"></button>`;

      expect(rootAt(shadow.getElementById('a'), shadow, isRoot)).toBe(shadow);
    });
  });

  describe("ownerRoot: the root an item of a group's belongs to", () => {
    it('is the nearest root above the item, short of the group root, else the group root', () => {
      render(`
        <div id="group" class="root">
          <div><button id="a"></button></div>
          <div id="panel" class="root">
            <div id="inner" class="root"><button id="b"></button></div>
          </div>
        </div>
      `);
      const group = byId('group');

      expect(ownerRoot(byId('a'), group, isRoot)).toBe(group);
      expect(ownerRoot(byId('b'), group, isRoot)).toBe(byId('inner'));
      // A root that is an item is in the group around it.
      expect(ownerRoot(byId('panel'), group, isRoot)).toBe(group);
      expect(ownerRoot(byId('inner'), group, isRoot)).toBe(byId('panel'));
    });

    it('stops at a shadow root read as a group', () => {
      render(`<div class="root"><div id="host"></div></div>`);
      const shadow = byId('host').attachShadow({ mode: 'open' });
      shadow.innerHTML = `<button id="a"></button>`;
      const group = shadow as unknown as Element;

      expect(ownerRoot(shadow.getElementById('a')!, group, isRoot)).toBe(
        shadow,
      );
    });
  });

  describe("outerRoot: the root around an element, within the listener's reach", () => {
    it("is the nearest root above it, else the listener's element", () => {
      render(`
        <div id="listener">
          <div id="outer" class="root">
            <div id="inner" class="root"><button id="a"></button></div>
          </div>
          <button id="b"></button>
        </div>
      `);
      const reach = byId('listener');

      expect(outerRoot(byId('inner'), reach, isRoot)).toBe(byId('outer'));
      expect(outerRoot(byId('a'), reach, isRoot)).toBe(byId('inner'));
      expect(outerRoot(byId('outer'), reach, isRoot)).toBe(reach);
      expect(outerRoot(byId('b'), reach, isRoot)).toBe(reach);
    });

    it("never goes past the listener's element, even to a root above it", () => {
      render(`
        <div id="wrapper" class="root">
          <div id="listener">
            <div id="inner" class="root"><button id="a"></button></div>
          </div>
          <div id="sibling" class="root"></div>
        </div>
      `);
      const reach = byId('listener');

      expect(outerRoot(byId('inner'), reach, isRoot)).toBe(reach);
      expect(outerRoot(reach, reach, isRoot)).toBeNull();
      expect(outerRoot(byId('sibling'), reach, isRoot)).toBeNull();
    });

    it('reaches a shadow root it listens on from a root at its top level', () => {
      render(`<div class="root"><div id="host"></div></div>`);
      const shadow = byId('host').attachShadow({ mode: 'open' });
      shadow.innerHTML = `<div id="inner" class="root"><button></button></div>`;
      const reach = shadow as unknown as Element;

      expect(outerRoot(shadow.getElementById('inner')!, reach, isRoot)).toBe(
        shadow,
      );
      expect(outerRoot(byId('host'), reach, isRoot)).toBeNull();
    });
  });

  describe('innerRoot: the root nested in an item', () => {
    it('is the first root inside the item, outermost first, never the item itself', () => {
      render(`
        <div id="item" class="root">
          <span>
            <div id="first" class="root">
              <div class="root"></div>
            </div>
          </span>
          <div class="root"></div>
        </div>
        <div id="bare"><button></button></div>
      `);

      expect(innerRoot(byId('item'), isRoot)).toBe(byId('first'));
      expect(innerRoot(byId('bare'), isRoot)).toBeNull();
    });
  });
});
