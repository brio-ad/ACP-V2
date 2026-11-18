import type { ComponentProps } from "react";
import { cx } from "../ui";

export function FieldGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cx("flex min-w-0 flex-col gap-4", className)}
      {...props}
    />
  );
}

export function Field({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="field"
      className={cx(
        "group/field flex min-w-0 flex-col gap-1 data-[invalid=true]:text-brio-danger-ink",
        className,
      )}
      {...props}
    />
  );
}

export function FieldLabel({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      data-slot="field-label"
      className={cx(
        "flex flex-wrap items-baseline gap-x-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function FieldDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cx("text-xs text-brio-muted", className)}
      {...props}
    />
  );
}

export function FieldError({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cx("text-sm text-brio-danger-ink", className)}
      {...props}
    />
  );
}
