import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import {
  VARIABLES,
  fullName,
  usedVariables,
  variableValues,
  type Assignment,
  type Customer,
  type DirectoryUser,
} from "../data";
import { Badge } from "./ui";

export type PreCheck = { status: "warn" | "fail"; title: string; detail: string };

const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;

export function signatureChecks(
  customer: Customer,
  html: string,
  recipients: DirectoryUser[],
  assignments: Record<string, Assignment>,
): PreCheck[] {
  const active = recipients.filter((u) => u.status === "active");
  const suspended = recipients.length - active.length;
  const vars = usedVariables(html);
  const gaps = vars
    .map((k) => ({
      label: VARIABLES.find((v) => v.key === k)?.label ?? k,
      missing: active.filter((u) => !variableValues(u, customer)[k]),
    }))
    .filter((g) => g.missing.length);
  const unknown = vars.filter((k) => !VARIABLES.some((v) => v.key === k));
  const insecure = (html.match(/src="http:\/\//g) ?? []).length;
  const replacing = active.filter((u) => assignments[u.id]).length;

  const checks: (PreCheck | null)[] = [
    customer.status !== "active"
      ? {
          status: "fail",
          title: "Directory is not ready",
          detail: "Set up the customer’s demo directory before deploying.",
        }
      : null,
    html.length > 10000
      ? {
          status: "fail",
          title: "Signature too long",
          detail: `${html.length.toLocaleString()} characters; Gmail allows 10,000.`,
        }
      : null,
    active.length === 0
      ? {
          status: "fail",
          title: "No active recipients",
          detail: "Every selected user is suspended or nobody is selected.",
        }
      : null,
    ...(suspended
      ? [
          {
            status: "warn" as const,
            title: `${plural(suspended, "suspended user")} will be skipped`,
            detail: "Gmail settings cannot be changed for suspended accounts.",
          },
        ]
      : []),
    ...gaps.map((g) => ({
      status: "warn" as const,
      title: `${g.label} is empty for ${plural(g.missing.length, "user")}`,
      detail: `${g.missing.slice(0, 3).map(fullName).join(", ")}${g.missing.length > 3 ? ` and ${g.missing.length - 3} more` : ""}. The field will render blank.`,
    })),
    ...(unknown.length
      ? [
          {
            status: "warn" as const,
            title: "Unknown fields",
            detail: `${unknown.map((k) => `{{${k}}}`).join(", ")} will render blank.`,
          },
        ]
      : []),
    ...(insecure
      ? [
          {
            status: "warn" as const,
            title: "Non-HTTPS images",
            detail: `${plural(insecure, "image")} use http://. Gmail may block them.`,
          },
        ]
      : []),
    ...(replacing
      ? [
          {
            status: "warn" as const,
            title: `${plural(replacing, "existing signature")} will be replaced`,
            detail: "These users already have a signature in the demo records.",
          },
        ]
      : []),
  ];
  return checks.filter((check): check is PreCheck => check !== null);
}

export function AssignmentChecks({ checks }: { checks: PreCheck[] }) {
  const warn = checks.filter((c) => c.status === "warn").length;
  const fail = checks.filter((c) => c.status === "fail").length;
  return (
    <section aria-labelledby="assignment-checks" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="assignment-checks" className="text-base font-semibold">
          Assignment checks
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {fail ? (
            <Badge tone="rose">{plural(fail, "blocking issue")}</Badge>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-brio-success-ink">
              <CheckCircle2 className="size-4" aria-hidden /> No blocking issues
            </span>
          )}
          {warn > 0 && <Badge tone="amber">{plural(warn, "warning")}</Badge>}
        </div>
      </div>
      {checks.length > 0 && (
        <ul className="flex flex-col gap-2">
          {checks.map((c, i) => (
            <li
              key={i}
              className={
                c.status === "warn"
                  ? "flex gap-3 rounded-brio-control bg-brio-warning-bg px-4 py-3"
                  : "flex gap-3 rounded-brio-control bg-brio-danger-bg px-4 py-3"
              }
            >
              {c.status === "warn" ? (
                <AlertTriangle className="mt-1 size-4 shrink-0 text-brio-warning-ink" aria-hidden />
              ) : (
                <XCircle className="mt-1 size-4 shrink-0 text-brio-danger-ink" aria-hidden />
              )}
              <div className="min-w-0 break-words">
                <p className="font-medium text-brio-ink">{c.title}</p>
                <p className="mt-1 text-sm text-brio-muted">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AssignmentSummary({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <section aria-labelledby="assignment-summary" className="min-w-0">
      <div className="mb-4">
        <h2 id="assignment-summary" className="text-base font-semibold">
          Assignment summary
        </h2>
      </div>
      <dl className="flex min-w-0 flex-col divide-y divide-brio-subtle rounded-brio-panel bg-canvas px-4">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid min-w-0 gap-2 py-3 @min-[32rem]:grid-cols-[9rem_minmax(0,1fr)] @min-[32rem]:gap-5"
          >
            <dt className="text-sm text-brio-muted">{label}</dt>
            <dd className="min-w-0 text-brio-ink [overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
