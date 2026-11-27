import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';

// Unstyled; the caller slides it off `data-starting-style`/`data-ending-style`.

function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetContent({
  overlayClassName,
  side = 'left',
  ...props
}: SheetPrimitive.Popup.Props & {
  overlayClassName?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <SheetPrimitive.Portal data-slot="sheet-portal">
      <SheetPrimitive.Backdrop
        data-slot="sheet-overlay"
        className={overlayClassName}
      />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        {...props}
      />
    </SheetPrimitive.Portal>
  );
}

export { Sheet, SheetContent, SheetTrigger };
