export type UserStatus = "active" | "suspended";

export interface DirectoryUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  department: string;
  orgUnit: string;
  phone: string;
  mobile: string;
  location: string;
  status: UserStatus;
}

export type CustomerStatus = "active" | "pending" | "error";
export const PLANS = [
  "Business Starter",
  "Business Standard",
  "Business Plus",
  "Enterprise",
] as const;
export type Plan = (typeof PLANS)[number];

export interface Customer {
  id: string;
  name: string;
  domain: string;
  serviceAccount: string;
  contactName: string;
  contactEmail: string;
  address: string;
  website: string;
  plan: Plan | null;
  status: CustomerStatus;
  color: string;
  createdAt: string;
}

export interface Agent {
  name: string;
  email: string;
}

export interface RecipientSelection {
  /** When true, every directory user is included except those in `ids`. */
  all: boolean;
  ids: string[];
}

export interface Template {
  id: string;
  customerId: string;
  name: string;
  description: string;
  notify: string[];
  notifyWhen: "always" | "errors";
  html: string;
  updatedAt: string;
}

export type ResultStatus = "applied" | "skipped" | "failed";

export interface LogResult {
  userId: string;
  name: string;
  email: string;
  status: ResultStatus;
  message: string;
}

export type BatchKind = "signature" | "delegation";
export type ActivityAction =
  | "template-created"
  | "template-updated"
  | "template-deleted"
  | "signature-assigned"
  | "delegate-added"
  | "delegate-removed";

export interface DeploymentNotification {
  recipients: string[];
  when: "always" | "errors";
}

export interface LogEntry {
  id: string;
  customerId: string;
  kind: BatchKind;
  action?: ActivityAction;
  name: string;
  detail: string;
  templateId: string | null;
  trigger: "manual" | "schedule";
  triggeredBy: string;
  startedAt: string;
  durationMs: number;
  notification?: DeploymentNotification;
  results: LogResult[];
}

export interface Assignment {
  templateId: string | null;
  templateName: string;
  html: string;
  at: string;
}

export interface Delegation {
  id: string;
  customerId: string;
  ownerId: string;
  delegateId: string;
  status?: "active" | "pending";
  createdAt: string;
}

export interface ExternalContact {
  id: string;
  customerId: string;
  name: string;
  organization: string;
  email: string;
  mobile: string;
  createdAt: string;
}

export const DEMO_AGENT = {
  name: "Rhea Kapoor",
  email: "agent@workspaceops.io",
  password: "demo1234",
};

