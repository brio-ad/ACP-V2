import * as Dialog from "@radix-ui/react-dialog";
import {
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Check, Minus, Search, X } from "lucide-react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brio-primary text-brio-ink enabled:hover:bg-brio-primary-hover enabled:active:bg-brio-primary-active disabled:bg-brio-hover disabled:text-brio-muted",
  secondary:
    "bg-brio-surface text-brio-ink ring-1 ring-inset ring-brio-border enabled:hover:bg-brio-hover disabled:opacity-45",
  ghost:
    "text-brio-muted enabled:hover:bg-brio-hover enabled:hover:text-brio-ink disabled:opacity-45",
  danger: "bg-brio-danger text-white enabled:hover:bg-brio-danger-ink disabled:opacity-45",
};

const controlFocus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brio-focus";

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md";
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-brio-control font-medium whitespace-nowrap transition-colors duration-120 ease-brio motion-reduce:transition-none disabled:cursor-not-allowed [&_svg]:shrink-0",
        controlFocus,
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        VARIANTS[variant],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        "inline-flex size-8 items-center justify-center rounded-brio-control text-brio-muted transition-colors duration-120 ease-brio hover:bg-brio-hover hover:text-brio-ink motion-reduce:transition-none disabled:opacity-40",
        controlFocus,
        className,
      )}
    >
      {children}
    </button>
  );
}

type Tone = "slate" | "blue" | "green" | "amber" | "rose" | "violet";
const TONES: Record<Tone, string> = {
  slate: "bg-brio-hover text-brio-muted",
  blue: "bg-accent-50 text-accent-700",
  green: "bg-brio-success-bg text-brio-success-ink",
  amber: "bg-brio-warning-bg text-brio-warning-ink",
  rose: "bg-brio-danger-bg text-brio-danger-ink",
  violet: "bg-violet-50 text-violet-700",
};

export function Badge({
  tone = "slate",
  dot,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs leading-4 font-medium whitespace-nowrap",
        TONES[tone],
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  optional,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 flex items-baseline gap-2 text-sm font-medium text-brio-ink">
        {label}
        {required && (
          <span aria-hidden className="text-brio-danger-ink">
            *
          </span>
        )}
        {optional && <span className="text-xs font-normal text-brio-muted">Optional</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-brio-danger-ink">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-brio-muted">{hint}</span>
      ) : null}
    </label>
  );
}

const inputBase = cx(
  "form-control rounded-brio-control bg-brio-surface px-3 text-sm text-brio-ink ring-1 ring-inset ring-brio-border placeholder:text-brio-muted focus:ring-brio-focus disabled:bg-brio-hover disabled:text-brio-muted",
  controlFocus,
);

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(inputBase, "control-single", className)} />;
}

