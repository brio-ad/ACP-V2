import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Info,
  LogOut,
  Menu,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import { useStore } from "../store";
import { Avatar, Button, CustomerStatusBadge, Field, IconButton, Modal, Textarea, cx } from "./ui";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";

export function Shell({ children }: { children: ReactNode }) {
  const { agent, data, navigate, route, toasts, connected } = useStore();
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const collapsed = !hovered && !keyboardFocus;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState("");
  const customerId =
    route.name === "customer"
      ? route.id
      : route.name === "assign" || route.name === "template"
        ? route.customerId
        : undefined;
  const customer = data.customers.find((entry) => entry.id === customerId);
  const template =
    route.name === "template"
      ? data.templates.find(
          (entry) => entry.customerId === customerId && entry.id === route.templateId,
        )
      : undefined;
  const header = {
    setup: { title: "Workspace setup", description: "Connect your Google Workspace" },
    users: { title: "User Management", description: data.customers[0]?.domain },
    customer: { title: "My Workspace", description: customer?.domain },
    template: {
      title: template ? "Edit signature template" : "Create signature template",
      description: template && customer ? template.name + " · " + customer.name : customer?.name,
    },
    assign: { title: "Assign signature", description: customer?.name },
  }[route.name];

  const isForm = route.name === "template" || route.name === "assign";

  useEffect(() => {
    if (!mobileOpen) return;
    const desktop = window.matchMedia("(min-width: 64rem)");
    function onResize(event: MediaQueryListEvent) {
      if (event.matches) setMobileOpen(false);
    }
    desktop.addEventListener("change", onResize);
    return () => desktop.removeEventListener("change", onResize);
  }, [mobileOpen]);

  function openCustomers() {
    navigate(connected || route.name !== "setup" ? { name: "customer", id: "c_brio" } : { name: "setup" });
    setMobileOpen(false);
  }

  function openUsers() {
    navigate({ name: "users" });
    setMobileOpen(false);
  }

  function downloadReport() {
    if (!report.trim()) return;
    const lines = [
      "Brio ACP issue report",
      "Date: " + new Date().toISOString(),
      "Reported by: " + (agent?.email ?? ""),
      "Page: " + header.title,
      ...(customer ? ["Customer: " + customer.domain] : []),
      "",
      report.trim(),
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }),
    );
    Object.assign(document.createElement("a"), {
      href: url,
      download: "brio-acp-issue.txt",
    }).click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setReport("");
    setReportOpen(false);
  }

  const navigation = {
    onCustomers: openCustomers,
    onUsers: openUsers,
    onHelp: () => setReportOpen(true),
    onCustomersPage: route.name === "customer",
    onUsersPage: route.name === "users",
    workspaceAvailable: connected || route.name !== "setup",
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="relative z-40 hidden w-16 shrink-0 lg:block">
        <aside
          id="desktop-sidebar"
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") setHovered(true);
          }}
          onPointerLeave={() => setHovered(false)}
          onFocusCapture={(e) => setKeyboardFocus(e.target.matches(":focus-visible"))}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setKeyboardFocus(false);
          }}
          className={cx(
            "absolute inset-y-0 left-0 flex flex-col overflow-hidden border-r border-brio-subtle bg-brio-surface transition-[width] duration-220 ease-brio motion-reduce:transition-none",
            collapsed ? "w-16" : "w-56 shadow-brio-overlay",
          )}
        >
          <SidebarNavigation {...navigation} collapsed={collapsed} />
        </aside>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-30 flex min-h-16 shrink-0 border-b border-brio-subtle bg-brio-surface">
          <div className="flex min-w-0 flex-1 items-stretch gap-3 px-5 py-2">
            <div className="shrink-0 self-center lg:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <IconButton
                    label="Open navigation"
                    className="ring-1 ring-inset ring-brio-border"
                  >
                    <Menu className="size-4" />
                  </IconButton>
                </SheetTrigger>
                <SheetContent aria-describedby={undefined}>
                  <div className="flex min-h-16 shrink-0 items-center justify-between gap-2 border-b border-brio-subtle px-4">
                    <SheetTitle>
                      <button
                        type="button"
                        aria-label="Brio ACP home"
                        onClick={openCustomers}
                        className="flex items-center gap-2 rounded-brio-control font-semibold hover:text-brio-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brio-focus"
                      >
                        <img src="/brio-mark.png" alt="" className="size-8 shrink-0" />
                        Brio ACP
                      </button>
                    </SheetTitle>
                    <SheetClose asChild>
                      <IconButton label="Close navigation">
                        <X className="size-4" />
                      </IconButton>
                    </SheetClose>
                  </div>
                  <SidebarNavigation {...navigation} />
                </SheetContent>
              </Sheet>
            </div>
            <div className="flex min-h-10 min-w-0 flex-1 flex-col justify-center">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <h1
                  className="min-w-0 truncate text-base font-semibold leading-6 text-brio-ink"
                  title={header.title}
                >
                  {header.title}
                </h1>
                {route.name === "customer" && customer && (
                  <CustomerStatusBadge status={customer.status} />
                )}
              </div>
              {header.description && (
                <p
                  className={cx(
                    "truncate text-xs text-brio-muted",
                route.name === "setup" && "hidden sm:block",
                  )}
                >
                  {header.description}
                </p>
              )}
            </div>
            <WorkspaceProfile />
          </div>
        </header>
        <main
          id="main-scroll"
          className="relative min-h-0 min-w-0 flex-1 overflow-y-auto scroll-pb-24"
        >
          <div
            className={cx(
              "@container flex min-h-full min-w-0 flex-col",
              !isForm && "p-5",
              (route.name === "setup" ||
                route.name === "users" ||
                route.name === "customer" ||
                route.name === "assign") &&
                "h-full",
            )}
          >
            {children}
          </div>
        </main>
      </div>
      <Toasts toasts={toasts} />
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report an issue"
        footer={
          <>
            <Button onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!report.trim()} onClick={downloadReport}>
              Download report
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-brio-muted">
          Describe what happened. Download the report and share it through your support channel.
        </p>
        <Field label="Issue details" required>
          <Textarea rows={5} value={report} onChange={(event) => setReport(event.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}

function SidebarNavigation({
  collapsed = false,
  onCustomers,
  onUsers,
  onHelp,
  onCustomersPage,
  onUsersPage,
  workspaceAvailable,
}: {
  collapsed?: boolean;
  onCustomers: () => void;
  onUsers: () => void;
  onHelp: () => void;
  onCustomersPage: boolean;
  onUsersPage: boolean;
  workspaceAvailable: boolean;
}) {
  const item =
    "flex h-10 w-full items-center gap-3 rounded-brio-control px-3 text-left text-sm font-medium text-brio-ink hover:bg-brio-hover focus-visible:outline-2 focus-visible:outline-brio-focus disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        aria-label="Brio ACP home"
        title="Brio ACP home"
        onClick={onCustomers}
        className="hidden h-16 w-full shrink-0 items-center gap-3 border-b border-brio-subtle px-4 text-left hover:bg-brio-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brio-focus lg:flex"
      >
        <img src="/brio-mark.png" alt="" className="size-8 shrink-0" />
        <span className={cx("whitespace-nowrap font-semibold", collapsed && "sr-only")}>
          Brio ACP
        </span>
      </button>
      <nav aria-label="Main navigation" className="flex flex-col gap-2 p-3">
        <button
          type="button"
          title="My Workspace"
          aria-current={onCustomersPage ? "page" : undefined}
          className={cx(item, onCustomersPage && "bg-brio-primary/15")}
          onClick={onCustomers}
        >
          <Building2 className="size-4 shrink-0" aria-hidden />
          <span className={collapsed ? "sr-only" : undefined}>My Workspace</span>
        </button>
        <button
          type="button"
          title="User Management"
          aria-current={onUsersPage ? "page" : undefined}
          className={cx(item, onUsersPage && "bg-brio-primary/15")}
          onClick={onUsers}
          disabled={!workspaceAvailable}
        >
          <UsersRound className="size-4 shrink-0" aria-hidden />
          <span className={collapsed ? "sr-only" : undefined}>User Management</span>
        </button>
      </nav>
      <div className="mt-auto border-t border-brio-subtle p-3">
        <button type="button" title="Help and issue reporting" className={item} onClick={onHelp}>
          <CircleHelp className="size-4 shrink-0" aria-hidden />
          <span className={collapsed ? "sr-only" : undefined}>Help and issue reporting</span>
        </button>
      </div>
    </div>
  );
}

