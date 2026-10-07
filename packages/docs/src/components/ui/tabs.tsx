import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';

/**
 * Tabs on Base UI's, which owns the arrow keys: the list is one tab stop, and
 * the arrows move between its tabs.
 *
 * Unstyled here — the code panels and the landing page's pattern tabs each
 * pass the classes style.css draws them with.
 */

function Tabs(props: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
}

/**
 * Selection follows focus, as the ARIA tabs pattern describes for panels that
 * are already rendered: arrowing onto a tab shows its panel.
 */
function TabsList({
  activateOnFocus = true,
  ...props
}: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      activateOnFocus={activateOnFocus}
      {...props}
    />
  );
}

function TabsTrigger(props: TabsPrimitive.Tab.Props) {
  return <TabsPrimitive.Tab data-slot="tabs-trigger" {...props} />;
}

/**
 * Every panel stays in the document while hidden — a demo in a hidden tab
 * keeps its listeners and its log, and the prerendered page carries all of
 * them for anyone reading without scripts.
 */
function TabsContent({
  keepMounted = true,
  ...props
}: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      keepMounted={keepMounted}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
