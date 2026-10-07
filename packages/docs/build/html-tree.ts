import {
  attributesToProps,
  domToReact,
  type DOMNode,
  type Element as DomElement,
} from 'html-react-parser';
import { DomUtils, parseDocument } from 'htmlparser2';

/**
 * A page's rendered HTML as a tree React can draw without parsing anything.
 *
 * Parsed here, at build time, so the browser never has to: parsing there
 * would mean shipping an HTML parser, its entity tables and an attribute map
 * to every reader — more code than draws the chrome. The page's chunk carries
 * the result instead: every element as its tag, the props React takes for its
 * attributes, and its children. Server and browser render the one tree, so
 * hydration has nothing to disagree about.
 *
 * html-react-parser does the conversion — attribute names, inline styles,
 * whitespace React rejects inside tables — with JSON standing in for React
 * elements, so the tree is exactly the elements it would have built.
 * src/components/markdown.tsx walks it.
 */

export type HtmlProps = Record<string, unknown>;

/** Text, or `[tag, props, children]`. */
export type HtmlNode = string | HtmlElement;

export type HtmlElement = [tag: string, props: HtmlProps, children: HtmlNode[]];

const toChildren = (children: unknown): HtmlNode[] =>
  children === undefined || children === null
    ? []
    : Array.isArray(children) && !isElement(children)
      ? (children as HtmlNode[])
      : [children as HtmlNode];

const isElement = (value: unknown): value is HtmlElement =>
  Array.isArray(value) &&
  typeof value[0] === 'string' &&
  typeof value[1] === 'object' &&
  Array.isArray(value[2]);

/**
 * React's element API, writing JSON. The `key` html-react-parser numbers
 * siblings with is dropped: the walker keys each element by its position as
 * it draws it, so the tree need not carry one on every node.
 */
const library = {
  createElement: (
    tag: string,
    { key: _key, ...props }: HtmlProps = {},
    children?: unknown,
  ) => [tag, props, toChildren(children)] satisfies HtmlElement,
  cloneElement: (element: HtmlElement) => element,
  isValidElement: isElement,
};

const hasClass = (element: DomElement, name: string) =>
  (element.attribs.class ?? '').split(/\s+/).includes(name);

/**
 * Elements whose contents React draws once and never touches again: a demo's
 * live preview, which keyrove and the demo's own script rearrange as the
 * reader presses keys, and the readouts they write to. They are kept as HTML,
 * for `dangerouslySetInnerHTML`, rather than as a tree React would reconcile.
 */
const isOpaque = (element: DomElement) =>
  hasClass(element, 'demo-preview') ||
  hasClass(element, 'demo-panel-preview') ||
  'data-demo-readout' in element.attribs ||
  'data-hero-readout' in element.attribs;

export const toHtmlTree = (html: string): HtmlNode[] => {
  const options = {
    library,
    replace: (node: DOMNode) => {
      if (node.type !== 'tag' || !isOpaque(node as DomElement)) return;
      const element = node as DomElement;

      return library.createElement(element.name, {
        ...attributesToProps(element.attribs, element.name),
        dangerouslySetInnerHTML: { __html: DomUtils.getInnerHTML(element) },
      });
    },
  };

  const document = parseDocument(html, { lowerCaseAttributeNames: false });
  return toChildren(
    domToReact(document.children as DOMNode[], options as never),
  );
};
