// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { EmailRecallDirectory } from "../src/pages/EmailRecallDirectory";
import { EmailRecallUser } from "../src/pages/EmailRecallUser";
import { EmailRecallWorkflow } from "../src/pages/EmailRecallWorkflow";
import { CustomerDetailPage } from "../src/pages/CustomerDetail";
import { useState } from "react";
import type { CustomerTab, Route } from "../src/store";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  api: {
    users: vi.fn(),
    user: vi.fn(),
    sent: vi.fn(),
    email: vi.fn(),
    recall: vi.fn(),
    record: vi.fn(),
    history: vi.fn(),
  },
}));

vi.mock("../src/emailRecallApi", () => ({ emailRecallApi: mocks.api }));
vi.mock("../src/store", () => ({
  useStore: () => ({ navigate: mocks.navigate }),
  useCustomer: () => ({
    customer: {
      id: "c_brio",
      domain: "example.com",
      status: "active",
      plan: "Demo",
      createdAt: "2026-01-01",
      contactEmail: "admin@example.com",
    },
    users: [user],
    templates: [],
    logs: [],
    assignments: {},
    delegations: [],
  }),
}));

const user = {
  id: "u1",
  name: "Alex Smith",
  primaryEmail: "alex@example.com",
  orgUnit: "/Sales",
  status: "active",
};
const email = {
  id: "m1",
  subject: "A long message",
  sentAt: "2026-11-20T10:00:00Z",
  sender: "alex@example.com",
  to: ["one@example.com", "two@example.com"],
  cc: [],
  hasAttachments: false,
  internalCount: 1,
  externalCount: 1,
  bodyText: "<script>window.bad = true</script>",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.api.users.mockResolvedValue({ items: [user], nextPageToken: "p2" });
  mocks.api.user.mockResolvedValue(user);
  mocks.api.sent.mockResolvedValue({ items: [email], nextPageToken: undefined });
  mocks.api.email.mockResolvedValue(email);
  mocks.api.history.mockResolvedValue({ items: [] });
});
afterEach(cleanup);

