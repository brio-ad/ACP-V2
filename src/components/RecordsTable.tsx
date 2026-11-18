import type { ComponentProps, ComponentPropsWithoutRef } from "react";
import { cx } from "./ui";

export function RecordsHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-brio-muted">{description}</p>
    </div>
  );
}

export function RecordsTable({ className, ...props }: ComponentPropsWithoutRef<"table">) {
  return <table {...props} className={cx("data-table records-table", className)} />;
}

export function RecordsViewport({
  className,
  fill = false,
  ...props
}: ComponentProps<"div"> & { fill?: boolean }) {
  return (
    <div
      tabIndex={0}
      {...props}
      className={cx(
        "records-viewport isolate min-w-0 flex-auto overflow-auto overscroll-contain focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brio-focus",
        // The row count must not contribute to the surrounding layout's minimum height.
        fill && "min-h-24 [contain:size]",
        className,
      )}
    />
  );
}