export function customerLogo(c: Pick<Customer, "name" | "color">) {
  const initial = c.name.trim()[0]?.toUpperCase() ?? "?";
  const word = escapeHtml(c.name.split(" ")[0]);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="36" viewBox="0 0 140 36"><rect width="36" height="36" rx="8" fill="${c.color}"/><text x="18" y="25" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="18" font-weight="700" fill="#fff">${initial}</text><text x="44" y="24" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="#0f172a">${word}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

const FIRST = [
  "Abdul",
  "Aisha",
  "Rohan",
  "Priya",
  "Vikram",
  "Meera",
  "Arjun",
  "Sneha",
  "Karthik",
  "Divya",
  "Rahul",
  "Ananya",
  "Siddharth",
  "Kavya",
  "Nikhil",
  "Pooja",
  "Aditya",
  "Ishita",
  "Farhan",
  "Neha",
  "Varun",
  "Tanvi",
  "Imran",
  "Shreya",
  "Manoj",
  "Ritika",
  "Sameer",
  "Lakshmi",
  "Gaurav",
  "Zoya",
  "Harish",
  "Nandini",
  "Omar",
  "Pallavi",
  "Suresh",
  "Fatima",
  "Deepak",
  "Aditi",
  "Kunal",
  "Sana",
  "Rajesh",
  "Bhavna",
  "Yusuf",
  "Swati",
  "Tarun",
  "Riya",
  "Mohan",
  "Leela",
  "Daniel",
  "Grace",
];
const LAST = [
  "Haq Adiy",
  "Khan",
  "Mehta",
  "Sharma",
  "Reddy",
  "Iyer",
  "Nair",
  "Kulkarni",
  "Rao",
  "Menon",
  "Verma",
  "Gupta",
  "Bose",
  "Pillai",
  "Joshi",
  "Desai",
  "Chopra",
  "Banerjee",
  "Ali",
  "Kapoor",
  "Saxena",
  "Patil",
  "Qureshi",
  "Ghosh",
  "Kumar",
  "Malhotra",
  "Shaikh",
  "Krishnan",
  "Arora",
  "Siddiqui",
  "Hegde",
  "Das",
  "Farooq",
  "Jain",
  "Babu",
  "Ansari",
  "Mishra",
  "Rathore",
  "Sinha",
  "Mirza",
  "Yadav",
  "Bhatt",
  "Syed",
  "Tiwari",
  "Grover",
  "Sen",
  "Prasad",
  "Varma",
  "Thomas",
  "Fernandes",
];
const ROLES: [string, string, string][] = [
  ["Design", "Design - Trainee", "/Design"],
  ["Design", "Senior Product Designer", "/Design"],
  ["Engineering", "Software Engineer", "/Engineering"],
  ["Engineering", "Engineering Manager", "/Engineering"],
  ["Engineering", "DevOps Engineer", "/Engineering/Platform"],
  ["Sales", "Account Executive", "/Sales"],
  ["Sales", "Sales Director", "/Sales"],
  ["Marketing", "Content Strategist", "/Marketing"],
  ["Marketing", "Growth Marketer", "/Marketing"],
  ["Operations", "HR Business Partner", "/Operations/HR"],
  ["Operations", "Finance Analyst", "/Operations/Finance"],
  ["Support", "Customer Success Lead", "/Support"],
];
const LOCATIONS = ["Hyderabad", "Bengaluru", "Mumbai", "Pune", "Remote"];

/** Deterministic mock directory for a customer domain. */
export function generateUsers(domain: string, count: number, seed: number): DirectoryUser[] {
  return Array.from({ length: count }, (_, n) => {
    const i = (n + seed * 7) % FIRST.length;
    const first = FIRST[i];
    const last = LAST[(n * 3 + seed) % LAST.length];
    const [department, title, orgUnit] = ROLES[(n * 7 + seed) % ROLES.length];
    return {
      id: `${domain}:${n + 1}`,
      firstName: first,
      lastName: last,
      email: `${first}.${last.split(" ")[0]}${n >= FIRST.length ? n : ""}@${domain}`.toLowerCase(),
      title,
      department,
      orgUnit,
      phone:
        (n + seed) % 6 !== 3 ? `+91 40 ${4100 + ((n * 37) % 900)} ${2200 + ((n * 53) % 700)}` : "",
      mobile: (n + seed) % 4 !== 1 ? `${8790037900 + n * 1311 + seed * 17}` : "",
      location: LOCATIONS[(n + seed) % LOCATIONS.length],
      status: (n + seed) % 13 === 7 ? "suspended" : "active",
    };
  });
}

export interface VariableDef {
  key: string;
  label: string;
  group: "Person" | "Contact" | "Company";
}

export const VARIABLES: VariableDef[] = [
  { key: "firstName", label: "First name", group: "Person" },
  { key: "lastName", label: "Last name", group: "Person" },
  { key: "fullName", label: "Full name", group: "Person" },
  { key: "title", label: "Job title", group: "Person" },
  { key: "department", label: "Department", group: "Person" },
  { key: "email", label: "Email", group: "Contact" },
  { key: "phone", label: "Work phone", group: "Contact" },
  { key: "mobile", label: "Mobile", group: "Contact" },
  { key: "location", label: "Office location", group: "Contact" },
  { key: "companyName", label: "Company name", group: "Company" },
  { key: "companyAddress", label: "Company address", group: "Company" },
  { key: "website", label: "Website", group: "Company" },
  { key: "companyLogo", label: "Company logo URL", group: "Company" },
];

export function variableValues(u: DirectoryUser, c: Customer): Record<string, string> {
  return {
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: `${u.firstName} ${u.lastName}`,
    title: u.title,
    department: u.department,
    email: u.email,
    phone: u.phone,
    mobile: u.mobile,
    location: u.location,
    companyName: c.name,
    companyAddress: c.address,
    website: c.website,
    companyLogo: customerLogo(c),
  };
}

const TOKEN = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

export function renderSignature(html: string, u: DirectoryUser, c: Customer): string {
  const values = variableValues(u, c);
  return html.replace(TOKEN, (_, key: string) => {
    const v = values[key] ?? "";
    return key === "companyLogo" ? v : escapeHtml(v);
  });
}

export function usedVariables(html: string): string[] {
  return Array.from(new Set(Array.from(html.matchAll(TOKEN), (m) => m[1])));
}

export function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
}

