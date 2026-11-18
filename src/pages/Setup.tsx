import { useState, type FormEvent } from "react";
import { CheckCircle2, FileKey2, Loader2, ShieldAlert } from "lucide-react";
import { useStore } from "../store";
import { Button, Card } from "../components/ui";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "../components/ui/field";
import { Input } from "../components/ui/input";

const required = ["type", "project_id", "private_key_id", "private_key", "client_email", "client_id", "token_uri"] as const;

export function SetupPage() {
  const { verifyConnection, previewWorkspace } = useStore();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!file) return setError("Choose a service account JSON file.");
    if (file.size > 64 * 1024 || !file.name.toLowerCase().endsWith(".json"))
      return setError("Choose a JSON credential file smaller than 64 KB.");
    try {
      const value: unknown = JSON.parse(await file.text());
      if (!value || typeof value !== "object" || required.some((key) => typeof (value as Record<string, unknown>)[key] !== "string" || !(value as Record<string, string>)[key].trim()) || (value as Record<string, unknown>).type !== "service_account") {
        return setError("This is not a valid Google service account credential file. Check its required fields and try again.");
      }
    } catch {
      return setError("The selected file is not valid JSON. Export the service account key again and retry.");
    }
    setBusy(true);
    const connectionError = await verifyConnection(file);
    setBusy(false);
    if (connectionError) setError(connectionError);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-4 sm:py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brio-muted">First-time setup</p>
        <h2 className="mt-2 text-2xl font-semibold text-brio-ink">Connect your Workspace</h2>
        <p className="mt-2 text-sm text-brio-muted">Upload a Google service account key so Brio can verify access to your organization's Workspace.</p>
      </div>
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <FileKey2 className="mt-1 size-5 shrink-0 text-brio-ink" aria-hidden />
          <div>
            <h3 className="text-base font-semibold">What you need</h3>
            <p className="mt-2 text-sm leading-6 text-brio-muted">A service account JSON key with domain-wide delegation enabled. Your Workspace administrator must authorize the scopes Brio needs for directory, Gmail signature, delegate, forwarding, and vacation operations.</p>
            <p className="mt-2 text-sm leading-6 text-brio-muted">The file must contain the standard Google service account fields, including the private key and client email. A file upload alone does not connect the Workspace.</p>
          </div>
        </div>
      </Card>
      <Card className="p-5 sm:p-6">
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="credentials">Service account JSON <span className="text-brio-danger-ink">*</span></FieldLabel>
              <Input id="credentials" type="file" accept=".json,application/json" aria-invalid={Boolean(error)} aria-describedby="credential-help" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); }} />
              <FieldDescription id="credential-help">JSON file, up to 64 KB. The key is held only for this verification attempt.</FieldDescription>
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
                {busy ? "Verifying connection…" : "Verify connection"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </Card>
      <div className="rounded-brio-panel border border-brio-border bg-brio-warning-bg p-4 text-sm text-brio-ink">
        <div className="flex gap-2"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden /><div><p className="font-semibold">Local preview limitation</p><p className="mt-1 leading-6">This repository has no customer authentication or secure Workspace backend. Verification remains unavailable until those services are connected. Do not upload a real key to this local preview.</p></div></div>
        <Button className="mt-3" onClick={previewWorkspace}>Preview demo Workspace</Button>
      </div>
    </div>
  );
}
