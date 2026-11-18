import { useRef, useState } from "react";
import { Download, FileUp, X } from "lucide-react";
import { selectedUsers, type DirectoryUser, type RecipientSelection } from "../data";
import { parseRecipientCsv } from "../recipientCsv";
import { Button, IconButton } from "./ui";
import { UserTable } from "./UserTable";

export function RecipientPicker({
  users,
  selection,
  onChange,
  directoryUsers,
  onImportingChange,
}: {
  users: DirectoryUser[];
  selection: RecipientSelection;
  onChange: (s: RecipientSelection) => void;
  directoryUsers?: DirectoryUser[];
  onImportingChange?: (busy: boolean) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{
    name: string;
    result: ReturnType<typeof parseRecipientCsv>;
  } | null>(null);
  const [error, setError] = useState("");
  const pickingDelegates = directoryUsers !== undefined;
  const count = pickingDelegates ? selectedUsers(selection, users).length : 0;
  const entire = users.length > 0 && count === users.length;

  async function importFile(input: File) {
    setError("");
    setReport(null);
    if (!/\.csv$/i.test(input.name) || input.size > 2 * 1024 * 1024) {
      setError("Choose a CSV file no larger than 2 MB. Your selection is unchanged.");
      return;
    }
    const inputElement = file.current;
    setBusy(true);
    onImportingChange?.(true);
    try {
      const eligibleUsers = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));
      const directoryEmails = new Set(directoryUsers?.map((user) => user.email.toLowerCase()));
      const result = parseRecipientCsv(await input.text(), eligibleUsers, directoryEmails);
      if (file.current !== inputElement) return;
      if (result.ids.length) onChange({ all: false, ids: result.ids });
      setReport({ name: input.name, result });
    } catch (err) {
      if (file.current !== inputElement) return;
      setError(
        (err instanceof Error ? err.message : "Could not read the CSV.") +
          " Your selection is unchanged.",
      );
    } finally {
      if (file.current === inputElement) {
        setBusy(false);
        onImportingChange?.(false);
      }
    }
  }

  function downloadSample() {
    const url = URL.createObjectURL(
      new Blob([["email", ...users.slice(0, 3).map((u) => u.email)].join("\r\n")], {
        type: "text/csv",
      }),
    );
    Object.assign(document.createElement("a"), {
      href: url,
      download: pickingDelegates ? "delegates.csv" : "signature-recipients.csv",
    }).click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const upload = (
    <Button
      variant={pickingDelegates ? "secondary" : "primary"}
      disabled={!users.length || busy}
      icon={<FileUp className="size-4" />}
      onClick={() => file.current?.click()}
    >
      {busy ? "Reading CSV…" : "Upload CSV"}
    </Button>
  );

  return (
    <div className="flex min-h-min min-w-0 flex-1 flex-col">
      <input
        ref={file}
        type="file"
        aria-label={pickingDelegates ? "Delegate CSV" : "Recipient CSV"}
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const input = e.target.files?.[0];
          if (input) void importFile(input);
          e.target.value = "";
        }}
      />
      <UserTable
        embedded
        tableLabel={pickingDelegates ? "Eligible delegates" : undefined}
        emptyTitle={pickingDelegates ? "No eligible delegates" : undefined}
        emptyDescription={
          pickingDelegates
            ? "Only active users without access to this mailbox can be added."
            : undefined
        }
        heading={
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">
                {pickingDelegates ? "Eligible delegates" : "Signature recipients"}
              </h2>
              <p className="mt-1 text-xs text-brio-muted">
                Importing a CSV with an email column replaces the current selection.
              </p>
            </div>
            {pickingDelegates && (
              <p aria-live="polite" aria-atomic="true" className="text-sm text-brio-muted">
                <strong className="font-semibold tabular-nums text-brio-ink">
                  {count.toLocaleString()}
                </strong>{" "}
                of {users.length.toLocaleString()} selected
              </p>
            )}
          </div>
        }
        users={users}
        selection={selection}
        onSelectionChange={onChange}
        showOrgUnitFilter={pickingDelegates}
        limitSelectionTableHeight={pickingDelegates}
        filterAction={pickingDelegates ? undefined : upload}
        toolbarActions={
          <>
            {pickingDelegates && (
              <Button
                variant="ghost"
                disabled={!users.length || busy}
                onClick={() => onChange(entire ? { all: false, ids: [] } : { all: true, ids: [] })}
              >
                {entire ? "Clear selection" : "Select all eligible users"}
              </Button>
            )}
            <IconButton
              label="Download sample CSV"
              disabled={!users.length}
              onClick={downloadSample}
            >
              <Download className="size-4" />
            </IconButton>
            {pickingDelegates && upload}
          </>
        }
        banner={
          <>
            {error && (
              <p
                role="alert"
                className="mb-3 rounded-brio-control bg-brio-danger-bg px-3 py-2 text-sm text-brio-danger-ink"
              >
                {error}
              </p>
            )}
            {report && (
              <div
                role="status"
                className="mb-3 flex items-start justify-between gap-3 rounded-brio-control border border-brio-subtle bg-brio-surface px-3 py-2 text-sm"
              >
                <div className="min-w-0 [overflow-wrap:anywhere]">
                  <p>
                    <strong>{report.name}</strong>: {report.result.ids.length} matched ·{" "}
                    {report.result.invalid} invalid · {report.result.duplicates} duplicate ·{" "}
                    {report.result.unmatched.length} unmatched
                    {report.result.ineligible.length > 0 &&
                      ` · ${report.result.ineligible.length} ineligible`}
                  </p>
                  {!report.result.ids.length && (
                    <p className="text-brio-muted">Your selection is unchanged.</p>
                  )}
                  {!!report.result.unmatched.length && (
                    <p className="text-xs text-brio-muted">
                      Unmatched: {report.result.unmatched.slice(0, 3).join(", ")}
                      {report.result.unmatched.length > 3 ? "…" : ""}
                    </p>
                  )}
                  {report.result.ineligible.length > 0 && (
                    <p className="text-xs text-brio-muted">
                      Ineligible: {report.result.ineligible.slice(0, 3).join(", ")}
                      {report.result.ineligible.length > 3 ? "…" : ""}
                    </p>
                  )}
                </div>
                <IconButton label="Dismiss CSV results" onClick={() => setReport(null)}>
                  <X className="size-4" />
                </IconButton>
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