export interface BlockDef {
  id: string;
  label: string;
  description: string;
  html: string;
}

export const BLOCKS: BlockDef[] = [
  {
    id: "contact",
    label: "Contact card",
    description: "Name, title, email and phone",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#334155;line-height:1.5"><b style="font-size:14px;color:#0f172a">{{fullName}}</b><br>{{title}} · {{department}}<br><a href="mailto:{{email}}" style="color:#1d3fd1">{{email}}</a> | {{mobile}}</div>`,
  },
  {
    id: "company",
    label: "Company details",
    description: "Company name, address and website",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;line-height:1.5"><b style="color:#0f172a">{{companyName}}</b><br>{{companyAddress}}<br><a href="https://{{website}}" style="color:#1d3fd1">{{website}}</a></div>`,
  },
  {
    id: "logo",
    label: "Company logo",
    description: "Logo from the customer profile",
    html: `<img src="{{companyLogo}}" alt="{{companyName}}" width="140" height="36" style="display:block;border:0">`,
  },
  {
    id: "divider",
    label: "Divider",
    description: "Thin horizontal rule",
    html: `<hr style="border:0;border-top:1px solid #e2e8f0;margin:10px 0;width:320px">`,
  },
  {
    id: "disclaimer",
    label: "Legal disclaimer",
    description: "Confidentiality notice",
    html: `<p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#94a3b8;max-width:460px;line-height:1.4">This email and any attachments are confidential and intended solely for the addressee. If you received it in error, please notify the sender and delete it.</p>`,
  },
  {
    id: "cta",
    label: "Banner link",
    description: "Promotional call-to-action button",
    html: `<a href="https://{{website}}" style="display:inline-block;margin-top:8px;padding:6px 12px;background:#1d3fd1;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:12px;border-radius:4px;text-decoration:none">Visit {{companyName}} →</a>`,
  },
];

export const STARTER_HTML = `<table cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#334155"><tbody><tr><td style="padding-right:16px;border-right:2px solid #1d3fd1;vertical-align:top"><img src="{{companyLogo}}" alt="{{companyName}}" width="140" height="36" style="display:block;border:0"></td><td style="padding-left:16px;line-height:1.55"><b style="font-size:15px;color:#0f172a">{{fullName}}</b><br><span style="color:#64748b">{{title}}</span><br><a href="mailto:{{email}}" style="color:#1d3fd1">{{email}}</a> | {{mobile}}<br><a href="https://{{website}}" style="color:#1d3fd1">{{website}}</a></td></tr></tbody></table>`;

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function isSelected(sel: RecipientSelection, id: string) {
  return sel.all ? !sel.ids.includes(id) : sel.ids.includes(id);
}

export function selectedUsers(sel: RecipientSelection, users: DirectoryUser[]) {
  const ids = new Set(sel.ids);
  return users.filter((u) => sel.all !== ids.has(u.id));
}

const DRAFT_SIGNATURE_HTML = [
  '<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#555;line-height:1.6">',
  '<div style="margin-bottom:8px;font-size:16px;font-weight:700;color:#1f1f1f">{{firstName}} {{lastName}}</div>',
  '<div style="margin-bottom:4px">{{title}}</div>',
  '<div style="margin-bottom:4px">{{email}} | {{mobile}}</div>',
  '<div style="margin-bottom:8px">{{website}}</div>',
  '<img src="{{companyLogo}}" alt="{{companyName}}" width="140" style="border:0">',
  "</div>",
].join("");

export function newTemplate(customerId: string, id = uid("tpl")): Template {
  return {
    id,
    customerId,
    name: "",
    description: "",
    notify: [],
    notifyWhen: "always",
    html: DRAFT_SIGNATURE_HTML,
    updatedAt: new Date().toISOString(),
  };
}

