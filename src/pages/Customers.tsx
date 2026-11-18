import { RecordsTable, RecordsViewport } from "../components/RecordsTable";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronRight, Plus } from "lucide-react";
import { AddCustomerDialog } from "../components/AddCustomerDialog";
import { PLANS, directorySize, relativeTime, type CustomerStatus, type Plan } from "../data";
import { useStore } from "../store";
import { TablePagination } from "../components/TablePagination";
import {
  Button,
  Card,
  CustomerMark,
  CustomerStatusBadge,
  EmptyState,
  ToolbarSearchInput,
  Select,
} from "../components/ui";

interface CustomerFilters {
  query: string;
  status: "" | CustomerStatus;
  plan: "" | Plan;
}

const emptyFilters: CustomerFilters = { query: "", status: "", plan: "" };

export function CustomersPage() {
  const [adding, setAdding] = useState(false);
  const { data, navigate } = useStore();
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [offset, setOffset] = useState(0);
  const [fixedPageSize, setFixedPageSize] = useState(0);
  const [fitPageSize, setFitPageSize] = useState(10);
  const viewportRef = useRef<HTMLDivElement>(null);

  const customers = useMemo(() => {
    const { query, status, plan } = filters;
    const s = query.trim().toLowerCase();
    return data.customers.filter(
      (c) =>
        (!s ||
          `${c.name} ${c.domain} ${c.contactName} ${c.contactEmail}`.toLowerCase().includes(s)) &&
        (!status || c.status === status) &&
        (!plan || c.plan === plan),
    );
  }, [data.customers, filters]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || fixedPageSize) return;

    function measure() {
      if (!viewport) return;
      const row = viewport.querySelector("tbody tr");
      const header = viewport.querySelector("thead");
      if (!row) return;
      const rowHeight = row.getBoundingClientRect().height;
      if (!rowHeight) return;
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      const capacity = Math.floor((viewport.clientHeight - headerHeight) / rowHeight);
      setFitPageSize(Math.max(1, Math.min(capacity, 50)));
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [customers, fixedPageSize]);

  const activity = useMemo(() => {
    const latest = new Map<string, string>();
    const delegates = new Map<string, number>();
    for (const log of data.logs) {
      const previous = latest.get(log.customerId);
      if (!previous || log.startedAt > previous) latest.set(log.customerId, log.startedAt);
    }
    for (const record of data.delegations) {
      delegates.set(record.customerId, (delegates.get(record.customerId) ?? 0) + 1);
    }
    return { latest, delegates };
  }, [data.logs, data.delegations]);

  const filtered = Boolean(filters.query || filters.status || filters.plan);
  const canClear = filtered || Boolean(draft.query || draft.status || draft.plan);
  const pageSize = fixedPageSize || fitPageSize;
  const pageCount = Math.max(1, Math.ceil(customers.length / pageSize));
  const currentPage = Math.min(Math.floor(offset / pageSize) + 1, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visibleRows = customers.slice(start, start + pageSize).map((c) => {
    const users = directorySize(c, data.users[c.id]);
    const covered = Object.keys(data.assignments[c.id] ?? {}).length;
    return {
      c,
      users,
      coverage: users ? Math.min(100, Math.round((covered / users) * 100)) : 0,
      delegates: activity.delegates.get(c.id) ?? 0,
      last: activity.latest.get(c.id),
    };
  });
  const openCustomer = (id: string) => navigate({ name: "customer", id });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Card className="@container flex min-h-0 flex-1 flex-col overflow-hidden">
        <form
          role="search"
          aria-label="Customer filters"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters({ ...draft, query: draft.query.trim() });
            setOffset(0);
            viewportRef.current?.scrollTo({ top: 0 });
          }}
          className="grid grid-cols-2 items-center gap-3 records-toolbar shrink-0 @min-[48rem]:grid-cols-[minmax(0,1fr)_minmax(8rem,auto)_minmax(9rem,auto)_auto]"
        >
          <ToolbarSearchInput
            value={draft.query}
            label="Search customers"
            onChange={(e) => setDraft({ ...draft, query: e.target.value })}
            placeholder="Search by name, domain or contact"
            className="col-span-2 @min-[48rem]:col-span-1"
          />
          <Select
            value={draft.status}
            onChange={(e) =>
              setDraft({ ...draft, status: e.target.value as CustomerFilters["status"] })
            }
            aria-label="Status"
          >
            <option value="">All statuses</option>
            <option value="active">Directory ready</option>
            <option value="pending">Setup pending</option>
            <option value="error">Needs attention</option>
          </Select>
          <Select
            value={draft.plan}
            onChange={(e) =>
              setDraft({ ...draft, plan: e.target.value as CustomerFilters["plan"] })
            }
            aria-label="Plan"
          >
            <option value="">All plans</option>
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <div className="col-span-2 flex flex-wrap justify-end gap-2 @min-[48rem]:col-span-1">
            {canClear && (
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(emptyFilters);
                  setFilters(emptyFilters);
                  setOffset(0);
                  viewportRef.current?.scrollTo({ top: 0 });
                }}
              >
                Clear
              </Button>
            )}
            <Button type="submit">Search</Button>
            <Button
              variant="primary"
              icon={<Plus className="size-4" />}
              onClick={() => setAdding(true)}
            >
              Add customer
            </Button>
          </div>
        </form>

        {customers.length === 0 ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <EmptyState
              icon={<Building2 className="size-5" />}
              title={filtered ? "No customers match" : "No customers yet"}
              description={
                filtered
                  ? "Try a different search or clear the filters."
                  : "Customer accounts will appear here when available."
              }
            />
          </div>
        ) : (
          <RecordsViewport ref={viewportRef} className="min-h-0 flex-1">
            <RecordsTable aria-label="Customers" className="customer-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Primary contact</th>
                  <th>Plan</th>
                  <th className="text-right font-medium">Users</th>
                  <th>Signature coverage</th>
                  <th className="text-right font-medium">Delegates</th>
                  <th>Last activity</th>
                  <th>Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(({ c, users, coverage, delegates, last }) => (
                  <tr
                    key={c.id}
                    onClick={() => openCustomer(c.id)}
                    className="group cursor-pointer transition-colors duration-120 ease-brio hover:bg-brio-hover focus-within:bg-brio-hover motion-reduce:transition-none"
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <CustomerMark customer={c} />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openCustomer(c.id);
                            }}
                            className="rounded text-left font-semibold text-brio-ink [overflow-wrap:anywhere] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brio-focus"
                          >
                            {c.name}
                          </button>
                          <p className="text-xs text-brio-muted [overflow-wrap:anywhere]">
                            {c.domain}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td data-label="Primary contact" className=" [overflow-wrap:anywhere]">
                      <p className="text-brio-ink">{c.contactName || c.contactEmail}</p>
                      {c.contactName && <p className="text-xs text-brio-muted">{c.contactEmail}</p>}
                    </td>
                    <td data-label="Plan" className=" text-brio-muted">
                      {c.plan || "—"}
                    </td>
                    <td data-label="Users" className="text-right text-brio-ink tabular-nums">
                      {users || "—"}
                    </td>
                    <td data-label="Signature coverage">
                      {users ? (
                        <div className="flex items-center gap-2">
                          <div
                            aria-hidden
                            className="h-1 min-w-12 max-w-32 flex-1 overflow-hidden rounded-full bg-brio-subtle"
                          >
                            <div
                              className="h-full rounded-full bg-brio-muted"
                              style={{ width: `${coverage}%` }}
                            />
                          </div>
                          <span className="text-xs text-brio-muted tabular-nums">{coverage}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-brio-muted">—</span>
                      )}
                    </td>
                    <td data-label="Delegates" className="text-right text-brio-ink tabular-nums">
                      {delegates || "—"}
                    </td>
                    <td data-label="Last activity" className=" whitespace-nowrap text-brio-muted">
                      {last ? relativeTime(last) : "Never"}
                    </td>
                    <td>
                      <CustomerStatusBadge status={c.status} />
                    </td>
                    <td>
                      <ChevronRight aria-hidden className="size-4 text-brio-muted" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </RecordsTable>
          </RecordsViewport>
        )}
        <TablePagination
          label="Customer pagination"
          noun="customer"
          total={customers.length}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={(page) => {
            setOffset((page - 1) * pageSize);
            viewportRef.current?.scrollTo({ top: 0 });
          }}
          autoPageSize={fixedPageSize === 0}
          onPageSizeChange={(size) => {
            setFixedPageSize(size);
            setOffset(0);
            viewportRef.current?.scrollTo({ top: 0 });
          }}
        />
      </Card>
      {adding && <AddCustomerDialog onClose={() => setAdding(false)} />}
    </div>
  );
}
