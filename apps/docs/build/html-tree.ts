import {
  attributesToProps,
  domToReact,
  type DOMNode,
  type Element as DomElement,
} from 'html-react-parser';
import { DomUtils, parseDocument } from 'htmlparser2';

import { isOpaque, placeholderOf } from './placeholders.ts';

// Parsed at build time so the browser ships no HTML parser, and server and
// browser render one tree.

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

// `key` is dropped: the walker keys elements by position.
const library = {
  createElement: (
    tag: string,
    { key: _key, ...props }: HtmlProps = {},
    children?: unknown,
  ) => [tag, props, toChildren(children)] satisfies HtmlElement,
  cloneElement: (element: HtmlElement) => element,
  isValidElement: isElement,
};

const hasOpaqueContents = (element: DomElement) => {
  const name = placeholderOf(
    element.name,
    element.attribs.class ?? '',
    (attribute) => attribute in element.attribs,
  );
  return name !== undefined && isOpaque(name);
};

export const toHtmlTree = (html: string): HtmlNode[] => {
  const options = {
    library,
    replace: (node: DOMNode) => {
      if (node.type !== 'tag' || !hasOpaqueContents(node as DomElement)) return;
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
