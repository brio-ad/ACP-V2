import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { Plus, UsersRound, X } from "lucide-react";
import { useCustomer, useStore, type AccessRole } from "../store";
import { UserTable } from "../components/UserTable";
import { Badge, Button, Card, EmptyState, Modal, Select, cx } from "../components/ui";
import { Field, FieldError, FieldGroup, FieldLabel } from "../components/ui/field";
import { Input } from "../components/ui/input";

const roleLabel: Record<AccessRole, string> = { "super-admin": "Super Admin", admin: "Admin" };

export function UserManagementPage() {
  const { agent, data, accessGrants, grantAccess, toast } = useStore();
  const scope = useCustomer(data.customers[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState("");
  const [resultsOpen, setResultsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [role, setRole] = useState<AccessRole>("admin");
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId() + "-directory-results";
  const canManage = accessGrants.some((grant) => grant.email === agent?.email.toLowerCase() && grant.role === "super-admin");
  const byEmail = useMemo(() => new Map(accessGrants.map((grant) => [grant.email, grant])), [accessGrants]);
  const available = useMemo(() => {
    return scope.users
      .filter((user) => user.status === "active" && !byEmail.has(user.email.toLowerCase()))
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  }, [scope.users, byEmail]);
  const selectedUser = scope.users.find((user) => user.id === userId);
  const term = query.trim().toLowerCase();
  const matches = available.filter((user) => !term || `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(term));
  const shownMatches = matches.slice(0, 8);

  function selectUser(id: string) {
    setUserId(id);
    setQuery("");
    setResultsOpen(false);
    setActiveIndex(-1);
    setError("");
  }

  function close() {
    setOpen(false);
    setError("");
    setUserId("");
    setQuery("");
    setResultsOpen(false);
    setActiveIndex(-1);
    setRole("admin");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!userId) return setError("Choose a user from the Workspace directory.");
    const result = grantAccess(userId, role);
    if (result === "duplicate") return setError("This user already has ACP access.");
    if (result === "invalid-user") return setError("Choose an active directory user and try again.");
    if (result === "forbidden") return setError("Only a Super Admin can grant ACP access.");
    close();
    toast(`${roleLabel[role]} access added in the local ACP preview.`, "info");
  }

  if (!scope.customer) {
    return <Card><EmptyState icon={<UsersRound className="size-5" />} title="Workspace unavailable" description="Connect or preview a Workspace to manage ACP access." /></Card>;
  }

  return (
    <div className="flex min-h-min min-w-0 flex-1 flex-col">
      <UserTable
        users={scope.users}
        filterAction={<Button variant="primary" icon={<Plus className="size-4" />} disabled={!canManage} title={!canManage ? "Only a Super Admin can add ACP users" : undefined} onClick={() => setOpen(true)}>Add user</Button>}
        extraColumns={[{
          header: "ACP role",
          render: (user) => {
            const grant = byEmail.get(user.email.toLowerCase());
            return grant ? <Badge tone="slate">{roleLabel[grant.role]}</Badge> : <span className="text-brio-muted">No access</span>;
          },
        }]}
        emptyTitle="No users in this Workspace"
        emptyDescription="The Workspace directory will appear here when it is available."
      />

      <Modal
        open={open}
        onClose={close}
        title="Add ACP user"
        footer={<><Button onClick={close}>Cancel</Button><Button type="submit" form="grant-access-form" variant="primary">Grant access</Button></>}
      >
        <form id="grant-access-form" onSubmit={submit} noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="access-user">Directory user <span className="text-brio-danger-ink">*</span></FieldLabel>
              <Input
                ref={searchRef}
                id="access-user"
                data-dialog-autofocus
                type="search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={resultsOpen}
                aria-controls={resultsOpen ? listId : undefined}
                aria-activedescendant={resultsOpen && activeIndex >= 0 && shownMatches[activeIndex] ? `${listId}-${activeIndex}` : undefined}
                aria-invalid={Boolean(error)}
                autoComplete="off"
                value={query}
                placeholder="Search by name or email"
                onFocus={() => setResultsOpen(true)}
                onClick={() => setResultsOpen(true)}
                onBlur={() => requestAnimationFrame(() => {
                  if (document.activeElement !== searchRef.current) { setResultsOpen(false); setActiveIndex(-1); }
                })}
                onChange={(event) => { setQuery(event.target.value); setResultsOpen(true); setActiveIndex(-1); setError(""); }}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && resultsOpen) { event.preventDefault(); event.stopPropagation(); setResultsOpen(false); setActiveIndex(-1); return; }
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setResultsOpen(true);
                    setActiveIndex((current) => event.key === "ArrowDown" ? Math.min(current + 1, shownMatches.length - 1) : current < 0 ? shownMatches.length - 1 : Math.max(0, current - 1));
                  } else if (event.key === "Enter" && resultsOpen && shownMatches.length) {
                    event.preventDefault();
                    selectUser(shownMatches[activeIndex >= 0 ? activeIndex : 0].id);
                  }
                }}
              />
              {resultsOpen && (
                <ul id={listId} role="listbox" aria-label="Directory users" className="mt-2 max-h-48 overflow-y-auto rounded-brio-control border border-brio-border bg-brio-surface p-1">
                  {shownMatches.map((user, index) => (
                    <li
                      key={user.id}
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectUser(user.id)}
                      className={cx("cursor-pointer rounded-brio-control px-3 py-2 hover:bg-brio-hover", index === activeIndex && "bg-brio-hover")}
                    >
                      <span className="block text-sm font-medium text-brio-ink">{user.firstName} {user.lastName}</span>
                      <span className="block text-xs text-brio-muted">{user.email}</span>
                    </li>
                  ))}
                  {!shownMatches.length && <li className="px-3 py-2 text-sm text-brio-muted">No matching users</li>}
                  {matches.length > shownMatches.length && <li className="px-3 py-2 text-xs text-brio-muted">Keep typing to narrow the results.</li>}
                </ul>
              )}
              {selectedUser && (
                <div className="mt-2 inline-flex max-w-full self-start items-center gap-2 rounded-full border border-brio-border bg-brio-hover py-1 pr-1 pl-3 text-sm">
                  <span className="min-w-0 truncate" title={selectedUser.email}>{selectedUser.firstName} {selectedUser.lastName} · {selectedUser.email}</span>
                  <button type="button" aria-label={`Remove ${selectedUser.firstName} ${selectedUser.lastName}`} onClick={() => { setUserId(""); setQuery(""); setResultsOpen(true); setError(""); requestAnimationFrame(() => searchRef.current?.focus()); }} className="grid size-8 shrink-0 place-items-center rounded-full text-brio-muted hover:bg-brio-subtle hover:text-brio-ink focus-visible:outline-2 focus-visible:outline-brio-focus"><X className="size-4" aria-hidden /></button>
                </div>
              )}
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="access-role">Role <span className="text-brio-danger-ink">*</span></FieldLabel>
              <Select id="access-role" value={role} onChange={(event) => setRole(event.target.value as AccessRole)}>
                <option value="admin">Admin</option>
                <option value="super-admin">Super Admin</option>
              </Select>
            </Field>
          </FieldGroup>
        </form>
      </Modal>
    </div>
  );
}
