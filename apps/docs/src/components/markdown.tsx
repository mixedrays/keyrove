import { keyRove } from '@mixedrays/keyrove';
import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

import type {
  HtmlElement,
  HtmlNode,
  HtmlProps,
} from '../../build/html-tree.ts';
import {
  isOpaque,
  placeholderOf,
  type SwappedPlaceholder,
} from '../../build/placeholders.ts';
import {
  CopyCodeButton,
  CopyCommandButton,
} from '@/components/copy-button.tsx';
import { SiteLink } from '@/components/site-link.tsx';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.tsx';
import { mountDemo } from '@/demos.ts';
import { mountHero } from '@/hero.ts';

// Draws the build-time tree, swapping internal links for router links and
// placeholders for the components `DRAW` names.

const elements = (children: HtmlNode[]) =>
  children.filter((child): child is HtmlElement => typeof child !== 'string');

const textOf = (nodes: HtmlNode[]): string =>
  nodes
    .map((node) => (typeof node === 'string' ? node : textOf(node[2])))
    .join('');

const str = (value: unknown) => (typeof value === 'string' ? value : '');

const placeholder = ([tag, props]: HtmlElement) =>
  placeholderOf(tag, str(props.className), (attribute) => attribute in props);

function CodeTabs({
  props,
  children,
}: {
  props: HtmlProps;
  children: HtmlNode[];
}) {
  const parts = elements(children);
  const list = parts.find(([, child]) => child.role === 'tablist');
  if (!list) return createElement('div', props, ...render(children));

  const tabs = elements(list[2]).filter(([, tab]) => tab.role === 'tab');
  const panels = parts.filter(([, child]) => child.role === 'tabpanel');
  const copy = parts.find((part) => placeholder(part) === 'copyCode');
  const selected = Math.max(
    0,
    tabs.findIndex(([, tab]) => tab['aria-selected'] === 'true'),
  );

  return (
    <Tabs className={str(props.className)} defaultValue={selected}>
      {copy && <CopyCodeButton label={str(copy[1]['aria-label'])} />}
      <TabsList
        className={str(list[1].className)}
        aria-label={str(list[1]['aria-label']) || undefined}
      >
        {tabs.map(([, tab, label], index) => (
          <TabsTrigger key={index} value={index} className={str(tab.className)}>
            {textOf(label)}
          </TabsTrigger>
        ))}
      </TabsList>
      {panels.map(([, panel, content], index) => (
        // Not a tab stop: the code block or demo items inside already are.
        <TabsContent
          key={index}
          value={index}
          className={str(panel.className)}
          tabIndex={-1}
        >
          {render(content)}
        </TabsContent>
      ))}
    </Tabs>
  );
}

// Undone on navigation, or React's second mount in development.
const useMount = (
  mount: (element: HTMLElement, signal: AbortSignal) => void,
) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (ref.current) mount(ref.current, controller.signal);
    return () => controller.abort();
    // Mounted once per element; `mount` is a module function.
  }, []);

  return ref;
};

function Demo({ props, children }: { props: HtmlProps; children: HtmlNode[] }) {
  const ref = useMount(mountDemo);

  return (
    <div ref={ref} {...props}>
      {render(children)}
    </div>
  );
}

function Hero({ props, children }: { props: HtmlProps; children: HtmlNode[] }) {
  const ref = useMount(mountHero);

  return (
    <div ref={ref} {...props}>
      {render(children)}
    </div>
  );
}

/** `key` is the placeholder's place among its siblings. */
type Draw = (props: HtmlProps, children: HtmlNode[], key: number) => ReactNode;

// A placeholder without a component here doesn't compile.
const DRAW: Record<SwappedPlaceholder, Draw> = {
  codeTabs: (props, children, key) => (
    <CodeTabs key={key} props={props} children={children} />
  ),
  demo: (props, children, key) => (
    <Demo key={key} props={props} children={children} />
  ),
  hero: (props, children, key) => (
    <Hero key={key} props={props} children={children} />
  ),
  copyCode: (props, _children, key) => (
    <CopyCodeButton key={key} label={str(props['aria-label'])} />
  ),
  copyCommand: (props, children, key) => (
    <CopyCommandButton
      key={key}
      command={str(props['data-copy-command'])}
      label={str(props['aria-label'])}
    >
      {render(children)}
    </CopyCommandButton>
  ),
  // Markdown can't mark links as items, so `items` names them. No focus on
  // arrival: a screen reader should reach the "missing" heading first.
  notFoundLinks: (props, children, key) => (
    <div
      key={key}
      {...props}
      onKeyDown={(event) => keyRove(event, { items: 'a' })}
    >
      {render(children)}
    </div>
  ),
};

const replace = (element: HtmlElement, key: number): ReactNode => {
  const [tag, props, children] = element;
  const href = str(props.href);

  if (tag === 'a' && href.startsWith('/')) {
    return (
      <SiteLink key={key} {...props} href={href}>
        {render(children)}
      </SiteLink>
    );
  }

  // An opaque placeholder is drawn as the HTML build/html-tree.ts kept.
  const name = placeholder(element);
  if (name === undefined || isOpaque(name)) return undefined;

  return DRAW[name](props, children, key);
};

const render = (nodes: HtmlNode[]): ReactNode[] =>
  nodes.map((node, key) => {
    if (typeof node === 'string') return node;

    const [tag, props, children] = node;
    return (
      replace(node, key) ??
      createElement(tag, { ...props, key }, ...render(children))
    );
  });

export function Markdown({ tree }: { tree: HtmlNode[] }) {
  const content = useMemo(() => render(tree), [tree]);

  return <>{content}</>;
}
