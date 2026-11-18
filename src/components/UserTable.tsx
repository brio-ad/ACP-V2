import { RecordsTable, RecordsViewport } from "./RecordsTable";
import { useMemo, useState, type ReactNode } from "react";
import { Users } from "lucide-react";
import { fullName, type DirectoryUser, type RecipientSelection } from "../data";
import { TablePagination, useTablePage } from "./TablePagination";
import { Avatar, Badge, Button, Card, Checkbox, EmptyState, ToolbarSearchInput, Select, cx } from "./ui";

export interface Filters {
  department: string;
  orgUnit: string;
  status: string;
}
const EMPTY: Filters = { department: "", orgUnit: "", status: "" };

export interface ExtraColumn {
  header: string;
  render: (u: DirectoryUser) => ReactNode;
  className?: string;
}

export function UserTable({
  users,
  selection,
  onSelectionChange,
  toolbarActions,
  toolbarHeading,
  filterAction,
  showOrgUnitFilter = true,
  showOrgUnitColumn = true,
  limitSelectionTableHeight = true,
  heading,
  embedded = false,
  tableLabel,
  emptyTitle = "Directory unavailable",
  emptyDescription = "No users are available for this customer.",
  extraColumns = [],
  rowAction,
  banner,
}: {
  users: DirectoryUser[];
  selection?: RecipientSelection;
  onSelectionChange?: (s: RecipientSelection) => void;
  toolbarActions?: ReactNode;
  toolbarHeading?: ReactNode;
  filterAction?: ReactNode;
  showOrgUnitFilter?: boolean;
  showOrgUnitColumn?: boolean;
  limitSelectionTableHeight?: boolean;
  heading?: ReactNode;
  embedded?: boolean;
  tableLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  extraColumns?: ExtraColumn[];
  rowAction?: (u: DirectoryUser) => ReactNode;
  banner?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (!q || `${fullName(u)} ${u.email} ${u.title}`.toLowerCase().includes(q)) &&
        (!filters.department || u.department === filters.department) &&
        (!filters.orgUnit || u.orgUnit === filters.orgUnit) &&
        (!filters.status || u.status === filters.status),
    );
  }, [users, query, filters]);

  const { visibleRows: rows, pagination, resetPage, viewportRef } = useTablePage(filtered);
  const hasFilters = Object.values(filters).some(Boolean);
  const narrowed = Boolean(query.trim()) || hasFilters;

  const selectable = Boolean(selection && onSelectionChange);
  const ids = useMemo(() => new Set(selection?.ids), [selection?.ids]);
  const checked = (id: string) => (selection ? selection.all !== ids.has(id) : false);
  const visibleSelected = filtered.filter((user) => checked(user.id)).length;
  const allVisible = filtered.length > 0 && visibleSelected === filtered.length;

  const departments = useMemo(() => [...new Set(users.map((u) => u.department))].sort(), [users]);
  const orgUnits = useMemo(() => [...new Set(users.map((u) => u.orgUnit))].sort(), [users]);

  function setMany(ids: string[], on: boolean) {
    if (!selection || !onSelectionChange) return;
    const set = new Set(selection.ids);
    // In "all" mode ids are exclusions, so selecting removes from the set.
    const add = selection.all ? !on : on;
    ids.forEach((id) => (add ? set.add(id) : set.delete(id)));
    onSelectionChange({ all: selection.all, ids: [...set] });
  }

  function toggleHeader() {
    if (!onSelectionChange) return;
    if (!narrowed) {
      onSelectionChange(allVisible ? { all: false, ids: [] } : { all: true, ids: [] });
    } else {
      setMany(
        filtered.map((u) => u.id),
        !allVisible,
      );
    }
  }

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((previous) => ({ ...previous, [key]: value }));
    resetPage();
  }

  const Container = embedded ? "div" : Card;
  return (
    <Container className="@container flex min-h-min min-w-0 flex-1 flex-col">
      <div className="records-toolbar flex shrink-0 flex-wrap items-center gap-3">
        {toolbarHeading && <div className="w-full min-w-0">{toolbarHeading}</div>}
        <ToolbarSearchInput
          value={query}
          label="Search directory users"
          onChange={(event) => {
            setQuery(event.target.value);
            resetPage();
          }}
          placeholder="Search by name, email or title"
        />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 @min-[52rem]:flex-none">
          <FilterSelect
            label="Department"
            allLabel="All departments"
            value={filters.department}
            options={departments}
            onChange={(value) => updateFilter("department", value)}
          />
          {showOrgUnitFilter && (
            <FilterSelect
              label="Organizational unit"
              allLabel="All org units"
              value={filters.orgUnit}
              options={orgUnits}
              onChange={(value) => updateFilter("orgUnit", value)}
            />
          )}
          <FilterSelect
            label="Account status"
            allLabel="All statuses"
            value={filters.status}
            options={["active", "suspended"]}
            onChange={(value) => updateFilter("status", value)}
          />
          {narrowed && (
            <Button
              variant="ghost"
              onClick={() => {
                setQuery("");
                setFilters(EMPTY);
                resetPage();
              }}
            >
              Clear
            </Button>
          )}
        </div>
        {filterAction && <div className="ml-auto shrink-0">{filterAction}</div>}
      </div>
      {(heading || toolbarActions) && (
        <div className="flex shrink-0 flex-wrap items-center gap-3 px-5 py-3">
          {heading && <div className="min-w-0 flex-1 basis-64">{heading}</div>}
          {toolbarActions && (
            <div className="ml-auto flex flex-wrap items-center gap-2">{toolbarActions}</div>
          )}
        </div>
      )}
      <div className="shrink-0 px-5 pt-3 empty:hidden">{banner}</div>

      {rows.length ? (
        <RecordsViewport
          ref={viewportRef}
          fill={!selectable || !limitSelectionTableHeight}
          className={selectable && limitSelectionTableHeight ? "max-h-[min(38dvh,24rem)]" : undefined}
        >
          <RecordsTable
            aria-label={tableLabel ?? (selectable ? "Signature recipients" : "Workspace directory")}
          >
            <thead>
              <tr>
                {selectable && (
                  <th className="w-12">
                    <Checkbox
                      label={narrowed ? "Select all matching users" : "Select entire directory"}
                      checked={allVisible}
                      indeterminate={!allVisible && visibleSelected > 0}
                      onChange={toggleHeader}
                    />
                  </th>
                )}
                <th scope="col">User</th>
                <th className="hidden font-medium @min-[38rem]:table-cell">Title</th>
                <th className="hidden font-medium @min-[38rem]:table-cell">Department</th>
                {showOrgUnitColumn && (
                  <th className="hidden font-medium @min-[56rem]:table-cell">Org unit</th>
                )}
                {extraColumns.map((c) => (
                  <th key={c.header} className={cx("font-medium", c.className)}>
                    {c.header}
                  </th>
                ))}
                <th className="pr-4 font-medium">Status</th>
                {rowAction && <th className="w-px pr-3" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const on = checked(u.id);
                return (
                  <tr
                    key={u.id}
                    onClick={selectable ? () => setMany([u.id], !on) : undefined}
                    className={cx(
                      "transition-colors",
                      selectable && "cursor-pointer",
                      on ? "bg-brio-primary/10" : "hover:bg-brio-hover",
                    )}
                  >
                    {selectable && (
                      <td className="pl-4">
                        <Checkbox
                          label={"Select " + fullName(u)}
                          checked={on}
                          onChange={() => setMany([u.id], !on)}
                        />
                      </td>
                    )}
                    <td className="pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={fullName(u)} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-brio-ink [overflow-wrap:anywhere]">
                            {fullName(u)}
                          </p>
                          <p className="text-xs text-brio-muted [overflow-wrap:anywhere]">
                            {u.email}
                          </p>
                          <p className="mt-0.5 text-xs text-brio-muted @min-[38rem]:hidden">
                            {u.title} · {u.department}
                          </p>
                          {showOrgUnitColumn && !selectable && u.orgUnit && (
                            <p className="mt-1 text-xs text-brio-muted @min-[56rem]:hidden">
                              {u.orgUnit}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden pr-4 text-brio-muted @min-[38rem]:table-cell">
                      {u.title}
                    </td>
                    <td className="hidden pr-4 text-brio-muted @min-[38rem]:table-cell">
                      {u.department}
                    </td>
                    {showOrgUnitColumn && (
                      <td className="hidden pr-4 font-mono text-xs text-brio-muted @min-[56rem]:table-cell">
                        {u.orgUnit}
                      </td>
                    )}
                    {extraColumns.map((c) => (
                      <td key={c.header} className={cx("pr-4", c.className)}>
                        {c.render(u)}
                      </td>
                    ))}
                    <td className="pr-4">
                      {u.status === "active" ? (
                        <Badge tone="green" dot>
                          Active
                        </Badge>
                      ) : (
                        <Badge tone="amber" dot>
                          Suspended
                        </Badge>
                      )}
                    </td>
                    {rowAction && (
                      <td className="pr-3" onClick={(e) => e.stopPropagation()}>
                        {rowAction(u)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </RecordsTable>
        </RecordsViewport>
      ) : (
        <EmptyState
          icon={<Users className="size-5" />}
          title={users.length ? "No matching users" : emptyTitle}
          description={users.length ? "Try another search or clear the filters." : emptyDescription}
        />
      )}
      <TablePagination label="Directory pagination" noun="user" {...pagination} />
    </Container>
  );
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-w-0 flex-1 basis-28 capitalize @min-[52rem]:w-36 @min-[52rem]:flex-none"
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </Select>
  );
}
