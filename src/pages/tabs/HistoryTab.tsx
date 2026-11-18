import { RecordsHeading, RecordsTable, RecordsViewport } from "../../components/RecordsTable";
import { Fragment, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  History,
  PenLine,
  RotateCw,
  UserCog,
  XCircle,
} from "lucide-react";
import {
  formatDate,
  signatureResults,
  type ActivityAction,
  type LogEntry,
  type ResultStatus,
} from "../../data";
import { type CustomerScope } from "../../store";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ToolbarSearchInput,
  Segmented,
  Select,
  cx,
} from "../../components/ui";
import { TablePagination, useTablePage } from "../../components/TablePagination";
import { BatchModal, type BatchJob } from "../../components/BatchModal";

const counts = (l: LogEntry) => ({
  applied: l.results.filter((r) => r.status === "applied").length,
  skipped: l.results.filter((r) => r.status === "skipped").length,
  failed: l.results.filter((r) => r.status === "failed").length,
});

const actions: Record<ActivityAction, string> = {
  "template-created": "Template created",
  "template-updated": "Template updated",
  "template-deleted": "Template deleted",
  "signature-assigned": "Signature assigned",
  "delegate-added": "Delegate added",
  "delegate-removed": "Delegate removed",
};

function activity(log: LogEntry) {
  if (log.action) return log.action;
  if (log.kind === "signature") return "signature-assigned";
  return /^remove/i.test(log.name) ? "delegate-removed" : "delegate-added";
}