export function SearchInput({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className={cx("relative min-w-0", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brio-muted"
      />
      <Input type="search" aria-label={label} className="pl-9" {...props} />
    </div>
  );
}

export function ToolbarSearchInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <SearchInput
      {...props}
      className={cx("w-full min-w-0 flex-none @min-[64rem]:w-80", className)}
    />
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(inputBase, "py-2", className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={cx(
        inputBase,
        'control-single appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2716%27%20height%3D%2716%27%20fill%3D%27none%27%20stroke%3D%27%2364748b%27%20stroke-width%3D%271.6%27%3E%3Cpath%20d%3D%27m4%206%204%204%204-4%27/%3E%3C/svg%3E")] bg-[position:right_10px_center] bg-no-repeat pr-9',
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  const on = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cx(
        "inline-flex size-4.5 shrink-0 items-center justify-center rounded-[5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500",
        on
          ? "bg-brio-primary text-brio-ink"
          : "bg-white ring-1 ring-inset ring-slate-300 hover:ring-slate-400",
      )}
    >
      {indeterminate ? (
        <Minus className="size-3.5" strokeWidth={3} />
      ) : checked ? (
        <Check className="size-3.5" strokeWidth={3} />
      ) : null}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("rounded-brio-panel bg-brio-surface ring-1 ring-brio-subtle", className)}>
      {children}
    </div>
  );
}

const AVATAR_COLORS = [
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-indigo-100 text-indigo-800",
];

export function Avatar({
  name,
  size = "md",
  tone = "color",
}: {
  name: string;
  size?: "sm" | "md";
  tone?: "color" | "neutral";
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const color =
    tone === "neutral"
      ? "bg-brio-ink text-white"
      : AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        color,
        size === "sm" ? "size-7 text-[11px]" : "size-8.5 text-xs",
      )}
    >
      {initials}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1 basis-56">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-medium tracking-wide text-accent-600 uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex max-w-full flex-wrap gap-0.5 rounded-lg bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-all",
            size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
            value === o.value
              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60"
              : "text-slate-500 hover:text-slate-800",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const content = useRef<HTMLDivElement>(null);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-brio-ink/35" />
        <Dialog.Content
          ref={content}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            const active = document.activeElement;
            returnFocus.current = active instanceof HTMLElement ? active : null;
            const initialField =
              content.current?.querySelector<HTMLElement>("[data-dialog-autofocus]");
            if (initialField) {
              event.preventDefault();
              initialField.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current?.isConnected) returnFocus.current.focus();
          }}
          className={cx(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-1/2 flex-col rounded-brio-dialog border border-brio-subtle bg-brio-surface shadow-brio-overlay outline-none",
            width,
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-brio-subtle px-4 py-3 sm:px-6">
            <Dialog.Title className="min-w-0 text-brio-title font-semibold [overflow-wrap:anywhere]">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <IconButton label="Close">
                <X className="size-4" />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto p-4 sm:p-6">{children}</div>
          {footer && (
            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-brio-subtle px-4 py-4 sm:px-6">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center sm:px-6 sm:py-16">
      <div className="mb-4 flex size-11 items-center justify-center rounded-brio-panel bg-brio-hover text-brio-muted">
        {icon}
      </div>
      <p className="font-medium text-brio-ink">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-brio-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cx("mt-0.5 text-xl font-semibold tabular-nums tracking-tight", tone)}>
        {value}
      </p>
    </div>
  );
}

export function CustomerMark({
  customer,
  size = "md",
}: {
  customer: { name: string; color: string };
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "lg"
      ? "size-14 text-xl rounded-brio-panel"
      : size === "sm"
        ? "size-8 text-xs rounded-brio-panel"
        : "size-9 text-sm rounded-brio-panel";
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center font-semibold text-brio-ink",
        dims,
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${customer.color} 12%, white)`,
      }}
    >
      {customer.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
    </span>
  );
}

export function CustomerStatusBadge({ status }: { status: "active" | "pending" | "error" }) {
  if (status === "active")
    return (
      <Badge tone="green" dot>
        Directory ready
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge tone="amber" dot>
        Setup pending
      </Badge>
    );
  return (
    <Badge tone="rose" dot>
      Needs attention
    </Badge>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: string }[];
}) {
  return (
    <div
      role="tablist"
      aria-label="Workspace tools"
      className="isolate grid w-full min-w-0 grid-cols-2 border-b border-brio-border @min-[36rem]:grid-cols-4 @min-[62rem]:grid-cols-8"
    >
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            id={`customer-tab-${t.value}`}
            aria-controls="customer-tab-panel"
            tabIndex={on ? 0 : -1}
            aria-selected={on}
            onClick={() => onChange(t.value)}
            onKeyDown={(event) => {
              const index = tabs.indexOf(t);
              const next = {
                ArrowRight: (index + 1) % tabs.length,
                ArrowLeft: (index + tabs.length - 1) % tabs.length,
                Home: 0,
                End: tabs.length - 1,
              }[event.key];
              if (next === undefined) return;
              event.preventDefault();
              const tab = tabs[next].value;
              onChange(tab);
              document.getElementById(`customer-tab-${tab}`)?.focus();
            }}
            className={cx(
              "relative flex min-h-11 min-w-0 items-center justify-center rounded-t-brio-control border border-transparent border-b-2 px-2 py-2 text-center text-xs leading-4 font-medium transition-colors duration-120 ease-brio focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brio-focus motion-reduce:transition-none @min-[36rem]:px-3 @min-[36rem]:text-sm",
              on
                ? "border-t-brio-subtle border-r-brio-subtle border-b-brio-primary border-l-brio-subtle bg-brio-surface font-semibold text-brio-ink"
                : "border-b-brio-border text-brio-muted hover:bg-brio-hover hover:text-brio-ink",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
