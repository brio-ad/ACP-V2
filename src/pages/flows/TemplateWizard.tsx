import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { newTemplate, type Template } from "../../data";
import { useCustomer, useStore } from "../../store";
import { ActionFooter, FooterStep } from "../../components/FormLayout";
import { SignatureEditor } from "../../components/SignatureEditor";
import { SignaturePreview } from "../../components/SignaturePreview";
import { Button, Card, Field, Input, Textarea } from "../../components/ui";
import { NotifyPicker } from "./NotifyPicker";
const DESCRIPTION_LIMIT = 250;

export function TemplateWizard({
  customerId,
  templateId,
}: {
  customerId: string;
  templateId: string;
}) {
  const { navigate, saveTemplate, toast } = useStore();
  const { customer, users, templates } = useCustomer(customerId);
  const existing = templates.find((t) => t.id === templateId);
  const [draft, setDraft] = useState(() => existing ?? newTemplate(customerId, templateId));
  const [previewId, setPreviewId] = useState(
    users.find((u) => u.status === "active")?.id ?? users[0]?.id ?? "",
  );
  const [attempted, setAttempted] = useState(false);
  const update = (patch: Partial<Template>) => setDraft((previous) => ({ ...previous, ...patch }));
  const exit = () => navigate({ name: "customer", id: customerId, tab: "signatures" });
  if (!customer) return null;

  const hasSignature =
    /<img\b/i.test(draft.html) || Boolean(draft.html.replace(/<[^>]*>|&nbsp;|&#160;/gi, "").trim());
  const error = !draft.name.trim()
    ? "Enter a template name."
    : draft.description.length > DESCRIPTION_LIMIT
      ? "Shorten the description to 250 characters."
      : !hasSignature
        ? "Enter a signature."
        : undefined;

  function save(assign: boolean) {
    setAttempted(true);
    if (error) return;
    const { id, customerId, name, description, html, notify, notifyWhen, updatedAt } = draft;
    saveTemplate({
      id,
      customerId,
      name: name.trim(),
      description: description.trim(),
      html,
      notify,
      notifyWhen,
      updatedAt,
    });
    toast(existing ? "Template updated" : "Template saved");
    if (assign) navigate({ name: "assign", customerId, templateId: draft.id });
    else exit();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-canvas">
      <div className="min-w-0 flex-1 p-5">
        <Card className="@container flex w-full min-w-0 flex-col gap-5 p-5">
          <section aria-labelledby="template-details">
            <h2 id="template-details" className="mb-4 text-base font-semibold text-brio-ink">
              Template Details
            </h2>
            <div className="grid min-w-0 items-start gap-4 @min-[36rem]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <Field
                label="Template name"
                required
                error={attempted && !draft.name.trim() ? error : undefined}
              >
                <Input
                  required
                  aria-invalid={attempted && !draft.name.trim()}
                  value={draft.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </Field>
              <Field
                label="Description"
                optional
                hint={draft.description.length + " / " + DESCRIPTION_LIMIT + " characters"}
                error={
                  attempted && draft.description.length > DESCRIPTION_LIMIT ? error : undefined
                }
              >
                <Textarea
                  rows={1}
                  maxLength={DESCRIPTION_LIMIT}
                  className="h-10 resize-none"
                  aria-invalid={attempted && draft.description.length > DESCRIPTION_LIMIT}
                  value={draft.description}
                  onChange={(e) => update({ description: e.target.value })}
                />
              </Field>
            </div>
          </section>
          <SignatureEditor
            html={draft.html}
            onChange={(html) => update({ html })}
            preview={
              <SignaturePreview
                signatureOnly
                title="Preview"
                html={draft.html}
                customer={customer}
                users={users}
                userId={previewId}
                onUserChange={setPreviewId}
              />
            }
          />
          <section aria-labelledby="template-notifications">
            <h2 id="template-notifications" className="text-base font-semibold text-brio-ink">
              Notifications
            </h2>
            <p className="mt-1 mb-4 text-sm text-brio-muted">
              Default recipients for deployments using this template. Email delivery is unavailable
              in this demo.
            </p>
            <NotifyPicker
              customer={customer}
              users={users}
              value={draft.notify}
              onChange={(notify) => update({ notify })}
              timing={draft.notifyWhen}
              onTimingChange={(notifyWhen) => update({ notifyWhen })}
            />
          </section>
        </Card>
      </div>
      <ActionFooter
        left={<Button onClick={exit}>Cancel</Button>}
        center={
          <>
            <FooterStep number={1} />
            {attempted && error && (
              <p role="alert" className="mt-1 text-center text-brio-danger-ink">
                {error}
              </p>
            )}
          </>
        }
        right={
          <>
            <Button onClick={() => save(false)}>
              {existing ? "Save changes" : "Save as Template"}
            </Button>
            <Button variant="primary" onClick={() => save(true)}>
              Next <ArrowRight className="size-4" aria-hidden />
            </Button>
          </>
        }
      />
    </div>
  );
}
