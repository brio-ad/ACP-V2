export interface WorkspaceUser {
  id: string;
  name: string;
  primaryEmail: string;
  orgUnit: string;
  department?: string;
  title?: string;
  phone?: string;
  status: "active" | "suspended" | "archived";
}

export interface SentEmail {
  id: string;
  subject: string;
  sentAt: string;
  sender: string;
  to: string[];
  cc: string[];
  /** Undefined means the service could not return BCC data. */
  bcc?: string[];
  snippet?: string;
  bodyText?: string;
  attachments?: { name: string; size?: number }[];
  hasAttachments: boolean;
  internalCount: number;
  externalCount: number;
}

export interface RecallResult {
  email: string;
  status: "successful" | "failed" | "skipped";
  detail: string;
}

export interface RecallRecord {
  id: string;
  messageId: string;
  subject: string;
  sender: string;
  initiatedBy: string;
  reason: string;
  startedAt: string;
  status: "processing" | "completed" | "partial" | "failed";
  results: RecallResult[];
}

export interface Page<T> {
  items: T[];
  nextPageToken?: string;
}

const unavailable =
  "Email Recall service is unavailable. Try again after the Workspace service is connected.";

function serviceError(status: number, detail?: string): Error {
  const fallback: Record<number, string> = {
    401: "Your session has expired. Sign in again and retry.",
    403: "You do not have permission to access this mailbox or Email Recall.",
    404: "This user, message, or recall operation is no longer available.",
    409: "The mailbox or message is unavailable. Refresh and retry.",
    410: "This page has expired. Refresh to start from the first page.",
    429: "Email Recall is rate limited. Please retry shortly.",
    500: unavailable,
    502: unavailable,
    503: unavailable,
    504: unavailable,
  };
  const message =
    detail?.trim() || fallback[status] || `Email Recall request failed (${status}). Please retry.`;
  return Object.assign(
    new Error(status === 429 && detail ? `${message} Please retry shortly.` : message),
    { status },
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPage(value: unknown): value is Page<unknown> {
  return (
    isObject(value) &&
    Array.isArray(value.items) &&
    (value.nextPageToken === undefined || typeof value.nextPageToken === "string")
  );
}

function isEntity(value: unknown): value is { id: string } {
  return isObject(value) && typeof value.id === "string" && value.id.length > 0;
}

function isRecall(value: unknown): value is RecallRecord {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    ["processing", "completed", "partial", "failed"].includes(String(value.status)) &&
    ((value.results === undefined && value.status === "processing") ||
      (Array.isArray(value.results) &&
        value.results.every(
          (result: unknown) =>
            isObject(result) &&
            typeof result.email === "string" &&
            ["successful", "failed", "skipped"].includes(String(result.status)) &&
            typeof result.detail === "string",
        )))
  );
}

async function recallRequest(path: string, init?: RequestInit): Promise<RecallRecord> {
  const response = await request<RecallRecord>(path, init, isRecall);
  return { ...response, results: response.results ?? [] };
}

async function request<T>(
  path: string,
  init: RequestInit | undefined,
  valid: (value: unknown) => boolean,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`/api/email-recall${path}`, {
      ...init,
      credentials: "same-origin",
      headers,
    });
  } catch {
    throw new Error(unavailable);
  }
  const json: unknown = response.headers.get("content-type")?.includes("application/json")
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok) {
    throw serviceError(
      response.status,
      isObject(json) && typeof json.error === "string" ? json.error : undefined,
    );
  }
  if (!valid(json)) {
    throw new Error(
      response.headers.get("content-type")?.includes("text/html")
        ? unavailable
        : "Email Recall service returned an invalid response. Refresh and retry.",
    );
  }
  return json as T;
}

export const emailRecallApi = {
  users: (
    options: { pageToken?: string; query?: string; status?: string; orgUnit?: string } = {},
  ) => {
    const params = new URLSearchParams({ limit: "100" });
    for (const [key, value] of Object.entries(options)) if (value) params.set(key, value);
    return request<Page<WorkspaceUser>>(`/users?${params}`, undefined, isPage);
  },
  user: (id: string) =>
    request<WorkspaceUser>(`/users/${encodeURIComponent(id)}`, undefined, isEntity),
  sent: (
    id: string,
    options: {
      pageToken?: string;
      query?: string;
      after?: string;
      before?: string;
      recipientType?: string;
    } = {},
  ) => {
    const params = new URLSearchParams({ limit: "10" });
    for (const [key, value] of Object.entries(options)) if (value) params.set(key, value);
    return request<Page<SentEmail>>(
      `/users/${encodeURIComponent(id)}/sent?${params}`,
      undefined,
      isPage,
    );
  },
  email: (userId: string, messageId: string) =>
    request<SentEmail>(
      `/users/${encodeURIComponent(userId)}/sent/${encodeURIComponent(messageId)}`,
      undefined,
      isEntity,
    ),
  recall: (userId: string, messageId: string, reason: string) =>
    recallRequest(
      `/users/${encodeURIComponent(userId)}/sent/${encodeURIComponent(messageId)}/recalls`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    ),
  record: (id: string) => recallRequest(`/history/${encodeURIComponent(id)}`),
  history: (pageToken?: string) =>
    request<Page<RecallRecord>>(
      `/history?limit=20${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
      undefined,
      isPage,
    ),
};
