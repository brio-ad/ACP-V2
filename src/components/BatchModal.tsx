import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  uid,
  type BatchKind,
  type DeploymentNotification,
  type DirectoryUser,
  type LogEntry,
  type LogResult,
} from "../data";
import { useStore, type BatchCommit } from "../store";
import { Button, Modal } from "./ui";

export interface BatchJob {
  customerId: string;
  kind: BatchKind;
  name: string;
  detail: string;
  templateId: string | null;
  users: DirectoryUser[];
  notification?: DeploymentNotification;
  /** Produces per-user results and the state changes to persist once the batch finishes. */
  run: () => { results: LogResult[]; changes: BatchCommit };
}

/** Simulates a Google Workspace batch with progress, then records it in batch history. */
export function BatchModal({
  job,
  onClose,
  onDone,
}: {
  job: BatchJob | null;
  onClose: () => void;
  onDone?: (log: LogEntry) => void;
}) {
  const { agent, commitBatch, navigate } = useStore();
  const [processed, setProcessed] = useState(0);
  const [log, setLog] = useState<LogEntry | null>(null);
  const started = useRef(0);

  useEffect(() => {
    if (!job) return;
    setProcessed(0);
    setLog(null);
    started.current = Date.now();
    const total = job.users.length;
    const step = Math.max(1, Math.ceil(total / 24));
    let n = 0;
    const timer = setInterval(() => {
      n = Math.min(total, n + step);
      setProcessed(n);
      if (n < total) return;
      clearInterval(timer);
      const { results, changes } = job.run();
      const entry: LogEntry = {
        id: uid("log"),
        customerId: job.customerId,
        kind: job.kind,
        action: job.kind === "signature" ? "signature-assigned" : undefined,
        name: job.name,
        detail: job.detail,
        templateId: job.templateId,
        trigger: "manual",
        triggeredBy: agent?.email ?? "agent",
        startedAt: new Date(started.current).toISOString(),
        durationMs: Date.now() - started.current,
        results,
        notification:
          job.notification &&
          (job.notification.when === "always" ||
            results.some((result) => result.status === "failed"))
            ? job.notification
            : undefined,
      };
      commitBatch(entry, changes);
      setLog(entry);
      onDone?.(entry);
    }, 90);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  if (!job) return null;
  const total = job.users.length;
  const pct = total ? Math.round((processed / total) * 100) : 100;
  const count = (s: string) => log?.results.filter((r) => r.status === s).length ?? 0;

  return (
    <Modal
      open
      onClose={log ? onClose : () => {}}
      title={log ? "Demo results" : "Running demo…"}
      footer={
        log && (
          <>
            <Button onClick={onClose}>Done</Button>
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                navigate({ name: "customer", id: job.customerId, tab: "history", logId: log.id });
              }}
            >
              View in History
            </Button>
          </>
        )
      }
    >
      <div className="flex items-center gap-3">
        {log ? (
          <CheckCircle2 className="size-9 text-emerald-500" />
        ) : (
          <Loader2 className="size-9 animate-spin text-accent-600" />
        )}
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{job.name}</p>
          <p className="text-sm text-slate-500">
            {processed} of {total} {job.kind === "signature" ? "mailbox" : "delegation"}
            {total === 1 ? "" : "s"} processed
          </p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-accent-600 transition-all duration-100"
          style={{ width: `${pct}%` }}
        />
      </div>
      {log && (
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {(
            [
              ["applied", "Applied", "bg-emerald-50 text-emerald-700"],
              ["skipped", "Skipped", "bg-amber-50 text-amber-700"],
              ["failed", "Failed", "bg-rose-50 text-rose-700"],
            ] as const
          ).map(([k, label, cls]) => (
            <div key={k} className={`rounded-lg py-2.5 ${cls}`}>
              <p className="text-lg font-semibold tabular-nums">{count(k)}</p>
              <p className="text-xs opacity-80">{label}</p>
            </div>
          ))}
        </div>
      )}
      {log && (
        <p className="mt-4 text-sm text-brio-muted">
          These results reflect local demo records. No Gmail changes were made.
        </p>
      )}
      {log?.notification && (
        <p className="mt-2 text-xs text-brio-muted">
          Notification recipients are in the History. No email was sent.
        </p>
      )}
    </Modal>
  );
}
