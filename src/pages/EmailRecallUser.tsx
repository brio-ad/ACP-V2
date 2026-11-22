import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Paperclip } from "lucide-react";
import { type SentEmail, type WorkspaceUser } from "../emailRecallApi";
import { useEmailRecallClient } from "../emailRecallDemo";
import { useStore } from "../store";
import { Button, Card, IconButton, Input, SearchInput } from "../components/ui";
import { EmailRecallWorkflow } from "./EmailRecallWorkflow";
import { RecordsTable, RecordsViewport } from "../components/RecordsTable";
import { TablePagination } from "../components/TablePagination";
import { EmptyState } from "../components/ui";
import { MailSearch } from "lucide-react";

type Criteria = { query: string; after: string; before: string };

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "The request failed. Please try again.";
}

function displayDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
}

function compactRecipients(values?: string[]) {
  if (!values) return "Unavailable";
  if (!values.length) return "—";
  return values.length === 1 ? values[0] : `${values[0]} +${values.length - 1}`;
}

function recipientType(email: SentEmail) {
  if (email.internalCount && email.externalCount) return "Mixed";
  if (email.externalCount) return "External";
  if (email.internalCount) return "Internal";
  return "—";
}

function ErrorNotice({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-brio-panel border border-brio-danger/30 bg-brio-danger-bg p-4 text-sm text-brio-danger-ink"
    >
      <span>{message}</span>
      <Button size="sm" onClick={retry}>
        Retry
      </Button>
    </div>
  );
}

