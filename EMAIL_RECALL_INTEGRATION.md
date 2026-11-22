# Email Recall integration contract

This checkout is a browser-only preview. It has no authenticated API server, credential vault, service-account implementation, or persistent audit database. The Email Recall UI calls same-origin `/api/email-recall` endpoints and shows a service error when they are absent. It never uses the preview directory as live mailbox data or claims a recall succeeded locally.

## Required server endpoints

All endpoints must require the existing production ACP session, tenant authorization, and an authorized admin role. Never accept an arbitrary tenant or mailbox from the browser without checking that it belongs to the connected Workspace.

| Endpoint | Response |
| --- | --- |
| `GET /users?limit=100&pageToken=&query=&status=&orgUnit=` | `{ items: WorkspaceUser[], nextPageToken? }`; filters apply across the whole directory |
| `GET /users/:id` | `WorkspaceUser` |
| `GET /users/:id/sent?limit=10&pageToken=&query=&after=&before=&recipientType=` | `{ items: SentEmail[], nextPageToken? }` |
| `GET /users/:id/sent/:messageId` | `SentEmail` with complete headers and snippet |
| `POST /users/:id/sent/:messageId/recalls` body `{ reason }` | `RecallRecord`, usually with `status: "processing"` |
| `GET /history/:id` | `RecallRecord` with current recipient results |
| `GET /history?limit=20&pageToken=` | `{ items: RecallRecord[], nextPageToken? }` |

The TypeScript shapes are in `src/emailRecallApi.ts`. Return `{ error: "actionable message" }` with an appropriate non-2xx status for missing scopes, disabled Gmail, unavailable mailboxes, rate limits, and connection failures. An audit record must be durably committed before queueing recipient work. The `POST` should use a server-side idempotency key for the selected sender message and operation request to prevent duplicate recalls after retries.

## Google Workspace operations

1. Verify domain-wide delegation for `admin.directory.user.readonly` and `gmail.modify` at connection time. List all users with Directory `users.list(customer=my_customer)` and use `nextPageToken`; a single `domain` would omit secondary domains. Resolve `users.get` for details.
2. Impersonate the sender for Gmail `messages.list` with `labelIds=SENT`, `maxResults=10`, and `pageToken`. Add safe Gmail search operators for subject, recipient, and date filters. `messages.list` only returns IDs, so call `messages.get` for each row and parse headers. Preserve the server's pagination token rather than paginating the rendered rows.
3. Before recall, fetch the sender message again and derive its RFC `Message-ID` header and To/CC/BCC headers from the authoritative mailbox copy. Check eligible recipients against Directory users (including aliases and secondary domains). Classify external, group, absent, suspended, and inaccessible accounts as skipped with a precise reason.
4. For each eligible mailbox, impersonate that recipient, search for `rfc822msgid:<...>`, inspect candidates to verify the exact `Message-ID` and recipient copy, then call Gmail `users.messages.trash` on the recipient mailbox's message ID. Sender and recipient Gmail IDs are mailbox-local; do not reuse the sender ID. Record success only after the Trash operation returns successfully. A missing or ambiguous copy is skipped or failed as appropriate. Trash cannot retract forwarded, downloaded, or external copies.
5. Process mailboxes in a bounded queue. Retry transient 429/5xx and rate-limit errors with exponential backoff and jitter; persist each outcome. Surface `processing`, `completed`, `partial`, or `failed` from the actual record. Store the initiating admin, reason, timestamps, original message identity, and immutable recipient results in a durable audit store.

Google documentation: [Directory users.list](https://developers.google.com/workspace/admin/directory/reference/rest/v1/users/list), [Gmail messages.list](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list), [Gmail messages.trash](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/trash), [Gmail error handling](https://developers.google.com/workspace/gmail/api/guides/handle-errors).