test("directory sends filters, appends unique users, and opens the dedicated page", async () => {
  mocks.api.users
    .mockResolvedValueOnce({ items: [user], nextPageToken: "p2" })
    .mockResolvedValueOnce({ items: [user, { ...user, id: "u2", name: "Taylor" }] });
  render(<EmailRecallDirectory />);
  await screen.findByRole("button", { name: "Open Alex Smith" });
  expect(screen.getByRole("columnheader", { name: "Action" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Load more users" }));
  await screen.findByRole("button", { name: "Open Taylor" });
  expect(screen.getAllByRole("button", { name: "Open Alex Smith" })).toHaveLength(1);
  expect(mocks.api.users).toHaveBeenLastCalledWith(expect.objectContaining({ pageToken: "p2" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Account status" }), {
    target: { value: "active" },
  });
  await waitFor(() =>
    expect(mocks.api.users).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "active", pageToken: undefined }),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Open Alex Smith" }));
  expect(mocks.navigate).toHaveBeenCalledWith({
    name: "customer",
    id: "c_brio",
    tab: "email-recall",
    recallUserId: "u1",
  });
});

test("user details use a full workspace page and return to the Email Recall tab", async () => {
  function Workspace() {
    const [route, setRoute] = useState<Route>({
      name: "customer",
      id: "c_brio",
      tab: "forwarding",
    });
    mocks.navigate.mockImplementation((next: Route) => setRoute(next));
    if (route.name !== "customer") return null;
    return (
      <CustomerDetailPage
        id={route.id}
        tab={route.tab as CustomerTab}
        recallUserId={route.recallUserId}
        recallMessageId={route.recallMessageId}
      />
    );
  }
  render(<Workspace />);
  fireEvent.click(screen.getByRole("tab", { name: "Email Recall" }));
  const tab = screen.getByRole("tab", { name: "Email Recall" });
  expect(tab.getAttribute("aria-selected")).toBe("true");
  expect(tab.getAttribute("aria-controls")).toBe("customer-tab-panel");
  expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(tab.id);
  expect(screen.getByText("Directory")).toBeTruthy();
  expect(
    screen.getByRole("heading", { name: "Email Recall" }).closest(".records-toolbar")?.parentElement
      ?.className,
  ).toContain("bg-brio-surface");
  expect(screen.queryByRole("button", { name: "Recall history" })).toBeNull();
  expect(screen.queryByText(/sample messages and simulated recalls only/)).toBeNull();
  fireEvent.click(await screen.findByRole("button", { name: "Open Alex Smith" }));
  expect(screen.queryByRole("tablist", { name: "Workspace tools" })).toBeNull();
  expect(screen.queryByText("Directory")).toBeNull();
  expect(await screen.findByRole("heading", { name: "Alex Smith" })).toBeTruthy();
  expect(screen.getByText("alex@example.com")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Back to Email Recall" }).textContent).toBe("");
  expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
  expect(screen.queryByRole("combobox", { name: "Recipient type" })).toBeNull();
  expect(screen.getByRole("columnheader", { name: "Action" })).toBeTruthy();
  expect(
    await screen.findByRole("button", { name: "Open details for A long message" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Open details for A long message" }));
  await screen.findByText("Message preview");
  const details = screen.getByRole("dialog", { name: "A long message" });
  expect(within(details).getByRole("heading", { name: "Message information" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Alex Smith", hidden: true })).toBeTruthy();
  expect(screen.getByRole("table", { name: "Sent emails", hidden: true })).toBeTruthy();
  expect(mocks.navigate).toHaveBeenCalledWith(
    expect.objectContaining({ tab: "email-recall", recallUserId: "u1", recallMessageId: "m1" }),
    { preserveScroll: true },
  );
  fireEvent.click(within(details).getAllByRole("button", { name: "Close" })[0]);
  expect(screen.getByRole("heading", { name: "Alex Smith" })).toBeTruthy();
  expect(screen.queryByRole("dialog", { name: "A long message" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Back to Email Recall" }));
  expect(screen.getByRole("tab", { name: "Email Recall" }).getAttribute("aria-selected")).toBe(
    "true",
  );
  fireEvent.click(screen.getByRole("tab", { name: "Domains" }));
  expect(screen.getByRole("tab", { name: "Domains" }).getAttribute("aria-selected")).toBe("true");
});

test("history loads matching operation details from the API", async () => {
  const row = {
    id: "op1",
    subject: "Correction",
    sender: "alex@example.com",
    initiatedBy: "admin@example.com",
    startedAt: email.sentAt,
    status: "completed",
  };
  mocks.api.history.mockResolvedValue({ items: [row] });
  mocks.api.record.mockResolvedValue({
    ...row,
    messageId: "m1",
    reason: "Sent in error",
    results: [{ email: "one@example.com", status: "skipped", detail: "External mailbox" }],
  });
  render(<CustomerDetailPage id="c_brio" tab="history" />);
  fireEvent.click(await screen.findByRole("button", { name: "Results for Correction" }));
  const dialog = await screen.findByRole("dialog", { name: "Recall results" });
  await within(dialog).findByText("External mailbox");
  expect(mocks.api.record).toHaveBeenCalledWith("op1");
  expect(within(dialog).getByText("1 skipped")).toBeTruthy();
});

test("sent date filters the API and full details keep unavailable BCC distinct", async () => {
  mocks.api.email.mockResolvedValue({
    ...email,
    cc: ["copy@example.com"],
    attachments: [{ name: "proposal.pdf", size: 24000 }],
  });
  render(<EmailRecallUser userId="u1" />);
  await screen.findAllByRole("button", { name: /^Open details for / });
  fireEvent.change(screen.getByLabelText("Sent date"), {
    target: { value: "2026-11-20" },
  });
  await waitFor(() =>
    expect(mocks.api.sent).toHaveBeenLastCalledWith(
      "u1",
      expect.objectContaining({ after: "2026-11-20", before: "2026-11-20", pageToken: undefined }),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Open details for A long message" }));
  await screen.findByText("proposal.pdf");
  const detail = screen.getByRole("dialog", { name: "A long message" });
  expect(mocks.api.email).toHaveBeenCalledWith("u1", "m1");
  expect(within(detail).getByText("To")).toBeTruthy();
  expect(within(detail).getByText("From").parentElement?.className).toContain("border");
  expect(within(detail).getByText("To").parentElement?.className).toContain("border");
  expect(within(detail).getByText("Cc")).toBeTruthy();
  expect(within(detail).getByText("Bcc")).toBeTruthy();
  expect(within(detail).getByText("copy@example.com")).toBeTruthy();
  expect(within(detail).getByText("Unavailable")).toBeTruthy();
  expect(within(detail).getByText("Message preview")).toBeTruthy();
  expect(within(detail).getByText("<script>window.bad = true</script>")).toBeTruthy();
  expect(within(detail).getByText("Attachments")).toBeTruthy();
  expect(within(detail).getByText("proposal.pdf")).toBeTruthy();
  expect(document.querySelector("script")).toBeNull();
});

test("message details keep long recipient and attachment lists in one labeled dialog", async () => {
  const manyRecipients = Array.from({ length: 24 }, (_, index) => `recipient-${index}@example.com`);
  const manyAttachments = Array.from({ length: 18 }, (_, index) => ({
    name: `project-file-${index}.pdf`,
    size: 24000,
  }));
  mocks.api.email.mockResolvedValue({
    ...email,
    to: manyRecipients,
    bcc: [],
    attachments: manyAttachments,
    bodyText: "A detailed update.\n".repeat(60),
  });
  render(<EmailRecallUser userId="u1" />);
  fireEvent.click(await screen.findByRole("button", { name: "Open details for A long message" }));
  await screen.findByText("project-file-17.pdf");
  const dialog = screen.getByRole("dialog", { name: "A long message" });
  expect(within(dialog).getByRole("region", { name: "Recipients" })).toBeTruthy();
  expect(within(dialog).getByRole("region", { name: "Message preview" })).toBeTruthy();
  expect(within(dialog).getByRole("region", { name: "Attachments" })).toBeTruthy();
  expect(within(dialog).getByText("recipient-23@example.com")).toBeTruthy();
  expect(within(dialog).getByText("project-file-17.pdf")).toBeTruthy();
  expect(within(dialog).queryByText("No attachments")).toBeNull();
});

test("sent pagination fetches more messages without a load-more button", async () => {
  mocks.api.sent
    .mockResolvedValueOnce({ items: [email], nextPageToken: "next" })
    .mockResolvedValueOnce({ items: [email, { ...email, id: "m2", subject: "Second message" }] });
  render(<EmailRecallUser userId="u1" />);
  const nextPage = await screen.findByRole("button", { name: "Next page" });
  expect(screen.queryByRole("button", { name: "Load 10 More" })).toBeNull();
  fireEvent.click(nextPage);
  await screen.findByText("Second message");
  expect(screen.getAllByRole("button", { name: /^Open details for / })).toHaveLength(2);
  expect(mocks.api.sent).toHaveBeenLastCalledWith(
    "u1",
    expect.objectContaining({ pageToken: "next" }),
  );
});

test("sent table shows ten messages by default", async () => {
  mocks.api.sent.mockResolvedValue({
    items: Array.from({ length: 12 }, (_, index) => ({
      ...email,
      id: `m${index}`,
      subject: `Message ${index}`,
    })),
  });
  render(<EmailRecallUser userId="u1" />);
  await screen.findAllByRole("button", { name: /^Open details for / });
  expect(screen.getAllByRole("button", { name: /^Open details for / })).toHaveLength(10);
  expect(screen.getByRole("navigation", { name: "Sent email pagination" })).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "Rows per page" }), {
    target: { value: "25" },
  });
  expect(screen.getAllByRole("button", { name: /^Open details for / })).toHaveLength(12);
});

test("increasing rows per page fetches enough server pages", async () => {
  const first = Array.from({ length: 10 }, (_, index) => ({ ...email, id: `first-${index}` }));
  const second = Array.from({ length: 5 }, (_, index) => ({ ...email, id: `second-${index}` }));
  mocks.api.sent
    .mockResolvedValueOnce({ items: first, nextPageToken: "next" })
    .mockResolvedValueOnce({ items: second });
  render(<EmailRecallUser userId="u1" />);
  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: /^Open details for / })).toHaveLength(10),
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Rows per page" }), {
    target: { value: "25" },
  });
  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: /^Open details for / })).toHaveLength(15),
  );
  expect(mocks.api.sent).toHaveBeenLastCalledWith(
    "u1",
    expect.objectContaining({ pageToken: "next" }),
  );
});

test("recall requires an Other reason and shows only API returned outcomes", async () => {
  const record = {
    id: "op1",
    messageId: "m1",
    subject: email.subject,
    sender: email.sender,
    initiatedBy: "admin@example.com",
    reason: "Other: correction",
    startedAt: email.sentAt,
    status: "completed",
    results: [{ email: "one@example.com", status: "successful", detail: "Moved to Trash" }],
  };
  mocks.api.recall.mockResolvedValue(record);
  render(<EmailRecallWorkflow userId="u1" email={email} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Recall Email" }));
  expect(screen.getByRole("dialog", { name: "A long message" })).toBeTruthy();
  await waitFor(() => expect(document.activeElement?.textContent).toBe("Review recall request"));
  expect(
    screen.getByText(/Recall is an attempt to move eligible internal mailbox copies/),
  ).toBeTruthy();
  const submit = screen.getByRole("button", { name: "Confirm recall" });
  expect(submit.hasAttribute("disabled")).toBe(true);
  fireEvent.change(screen.getByRole("combobox", { name: /Recall reason/ }), {
    target: { value: "Other" },
  });
  expect(submit.hasAttribute("disabled")).toBe(true);
  fireEvent.change(screen.getByRole("textbox", { name: /Other reason/ }), {
    target: { value: "correction" },
  });
  fireEvent.click(submit);
  expect(await screen.findByRole("heading", { name: "Recall outcome" })).toBeTruthy();
  expect(screen.getByRole("dialog", { name: "A long message" })).toBeTruthy();
  await waitFor(() => expect(document.activeElement?.textContent).toBe("Recall outcome"));
  expect(mocks.api.recall).toHaveBeenCalledTimes(1);
  expect(mocks.api.recall).toHaveBeenCalledWith("u1", "m1", "Other: correction");
  expect(screen.getByText("Moved to Trash")).toBeTruthy();
  expect(screen.getByText("1 successful")).toBeTruthy();
});

test("failed recall stays in confirmation and never shows a success report", async () => {
  mocks.api.recall.mockRejectedValue(new Error("Service unavailable"));
  render(<EmailRecallWorkflow userId="u1" email={email} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Recall Email" }));
  fireEvent.change(screen.getByRole("combobox", { name: /Recall reason/ }), {
    target: { value: "Sent in error" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirm recall" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Service unavailable");
  expect(screen.queryByText("successful")).toBeNull();
});
