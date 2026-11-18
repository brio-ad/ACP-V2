import { AlertTriangle } from "lucide-react";
import {
  VARIABLES,
  fullName,
  renderSignature,
  usedVariables,
  variableValues,
  type Customer,
  type DirectoryUser,
} from "../data";
import { Field, Select } from "./ui";

export function SignaturePreview({
  html,
  customer,
  users,
  userId,
  onUserChange,
  title = "Live preview",
  signatureOnly = false,
}: {
  html: string;
  customer: Customer;
  users: DirectoryUser[];
  userId: string;
  onUserChange?: (id: string) => void;
  title?: string;
  signatureOnly?: boolean;
}) {
  const user = users.find((u) => u.id === userId) ?? users[0];
  const values = user ? variableValues(user, customer) : {};
  const missing = usedVariables(html).filter((k) => !values[k]);
  const picker = onUserChange && user && (
    <Select
      aria-label="Preview as"
      className={signatureOnly ? "h-8 max-w-64 text-xs" : undefined}
      value={user.id}
      onChange={(e) => onUserChange(e.target.value)}
    >
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {fullName(u)} — {u.email}
        </option>
      ))}
    </Select>
  );
  const signature = user ? (
    <div
      className="overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: renderSignature(html, user, customer) }}
    />
  ) : (
    <p className="text-brio-muted">A directory user is needed to preview personalized fields.</p>
  );
  const warning = user && missing.length > 0 && (
    <div className="flex items-start gap-2 border-t border-brio-warning/20 bg-brio-warning-bg px-3 py-2 text-xs text-brio-warning-ink">
      <AlertTriangle className="mt-px size-3.5 shrink-0" />
      <span>
        {fullName(user)} has no value for{" "}
        {missing.map((k) => VARIABLES.find((v) => v.key === k)?.label ?? k).join(", ")}. The field
        will render empty.
      </span>
    </div>
  );

  if (signatureOnly) {
    return (
      <div className="min-w-0">
        <div className="mb-2 flex h-8 items-center justify-between gap-2">
          <h3 className="shrink-0 text-sm font-medium">{title}</h3>
          {picker}
        </div>
        <div
          role="region"
          aria-label="Signature preview"
          tabIndex={0}
          className="sig-surface h-56 overflow-auto rounded-brio-panel border border-brio-border bg-brio-hover p-3 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brio-focus"
        >
          {signature}
        </div>
        {warning && <div className="mt-2 overflow-hidden rounded-brio-control">{warning}</div>}
      </div>
    );
  }

  return (
    <section aria-label={title || "Recipient preview"} className="min-w-0">
      <div className="records-toolbar">
        {title && <h2 className="text-base font-semibold">{title}</h2>}
        {picker && (
          <div className={title ? "mt-4" : undefined}>
            <Field label="Preview as">{picker}</Field>
          </div>
        )}
      </div>
      <div className="bg-canvas p-5">
        <div className="min-w-0 overflow-hidden rounded-brio-panel border border-brio-subtle bg-brio-surface">
          <div className="flex items-center justify-between bg-slate-800 px-3.5 py-2 text-[12px] text-white">
            <span>New Message</span>
            <span className="flex gap-1.5 opacity-60">
              <span className="size-2 rounded-full bg-white/70" />
              <span className="size-2 rounded-full bg-white/70" />
            </span>
          </div>
          <div className="divide-y divide-slate-100 text-[12.5px] break-words text-slate-500">
            <p className="px-3.5 py-1.5">
              From <span className="text-slate-800">{user?.email}</span>
            </p>
            <p className="px-3.5 py-1.5">
              To <span className="text-slate-800">client@example.com</span>
            </p>
            <p className="px-3.5 py-1.5 text-slate-800">Following up on our call</p>
          </div>
          <div className="sig-surface px-3.5 pt-3 pb-5">
            <p className="mb-3 text-slate-600">
              Hi there,
              <br />
              Great speaking with you today. Sharing the details below.
            </p>
            <p className="text-slate-400">--</p>
            {signature}
          </div>
        </div>
      </div>
      {warning}
    </section>
  );
}
