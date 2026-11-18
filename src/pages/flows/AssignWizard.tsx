import { useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown, Eye } from "lucide-react";
import { selectedUsers, signatureResults, type RecipientSelection } from "../../data";
import { useCustomer, useStore } from "../../store";
import { Badge, Button, Card, Field, Input, Select } from "../../components/ui";
import { SignaturePreview } from "../../components/SignaturePreview";
import { RecipientPicker } from "../../components/RecipientPicker";
import { AssignmentChecks, AssignmentSummary, signatureChecks } from "../../components/Preflight";
import { BatchModal, type BatchJob } from "../../components/BatchModal";
import { StepHeading, WizardFrame } from "../../components/WizardFrame";

const timeZone = "Asia/Kolkata";

export function AssignWizard({
  customerId,
  templateId,
}: {
  customerId: string;
  templateId?: string;
}) {
  const { navigate } = useStore();
  const { customer, users, templates, assignments } = useCustomer(customerId);
  const usable = templates.filter((t) => t.html.trim());
  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState<RecipientSelection>({ all: false, ids: [] });
  const [pickedTemplate, setPickedTemplate] = useState(templateId ?? "");
  const [execution, setExecution] = useState<"manual" | "scheduled">("manual");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [time, setTime] = useState("09:00");
  const [previewId, setPreviewId] = useState("");
  const [error, setError] = useState("");
  const [job, setJob] = useState<BatchJob | null>(null);
  if (!customer) return null;

  const template = usable.find((t) => t.id === pickedTemplate);
  const recipients = selectedUsers(selection, users);
  const recipientCount = recipients.length;
  const entireDirectorySelected = users.length > 0 && recipientCount === users.length;
  const checks = signatureChecks(customer, template?.html ?? "", recipients, assignments);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone }).format(new Date());
  const target = selection.all
    ? `Entire directory · ${recipients.length} selected${selection.ids.length ? ` (${selection.ids.length} excluded)` : ""}`
    : recipients.length === 1
      ? recipients[0].email
      : `${recipients.length} selected users`;
  const selectionError = !template
    ? "Select a saved template."
    : !recipients.length
      ? "Select at least one user."
      : "";
  const scheduleError =
    execution === "scheduled" && (!start || !end || !time || start < today || end < start)
      ? "Enter a daily time and a date range that starts today or later."
      : "";
  const notify = template?.notify ?? [];
  const notifyWhen = template?.notifyWhen ?? "always";
  const notifyRows: [string, ReactNode][] = [
    [
      "Notifications",
      notify.length ? (
        <div>
          <p className="font-medium">
            {notifyWhen === "errors" ? "On failures only" : "After deployment"}
          </p>
          <ul className="mt-1 flex max-h-32 flex-col gap-1 overflow-auto overscroll-contain text-sm text-brio-muted">
            {notify.map((email) => (
              <li key={email}>{email}</li>
            ))}
          </ul>
        </div>
      ) : (
        "None"
      ),
    ],
  ];
  const exit = () => navigate({ name: "customer", id: customerId, tab: "signatures" });

  function back() {
    if (step > 0) goTo(step - 1);
    else if (templateId) navigate({ name: "template", customerId, templateId });
    else exit();
  }

  function goTo(next: number) {
    if (next > 0 && (selectionError || scheduleError)) {
      setError(selectionError || scheduleError);
    } else {
      setError("");
      setStep(next);
    }
    document.getElementById("main-scroll")?.scrollTo({ top: 0 });
  }

  function deploy() {
    if (
      !template ||
      selectionError ||
      execution !== "manual" ||
      checks.some((c) => c.status === "fail")
    )
      return;
    setJob({
      customerId,
      kind: "signature",
      name: template.name,
      detail: target,
      templateId: template.id,
      users: recipients,
      notification: notify.length ? { recipients: notify, when: notifyWhen } : undefined,
      run: () => {
        const results = signatureResults(recipients);
        const at = new Date().toISOString();
        return {
          results,
          changes: {
            assignments: Object.fromEntries(
              results
                .filter((r) => r.status === "applied")
                .map((r) => [
                  r.userId,
                  { templateId: template.id, templateName: template.name, html: template.html, at },
                ]),
            ),
          },
        };
      },
    });
  }

  return (
    <WizardFrame
      stepNumber={step + 2}
      onBack={back}
      onExit={step > 0 ? exit : undefined}
      fitTable={step === 0}
      footerRight={
        step === 0 ? (
          <>
            <p role="status" className="text-xs text-brio-muted">
              {entireDirectorySelected
                ? `Entire directory selected (${recipientCount.toLocaleString()})`
                : `${recipientCount.toLocaleString()} selected`}
            </p>
            <Button variant="primary" onClick={() => goTo(step + 1)}>
              Review assignment <ArrowRight className="size-4" aria-hidden />
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            disabled={execution === "scheduled" || checks.some((c) => c.status === "fail")}
            onClick={deploy}
          >
            Assign signature
          </Button>
        )
      }
    >
      {error && (
        <p role="alert" className="mb-4 shrink-0 text-sm text-brio-danger-ink">
          {error}
        </p>
      )}
      {step === 0 && (
        <Card className="@container flex min-h-min flex-1 flex-col">
          <section
            aria-label="Deployment setup"
            className="shrink-0 border-b border-brio-subtle p-5"
          >
            <div className="grid items-start gap-4 @min-[35rem]:grid-cols-2">
              <Field label="Template name" required>
                <Select
                  required
                  aria-invalid={Boolean(error && !template)}
                  value={pickedTemplate}
                  onChange={(event) => setPickedTemplate(event.target.value)}
                >
                  <option value="">Select a template</option>
                  {usable.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name || "Untitled template"}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="When to deploy">
                <Select
                  value={execution}
                  onChange={(event) =>
                    setExecution(event.target.value === "scheduled" ? "scheduled" : "manual")
                  }
                >
                  <option value="manual">Manual</option>
                  <option value="scheduled">Scheduled</option>
                </Select>
              </Field>
            </div>
            {execution === "scheduled" && (
              <div className="mt-4">
                <div className="grid items-start gap-4 @min-[35rem]:grid-cols-3">
                  <Field label="Start date" required>
                    <Input
                      required
                      type="date"
                      min={today}
                      value={start}
                      onInput={(event) => setStart(event.currentTarget.value)}
                    />
                  </Field>
                  <Field label="End date" required>
                    <Input
                      required
                      type="date"
                      min={start || today}
                      value={end}
                      onInput={(event) => setEnd(event.currentTarget.value)}
                    />
                  </Field>
                  <Field label="Daily time (IST)" required>
                    <Input
                      required
                      type="time"
                      value={time}
                      onInput={(event) => setTime(event.currentTarget.value)}
                    />
                  </Field>
                </div>
                <p className="mt-2 text-xs text-brio-muted">
                  Automatic deployment requires a connected scheduler.
                </p>
              </div>
            )}
          </section>
          <RecipientPicker users={users} selection={selection} onChange={setSelection} />
        </Card>
      )}
      {step === 1 && template && (
        <Card className="@container flex w-full min-w-0 flex-col gap-6 p-5">
          <div className="flex flex-col gap-2">
            <StepHeading
              title="Review assignment"
              className=""
              description="Review the assignment details and check for any issues before proceeding."
            />
            <p className="text-xs text-brio-muted">
              {execution === "scheduled"
                ? "Scheduling is unavailable. No deployment will be queued."
                : "This demo updates the local assignment records only. Gmail mailboxes and email notifications are unaffected."}
            </p>
          </div>
          <AssignmentSummary
            rows={[
              [
                "Template",
                <span className="font-semibold">{template.name || "Untitled template"}</span>,
              ],
              [
                recipients.length === 1 ? "Recipient" : "Recipients",
                recipients.length === 1 ? (
                  target
                ) : (
                  <details>
                    <summary className="cursor-pointer rounded-brio-control font-medium focus-visible:outline-2 focus-visible:outline-brio-focus">
                      {target}
                    </summary>
                    <ul className="mt-3 flex max-h-44 flex-col gap-2 overflow-auto overscroll-contain rounded-brio-control border border-brio-subtle bg-brio-surface p-3 text-sm text-brio-muted">
                      {recipients.map((u) => (
                        <li key={u.id}>{u.email}</li>
                      ))}
                    </ul>
                  </details>
                ),
              ],
              [
                "Deployment",
                <div>
                  <Badge>{execution === "manual" ? "Manual" : "Scheduled"}</Badge>
                  {execution === "scheduled" && (
                    <p className="mt-2 text-brio-muted">
                      Daily at {time} IST
                      <span className="block">
                        {start} to {end}
                      </span>
                    </p>
                  )}
                </div>,
              ],
              ...notifyRows,
            ]}
          />
          <div className="border-t border-brio-subtle pt-5">
            <AssignmentChecks checks={checks} />
          </div>
          <details open className="group min-w-0 border-t border-brio-subtle pt-4">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-brio-control text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brio-focus [&::-webkit-details-marker]:hidden">
              <Eye className="size-4 text-brio-muted" aria-hidden />
              Preview email
              <ChevronDown
                className="ml-auto size-4 text-brio-muted group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="mt-3 max-h-[min(60dvh,36rem)] overflow-auto overscroll-contain rounded-brio-panel border border-brio-subtle">
              <SignaturePreview
                title=""
                html={template.html}
                customer={customer}
                users={recipients}
                userId={
                  recipients.some((u) => u.id === previewId) ? previewId : (recipients[0]?.id ?? "")
                }
                onUserChange={setPreviewId}
              />
            </div>
          </details>
          <p className="text-xs text-brio-muted">
            {execution === "scheduled"
              ? "Connect a scheduler to enable scheduled assignments."
              : `Confirming assigns this signature to ${recipientCount.toLocaleString()} selected ${recipientCount === 1 ? "recipient" : "recipients"} in the demo records. Suspended accounts are skipped.`}
          </p>
        </Card>
      )}
      <BatchModal
        job={job}
        onClose={() => {
          setJob(null);
          exit();
        }}
      />
    </WizardFrame>
  );
}