function WorkspaceProfile() {
  const { agent, logout, accessGrants } = useStore();
  if (!agent) return null;
  const role = accessGrants.find((grant) => grant.email === agent.email.toLowerCase())?.role;
  return (
    <details
      className="group relative min-w-0 max-w-[48%] shrink-0 self-center"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && event.currentTarget.open) {
          const disclosure = event.currentTarget;
          disclosure.querySelector("summary")?.focus();
          disclosure.open = false;
        }
      }}
    >
      <summary
        aria-label={"Profile for " + agent.name}
        className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-brio-panel bg-brio-surface px-2 text-brio-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brio-focus sm:px-3 [&::-webkit-details-marker]:hidden"
      >
        <Avatar name={agent.name} size="sm" tone="neutral" />
        <div className="min-w-0">
          <p className="truncate text-sm leading-6 font-medium" title={agent.name}>
            {agent.name}
          </p>
          <p className="hidden truncate text-xs text-brio-muted sm:block" title={agent.email}>
            {agent.email}{role ? ` · ${role === "super-admin" ? "Super Admin" : "Admin"}` : ""}
          </p>
        </div>
        <ChevronDown
          className="size-4 shrink-0 text-brio-ink group-open:rotate-180 sm:ml-2"
          aria-hidden
        />
      </summary>
      <div className="absolute top-full right-0 z-50 mt-2 min-w-48 rounded-brio-panel border border-brio-subtle bg-brio-surface p-1 shadow-brio-overlay">
        <p className="px-3 py-2 text-xs text-brio-muted sm:hidden">{agent.email}</p>
        <Button
          variant="ghost"
          className="w-full justify-start"
          icon={<LogOut className="size-4" />}
          onClick={logout}
        >
          Logout
        </Button>
      </div>
    </details>
  );
}

export function Toasts({ toasts }: { toasts: { id: number; message: string; tone: string }[] }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-20 z-[60] flex flex-col items-end gap-2 sm:right-6 sm:left-auto"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast flex max-w-sm items-start gap-2 rounded-brio-panel border border-brio-subtle bg-brio-surface px-4 py-3 text-sm text-brio-ink shadow-brio-overlay"
        >
          {t.tone === "success" ? (
            <CheckCircle2 className="mt-1 size-4 shrink-0 text-brio-success-ink" />
          ) : t.tone === "error" ? (
            <XCircle className="mt-1 size-4 shrink-0 text-brio-danger-ink" />
          ) : (
            <Info className="mt-1 size-4 shrink-0 text-brio-muted" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}