export function signatureResults(users: DirectoryUser[], failIndex = -1): LogResult[] {
  return users.map((u, i) => {
    const base = { userId: u.id, name: fullName(u), email: u.email };
    if (u.status === "suspended")
      return { ...base, status: "skipped", message: "User is suspended" };
    if (i === failIndex)
      return { ...base, status: "failed", message: "Sample failure: rate limit exceeded" };
    return { ...base, status: "applied", message: "Signature saved in demo records" };
  });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (Math.abs(m) < 1) return "just now";
  if (m < 0) {
    const h = Math.round(-m / 60);
    return h >= 24 ? `in ${Math.round(h / 24)}d` : `in ${h}h`;
  }
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function fullName(u: DirectoryUser) {
  return `${u.firstName} ${u.lastName}`;
}

/* ---------- Seed data ---------- */

const daysAgo = (d: number, h = 10) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, 12, 0, 0);
  return t.toISOString();
};

export const CUSTOMER_COLORS = [
  "#1d3fd1",
  "#0f766e",
  "#b45309",
  "#7c3aed",
  "#be123c",
  "#0369a1",
  "#4d7c0f",
];

const SEED_CUSTOMERS: (Omit<Customer, "createdAt"> & { users: number; created: number })[] = [
  {
    id: "c_brio",
    name: "Brio Technologies",
    domain: "brio.co.in",
    serviceAccount: "gws-ops@brio-prod.iam.gserviceaccount.com",
    contactName: "Abdul Haq Adiy",
    contactEmail: "it@brio.co.in",
    address: "4th Floor, Cyber Towers, Hitech City, Hyderabad 500081",
    website: "www.briotech.com",
    plan: "Business Plus",
    status: "active",
    color: CUSTOMER_COLORS[0],
    users: 48,
    created: 120,
  },
  {
    id: "c_northwind",
    name: "Northwind Logistics",
    domain: "northwind.io",
    serviceAccount: "signatures@northwind-gws.iam.gserviceaccount.com",
    contactName: "Meera Iyer",
    contactEmail: "admin@northwind.io",
    address: "Plot 22, MIDC Andheri East, Mumbai 400093",
    website: "www.northwind.io",
    plan: "Business Standard",
    status: "active",
    color: CUSTOMER_COLORS[1],
    users: 32,
    created: 84,
  },
  {
    id: "c_lumen",
    name: "Lumen Health",
    domain: "lumenhealth.com",
    serviceAccount: "ops@lumen-health.iam.gserviceaccount.com",
    contactName: "Karthik Rao",
    contactEmail: "karthik@lumenhealth.com",
    address: "12 Residency Road, Bengaluru 560025",
    website: "www.lumenhealth.com",
    plan: "Enterprise",
    status: "active",
    color: CUSTOMER_COLORS[3],
    users: 26,
    created: 60,
  },
  {
    id: "c_kestrel",
    name: "Kestrel Capital",
    domain: "kestrelcap.com",
    serviceAccount: "gws@kestrel-cap.iam.gserviceaccount.com",
    contactName: "Ritika Malhotra",
    contactEmail: "it@kestrelcap.com",
    address: "One BKC, Bandra Kurla Complex, Mumbai 400051",
    website: "www.kestrelcap.com",
    plan: "Business Plus",
    status: "error",
    color: CUSTOMER_COLORS[4],
    users: 18,
    created: 41,
  },
  {
    id: "c_saffron",
    name: "Saffron Foods",
    domain: "saffronfoods.in",
    serviceAccount: "admin-tools@saffron-foods.iam.gserviceaccount.com",
    contactName: "Farhan Ali",
    contactEmail: "farhan@saffronfoods.in",
    address: "Survey 45, Hinjewadi Phase 2, Pune 411057",
    website: "www.saffronfoods.in",
    plan: "Business Starter",
    status: "active",
    color: CUSTOMER_COLORS[2],
    users: 40,
    created: 22,
  },
  {
    id: "c_atlas",
    name: "Atlas Studio",
    domain: "atlasstudio.co",
    serviceAccount: "",
    contactName: "Zoya Siddiqui",
    contactEmail: "zoya@atlasstudio.co",
    address: "Road No. 36, Jubilee Hills, Hyderabad 500033",
    website: "www.atlasstudio.co",
    plan: "Business Standard",
    status: "pending",
    color: CUSTOMER_COLORS[5],
    users: 0,
    created: 2,
  },
];

