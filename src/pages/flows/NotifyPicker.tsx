import { useEffect, useId, useMemo, useState } from "react";
import { X } from "lucide-react";
import { fullName, type Customer, type DirectoryUser, type Template } from "../../data";
import { Field, IconButton, SearchInput, Select, cx } from "../../components/ui";

type RecipientType = "people" | "groups";
const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export function NotifyPicker({
  customer,
  users,
  value,
  onChange,
  timing,
  onTimingChange,
}: {
  customer: Customer;
  users: DirectoryUser[];
  value: string[];
  onChange: (v: string[]) => void;
  timing: Template["notifyWhen"];
  onTimingChange: (timing: Template["notifyWhen"]) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | RecipientType>("all");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const options = useMemo(() => {
    const entries = new Map<string, { label: string; type: RecipientType }>();
    const recipients: [string, string, RecipientType][] = [
      [
        customer.contactEmail,
        customer.contactName ? customer.contactName + " (primary contact)" : "Primary contact",
        "people",
      ],
      ["workspace-admins@" + customer.domain, "Workspace Admins (demo group)", "groups"],
      ["leadership@" + customer.domain, "Leadership (demo group)", "groups"],
      ...users.map((user): [string, string, RecipientType] => [
        user.email,
        fullName(user),
        "people",
      ]),
    ];
    for (const [email, label, type] of recipients) {
      if (email && !entries.has(email.toLowerCase()))
        entries.set(email.toLowerCase(), { label, type });
    }
    return entries;
  }, [customer, users]);

  const term = query.trim().toLowerCase();
  const selected = new Set(value.map((email) => email.toLowerCase()));
  const matches = [...options].filter(
    ([email, { label, type }]) =>
      (filter === "all" || type === filter) &&
      !selected.has(email) &&
      (email.includes(term) || label.toLowerCase().includes(term)),
  );
  if (EMAIL.test(term) && !options.has(term) && !selected.has(term)) {
    matches.push([term, { label: term, type: "people" }]);
  }
  const listId = id + "-options";
  const activeId = open && matches[active] ? `${listId}-${active}` : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function add(email: string) {
    if (!EMAIL.test(email)) {
      setError("Choose a suggestion or enter a valid email address.");
    } else if (selected.has(email)) {
      setError("This recipient is already selected.");
    } else {
      onChange([...value, email]);
      setQuery("");
      setError("");
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div className="grid min-w-0 items-start gap-4 @min-[48rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <label htmlFor={id} className="mb-1 block text-sm font-medium">
          Notification recipients{" "}
          <span className="ml-1 text-xs font-normal text-brio-muted">Optional</span>
        </label>
        <div className="flex items-start gap-2">
          <div className="relative min-w-0 flex-1">
            <SearchInput
              id={id}
              label="Notification recipients"
              role="combobox"
              aria-autocomplete="list"
              aria-controls={open ? listId : undefined}
              aria-expanded={open}
              aria-activedescendant={activeId}
              aria-describedby={error ? id + "-error" : undefined}
              aria-invalid={Boolean(error)}
              autoComplete="off"
              value={query}
              placeholder="Search people or groups"
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              onBlur={() => {
                setOpen(false);
                setActive(-1);
              }}
              onChange={(e) => {
                setQuery(e.target.value);
                setError("");
                setOpen(true);
                setActive(-1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && open) {
                  e.preventDefault();
                  setOpen(false);
                  setActive(-1);
                } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  setOpen(true);
                  setActive(
                    e.key === "ArrowDown"
                      ? Math.min(active + 1, matches.length - 1)
                      : active < 0
                        ? matches.length - 1
                        : Math.max(0, active - 1),
                  );
                } else if (e.key === "Enter" && (term || activeId)) {
                  e.preventDefault();
                  add(activeId ? matches[active][0] : term);
                }
              }}
            />
            {open && (
              <ul
                id={listId}
                role="listbox"
                aria-label="Matching notification recipients"
                className="absolute bottom-full z-30 mb-1 max-h-48 w-full min-w-0 overflow-auto rounded-brio-control border border-brio-border bg-brio-surface p-1 shadow-brio-overlay"
              >
                {matches.map(([email, { label }], index) => (
                  <li
                    key={email}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === active}
                    className={cx(
                      "cursor-pointer rounded-brio-control px-2 py-1.5 hover:bg-brio-hover",
                      index === active && "bg-brio-hover",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => add(email)}
                  >
                    <span className="block truncate font-medium">{label}</span>
                    {label !== email && (
                      <span className="block truncate text-xs text-brio-muted">{email}</span>
                    )}
                  </li>
                ))}
                {!matches.length && (
                  <li role="option" aria-disabled="true" className="px-2 py-1.5 text-brio-muted">
                    No matching recipients
                  </li>
                )}
              </ul>
            )}
          </div>
          <Select
            aria-label="Filter notification recipients"
            className="w-auto"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as typeof filter);
              setActive(-1);
            }}
          >
            <option value="all">All recipients</option>
            <option value="people">People</option>
            <option value="groups">Groups</option>
          </Select>
        </div>
        {error && (
          <p id={id + "-error"} role="alert" className="mt-1 text-xs text-brio-danger-ink">
            {error}
          </p>
        )}
        {!!value.length && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {value.map((email) => (
              <li
                key={email}
                className="inline-flex max-w-full items-center gap-1 rounded-brio-control bg-brio-hover pl-2 text-xs"
              >
                <span className="min-w-0 [overflow-wrap:anywhere]" title={email}>
                  {options.get(email.toLowerCase())?.label ?? email}
                </span>
                <IconButton
                  label={"Remove " + email}
                  onClick={() => onChange(value.filter((item) => item !== email))}
                >
                  <X className="size-3.5" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Field label="When to notify">
        <Select
          value={timing}
          onChange={(event) =>
            onTimingChange(event.target.value === "errors" ? "errors" : "always")
          }
        >
          <option value="always">After every deployment</option>
          <option value="errors">Only when deployment has failures</option>
        </Select>
      </Field>
    </div>
  );
}
