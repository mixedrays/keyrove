import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';

/**
 * A panel that slides in from an edge, on Base UI's dialog: the mobile docs
 * navigation. Focus is trapped while it is open, Escape and the backdrop
 * close it, and focus returns to the button that opened it.
 *
 * Unstyled here. The slide is the caller's stylesheet, keyed off the
 * `data-starting-style` and `data-ending-style` attributes Base UI sets while
 * the panel enters and leaves.
 */

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
