import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  buildSeed,
  customerDirectory,
  uid,
  type Agent,
  type Assignment,
  type Customer,
  type DirectoryUser,
  type Delegation,
  type ExternalContact,
  type LogEntry,
  type Seed,
  type Template,
} from "./data";
import { clearDemoRecallHistory } from "./emailRecallDemo";

export type CustomerTab =
  | "signatures"
  | "delegates"
  | "forwarding"
  | "vacation"
  | "domains"
  | "history"
  | "email-recall"
  | "add-contact";
export type AccessRole = "super-admin" | "admin";
export interface AccessGrant {
  email: string;
  name: string;
  role: AccessRole;
  userId?: string;
}

export type Route =
  | { name: "setup" }
  | { name: "users" }
  | {
      name: "customer";
      id: string;
      tab?: CustomerTab;
      logId?: string;
      recallUserId?: string;
      recallMessageId?: string;
    }
  | { name: "template"; customerId: string; templateId: string }
  | { name: "assign"; customerId: string; templateId?: string };

interface Toast {
  id: number;
  message: string;
  tone: "success" | "info" | "error";
}

export interface BatchCommit {
  assignments?: Record<string, Assignment>;
  addDelegations?: Delegation[];
  removeDelegationIds?: string[];
}

interface Store {
  agent: Agent | null;
  data: Seed;
  route: Route;
  navigate: (r: Route, options?: { preserveScroll?: boolean }) => void;
  login: (agent: Agent) => void;
  logout: () => void;
  connected: boolean;
  accessGrants: AccessGrant[];
  previewWorkspace: () => void;
  verifyConnection: (file: File) => Promise<string | null>;
  grantAccess: (
    userId: string,
    role: AccessRole,
  ) => "granted" | "duplicate" | "invalid-user" | "forbidden";
  addCustomer: (
    details: Pick<Customer, "name" | "domain" | "serviceAccount" | "contactEmail">,
  ) => Customer | null;
  addExternalContact: (
    contact: Pick<ExternalContact, "customerId" | "name" | "organization" | "email" | "mobile">,
  ) => "added" | "duplicate" | "directory" | "invalid";
  saveTemplate: (t: Template) => void;
  deleteTemplate: (id: string) => void;
  commitBatch: (log: LogEntry, changes: BatchCommit) => void;
  toasts: Toast[];
  toast: (message: string, tone?: Toast["tone"]) => void;
  resetDemo: () => void;
}

const WORKSPACE_ID = "c_brio";
const KEY = "brio-customer-portal-test-v1";
const Ctx = createContext<Store | null>(null);

function scopeSeed(seed: Seed): Seed {
  const workspaceDomain = seed.customers
    .find((item) => item.id === WORKSPACE_ID)
    ?.domain.toLowerCase();
  return {
    customers: seed.customers.filter((item) => item.id === WORKSPACE_ID),
    users: { [WORKSPACE_ID]: seed.users[WORKSPACE_ID] ?? [] },
    templates: seed.templates.filter((item) => item.customerId === WORKSPACE_ID),
    logs: seed.logs.filter((item) => item.customerId === WORKSPACE_ID),
    assignments: { [WORKSPACE_ID]: seed.assignments[WORKSPACE_ID] ?? {} },
    delegations: seed.delegations.filter((item) => item.customerId === WORKSPACE_ID),
    externalContacts: (Array.isArray(seed.externalContacts) ? seed.externalContacts : []).filter(
      (item) =>
        item &&
        item.customerId === WORKSPACE_ID &&
        typeof item.name === "string" &&
        typeof item.email === "string" &&
        typeof item.mobile === "string" &&
        typeof item.organization === "string" &&
        (!workspaceDomain ||
          (item.email.toLowerCase().split("@")[1] !== workspaceDomain &&
            !item.email.toLowerCase().split("@")[1]?.endsWith(`.${workspaceDomain}`))) &&
        !seed.users[WORKSPACE_ID]?.some(
          (user) => user.email.toLowerCase() === item.email.toLowerCase(),
        ),
    ),
  };
}

