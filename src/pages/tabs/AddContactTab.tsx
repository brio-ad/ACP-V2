import { useMemo, useState, type FormEvent } from "react";
import { ContactRound, Plus } from "lucide-react";
import { RecordsHeading, RecordsTable, RecordsViewport } from "../../components/RecordsTable";
import { TablePagination, useTablePage } from "../../components/TablePagination";
import { Button, Card, EmptyState, Field, Input, Modal, SearchInput } from "../../components/ui";
import { useStore, type CustomerScope } from "../../store";

const emptyForm = { name: "", organization: "", email: "", mobile: "" };

export function AddContactTab({ scope }: { scope: CustomerScope }) {
  const { customer, externalContacts } = scope;
  const { addExternalContact, toast } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const contacts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...externalContacts]
      .filter(
        (contact) =>
          !needle ||
          [contact.name, contact.organization, contact.email, contact.mobile].some((value) =>
            value.toLowerCase().includes(needle),
          ),
      )
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [externalContacts, query]);
  const { visibleRows, pagination, resetPage, viewportRef } = useTablePage(contacts);

  function showForm() {
    setForm(emptyForm);
    setError("");
    setOpen(true);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = addExternalContact({ customerId: customer.id, ...form });
    if (result !== "added") {
      setError(
        result === "directory"
          ? "This email belongs to the workspace directory. Find this person in User Management."
          : result === "duplicate"
            ? "A shared contact with this email or mobile number already exists."
            : "Enter a name, an optional valid external email, and a mobile number with 7–15 digits.",
      );
      return;
    }
    setOpen(false);
    resetPage();
    toast("Shared contact added");
  }

  return (
    <>
      <Card className="@container flex min-h-min min-w-0 flex-1 flex-col overflow-hidden">
        <div className="records-toolbar flex shrink-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <RecordsHeading
              title="Shared Contacts"
              description="Keep client points of contact here. Directory users are available in User Management."
            />
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={showForm}>
              Add shared contact
            </Button>
          </div>
          <SearchInput
            label="Search shared contacts"
            placeholder="Search name, organization, email, or mobile"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
            }}
            className="w-full sm:max-w-sm"
          />
        </div>
        {contacts.length ? (
          <RecordsViewport ref={viewportRef} fill>
            <RecordsTable aria-label="Shared contacts" className="table-fixed">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col" className="hidden @min-[42rem]:table-cell">
                    Organization
                  </th>
                  <th scope="col" className="hidden @min-[34rem]:table-cell">
                    Work email
                  </th>
                  <th scope="col">Mobile</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((contact) => (
                  <tr key={contact.id}>
                    <td className="[overflow-wrap:anywhere]">
                      <p className="font-medium">{contact.name}</p>
                      <p className="mt-1 text-xs text-brio-muted @min-[34rem]:hidden">
                        {contact.email || "—"}
                      </p>
                      {contact.organization && (
                        <p className="mt-1 text-xs text-brio-muted @min-[42rem]:hidden">
                          {contact.organization}
                        </p>
                      )}
                    </td>
                    <td className="hidden [overflow-wrap:anywhere] @min-[42rem]:table-cell">
                      {contact.organization || "—"}
                    </td>
                    <td className="hidden [overflow-wrap:anywhere] @min-[34rem]:table-cell">
                      {contact.email || "—"}
                    </td>
                    <td className="[overflow-wrap:anywhere]">
                      <a
                        href={`tel:${contact.mobile.replace(/[^\d+]/g, "")}`}
                        className="rounded-brio-control text-brio-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brio-focus"
                      >
                        {contact.mobile}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </RecordsTable>
          </RecordsViewport>
        ) : (
          <EmptyState
            icon={<ContactRound className="size-5" />}
            title={externalContacts.length ? "No matching contacts" : "No shared contacts yet"}
            description={
              externalContacts.length
                ? "Try a different search."
                : "Add a client point of contact to keep their mobile number close at hand."
            }
            action={
              !externalContacts.length ? <Button onClick={showForm}>Add shared contact</Button> : undefined
            }
          />
        )}
        {contacts.length > 0 && (
          <TablePagination label="Shared contact pagination" noun="contact" {...pagination} />
        )}
      </Card>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add shared contact"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="external-contact-form">
              Add shared contact
            </Button>
          </>
        }
      >
        <form id="external-contact-form" onSubmit={save} className="space-y-4">
          <Field label="Name" required>
            <Input
              data-dialog-autofocus
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              autoComplete="name"
              required
              maxLength={120}
            />
          </Field>
          <Field label="Organization" optional>
            <Input
              value={form.organization}
              onChange={(event) => setForm({ ...form, organization: event.target.value })}
              autoComplete="organization"
              maxLength={120}
            />
          </Field>
          <Field label="Work email" optional>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              autoComplete="email"
              maxLength={254}
            />
          </Field>
          <Field label="Mobile number" required>
            <Input
              type="tel"
              value={form.mobile}
              onChange={(event) => setForm({ ...form, mobile: event.target.value })}
              autoComplete="tel"
              required
              maxLength={32}
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-brio-danger-ink">
              {error}
            </p>
          )}
          <p className="text-xs text-brio-muted">
            Saved in this browser’s workspace preview; this does not create a Google Workspace
            contact.
          </p>
        </form>
      </Modal>
    </>
  );
}