export function EmailRecallUser({
  userId,
  workspaceId = "c_brio",
  messageId,
}: {
  userId: string;
  workspaceId?: string;
  messageId?: string;
}) {
  const { navigate } = useStore();
  const { api } = useEmailRecallClient();
  const [user, setUser] = useState<WorkspaceUser>();
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileRetry, setProfileRetry] = useState(0);
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [requestedPage, setRequestedPage] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [nextPageToken, setNextPageToken] = useState<string>();
  const [sentError, setSentError] = useState("");
  const [sentLoading, setSentLoading] = useState(true);
  const [loadedCriteria, setLoadedCriteria] = useState("");
  const [query, setQuery] = useState("");
  const [sentDate, setSentDate] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
  const [detailTarget, setDetailTarget] = useState<SentEmail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const detailRequest = useRef(0);
  const sentRequest = useRef(0);
  const sentBusy = useRef(false);
  const criteria: Criteria = { query, after: sentDate, before: sentDate };
  const criteriaKey = `${userId}\u0000${query}\u0000${sentDate}`;
  const maxPage = Math.max(1, Math.ceil(emails.length / pageSize) + (nextPageToken ? 1 : 0));
  const currentPage = Math.min(requestedPage, maxPage);
  const visibleEmails = emails.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    let active = true;
    setUser(undefined);
    setProfileError("");
    setProfileLoading(true);
    api
      .user(userId)
      .then((result) => {
        if (active) setUser(result);
      })
      .catch((error) => {
        if (active) setProfileError(messageFor(error));
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, userId, profileRetry]);

  const fetchSent = useCallback(
    async (filters: Criteria, token: string | undefined, requestId: number) => {
      sentBusy.current = true;
      setSentLoading(true);
      setSentError("");
      try {
        const page = await api.sent(userId, { ...filters, pageToken: token });
        if (requestId !== sentRequest.current) return;
        setEmails((current) => {
          const known = new Set(token ? current.map((email) => email.id) : []);
          const items = token ? [...current] : [];
          for (const email of page.items) {
            if (!known.has(email.id)) {
              known.add(email.id);
              items.push(email);
            }
          }
          return items.sort(
            (first, second) => new Date(second.sentAt).getTime() - new Date(first.sentAt).getTime(),
          );
        });
        setNextPageToken(page.nextPageToken);
        setLoadedCriteria(`${userId}\u0000${filters.query}\u0000${filters.after}`);
      } catch (error) {
        if (requestId === sentRequest.current) setSentError(messageFor(error));
      } finally {
        if (requestId === sentRequest.current) {
          sentBusy.current = false;
          setSentLoading(false);
        }
      }
    },
    [api, userId],
  );

  useEffect(() => {
    const requestId = ++sentRequest.current;
    sentBusy.current = false;
    setEmails([]);
    setNextPageToken(undefined);
    setRequestedPage(1);
    setSentError("");
    setSentLoading(true);
    const delay = query || sentDate ? 300 : 0;
    const timer = window.setTimeout(() => void fetchSent(criteria, undefined, requestId), delay);
    return () => window.clearTimeout(timer);
  }, [userId, query, sentDate, fetchSent]);

  function reloadSent() {
    const requestId = ++sentRequest.current;
    sentBusy.current = false;
    setEmails([]);
    setNextPageToken(undefined);
    void fetchSent(criteria, undefined, requestId);
  }

  function loadMore() {
    if (!nextPageToken || sentBusy.current) return;
    void fetchSent(criteria, nextPageToken, ++sentRequest.current);
  }

  useEffect(() => {
    if (
      !sentLoading &&
      !sentError &&
      loadedCriteria === criteriaKey &&
      nextPageToken &&
      emails.length < currentPage * pageSize
    )
      loadMore();
  }, [
    sentLoading,
    sentError,
    loadedCriteria,
    criteriaKey,
    nextPageToken,
    emails.length,
    currentPage,
    pageSize,
  ]);

  function changePage(next: number) {
    setRequestedPage(next);
    viewportRef.current?.scrollTo?.({ top: 0 });
  }

  async function openEmail(email: SentEmail) {
    navigate(
      {
        name: "customer",
        id: workspaceId,
        tab: "email-recall",
        recallUserId: userId,
        recallMessageId: email.id,
      },
      { preserveScroll: true },
    );
    const requestId = ++detailRequest.current;
    setDetailTarget(email);
    setSelectedEmail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const fullEmail = await api.email(userId, email.id);
      if (requestId === detailRequest.current) setSelectedEmail(fullEmail);
    } catch (error) {
      if (requestId === detailRequest.current) setDetailError(messageFor(error));
    } finally {
      if (requestId === detailRequest.current) setDetailLoading(false);
    }
  }

  function closeDetails() {
    navigate(
      { name: "customer", id: workspaceId, tab: "email-recall", recallUserId: userId },
      { preserveScroll: true },
    );
    ++detailRequest.current;
    setDetailTarget(null);
    setSelectedEmail(null);
    setDetailError("");
    setDetailLoading(false);
  }

  if (detailTarget && (!messageId || detailTarget.id === messageId)) {
    return (
      <div className="flex min-h-min min-w-0 flex-1 flex-col gap-4">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-sm text-brio-muted"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(
                { name: "customer", id: workspaceId, tab: "email-recall" },
                { preserveScroll: true },
              )
            }
          >
            Email Recall
          </Button>
          <span aria-hidden="true">/</span>
          <Button variant="ghost" size="sm" onClick={closeDetails}>
            Sent Emails
          </Button>
          <span aria-hidden="true">/</span>
          <span className="min-w-0 truncate text-brio-ink" aria-current="page">
            {detailTarget.subject || "(No subject)"}
          </span>
        </nav>
        {detailLoading && (
          <Card>
            <p role="status" className="p-5 text-sm text-brio-muted">
              Loading message details…
            </p>
          </Card>
        )}
        {detailError && (
          <Card className="p-5">
            <ErrorNotice
              message={`Message details: ${detailError}`}
              retry={() => void openEmail(detailTarget)}
            />
          </Card>
        )}
        {selectedEmail && (
          <EmailRecallWorkflow userId={userId} email={selectedEmail} onClose={closeDetails} />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-min min-w-0 flex-1 flex-col">
      <Card className="@container flex min-h-min min-w-0 flex-1 flex-col overflow-hidden">
        <div className="records-toolbar">
          <div className="flex items-start gap-3">
            <IconButton
              label="Back to Email Recall"
              onClick={() =>
                navigate(
                  { name: "customer", id: workspaceId, tab: "email-recall" },
                  { preserveScroll: true },
                )
              }
            >
              <ArrowLeft className="size-4" />
            </IconButton>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-base font-semibold text-brio-ink">
                {user?.name || (profileLoading ? "Loading user…" : "User unavailable")}
              </h2>
              <p className="mt-0.5 break-all text-sm text-brio-muted">{user?.primaryEmail || ""}</p>
            </div>
          </div>
          {profileError && (
            <div className="mt-4">
              <ErrorNotice
                message={profileError}
                retry={() => setProfileRetry((count) => count + 1)}
              />
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <SearchInput
              label="Search subject or recipient"
              placeholder="Subject or recipient email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full sm:max-w-sm"
            />
            <Input
              aria-label="Sent date"
              type="date"
              value={sentDate}
              onChange={(event) => setSentDate(event.target.value)}
              className="w-full sm:w-44"
            />
          </div>
        </div>
        {sentError && (
          <div className="p-5">
            <ErrorNotice message={sentError} retry={reloadSent} />
          </div>
        )}
        {emails.length > 0 && (
          <RecordsViewport ref={viewportRef} fill>
            <RecordsTable aria-label="Sent emails" className="min-w-[1050px]">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date Sent</th>
                  <th>To</th>
                  <th>CC</th>
                  <th>BCC</th>
                  <th>Recipient Type</th>
                  <th>Attachments</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleEmails.map((email) => (
                  <tr
                    key={email.id}
                    className="cursor-pointer focus-within:bg-brio-hover focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brio-focus"
                    tabIndex={0}
                    onClick={() => void openEmail(email)}
                    onKeyDown={(event) => {
                      if (
                        event.target === event.currentTarget &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        void openEmail(email);
                      }
                    }}
                    aria-label={`Open ${email.subject || "untitled message"}`}
                  >
                    <td className="max-w-52 truncate font-medium" title={email.subject}>
                      {email.subject || "(No subject)"}
                    </td>
                    <td className="whitespace-nowrap">{displayDate(email.sentAt)}</td>
                    <td className="max-w-44 truncate" title={email.to?.join(", ")}>
                      {compactRecipients(email.to)}
                    </td>
                    <td className="max-w-44 truncate" title={email.cc?.join(", ")}>
                      {compactRecipients(email.cc)}
                    </td>
                    <td className="max-w-44 truncate" title={email.bcc?.join(", ")}>
                      {compactRecipients(email.bcc)}
                    </td>
                    <td>{recipientType(email)}</td>
                    <td>
                      {email.hasAttachments ? (
                        <Paperclip className="size-4" aria-label="Has attachments" />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          void openEmail(email);
                        }}
                      >
                        View details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </RecordsTable>
          </RecordsViewport>
        )}
        {sentLoading && (
          <p role="status" className="p-5 text-sm text-brio-muted">
            Loading sent emails…
          </p>
        )}
        {!sentLoading && !emails.length && (
          <EmptyState
            icon={<MailSearch className="size-5" />}
            title={sentError ? "Sent emails unavailable" : "No sent emails found"}
            description={
              sentError
                ? "Retry the request to load messages."
                : "Try a different search or filter."
            }
          />
        )}
        {emails.length > 0 && (
          <TablePagination
            label="Sent email pagination"
            noun="message"
            total={emails.length}
            hasMore={Boolean(nextPageToken)}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={changePage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              changePage(1);
            }}
          />
        )}
      </Card>
    </div>
  );
}
