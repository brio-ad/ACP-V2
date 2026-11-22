import { RecordsHeading, RecordsTable, RecordsViewport } from "../../components/RecordsTable";
import { Fragment, useEffect, useMemo, useState } from "react";
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
import { useEmailRecallClient } from "../../emailRecallDemo";
import type { RecallRecord } from "../../emailRecallApi";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ToolbarSearchInput,
  Segmented,
  Select,
  Modal,
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

type HistoryItem =
  | { kind: "activity"; id: string; startedAt: string; log: LogEntry }
  | { kind: "recall"; id: string; startedAt: string; record: RecallRecord };

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
  const { api } = useEmailRecallClient();
  const [recalls, setRecalls] = useState<RecallRecord[]>([]);
  const [recallNext, setRecallNext] = useState<string>();
  const [recallError, setRecallError] = useState("");
  const [recallLoading, setRecallLoading] = useState(false);
  const [recallRetry, setRecallRetry] = useState(0);
  const [selectedRecall, setSelectedRecall] = useState<RecallRecord | null>(null);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(initialLogId ?? null);
  const [tab, setTab] = useState<"all" | "signature" | "delegation" | "recall" | "failed">("all");
  const [q, setQ] = useState("");
  const [job, setJob] = useState<BatchJob | null>(null);

  useEffect(() => {
    let active = true;
    setRecallLoading(true);
    api
      .history()
      .then((page) => {
        if (active) {
          setRecalls(page.items);
          setRecallNext(page.nextPageToken);
          setRecallError("");
        }
      })
      .catch((error) => {
        if (active)
          setRecallError(error instanceof Error ? error.message : "Recall history is unavailable.");
      })
      .finally(() => {
        if (active) setRecallLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, recallRetry]);

  async function loadMoreRecalls() {
    if (!recallNext || recallLoading) return;
    setRecallLoading(true);
    try {
      const page = await api.history(recallNext);
      setRecalls((current) => [
        ...current,
        ...page.items.filter((item) => !current.some((known) => known.id === item.id)),
      ]);
      setRecallNext(page.nextPageToken);
      setRecallError("");
    } catch (error) {
      setRecallError(error instanceof Error ? error.message : "Recall history is unavailable.");
    } finally {
      setRecallLoading(false);
    }
  }

  async function openRecall(id: string) {
    setSelectedRecall(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      setSelectedRecall(await api.record(id));
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Recall results are unavailable.");
    } finally {
      setDetailLoading(false);
    }
  }

  const list = useMemo<HistoryItem[]>(
    () =>
      [
        ...logs.map((log): HistoryItem => ({
          kind: "activity",
          id: log.id,
          startedAt: log.startedAt,
          log,
        })),
        ...recalls.map((record): HistoryItem => ({
          kind: "recall",
          id: record.id,
          startedAt: record.startedAt,
          record,
        })),
      ]
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .filter((l) => {
          if (tab === "recall" && l.kind !== "recall") return false;
          if (
            (tab === "signature" || tab === "delegation") &&
            (l.kind !== "activity" || l.log.kind !== tab)
          )
            return false;
          if (
            tab === "failed" &&
            (l.kind === "activity"
              ? counts(l.log).failed === 0
              : !["failed", "partial"].includes(l.record.status) &&
                !l.record.results?.some((result) => result.status === "failed"))
          )
            return false;
          const s = q.trim().toLowerCase();
          if (l.kind === "recall")
            return (
              !s ||
              [
                l.record.subject,
                l.record.sender,
                l.record.initiatedBy,
                l.record.status,
                "Email recall",
              ].some((value) => value.toLowerCase().includes(s))
            );
          const log = l.log;
          return (
            !s ||
            [actions[activity(log)], log.name, log.detail, log.triggeredBy].some((value) =>
              value.toLowerCase().includes(s),
            ) ||
            log.results.some((r) =>
              [r.email, r.name, r.message].some((value) => value.toLowerCase().includes(s)),
            )
          );
        }),
    [logs, recalls, tab, q],
  );

  const initialIndex = initialLogId ? list.findIndex((item) => item.id === initialLogId) : -1;
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
              description={`Review signature, delegation, and email recall activity for ${customer.domain}.`}
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
            <option value="all">All {logs.length + recalls.length}</option>
            <option value="signature">Signatures</option>
            <option value="delegation">Delegates</option>
            <option value="recall">Email Recall</option>
            <option value="failed">With failures</option>
          </Select>
        </div>

        {recallError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-brio-danger-ink"
          >
            <span>Recall activity: {recallError}</span>
            <Button
              size="sm"
              onClick={() =>
                recallNext ? void loadMoreRecalls() : setRecallRetry((value) => value + 1)
              }
            >
              Retry
            </Button>
          </div>
        )}
        {recallLoading && (
          <p role="status" className="p-5 text-sm text-brio-muted">
            Loading recall activity…
          </p>
        )}

        {list.length === 0 ? (
          <EmptyState
            icon={<History className="size-5" />}
            title={logs.length + recalls.length ? "No matching activity" : "No activity yet"}
            description={
              logs.length + recalls.length
                ? "Try a different search or filter."
                : "Template, signature, delegate, and email recall activity will appear here."
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
                {visible.map((item) => {
                  if (item.kind === "recall") {
                    const record = item.record;
                    return (
                      <tr key={`recall-${record.id}`}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                              <History className="size-4" />
                            </span>
                            <div>
                              <p className="font-medium">
                                Email recall{" "}
                                <Badge
                                  tone={
                                    record.status === "completed"
                                      ? "green"
                                      : record.status === "failed"
                                        ? "rose"
                                        : "amber"
                                  }
                                >
                                  {record.status}
                                </Badge>
                              </p>
                              <p className="mt-1 text-xs text-brio-muted @min-[52rem]:hidden">
                                {record.subject || "(No subject)"} · {record.initiatedBy} ·{" "}
                                {formatDate(record.startedAt)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden [overflow-wrap:anywhere] @min-[52rem]:table-cell">
                          {record.subject || "(No subject)"}
                          <p className="text-xs text-brio-muted">{record.sender}</p>
                        </td>
                        <td className="hidden [overflow-wrap:anywhere] @min-[52rem]:table-cell">
                          {record.initiatedBy}
                        </td>
                        <td className="hidden @min-[52rem]:table-cell">
                          <time dateTime={record.startedAt}>{formatDate(record.startedAt)}</time>
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Results for ${record.subject || "email recall"}`}
                            onClick={() => void openRecall(record.id)}
                          >
                            <ChevronRight className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  }
                  const l = item.log;
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
        {list.length > 0 && (
          <TablePagination
            label="History pagination"
            noun="entry"
            plural="entries"
            {...pagination}
          />
        )}
        {recallNext && (
          <div className="flex justify-end border-t border-brio-subtle px-5 py-3">
            <Button disabled={recallLoading} onClick={() => void loadMoreRecalls()}>
              Load more activity
            </Button>
          </div>
        )}
      </Card>
      <Modal
        open={Boolean(selectedRecall) || detailLoading || Boolean(detailError)}
        onClose={() => {
          setSelectedRecall(null);
          setDetailError("");
          setDetailLoading(false);
        }}
        title="Recall results"
      >
        {detailLoading && <p role="status">Loading results…</p>}
        {detailError && (
          <p role="alert" className="text-brio-danger-ink">
            {detailError}
          </p>
        )}
        {selectedRecall && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold">{selectedRecall.subject || "(No subject)"}</p>
              <p className="text-brio-muted">
                {selectedRecall.sender} · {formatDate(selectedRecall.startedAt)}
              </p>
              <p className="mt-2">Reason: {selectedRecall.reason}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">
                {selectedRecall.results?.filter((item) => item.status === "successful").length ?? 0}{" "}
                successful
              </Badge>
              <Badge tone="rose">
                {selectedRecall.results?.filter((item) => item.status === "failed").length ?? 0}{" "}
                failed
              </Badge>
              <Badge tone="amber">
                {selectedRecall.results?.filter((item) => item.status === "skipped").length ?? 0}{" "}
                skipped
              </Badge>
            </div>
            <div className="max-h-72 divide-y divide-brio-subtle overflow-y-auto">
              {selectedRecall.results?.map((result, index) => (
                <div
                  key={`${result.email}-${index}`}
                  className="flex flex-wrap justify-between gap-2 py-2"
                >
                  <span className="break-all">
                    {result.email}
                    <span className="block text-xs text-brio-muted">{result.detail}</span>
                  </span>
                  <Badge
                    tone={
                      result.status === "successful"
                        ? "green"
                        : result.status === "failed"
                          ? "rose"
                          : "amber"
                    }
                  >
                    {result.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
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