const demoPrefixes =
  "Alder Amber Ashford Beacon Birch Bluewater Cedar Copper Crestline Evergreen Fairmont Fern Fieldstone Harbor Highland Juniper Lakeview Maple Meridian Oakwell Orchard Pinecrest Redwood Ridgeway Silverline Summit Thistle Westbridge Willow Windward".split(
    " ",
  );
const demoSectors =
  "Advisory Analytics Architecture Automation Banking Biotech Capital Care Cloud Consulting Design Digital Distribution Education Energy Engineering Exports Finance Foods Fulfillment Health Holdings Hospitality Industries Insurance Labs Learning Logistics Manufacturing Marine Media Networks Packaging Partners Pharma Power Properties Research Retail Robotics Services Software Studio Systems Textiles Trading Transport Ventures Works Workspace".split(
    " ",
  );
const demoLocations = [
  "Bengaluru 560001",
  "Hyderabad 500081",
  "Mumbai 400051",
  "Pune 411057",
  "Chennai 600032",
  "New Delhi 110020",
  "Kolkata 700091",
  "Ahmedabad 380015",
];
const demoStreets = [
  "Park Avenue",
  "Commerce Road",
  "Central Boulevard",
  "Station Road",
  "Lake View Road",
  "Technology Park",
];

function demoCustomerIndex(id: string) {
  return id.startsWith("c_demo_") ? Number(id.slice(7)) : undefined;
}

export function directorySize(customer: Customer, stored?: DirectoryUser[]) {
  if (stored) return stored.length;
  const n = demoCustomerIndex(customer.id);
  if (n === undefined || customer.status === "pending") return 0;
  return n % 53 === 0 ? 250 + (n % 480) : 8 + ((n * 13) % 115);
}

export function customerDirectory(customer: Customer, stored?: DirectoryUser[]) {
  return (
    stored ??
    generateUsers(customer.domain, directorySize(customer), demoCustomerIndex(customer.id) ?? 0)
  );
}

/** Extend saved demo data without replacing its customers or operational records. */
export function withDemoCustomers(data: Seed): Seed {
  if (data.customers.some((customer) => demoCustomerIndex(customer.id) !== undefined)) return data;
  const total = 1200 + Math.floor(Math.random() * 301);
  const names = new Set(data.customers.map((c) => c.name.toLowerCase()));
  const domains = new Set(data.customers.map((c) => c.domain.toLowerCase()));
  const customers = [...data.customers];
  const now = Date.now();
  const combinations = demoPrefixes.length * demoSectors.length;
  for (let i = 0; customers.length < total; i++) {
    const slot = (i * 677) % combinations;
    const prefix = demoPrefixes[slot % demoPrefixes.length];
    const sector = demoSectors[Math.floor(slot / demoPrefixes.length)];
    const name = prefix + " " + sector + (i >= combinations ? " Group" : "");
    const slug = name.toLowerCase().split(" ").join("-");
    const domain = slug + ".example";
    if (names.has(name.toLowerCase()) || domains.has(domain)) continue;
    const status = i % 17 === 0 ? "pending" : i % 23 === 0 ? "error" : "active";
    const contactFirst = FIRST[(i * 7 + Math.floor(i / FIRST.length)) % FIRST.length];
    const contactLast = LAST[(i * 3 + Math.floor(i / LAST.length)) % LAST.length];
    customers.push({
      id: "c_demo_" + i,
      name,
      domain,
      status,
      serviceAccount:
        status === "pending" ? "" : "workspace-ops@" + slug + ".iam.gserviceaccount.com",
      contactName: contactFirst + " " + contactLast,
      contactEmail: (i % 3 === 0 ? "admin@" : "it@") + domain,
      address:
        12 +
        (i % 180) +
        " " +
        demoStreets[(i * 5) % demoStreets.length] +
        ", " +
        demoLocations[(i * 3) % demoLocations.length],
      website: "www." + domain,
      plan: PLANS[(i * 3 + Math.floor(i / 7)) % PLANS.length],
      color: CUSTOMER_COLORS[i % CUSTOMER_COLORS.length],
      createdAt: new Date(now - (14 + ((i * 31) % 1500)) * 86400000).toISOString(),
    });
  }
  return { ...data, customers };
}

