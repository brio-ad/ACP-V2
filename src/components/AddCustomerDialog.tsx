import { useId, useRef, useState, type FormEvent } from "react";
import { useStore } from "../store";
import { Button, Modal } from "./ui";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";

const scopes = [
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/gmail.settings.sharing",
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.directory.domain.readonly",
].join(",");

export async function readServiceAccountEmail(file: File) {
  if (!file.name.toLowerCase().endsWith(".json") || file.size > 64 * 1024) {
    throw new Error("Choose a service account JSON key file under 64 KB.");
  }

  let key: unknown;
  try {
    key = JSON.parse(await file.text());
  } catch {
    throw new Error("The selected file contains invalid JSON.");
  }

  const account = key as Record<string, unknown> | null;
  if (
    !account ||
    account.type !== "service_account" ||
    typeof account.client_email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.gserviceaccount\.com$/i.test(account.client_email) ||
    typeof account.client_id !== "string" ||
    !/^\d+$/.test(account.client_id) ||
    typeof account.private_key !== "string"
  ) {
    throw new Error("Choose a Google Cloud service account key with a client ID and private key.");
  }

  const pem = account.private_key.trim();
  const begin = "-----BEGIN PRIVATE KEY-----";
  const end = "-----END PRIVATE KEY-----";
  try {
    if (!pem.startsWith(begin) || !pem.endsWith(end)) throw new Error();
    const bytes = Uint8Array.from(
      atob(pem.slice(begin.length, -end.length).replace(/\s/g, "")),
      (character) => character.charCodeAt(0),
    );
    await crypto.subtle.importKey(
      "pkcs8",
      bytes,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
  } catch {
    throw new Error("The JSON file does not contain a valid RSA private key.");
  }

  return account.client_email;
}

export function AddCustomerDialog({ onClose }: { onClose: () => void }) {
  const { addCustomer, navigate, toast } = useStore();
  const formId = useId();
  const scopesId = `${formId}-scopes`;
  const keyId = `${formId}-key`;
  const emailId = `${formId}-email`;
  const nameId = `${formId}-name`;
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; field?: "key" | "email" } | null>(null);
  const keyError = error?.field === "key" ? error.message : undefined;
  const emailError = error?.field === "email" ? error.message : undefined;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    setError(null);

    const form = new FormData(event.currentTarget);
    const contactEmail = String(form.get("admin_email") ?? "").trim();
    const domain = contactEmail.split("@").at(-1)?.toLowerCase() ?? "";
    const name = String(form.get("display_name") ?? "").trim() || domain;
    const file = form.get("service_account_key");

    if (
      !/^[^\s@]+@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(
        contactEmail,
      )
    ) {
      setError({
        field: "email",
        message: "Enter an admin email in the customer's Workspace domain.",
      });
      return;
    }
    if (!(file instanceof File) || !file.size) {
      setError({ field: "key", message: "Choose the customer's service account JSON key." });
      return;
    }

    saving.current = true;
    setBusy(true);
    try {
      let serviceAccount: string;
      try {
        serviceAccount = await readServiceAccountEmail(file);
      } catch (error) {
        setError({
          field: "key",
          message:
            error instanceof Error ? error.message : "Unable to read the service account key.",
        });
        return;
      }
      const customer = addCustomer({ name, domain, serviceAccount, contactEmail });
      if (!customer) {
        setError({
          field: "email",
          message: "A customer with this Workspace domain already exists.",
        });
        return;
      }
      onClose();
      toast("Customer added. Workspace setup is pending.");
      navigate({ name: "customer", id: customer.id });
    } catch (error) {
      setError({ message: error instanceof Error ? error.message : "Unable to add the customer." });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={() => {
        if (!saving.current) onClose();
      }}
      title="Add a customer"
      width="max-w-2xl"
      footer={
        <>
          <Button disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" disabled={busy}>
            {busy ? "Adding customer…" : "Add customer"}
          </Button>
        </>
      }
    >
      <details open className="rounded-brio-control border border-brio-subtle bg-canvas p-4">
        <summary className="cursor-pointer rounded-brio-control font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brio-focus">
          What the customer must set up first
        </summary>
        <Field className="mt-3">
          <FieldLabel htmlFor={scopesId}>Scopes</FieldLabel>
          <Input
            id={scopesId}
            className="font-mono"
            value={scopes}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
        </Field>
        <ol className="mt-3 flex list-decimal flex-col gap-1 pl-5 text-sm text-brio-muted">
          <li>
            Enable the Gmail API and the Admin SDK API in the customer's Google Cloud project.
          </li>
          <li>
            In the Google Admin console, go to Security → Access and data control → API controls →
            Manage Domain Wide Delegation → Add new. Enter the service account client ID and the
            scopes above.
          </li>
          <li>
            Use a super admin email or an admin allowed to read users and domains in that Workspace.
          </li>
          <li>
            Delegation can take a few minutes to start working. If it doesn't work right away, try
            again after a few minutes.
          </li>
        </ol>
      </details>
      <form id={formId} onSubmit={submit} className="mt-5">
        <FieldGroup>
          <Field data-disabled={busy} data-invalid={Boolean(keyError)}>
            <FieldLabel htmlFor={keyId}>
              Service account JSON key{" "}
              <span aria-hidden className="text-brio-danger-ink">
                *
              </span>
            </FieldLabel>
            <Input
              id={keyId}
              name="service_account_key"
              type="file"
              accept=".json,application/json"
              required
              disabled={busy}
              aria-invalid={keyError ? true : undefined}
              aria-describedby={keyError ? `${keyId}-error` : undefined}
              onChange={() => {
                if (keyError) setError(null);
              }}
            />
            {keyError && <FieldError id={`${keyId}-error`}>{keyError}</FieldError>}
          </Field>
          <Field data-disabled={busy} data-invalid={Boolean(emailError)}>
            <FieldLabel htmlFor={emailId}>
              Admin email (in the customer's Workspace){" "}
              <span aria-hidden className="text-brio-danger-ink">
                *
              </span>
            </FieldLabel>
            <Input
              id={emailId}
              name="admin_email"
              type="email"
              autoComplete="off"
              placeholder="admin@customer.com"
              required
              disabled={busy}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? `${emailId}-error` : undefined}
              onChange={() => {
                if (emailError) setError(null);
              }}
            />
            {emailError && <FieldError id={`${emailId}-error`}>{emailError}</FieldError>}
          </Field>
          <Field data-disabled={busy}>
            <FieldLabel htmlFor={nameId}>
              Display name <span className="text-xs font-normal text-brio-muted">Optional</span>
            </FieldLabel>
            <Input
              id={nameId}
              name="display_name"
              maxLength={120}
              disabled={busy}
              aria-describedby={`${nameId}-hint`}
            />
            <FieldDescription id={`${nameId}-hint`}>
              Defaults to the Workspace domain while setup is pending.
            </FieldDescription>
          </Field>
          <FieldDescription>
            The customer is saved as Setup pending. The key is checked locally and discarded.
          </FieldDescription>
          {error && !error.field && <FieldError>{error.message}</FieldError>}
        </FieldGroup>
      </form>
    </Modal>
  );
}
