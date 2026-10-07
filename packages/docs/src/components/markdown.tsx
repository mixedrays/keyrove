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

/**
 * A page's rendered markdown, as React.
 *
 * build/markdown.ts renders the HTML and build/html-tree.ts turns it into a
 * tree of elements at build time; this draws the tree, swapping in a component
 * wherever the markup stands for one: a link to another page becomes a router
 * link, a group of code blocks becomes Base UI tabs, a copy button gets its
 * click, and a demo gets its behaviour.
 */

const classes = (props: HtmlProps) =>
  typeof props.className === 'string' ? props.className.split(/\s+/) : [];

const hasClass = (props: HtmlProps, name: string) =>
  classes(props).includes(name);

const elements = (children: HtmlNode[]) =>
  children.filter((child): child is HtmlElement => typeof child !== 'string');

const textOf = (nodes: HtmlNode[]): string =>
  nodes
    .map((node) => (typeof node === 'string' ? node : textOf(node[2])))
    .join('');

const str = (value: unknown) => (typeof value === 'string' ? value : '');

/**
 * Code blocks written back to back, as build/markdown.ts stamps them — or the
 * landing page's pattern tabs, written in the same markup by hand. The markup
 * says which tab starts selected and what each is called; Base UI's tabs take
 * it from there.
 */
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
  const copy = parts.find(
    ([tag, child]) => tag === 'button' && hasClass(child, 'code-copy'),
  );
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
        // Not a tab stop of its own: the code block inside already is, and a
        // demo's items are.
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

/**
 * Runs `mount` on the element once React has drawn it, and undoes it when the
 * element goes — on navigation, or React's second mount in development.
 */
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

/** A demo build/demos.ts stamped: the panel, its live preview, its source. */
function Demo({ props, children }: { props: HtmlProps; children: HtmlNode[] }) {
  const ref = useMount(mountDemo);

  return (
    <div ref={ref} {...props}>
      {render(children)}
    </div>
  );
}

/**
 * The landing page's hero demo. Its effect runs before any demo's, since React
 * reaches it first — which is what lets it take the page's first focus.
 */
function Hero({ props, children }: { props: HtmlProps; children: HtmlNode[] }) {
  const ref = useMount(mountHero);

  return (
    <div ref={ref} {...props}>
      {render(children)}
    </div>
  );
}

/**
 * The component an element stands for, or undefined for a plain element.
 * `key` is the element's place among its siblings.
 */
const replace = (
  [tag, props, children]: HtmlElement,
  key: number,
): ReactNode => {
  const href = str(props.href);

  if (tag === 'a' && href.startsWith('/')) {
    return (
      <SiteLink key={key} {...props} href={href}>
        {render(children)}
      </SiteLink>
    );
  }

  if ('data-code-tabs' in props) {
    return <CodeTabs key={key} props={props} children={children} />;
  }

  if ('data-demo' in props) {
    return <Demo key={key} props={props} children={children} />;
  }

  if (hasClass(props, 'hero-demo')) {
    return <Hero key={key} props={props} children={children} />;
  }

  if (tag === 'button' && hasClass(props, 'code-copy')) {
    return <CopyCodeButton key={key} label={str(props['aria-label'])} />;
  }

  if (tag === 'button' && 'data-copy-command' in props) {
    return (
      <CopyCommandButton
        key={key}
        command={str(props['data-copy-command'])}
        label={str(props['aria-label'])}
      >
        {render(children)}
      </CopyCommandButton>
    );
  }

  // The 404's list of places to go instead, on the arrows like everything
  // else. It is written in markdown, which cannot mark its links as items, so
  // `items` names them instead. Nothing takes focus on arrival: the heading
  // saying the page is missing is what a screen reader should reach first, so
  // the hint under the list says how to get in.
  if ('data-not-found-links' in props) {
    return (
      <div
        key={key}
        {...props}
        onKeyDown={(event) => keyRove(event, { items: 'a' })}
      >
        {render(children)}
      </div>
    );
  }

  return undefined;
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