export interface Seed {
  customers: Customer[];
  users: Record<string, DirectoryUser[]>;
  templates: Template[];
  logs: LogEntry[];
  assignments: Record<string, Record<string, Assignment>>;
  delegations: Delegation[];
  externalContacts: ExternalContact[];
}

export function buildSeed(agentEmail: string): Seed {
  const customers: Customer[] = SEED_CUSTOMERS.map(({ users: _u, created, ...c }) => ({
    ...c,
    createdAt: daysAgo(created),
  }));
  const users: Record<string, DirectoryUser[]> = {};
  SEED_CUSTOMERS.forEach((c, i) => (users[c.id] = generateUsers(c.domain, c.users, i)));

  const templates: Template[] = [];
  const logs: LogEntry[] = [];
  const assignments: Record<string, Record<string, Assignment>> = {};
  const delegations: Delegation[] = [];

  SEED_CUSTOMERS.filter((c) => c.users > 0).forEach((c, ci) => {
    const dir = users[c.id];
    const std: Template = {
      ...newTemplate(c.id),
      id: `tpl_${c.id}_std`,
      name: "Company standard",
      description: "Default signature for all employees with logo and contact details.",
      html: STARTER_HTML,
      notify: [c.contactEmail],
      updatedAt: daysAgo(10 + ci),
    };
    templates.push(std);
    const run: LogEntry = {
      id: `log_${c.id}_1`,
      customerId: c.id,
      kind: "signature",
      name: std.name,
      detail: "Template · entire directory",
      templateId: std.id,
      trigger: "manual",
      triggeredBy: agentEmail,
      startedAt: daysAgo(8 + ci),
      durationMs: 600 + dir.length * 320,
      results: signatureResults(
        selectedUsers({ all: true, ids: [dir[3].id] }, dir),
        ci % 2 === 0 ? 9 : -1,
      ),
    };
    logs.push(run);
    assignments[c.id] = {};
    run.results.forEach((r) => {
      if (r.status === "applied")
        assignments[c.id][r.userId] = {
          templateId: std.id,
          templateName: std.name,
          html: std.html,
          at: run.startedAt,
        };
    });

    // A couple of delegations per customer, with a matching batch.
    const owner = dir[1];
    const helpers = [dir[4], dir[6]].filter(Boolean);
    const at = daysAgo(3 + ci, 14);
    helpers.forEach((d, k) =>
      delegations.push({
        id: `dlg_${c.id}_${k}`,
        customerId: c.id,
        ownerId: owner.id,
        delegateId: d.id,
        createdAt: at,
      }),
    );
    logs.push({
      id: `log_${c.id}_2`,
      customerId: c.id,
      kind: "delegation",
      name: `Delegate access to ${fullName(owner)}`,
      detail: `${helpers.length} delegates added`,
      templateId: null,
      trigger: "manual",
      triggeredBy: agentEmail,
      startedAt: at,
      durationMs: 1400,
      results: helpers.map((d) => ({
        userId: d.id,
        name: fullName(d),
        email: d.email,
        status: "applied",
        message: `Sample delegate record for ${owner.email}`,
      })),
    });
  });

  templates.push(
    {
      ...newTemplate("c_brio"),
      id: "tpl_brio_sales",
      name: "Sales — Q3 campaign",
      description: "Adds a promotional banner link for the sales team.",
      html: STARTER_HTML + BLOCKS[5].html,
      updatedAt: daysAgo(1),
    },
    {
      ...newTemplate("c_brio"),
      id: "tpl_brio_min",
      name: "Design team minimal",
      description: "Lightweight text-only signature.",
      html: BLOCKS[0].html,
      updatedAt: daysAgo(0, 9),
    },
  );

  logs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return withDemoCustomers({
    customers,
    users,
    templates,
    logs,
    assignments,
    delegations,
    externalContacts: [],
  });
}
