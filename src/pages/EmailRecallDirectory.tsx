import { useEffect, useRef, useState } from "react";
import { MailSearch } from "lucide-react";
import type { WorkspaceUser } from "../emailRecallApi";
import { useEmailRecallClient } from "../emailRecallDemo";
import { RecordsHeading, RecordsTable, RecordsViewport } from "../components/RecordsTable";
import { TablePagination, useTablePage } from "../components/TablePagination";
import { Badge, Button, Card, EmptyState, Input, SearchInput, Select } from "../components/ui";
import { useStore } from "../store";

type DirectoryState = {
  users: WorkspaceUser[];
  next?: string;
  query: string;
  status: string;
  unit: string;
};
let previousDirectory: DirectoryState = { users: [], query: "", status: "", unit: "" };
const uniqueById = <T extends { id: string }>(items: T[]) =>
  Array.from(new Map(items.map((item) => [item.id, item])).values());
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "The request failed. Please try again.";

export function EmailRecallDirectory({ workspaceId = "c_brio" }: { workspaceId?: string }) {
  const { navigate } = useStore();
  const { api } = useEmailRecallClient();
  const [users, setUsers] = useState(previousDirectory.users);
  const [next, setNext] = useState(previousDirectory.next);
  const [query, setQuery] = useState(previousDirectory.query);
  const [status, setStatus] = useState(previousDirectory.status);
  const [unit, setUnit] = useState(previousDirectory.unit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorToken, setErrorToken] = useState<string>();
  const request = useRef(0);
  const preserveInitial = useRef(previousDirectory.users.length > 0);
  const criteria = `${query}\u0000${status}\u0000${unit}`;
  const criteriaRef = useRef(criteria);
  criteriaRef.current = criteria;
  const { visibleRows, viewportRef, pagination } = useTablePage(users);

  useEffect(() => {
    previousDirectory = { users, next, query, status, unit };
  }, [users, next, query, status, unit]);

  async function loadUsers(token?: string) {
    const id = ++request.current;
    const requestedCriteria = criteria;
    setLoading(true);
    setError("");
    setErrorToken(undefined);
    if (!token) {
      setUsers([]);
      setNext(undefined);
    }
    try {
      const page = await api.users({ pageToken: token, query, status, orgUnit: unit });
      if (id !== request.current || requestedCriteria !== criteriaRef.current) return;
      setUsers((current) =>
        token ? uniqueById([...current, ...page.items]) : uniqueById(page.items),
      );
      setNext(page.nextPageToken);
    } catch (cause) {
      if (id === request.current && requestedCriteria === criteriaRef.current) {
        setError(errorMessage(cause));
        setErrorToken(
          cause instanceof Error && "status" in cause && cause.status === 410 ? undefined : token,
        );
      }
    } finally {
      if (id === request.current && requestedCriteria === criteriaRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (preserveInitial.current) {
      preserveInitial.current = false;
      return;
    }
    const timer = window.setTimeout(() => void loadUsers(), query || unit ? 350 : 0);
    return () => {
      window.clearTimeout(timer);
      ++request.current;
    };
  }, [criteria]);

  function openUser(id: string) {
    previousDirectory = { users, next, query, status, unit };
    navigate({ name: "customer", id: workspaceId, tab: "email-recall", recallUserId: id });
  }

  return (
    <Card className="@container flex min-h-min min-w-0 flex-1 flex-col overflow-hidden">
      <div className="records-toolbar flex shrink-0 flex-col gap-4">
        <RecordsHeading
          title="Email Recall"
          description="Inspect sent mail and attempt recall from eligible internal mailboxes."
        />
        <div className="flex flex-wrap gap-3">
          <SearchInput
            label="Search users"
            placeholder="Search name or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full sm:max-w-sm"
          />
          <Select
            aria-label="Account status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full sm:w-40"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="archived">Archived</option>
          </Select>
          <Input
            aria-label="Filter organizational unit"
            placeholder="Organizational unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            className="w-full sm:w-48"
          />
        </div>
      </div>
      {error && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-brio-danger-ink"
          role="alert"
        >
          <span>{error}</span>
          <Button size="sm" onClick={() => void loadUsers(errorToken)}>
            Retry
          </Button>
        </div>
      )}
      {users.length > 0 && (
        <RecordsViewport ref={viewportRef} fill>
          <RecordsTable aria-label="Email Recall users" className="min-w-[720px]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Primary email</th>
                <th>Organizational unit</th>
                <th>Department</th>
                <th>Account status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((user) => (
                <tr key={user.id}>
                  <td>
                    <Button
                      variant="ghost"
                      className="max-w-52 justify-start truncate px-0 font-medium"
                      onClick={() => openUser(user.id)}
                    >
                      {user.name || "—"}
                    </Button>
                  </td>
                  <td className="break-all">{user.primaryEmail || "—"}</td>
                  <td>{user.orgUnit || "—"}</td>
                  <td>{user.department || "—"}</td>
                  <td>
                    <Badge
                      tone={
                        user.status === "active"
                          ? "green"
                          : user.status === "suspended"
                            ? "rose"
                            : "amber"
                      }
                    >
                      {user.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </RecordsTable>
        </RecordsViewport>
      )}
      {loading && (
        <p role="status" className="p-5 text-sm text-brio-muted">
          Loading users…
        </p>
      )}
      {!users.length && !loading && !error && (
        <EmptyState
          icon={<MailSearch className="size-5" />}
          title="No matching users"
          description="Try a different search or filter."
        />
      )}
      {users.length > 0 && (
        <TablePagination label="Email Recall user pagination" noun="user" {...pagination} />
      )}
      {next && (
        <div className="flex justify-end border-t border-brio-subtle px-5 py-3">
          <Button disabled={loading} onClick={() => void loadUsers(next)}>
            Load more users
          </Button>
        </div>
      )}
    </Card>
  );
}