export function HistoryTab({
  scope,
  initialLogId,
}: {
  scope: CustomerScope;
  initialLogId?: string;
}) {
  const { customer, logs, templates, users } = scope;
  const [open, setOpen] = useState<string | null>(initialLogId ?? null);
  const [tab, setTab] = useState<"all" | "signature" | "delegation" | "failed">("all");
  const [q, setQ] = useState("");
  const [job, setJob] = useState<BatchJob | null>(null);

  const list = useMemo(
    () =>
      [...logs]
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .filter((l) => {
          if (tab === "failed" && counts(l).failed === 0) return false;
          if ((tab === "signature" || tab === "delegation") && l.kind !== tab) return false;
          const s = q.trim().toLowerCase();
          return (
            !s ||
            [actions[activity(l)], l.name, l.detail, l.triggeredBy].some((value) =>
              value.toLowerCase().includes(s),
            ) ||
            l.results.some((r) =>
              [r.email, r.name, r.message].some((value) => value.toLowerCase().includes(s)),
            )
          );
        }),
    [logs, tab, q],
  );

  const initialIndex = initialLogId ? list.findIndex((log) => log.id === initialLogId) : -1;
  const {
    visibleRows: visible,
    pagination,
    resetPage,
    viewportRef,
  } = useTablePage(list, Math.max(0, initialIndex));

  function exportCsv(l: LogEntry) {
    const rows = [
      "name,email,status,message",
      ...l.results.map((r) =>
        [r.name, r.email, r.status, r.message].map((v) => `"${v.replace(/"/g, '""')}"`).join(","),
      ),
    ];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), {
      href: url,
      download: `${customer.domain}-batch-${l.id}.csv`,
    }).click();
    URL.revokeObjectURL(url);
  }

  function retry(l: LogEntry) {
    if (customer.status !== "active" || l.kind !== "signature") return;
    const t = templates.find((x) => x.id === l.templateId);
    if (!t) return;
    const failed = new Set(l.results.filter((r) => r.status === "failed").map((r) => r.userId));
    const targets = users.filter((u) => failed.has(u.id));
    setJob({
      customerId: customer.id,
      kind: "signature",
      name: `${t.name} (retry)`,
      detail: `Retry of ${targets.length} failed`,
      templateId: t.id,
      users: targets,
      run: () => {
        const results = signatureResults(targets);
        const assignments = Object.fromEntries(
          results
            .filter((r) => r.status === "applied")
            .map((r) => [
              r.userId,
              {
                templateId: t.id,
                templateName: t.name,
                html: t.html,
                at: new Date().toISOString(),
              },
            ]),
        );
        return { results, changes: { assignments } };
      },
    });
  }

  return (
    <>
      <Card className="@container flex min-h-min flex-1 flex-col overflow-hidden">
        <div className="records-toolbar flex shrink-0 flex-wrap items-center gap-3">
          <div className="w-full min-w-0">
            <RecordsHeading
              title="Activity history"
              description={`Review signature and delegation activity for ${customer.domain}.`}
            />
          </div>
          <ToolbarSearchInput
            label="Search history"
            placeholder="Search activity, user or agent"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              resetPage();
            }}
          />
          <Select
            aria-label="Filter history"
            className="w-auto min-w-36"
            value={tab}
            onChange={(event) => {
              setTab(event.target.value as typeof tab);
              resetPage();
            }}
          >
            <option value="all">All {logs.length}</option>
            <option value="signature">Signatures</option>
            <option value="delegation">Delegates</option>
            <option value="failed">With failures</option>
          </Select>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={<History className="size-5" />}
            title={logs.length ? "No matching activity" : "No activity yet"}
            description={
              logs.length
                ? "Try a different search or filter."
                : "Template, signature, and delegate activity will appear here."
            }
          />
        ) : (
          <RecordsViewport ref={viewportRef} fill>
            <RecordsTable aria-label="History">
              <thead>
                <tr>
                  <th className="font-medium">Action</th>
                  <th className="hidden @min-[52rem]:table-cell">Affected users or template</th>
                  <th className="hidden @min-[52rem]:table-cell">Performed by</th>
                  <th className="hidden @min-[52rem]:table-cell">Date and time</th>
                  <th className="w-10">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => {
                  const c = counts(l);
                  const action = activity(l);
                  const canExpand = l.results.length > 0;
                  const isOpen = open === l.id;
                  const target =
                    action === "signature-assigned" && l.results.length === 1
                      ? `${l.name} · ${l.results[0].email}`
                      : l.name;
                  return (
                    <Fragment key={l.id}>
                      <tr className={isOpen ? "bg-brio-hover" : undefined}>
                        <td>
                          <div className="flex items-start gap-3 md:items-center">
                            <span
                              className={cx(
                                "flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
                                l.kind === "signature"
                                  ? "bg-accent-50 text-accent-700"
                                  : "bg-violet-50 text-violet-700",
                              )}
                            >
                              {l.kind === "signature" ? <PenLine /> : <UserCog />}
                            </span>
                            <div className="min-w-0 [overflow-wrap:anywhere]">
                              <p className="flex flex-wrap items-center gap-2 font-medium text-brio-ink">
                                {actions[action]}
                                {canExpand ? (
                                  <span className="flex flex-wrap gap-1">
                                    {c.applied > 0 && (
                                      <Badge tone="green">{c.applied} applied</Badge>
                                    )}
                                    {c.skipped > 0 && (
                                      <Badge tone="amber">{c.skipped} skipped</Badge>
                                    )}
                                    {c.failed > 0 && <Badge tone="rose">{c.failed} failed</Badge>}
                                  </span>
                                ) : (
                                  <Badge>Saved locally</Badge>
                                )}
                              </p>
                              <div className="mt-1 space-y-0.5 text-xs text-brio-muted @min-[52rem]:hidden">
                                <p className="font-medium text-brio-ink">{target}</p>
                                {l.detail && <p>{l.detail}</p>}
                                <p>
                                  {l.triggeredBy} · {formatDate(l.startedAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden py-3 [overflow-wrap:anywhere] @min-[52rem]:table-cell">
                          <p className="font-medium text-brio-ink">{target}</p>
                          {l.detail && <p className="text-xs text-brio-muted">{l.detail}</p>}
                        </td>
                        <td className="hidden py-3 text-brio-muted [overflow-wrap:anywhere] @min-[52rem]:table-cell">
                          {l.triggeredBy}
                        </td>
                        <td className="hidden py-3 text-brio-muted @min-[52rem]:table-cell">
                          <time dateTime={l.startedAt}>{formatDate(l.startedAt)}</time>
                        </td>
                        <td className="py-3">
                          {canExpand && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-8 px-0"
                              aria-expanded={isOpen}
                              aria-label={`Details for ${l.name}`}
                              onClick={() => setOpen(isOpen ? null : l.id)}
                            >
                              <ChevronRight
                                className={cx("size-4 transition-transform", isOpen && "rotate-90")}
                              />
                            </Button>
                          )}
                        </td>
                      </tr>
                      {isOpen && canExpand && (
                        <tr>
                          <td colSpan={5} className="bg-slate-50/80 px-4 pb-4">
                            <LogDetail
                              log={l}
                              onExport={() => exportCsv(l)}
                              onRetry={
                                customer.status === "active" &&
                                l.kind === "signature" &&
                                c.failed > 0 &&
                                templates.some((t) => t.id === l.templateId)
                                  ? () => retry(l)
                                  : undefined
                              }
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </RecordsTable>
          </RecordsViewport>
        )}
        {logs.length > 0 && (
          <TablePagination
            label="History pagination"
            noun="entry"
            plural="entries"
            {...pagination}
          />
        )}
      </Card>
      <BatchModal
        job={job}
        onClose={() => setJob(null)}
        onDone={(l) => {
          setOpen(l.id);
          resetPage();
        }}
      />
    </>
  );
}

function LogDetail({
  log,
  onExport,
  onRetry,
}: {
  log: LogEntry;
  onExport: () => void;
  onRetry?: () => void;
}) {
  const [filter, setFilter] = useState<"all" | ResultStatus>("all");
  const filtered = log.results.filter((r) => filter === "all" || r.status === filter);
  const { visibleRows: rows, pagination, resetPage, viewportRef } = useTablePage(filtered);
  return (
    <div className="max-w-[calc(100cqw-2.5rem)] overflow-hidden rounded-brio-panel border border-brio-subtle bg-brio-surface">
      <div className="records-toolbar flex flex-wrap items-center justify-between gap-3">
        <Segmented
          size="sm"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            resetPage();
          }}
          options={[
            { value: "all", label: `All ${log.results.length}` },
            { value: "applied", label: "Applied" },
            { value: "skipped", label: "Skipped" },
            { value: "failed", label: "Failed" },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          {onRetry && (
            <Button size="sm" icon={<RotateCw className="size-3.5" />} onClick={onRetry}>
              Retry in demo
            </Button>
          )}
          <Button size="sm" icon={<Download className="size-3.5" />} onClick={onExport}>
            Export CSV
          </Button>
        </div>
      </div>
      <p className="border-b border-brio-subtle px-5 py-2 text-xs text-brio-muted">
        {counts(log).applied} applied · {counts(log).skipped} skipped · {counts(log).failed} failed
      </p>
      {log.notification && (
        <p className="border-b border-brio-subtle px-4 py-2 text-xs text-brio-muted [overflow-wrap:anywhere]">
          Notification requested for {log.notification.recipients.join(", ")}. No email was sent in
          this demo.
        </p>
      )}
      <RecordsViewport ref={viewportRef} className="max-h-[min(30dvh,20rem)] overscroll-y-auto">
        <RecordsTable aria-label="Batch results">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Status</span>
              </th>
              <th scope="col">User</th>
              <th scope="col" className="hidden sm:table-cell">
                Result
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.userId}-${i}`}>
                <td className="w-12">
                  {r.status === "applied" ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : r.status === "skipped" ? (
                    <AlertTriangle className="size-4 text-amber-500" />
                  ) : (
                    <XCircle className="size-4 text-rose-500" />
                  )}
                </td>
                <td className="[overflow-wrap:anywhere]">
                  <p className="font-medium text-brio-ink">{r.name}</p>
                  <p className="text-brio-muted">{r.email}</p>
                  <p className="text-brio-muted sm:hidden">{r.message}</p>
                </td>
                <td className="hidden text-brio-muted [overflow-wrap:anywhere] sm:table-cell">
                  {r.message}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-brio-muted">
                  No {filter} results in this batch.
                </td>
              </tr>
            )}
          </tbody>
        </RecordsTable>
      </RecordsViewport>
      <TablePagination label="Batch results pagination" noun="result" {...pagination} />
    </div>
  );
}
