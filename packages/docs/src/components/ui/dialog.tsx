import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

/**
 * A modal on Base UI's dialog, which handles what the native `<dialog>` used
 * to: focus moves in and is trapped, Escape and the backdrop close it, focus
 * goes back to whatever opened it, and the page behind stops scrolling.
 *
 * Unstyled here; the search passes the classes style.css draws it with.
 */

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogTitle(props: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title data-slot="dialog-title" {...props} />;
}

function DialogContent({
  overlayClassName,
  ...props
}: DialogPrimitive.Popup.Props & { overlayClassName?: string }) {
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal">
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className={overlayClassName}
      />
      <DialogPrimitive.Popup data-slot="dialog-content" {...props} />
    </DialogPrimitive.Portal>
  );
}

export { Dialog, DialogClose, DialogContent, DialogTitle };