function load(): { agent: Agent | null; data: Seed | null; accessGrants?: AccessGrant[] } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore corrupt storage */
  }
  return { agent: null, data: null };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(load, []);
  const [agent, setAgent] = useState<Agent | null>(initial.agent);
  const [data, setData] = useState<Seed>(() =>
    scopeSeed(initial.data ?? buildSeed("admin@brio.co.in")),
  );
  const [accessGrants, setAccessGrants] = useState<AccessGrant[]>(() =>
    Array.isArray(initial.accessGrants) ? initial.accessGrants : [],
  );
  const [connected, setConnected] = useState(false);
  const [route, setRoute] = useState<Route>({ name: "setup" });
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ agent, data: scopeSeed(data), accessGrants }));
  }, [agent, data, accessGrants]);

  const toast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const navigate = useCallback((r: Route, options?: { preserveScroll?: boolean }) => {
    if (r.name !== "setup" && "customerId" in r && r.customerId !== WORKSPACE_ID) return;
    if (r.name === "customer" && r.id !== WORKSPACE_ID) return;
    setRoute(r);
    if (!options?.preserveScroll) document.getElementById("main-scroll")?.scrollTo({ top: 0 });
  }, []);

  const login = useCallback((a: Agent) => {
    setAgent(a);
    setRoute({ name: "setup" });
  }, []);
  const logout = useCallback(() => {
    setAgent(null);
    setConnected(false);
    setRoute({ name: "setup" });
  }, []);
  const ensureFirstSuperAdmin = useCallback(() => {
    if (!agent) return;
    const email = agent.email.toLowerCase();
    const ownerId = `owner:${email}`;
    setData((current) => {
      if (current.users[WORKSPACE_ID]?.some((user) => user.email.toLowerCase() === email))
        return current;
      const [firstName, ...rest] = agent.name.split(" ");
      const owner: DirectoryUser = {
        id: ownerId,
        firstName,
        lastName: rest.join(" ") || "Admin",
        email,
        title: "",
        department: "",
        orgUnit: "/",
        phone: "",
        mobile: "",
        location: "",
        status: "active",
      };
      return {
        ...current,
        users: {
          ...current.users,
          [WORKSPACE_ID]: [owner, ...(current.users[WORKSPACE_ID] ?? [])],
        },
      };
    });
    setAccessGrants((current) =>
      current.length
        ? current
        : [{ email, name: agent.name, role: "super-admin", userId: ownerId }],
    );
  }, [agent]);
  const previewWorkspace = useCallback(() => {
    ensureFirstSuperAdmin();
    setRoute({ name: "customer", id: WORKSPACE_ID });
  }, [ensureFirstSuperAdmin]);
  const verifyConnection = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const capabilityResponse = await fetch("/api/workspace/capabilities", {
          credentials: "same-origin",
        });
        if (
          !capabilityResponse.ok ||
          !capabilityResponse.headers.get("content-type")?.includes("application/json")
        ) {
          return "Secure connection verification is not configured in this preview. No credentials were uploaded.";
        }
        const capabilities: unknown = await capabilityResponse.json();
        if (
          !capabilities ||
          typeof capabilities !== "object" ||
          !("credentialUpload" in capabilities) ||
          capabilities.credentialUpload !== true ||
          !("workspaceId" in capabilities) ||
          capabilities.workspaceId !== WORKSPACE_ID
        ) {
          return "Secure connection verification is not available for this Workspace. No credentials were uploaded.";
        }
        const body = new FormData();
        body.set("credentials", file);
        const response = await fetch("/api/workspace/connect", {
          method: "POST",
          body,
          credentials: "same-origin",
        });
        if (!response.ok)
          return "Connection verification is unavailable. No credentials were saved. Ask Brio to enable the secure Workspace integration and try again.";
        const result: unknown = await response.json();
        if (
          !result ||
          typeof result !== "object" ||
          !("verified" in result) ||
          result.verified !== true ||
          !("workspaceId" in result) ||
          result.workspaceId !== WORKSPACE_ID
        ) {
          return "The connection could not be verified for this Workspace. Check the service account permissions and try again.";
        }
        setConnected(true);
        ensureFirstSuperAdmin();
        setRoute({ name: "customer", id: WORKSPACE_ID });
        return null;
      } catch {
        return "Connection verification is unavailable. No credentials were uploaded. Try again after the secure integration is configured.";
      }
    },
    [ensureFirstSuperAdmin],
  );

  const addCustomer = useCallback<Store["addCustomer"]>(() => null, []);

  const addExternalContact = useCallback<Store["addExternalContact"]>(
    (contact) => {
      const customer = data.customers.find((item) => item.id === contact.customerId);
      if (!customer || customer.id !== WORKSPACE_ID) return "invalid";
      const name = contact.name.trim();
      const organization = contact.organization.trim();
      const email = contact.email.trim().toLowerCase();
      const mobile = contact.mobile.trim();
      const digits = mobile.replace(/\D/g, "");
      if (
        !name ||
        (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
        !/^[+\d][\d\s()\-]+$/.test(mobile) ||
        digits.length < 7 ||
        digits.length > 15
      )
        return "invalid";
      const domain = email.split("@")[1];
      if (
        (email &&
          (domain === customer.domain.toLowerCase() ||
            domain.endsWith(`.${customer.domain.toLowerCase()}`))) ||
        data.users[WORKSPACE_ID]?.some(
          (user) =>
            (email && user.email.toLowerCase() === email) ||
            [user.mobile, user.phone].some((number) => number.replace(/\D/g, "") === digits),
        )
      )
        return "directory";
      if (
        data.externalContacts.some(
          (item) =>
            item.customerId === customer.id &&
            ((email && item.email.toLowerCase() === email) ||
              item.mobile.replace(/\D/g, "") === digits),
        )
      )
        return "duplicate";
      const created: ExternalContact = {
        id: uid("contact"),
        customerId: customer.id,
        name,
        organization,
        email,
        mobile,
        createdAt: new Date().toISOString(),
      };
      setData((current) => ({
        ...current,
        externalContacts: [created, ...current.externalContacts],
      }));
      return "added";
    },
    [data],
  );

  const grantAccess = useCallback<Store["grantAccess"]>(
    (userId, role) => {
      if (
        !agent ||
        accessGrants.find((grant) => grant.email === agent.email.toLowerCase())?.role !==
          "super-admin"
      )
        return "forbidden";
      const user = data.users[WORKSPACE_ID]?.find(
        (entry) => entry.id === userId && entry.status === "active",
      );
      if (!user || !["admin", "super-admin"].includes(role)) return "invalid-user";
      if (accessGrants.some((grant) => grant.email === user.email.toLowerCase()))
        return "duplicate";
      setAccessGrants((current) => [
        ...current,
        {
          userId: user.id,
          email: user.email.toLowerCase(),
          name: `${user.firstName} ${user.lastName}`,
          role,
        },
      ]);
      return "granted";
    },
    [agent, accessGrants, data.users],
  );

  const templateActivity = useCallback(
    (
      t: Template,
      action: "template-created" | "template-updated" | "template-deleted",
    ): LogEntry => ({
      id: uid("log"),
      customerId: t.customerId,
      kind: "signature",
      action,
      name: t.name || "Untitled template",
      detail: "",
      templateId: t.id,
      trigger: "manual",
      triggeredBy: agent?.email ?? "agent",
      startedAt: new Date().toISOString(),
      durationMs: 0,
      results: [],
    }),
    [agent],
  );

  const saveTemplate = useCallback(
    (t: Template) => {
      if (t.customerId !== WORKSPACE_ID) return;
      setData((d) => {
        const editing = d.templates.some((x) => x.id === t.id && x.customerId === t.customerId);
        const entry = templateActivity(t, editing ? "template-updated" : "template-created");
        const next = { ...t, updatedAt: entry.startedAt };
        return {
          ...d,
          templates: editing
            ? d.templates.map((x) => (x.id === t.id && x.customerId === t.customerId ? next : x))
            : [next, ...d.templates],
          logs: [entry, ...d.logs],
        };
      });
    },
    [templateActivity],
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      setData((d) => {
        const t = d.templates.find((x) => x.id === id);
        if (!t || t.customerId !== WORKSPACE_ID) return d;
        return {
          ...d,
          templates: d.templates.filter((x) => x.id !== id),
          logs: [templateActivity(t, "template-deleted"), ...d.logs],
        };
      });
    },
    [templateActivity],
  );

  const commitBatch = useCallback((log: LogEntry, ch: BatchCommit) => {
    if (log.customerId !== WORKSPACE_ID) return;
    setData((d) => {
      const remove = new Set(ch.removeDelegationIds ?? []);
      return {
        ...d,
        logs: [log, ...d.logs],
        assignments: ch.assignments
          ? {
              ...d.assignments,
              [log.customerId]: { ...d.assignments[log.customerId], ...ch.assignments },
            }
          : d.assignments,
        delegations: [
          ...d.delegations.filter((x) => !remove.has(x.id)),
          ...(ch.addDelegations ?? []),
        ],
      };
    });
  }, []);

  const resetDemo = useCallback(() => {
    clearDemoRecallHistory();
    setData(scopeSeed(buildSeed(agent?.email ?? "admin@brio.co.in")));
    setAccessGrants([]);
    setConnected(false);
    setRoute({ name: "setup" });
  }, [agent]);

  const value = useMemo<Store>(
    () => ({
      agent,
      data,
      route,
      navigate,
      login,
      logout,
      connected,
      accessGrants,
      previewWorkspace,
      verifyConnection,
      grantAccess,
      addCustomer,
      addExternalContact,
      saveTemplate,
      deleteTemplate,
      commitBatch,
      toasts,
      toast,
      resetDemo,
    }),
    [
      agent,
      data,
      route,
      navigate,
      login,
      logout,
      connected,
      accessGrants,
      previewWorkspace,
      verifyConnection,
      grantAccess,
      addCustomer,
      addExternalContact,
      saveTemplate,
      deleteTemplate,
      commitBatch,
      toasts,
      toast,
      resetDemo,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

/** Everything scoped to one customer. */
export function useCustomer(id: string) {
  const { data } = useStore();
  const customer = id === WORKSPACE_ID ? data.customers.find((c) => c.id === id) : undefined;
  const stored = data.users[id];
  const users = useMemo(
    () => (customer ? customerDirectory(customer, stored) : []),
    [customer, stored],
  );
  return useMemo(() => {
    return {
      customer,
      users,
      templates: data.templates.filter((t) => t.customerId === id),
      logs: data.logs.filter((l) => l.customerId === id),
      assignments: data.assignments[id] ?? {},
      delegations: data.delegations.filter((x) => x.customerId === id),
      externalContacts: data.externalContacts.filter((x) => x.customerId === id),
    };
  }, [data, id, customer, users]);
}

export type CustomerScope = Omit<ReturnType<typeof useCustomer>, "customer"> & {
  customer: Customer;
};
