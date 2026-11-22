import { useMemo } from "react";
import type { DirectoryUser } from "./data";
import {
  emailRecallApi,
  type Page,
  type RecallRecord,
  type SentEmail,
  type WorkspaceUser,
} from "./emailRecallApi";
import { useStore } from "./store";

const HISTORY_KEY = "brio-email-recall-demo-history-v1";
const demoNow = Date.now();
const subjects = [
  "Quarterly planning notes",
  "Project handoff",
  "Updated proposal",
  "Team meeting follow-up",
  "Customer review",
  "Invoice clarification",
  "Launch checklist",
  "Schedule update",
  "Draft agreement",
  "Design feedback",
  "Monthly report",
  "Action items",
];

function page<T>(items: T[], token: string | undefined, size: number): Page<T> {
  const offset = Number(token ?? 0);
  const start = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  return {
    items: items.slice(start, start + size),
    nextPageToken: start + size < items.length ? String(start + size) : undefined,
  };
}

function profile(user: DirectoryUser): WorkspaceUser {
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`.trim(),
    primaryEmail: user.email,
    orgUnit: user.orgUnit,
    department: user.department,
    title: user.title,
    phone: user.phone,
    status: user.status,
  };
}

function sentMessages(user: DirectoryUser, directory: DirectoryUser[]): SentEmail[] {
  const others = directory.filter((entry) => entry.id !== user.id && entry.status === "active");
  return subjects.map((subject, index) => {
    const internal = others[(index * 3) % others.length]?.email ?? "admin@brio.co.in";
    const external = `contact${index + 1}@example.net`;
    const to = index % 3 === 0 ? [internal, external] : index % 3 === 1 ? [internal] : [external];
    const cc =
      index % 4 === 0 ? [others[(index * 3 + 1) % others.length]?.email ?? "admin@brio.co.in"] : [];
    const recipients = [...to, ...cc];
    const internalCount = recipients.filter((address) =>
      address.toLowerCase().endsWith("@brio.co.in"),
    ).length;
    return {
      id: `${user.id}:sent:${index + 1}`,
      subject,
      sentAt: new Date(demoNow - (index + 1) * 86400000).toISOString(),
      sender: user.email,
      to,
      cc,
      bcc: index % 5 === 0 ? undefined : [],
      snippet: `Demo message about ${subject.toLowerCase()}.`,
      bodyText: `Hi team,\n\nPlease review the ${subject.toLowerCase()} and share any updates.\n\nThanks,\n${user.firstName}`,
      attachments: index % 4 === 0 ? [{ name: "sample-document.pdf", size: 24000 }] : [],
      hasAttachments: index % 4 === 0,
      internalCount,
      externalCount: recipients.length - internalCount,
    };
  });
}

function readHistory(): RecallRecord[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is RecallRecord =>
          Boolean(item && typeof item.id === "string" && Array.isArray(item.results)),
        )
      : [];
  } catch {
    return [];
  }
}

function demoApi(directory: DirectoryUser[], initiatedBy: string): typeof emailRecallApi {
  const findUser = (id: string) => directory.find((entry) => entry.id === id);
  const findEmail = (userId: string, messageId: string) => {
    const user = findUser(userId);
    return user && sentMessages(user, directory).find((entry) => entry.id === messageId);
  };
  const missing = () => {
    throw new Error("Demo record not found. Refresh and try again.");
  };
  return {
    users: async (options = {}) => {
      const query = options.query?.trim().toLowerCase();
      const unit = options.orgUnit?.trim().toLowerCase();
      const matches = directory
        .map(profile)
        .filter(
          (user) =>
            (!query || `${user.name} ${user.primaryEmail}`.toLowerCase().includes(query)) &&
            (!options.status || user.status === options.status) &&
            (!unit || user.orgUnit.toLowerCase().includes(unit)),
        );
      return page(matches, options.pageToken, 100);
    },
    user: async (id) => {
      const user = findUser(id);
      return user ? profile(user) : missing();
    },
    sent: async (id, options = {}) => {
      const user = findUser(id);
      if (!user) return missing();
      const query = options.query?.trim().toLowerCase();
      const matches = sentMessages(user, directory).filter(
        (email) =>
          (!query ||
            `${email.subject} ${[...email.to, ...email.cc, ...(email.bcc ?? [])].join(" ")}`
              .toLowerCase()
              .includes(query)) &&
          (!options.after || email.sentAt.slice(0, 10) >= options.after) &&
          (!options.before || email.sentAt.slice(0, 10) <= options.before) &&
          (!options.recipientType ||
            (options.recipientType === "internal"
              ? email.internalCount > 0
              : email.externalCount > 0)),
      );
      return page(matches, options.pageToken, 10);
    },
    email: async (userId, messageId) => findEmail(userId, messageId) ?? missing(),
    recall: async (userId, messageId, reason) => {
      const email = findEmail(userId, messageId);
      if (!email) return missing();
      const results = [...email.to, ...email.cc, ...(email.bcc ?? [])].map((address) => ({
        email: address,
        status: address.toLowerCase().endsWith("@brio.co.in")
          ? ("successful" as const)
          : ("skipped" as const),
        detail: address.toLowerCase().endsWith("@brio.co.in")
          ? "Demo: eligible internal copy moved to Trash."
          : "Demo: external mailboxes cannot be recalled.",
      }));
      const record: RecallRecord = {
        id: `demo-recall-${crypto.randomUUID()}`,
        messageId,
        subject: email.subject,
        sender: email.sender,
        initiatedBy,
        reason,
        startedAt: new Date().toISOString(),
        status: results.some((result) => result.status === "successful") ? "partial" : "failed",
        results,
      };
      if (results.every((result) => result.status === "successful")) record.status = "completed";
      localStorage.setItem(HISTORY_KEY, JSON.stringify([record, ...readHistory()]));
      return record;
    },
    record: async (id) => readHistory().find((entry) => entry.id === id) ?? missing(),
    history: async (token) => page(readHistory(), token, 20),
  };
}

export function clearDemoRecallHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function useEmailRecallClient() {
  const { connected, data, agent } = useStore();
  const directory = data?.users?.c_brio;
  const isDemo = connected === false && Boolean(directory);
  const api = useMemo(
    () => (isDemo && directory ? demoApi(directory, agent?.email ?? "Demo admin") : emailRecallApi),
    [isDemo, directory, agent?.email],
  );
  return { api, isDemo };
}
