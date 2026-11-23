import { useEffect, useId, useRef, useState, type Ref } from "react";
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

function attachmentSize(bytes?: number) {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let amount = bytes;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit++;
  }
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(amount)} ${units[unit]}`;
}

function RecipientRow({ label, values }: { label: string; values?: string[] }) {
  return (
    <div className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] gap-3 py-2 first:pt-0 last:pb-0 sm:grid-cols-[4rem_minmax(0,1fr)]">
      <dt className="font-medium text-brio-muted">{label}</dt>
      <dd className="min-w-0">
        {values === undefined ? (
          <span className="text-brio-muted">Unavailable</span>
        ) : values.length ? (
          <ul className="space-y-1">
            {values.map((value, index) => (
              <li className="break-all" key={`${value}-${index}`}>
                {value}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-brio-muted">None</span>
        )}
      </dd>
    </div>
  );
}

function MessageOverview({
  email,
  subjectRef,
}: {
  email: SentEmail;
  subjectRef?: Ref<HTMLHeadingElement>;
}) {
  const recipientsId = useId();
  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <h3
          ref={subjectRef}
          tabIndex={-1}
          className="break-words rounded-brio-control text-base font-semibold text-brio-ink focus:outline-2 focus:outline-offset-2 focus:outline-brio-focus"
        >
          {email.subject || "(No subject)"}
        </h3>
        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[4rem_minmax(0,1fr)]">
          <dt className="font-medium text-brio-muted">From</dt>
          <dd className="min-w-0 break-all">{email.sender}</dd>
          <dt className="font-medium text-brio-muted">Sent</dt>
          <dd>{dateTime(email.sentAt)}</dd>
        </dl>
      </header>
      <section aria-labelledby={recipientsId} className="border-t border-brio-subtle pt-4">
        <h4 id={recipientsId} className="mb-3 font-semibold text-brio-ink">
          Recipients
        </h4>
        <dl className="divide-y divide-brio-subtle rounded-brio-control border border-brio-subtle px-3 py-1 sm:px-4">
          <RecipientRow label="To" values={email.to} />
          <RecipientRow label="Cc" values={email.cc} />
          <RecipientRow label="Bcc" values={email.bcc} />
        </dl>
      </section>
    </div>
  );
}

function MessageContent({ email }: { email: SentEmail }) {
  const previewId = useId();
  const attachmentsId = useId();
  return (
    <>
      <section aria-labelledby={previewId} className="border-t border-brio-subtle pt-4">
        <h4 id={previewId} className="font-semibold text-brio-ink">
          Message preview
        </h4>
        <p className="mt-2 whitespace-pre-wrap break-words rounded-brio-control border border-brio-subtle bg-brio-hover p-3 [overflow-wrap:anywhere]">
          {email.bodyText || email.snippet || "No message preview available."}
        </p>
      </section>
      <section aria-labelledby={attachmentsId} className="border-t border-brio-subtle pt-4">
        <h4 id={attachmentsId} className="font-semibold text-brio-ink">
          Attachments
        </h4>
        {email.attachments?.length ? (
          <ul className="mt-2 divide-y divide-brio-subtle rounded-brio-control border border-brio-subtle">
            {email.attachments.map((item, index) => {
              const size = attachmentSize(item.size);
              return (
                <li
                  key={`${item.name}-${index}`}
                  className="flex min-w-0 items-start gap-2 px-3 py-2"
                >
                  <Paperclip
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-brio-muted"
                  />
                  <span className="min-w-0 break-all">{item.name}</span>
                  {size && <span className="ml-auto shrink-0 text-brio-muted">{size}</span>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-brio-muted">
            {email.hasAttachments ? "Attachments present; names unavailable" : "No attachments"}
          </p>
        )}
      </section>
    </>
  );
}

function Report({
  record,
  headingRef,
}: {
  record: RecallRecord;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const counts = { successful: 0, failed: 0, skipped: 0 };
  for (const result of record.results) counts[result.status]++;
  return (
    <div className="space-y-4 text-sm">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="rounded-brio-control text-base font-semibold text-brio-ink focus:outline-2 focus:outline-offset-2 focus:outline-brio-focus"
      >
        Recall outcome
      </h3>
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
        <ul className="divide-y divide-brio-subtle">
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
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const previousStage = useRef(stage);

  useEffect(() => {
    if (previousStage.current !== stage) stageHeading.current?.focus();
    previousStage.current = stage;
  }, [stage]);

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
            <Report record={record} headingRef={stageHeading} />
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
            {stage === "confirm" && (
              <h3
                ref={stageHeading}
                tabIndex={-1}
                className="rounded-brio-control text-base font-semibold text-brio-ink focus:outline-2 focus:outline-offset-2 focus:outline-brio-focus"
              >
                Review recall request
              </h3>
            )}
            <MessageOverview
              email={email}
              subjectRef={stage === "details" ? stageHeading : undefined}
            />
            {stage === "details" ? (
              <MessageContent email={email} />
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
