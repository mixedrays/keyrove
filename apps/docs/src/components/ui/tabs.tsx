import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';

function Tabs(props: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
}

/** Selection follows focus, per the ARIA tabs pattern for rendered panels. */
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

/** Hidden panels stay mounted, so demos keep listeners and no-JS readers see all. */
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
