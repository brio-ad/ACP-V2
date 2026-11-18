import type { ComponentProps } from "react";
import { cx } from "../ui";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cx(
        "h-10 w-full min-w-0 rounded-brio-control border border-brio-border bg-brio-surface px-3 text-sm text-brio-ink outline-none transition-[border-color,box-shadow] placeholder:text-brio-muted focus-visible:border-brio-focus focus-visible:ring-2 focus-visible:ring-brio-focus/30 disabled:cursor-not-allowed disabled:bg-brio-hover disabled:opacity-60 aria-invalid:border-brio-danger aria-invalid:focus-visible:ring-brio-danger/25",
        "file:mr-3 file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-brio-ink",
        className,
      )}
      {...props}
    />
  );
}
