import * as Dialog from "@radix-ui/react-dialog";
import type { ComponentProps } from "react";
import { cx } from "../ui";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;
export const SheetTitle = Dialog.Title;

// The shadcn/ui Sheet pattern, styled for the app's left navigation.
export function SheetContent({
  className,
  children,
  ...props
}: ComponentProps<typeof Dialog.Content>) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-brio-ink/35" />
      <Dialog.Content
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-64 max-w-[calc(100%-2rem)] flex-col border-r border-brio-subtle bg-brio-surface shadow-brio-overlay outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
