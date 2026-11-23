import { useEffect, useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import { type RecallRecord, type SentEmail } from "../emailRecallApi";
import { useEmailRecallClient } from "../emailRecallDemo";
import { Badge, Button, Field, Modal, Select, Textarea } from "../components/ui";

const reasons = [
  "Sent in error",
  "Incorrect recipients",
  "Confidential information",
  "Outdated information",
  "Other",
];

function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function RecipientList({ label, values }: { label: string; values?: string[] }) {
  return (
    <div className="min-w-0">
      <p className="font-medium">{label}</p>
      {values === undefined ? (
        <p className="text-brio-muted">Unavailable</p>
      ) : values.length ? (
        <ul className="mt-1 space-y-1 break-all">
          {values.map((value, index) => (
            <li key={`${value}-${index}`}>{value}</li>
          ))}
        </ul>
      ) : (
        <p className="text-brio-muted">None</p>
      )}
    </div>
  );
}

function Report({ record }: { record: RecallRecord }) {
  const counts = { successful: 0, failed: 0, skipped: 0 };
  for (const result of record.results) counts[result.status]++;
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <p className="font-semibold break-words">{record.subject || "(No subject)"}</p>
        <p className="break-all text-brio-muted">
          {record.sender} · {dateTime(record.startedAt)}
        </p>
        <p className="break-words text-brio-muted">
          Initiated by {record.initiatedBy} · {record.reason}
        </p>
        <p className="break-all text-xs text-brio-muted">Operation ID: {record.id}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge
          tone={
            record.status === "completed" ? "green" : record.status === "failed" ? "rose" : "amber"
          }
        >
          {record.status}
        </Badge>
        <Badge tone="green">{counts.successful} successful</Badge>
        <Badge tone="rose">{counts.failed} failed</Badge>
        <Badge tone="amber">{counts.skipped} skipped</Badge>
      </div>
      {record.status === "processing" && (
        <p role="status">Recall is processing. Results update as the service checks recipients.</p>
      )}
      {record.results.length ? (
        <ul className="max-h-64 divide-y divide-brio-subtle overflow-y-auto">
          {record.results.map((result, index) => (
            <li
              key={`${result.email}-${index}`}
              className="flex flex-wrap items-start justify-between gap-2 py-2"
            >
              <div className="min-w-0">
                <p className="break-all font-medium">{result.email}</p>
                <p className="break-words text-brio-muted">{result.detail}</p>
              </div>
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
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-brio-muted">No recipient outcomes have been returned yet.</p>
      )}
    </div>
  );
}

export function EmailRecallWorkflow({
  userId,
  email,
  onClose,
}: {
  userId: string;
  email: SentEmail;
  onClose: () => void;
}) {
  const { api, isDemo } = useEmailRecallClient();
  const [stage, setStage] = useState<"details" | "confirm" | "report">("details");
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [pollError, setPollError] = useState("");
  const [record, setRecord] = useState<RecallRecord | null>(null);
  const submitLock = useRef(false);

  async function refreshRecord(id: string) {
    try {
      const result = await api.record(id);
      setRecord(result);
      setPollError("");
    } catch (error) {
      setPollError(
        error instanceof Error ? error.message : "Could not update recall results. Please retry.",
      );
    }
  }

  useEffect(() => {
    if (stage !== "report" || !record || record.status !== "processing" || pollError) return;
    const timer = window.setTimeout(() => {
      void refreshRecord(record.id);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [stage, record, pollError]);

  async function submit() {
    if (submitLock.current || !reason || (reason === "Other" && !other.trim())) return;
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await api.recall(
        userId,
        email.id,
        reason === "Other" ? `Other: ${other.trim()}` : reason,
      );
      setRecord(result);
      setStage("report");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Recall request failed. Please retry.",
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  const close = () => {
    if (!submitting) onClose();
  };
  const title =
    stage === "details"
      ? "Email details"
      : stage === "confirm"
        ? "Confirm email recall"
        : "Recall processing and results";
  return (
    <Modal
      open
      onClose={close}
      title={title}
      width="max-w-2xl"
      footer={
        stage === "report" ? (
          <Button onClick={close}>Close</Button>
        ) : (
          <>
            <Button
              disabled={submitting}
              onClick={
                stage === "confirm"
                  ? () => {
                      setSubmitError("");
                      setStage("details");
                    }
                  : close
              }
            >
              {stage === "confirm" ? "Back" : "Close"}
            </Button>
            {stage === "details" ? (
              <Button variant="danger" onClick={() => setStage("confirm")}>
                Recall Email
              </Button>
            ) : (
              <Button
                variant="danger"
                disabled={submitting || !reason || (reason === "Other" && !other.trim())}
                onClick={() => void submit()}
              >
                {submitting ? "Submitting…" : "Confirm recall"}
              </Button>
            )}
          </>
        )
      }
    >
      <div className="min-w-0 space-y-5">
        {stage === "report" && record ? (
          <div className="space-y-4">
            <Report record={record} />
            {pollError && (
              <div
                role="alert"
                className="rounded-brio-control bg-brio-danger-bg p-3 text-sm text-brio-danger-ink"
              >
                <p>{pollError}</p>
                <p className="mt-1">
                  Operation ID: <span className="break-all font-mono">{record.id}</span>
                </p>
                <Button size="sm" className="mt-3" onClick={() => void refreshRecord(record.id)}>
                  Retry results
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5 text-sm">
            <div className="space-y-2">
              <h3 className="break-words text-base font-semibold text-brio-ink">
                {email.subject || "(No subject)"}
              </h3>
              <dl className="grid gap-x-4 gap-y-1 text-brio-muted sm:grid-cols-[5rem_1fr]">
                <dt>From</dt>
                <dd className="break-all text-brio-ink">{email.sender}</dd>
                <dt>Sent</dt>
                <dd className="text-brio-ink">{dateTime(email.sentAt)}</dd>
              </dl>
            </div>
            <div className="grid gap-4 border-t border-brio-subtle pt-4 sm:grid-cols-3">
              <RecipientList label="To" values={email.to} />
              <RecipientList label="Cc" values={email.cc} />
              <RecipientList label="Bcc" values={email.bcc} />
            </div>
            {stage === "details" ? (
              <>
                <section className="border-t border-brio-subtle pt-4" aria-label="Message preview">
                  <h4 className="font-medium text-brio-ink">Message preview</h4>
                  <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-brio-control border border-brio-subtle bg-brio-hover p-3 text-brio-ink">
                    {email.bodyText || email.snippet || "No message preview available."}
                  </p>
                </section>
                <section aria-label="Attachments">
                  <h4 className="font-medium text-brio-ink">Attachments</h4>
                  {email.attachments?.length ? (
                    <ul className="mt-2 divide-y divide-brio-subtle rounded-brio-control border border-brio-subtle">
                      {email.attachments.map((item, index) => (
                        <li key={`${item.name}-${index}`} className="flex items-start gap-2 px-3 py-2">
                          <Paperclip aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brio-muted" />
                          <span className="min-w-0 break-all">{item.name}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-brio-muted">
                      {email.hasAttachments ? "Present; names unavailable" : "None"}
                    </p>
                  )}
                </section>
              </>
            ) : (
              <div className="space-y-4 border-t border-brio-subtle pt-4">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="blue">{email.internalCount} internal</Badge>
                  <Badge tone="amber">{email.externalCount} external</Badge>
                </div>
                <p className="rounded-brio-control bg-brio-warning-bg p-3 text-brio-warning-ink">
                  {isDemo
                    ? "Demo preview: this recall only simulates recipient outcomes. No mailbox is changed."
                    : "Recall is an attempt to move eligible internal mailbox copies to Trash. It cannot be guaranteed for every recipient."}
                </p>
                <Field label="Recall reason" required>
                  <Select value={reason} onChange={(event) => setReason(event.target.value)}>
                    <option value="">Select a reason</option>
                    {reasons.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </Select>
                </Field>
                {reason === "Other" && (
                  <Field label="Other reason" required>
                    <Textarea
                      value={other}
                      onChange={(event) => setOther(event.target.value)}
                      rows={3}
                    />
                  </Field>
                )}
                {submitError && (
                  <p
                    role="alert"
                    className="rounded-brio-control bg-brio-danger-bg p-3 text-brio-danger-ink"
                  >
                    {submitError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
