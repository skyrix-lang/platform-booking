import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ComponentProps } from "react";
import { withBase } from "../lib/utils";

// A modal dialog: focus moves in and is trapped, Escape and a click outside
// close it, and focus returns where it was. Open it with `open` and
// `onOpenChange` on <Dialog>, then put a <DialogPopup> with a <DialogTitle>
// inside. It fades and scales in and out, unless reduced motion is asked for.

export const Dialog = BaseDialog.Root;
export const DialogClose = BaseDialog.Close;

export function DialogPopup({
  className,
  ...props
}: ComponentProps<typeof BaseDialog.Popup>) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm transition-opacity duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none" />
      <BaseDialog.Popup
        className={withBase(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-card text-card-foreground shadow-lg outline-none transition-[opacity,scale] duration-150 ease-out data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 motion-reduce:transition-none",
          className,
        )}
        {...props}
      />
    </BaseDialog.Portal>
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      className={withBase("text-sm font-semibold", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description
      className={withBase("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}
