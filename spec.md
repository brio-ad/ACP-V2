# Email Recall UI specification

## Purpose and scope

Design and implement the **Email Recall user interface** in the existing ACP React preview. The intended path is **ACP navigation → User Directory → User Details → Sent Emails → Email Details → Recall Confirmation → Processing → Results → Recall History**. This repository is UI only: the work here covers routes, components, visual states, responsive behavior, and a documented API boundary. It does not implement Google Workspace access, a backend, mailbox changes, or durable audit storage.

The preview must never present demo data or simulated recall outcomes as live Workspace results. Any preview data used to inspect the interface must be clearly labeled **Demo preview**. Without a backend response, live actions show a clear service-unavailable state.

## Existing ACP baseline

- React 19, TypeScript, Vite, Tailwind CSS. `src/App.tsx` renders routes from `src/store.tsx`; `src/data.ts` contains local preview records.
- `src/pages/CustomerDetail.tsx` includes Email Recall in the workspace tabs. Keep that tab as the feature entry point and preserve its selected state throughout the flow. See `EMAIL_RECALL_WORKSPACE_PROMPT.md` for the reviewed target layout.
- `src/pages/EmailRecall.tsx` already sketches the directory, dedicated user page, sent table, details and confirmation dialog, results, and history. `src/emailRecallApi.ts` calls same-origin `/api/email-recall` endpoints. Refine these components rather than building a parallel UI.
- Reuse ACP's Inter type, Brio yellow primary and semantic status colors, spacing, radii, `Button`, `Card`, `Badge`, `Avatar`, `SearchInput`, `Input`, `Select`, `Modal`, `Tabs`, and `records-table` styles from `src/components/ui.tsx` and `src/index.css`. Do not redesign other ACP screens.
- This checkout has no API server, secure authentication, Google service account integration, or audit database. The UI should be ready to consume production API responses, while remaining honest about the preview limitation.

## Screen requirements

### Navigation and directory

- Email Recall is reachable from the My Workspace tab. Its active state remains visible on the directory and user details page.
- Show two views in the feature: **User directory** and **Recall history**. Do not add settings or privilege screens.
- The directory table shows name, primary email, organizational unit, department when available, and account status. Provide search by name/email and filters for status and organizational unit. Show loading, no results, error/retry, and additional-page states.
- Search and filters are sent to the API for the entire directory, rather than filtering only rows already loaded. Changing search or filters resets pagination. Additional users are appended from a returned continuation token.
- Selecting a user opens a **dedicated user details page**, never a drawer or modal. Provide a back control and preserve directory context when returning. The selected user should be represented in a refreshable route when the production app navigation supports URL routing.

### User details and Sent Emails

- At the top show name/avatar, primary email, organizational unit, department, account status, and available useful profile fields such as title and work phone. Use `—` for missing optional values.
- Below, show **Sent Emails** with an initial page of up to 10 rows, newest first. Table columns: **Subject**, **Date Sent**, **To**, **CC**, **BCC**, **Recipient Type**, **Attachments**, **Action**.
- Provide search by subject or recipient email, date range, and Internal/External filters. Show Mixed when both recipient types occur. A mixed message may match either type filter. The API owns filtering and returns matching pages; the UI must not imply its results cover the whole mailbox when they are only local rows.
- **Load 10 More** appends the next API page without duplicate rows. Reset rows and cursor when search/filters change. Show a distinct state when no further page exists.
- Keep dense recipient cells readable: show the first address plus `+N` for additional recipients; expose full lists in message details. Use ACP's wide-table horizontal scrolling on narrow screens and keep actions keyboard reachable.
- Selecting a message opens details with subject, sender, date/time, all available To/CC/BCC, safe text preview, and attachment names/indicator. If BCC data is unavailable, show **Unavailable** rather than **None**. Do not render unsafe message HTML.

### Recall confirmation, progress, and results

- **Recall Email** opens a confirmation dialog showing subject, sender, full To/CC/BCC lists, internal/external recipient counts, and the warning: **“Recall is an attempt to move eligible internal mailbox copies to Trash. It cannot be guaranteed for every recipient.”**
- Require one reason: **Sent in error**, **Incorrect recipients**, **Confidential information**, **Outdated information**, or **Other**. Other requires nonblank text. Disable repeated submission while a request is pending.
- On an accepted API response, show the operation's processing state and recipient-level progress. Poll the returned operation ID while it is processing. Show final successful, failed, and skipped counts with a reason for each recipient. Labels must reflect returned outcomes; the UI must not infer success from request acceptance.
- Closing the progress dialog does not lose the operation: it can be reopened from Recall history. A temporary polling error keeps the operation ID available and provides retry. Without a working API, the confirmation action shows a service-unavailable error and no success state.

### Recall history

- Show subject, original sender, initiating admin, date/time, and overall status in a paginated list. **Results** opens reason, counts, and recipient-wise outcomes. The UI reads history from the API and does not claim local browser state is an audit record.
- Include loading, empty, error/retry, and next-page states. Keep the history view consistent with ACP tables and badges.

## UI data boundary

Keep the existing `/api/email-recall` client contract as the integration seam:

| Endpoint | UI use |
| --- | --- |
| `GET /users?limit=100&pageToken=&query=&status=&orgUnit=` | Directory page |
| `GET /users/:id` | User profile |
| `GET /users/:id/sent?limit=10&pageToken=&query=&after=&before=&recipientType=` | Sent table page |
| `GET /users/:id/sent/:messageId` | Message details |
| `POST /users/:id/sent/:messageId/recalls` with `{ reason }` | Request recall; return operation ID/status |
| `GET /history/:id` | Processing/final results |
| `GET /history?limit=20&pageToken=` | Recall history |

Use `WorkspaceUser`, `SentEmail`, `RecallRecord`, and `Page<T>` types from `src/emailRecallApi.ts`, updating them only as needed to represent the screens. Show useful errors for missing service, missing permission, inaccessible mailbox, expired pagination, and rate limiting. Keep credentials and tokens out of browser code. The production service will be responsible for authentication, Google scopes, mailbox matching/trash operations, and durable audit records; those are integration dependencies, not deliverables in this UI project.

## Acceptance criteria

1. The full UI path is navigable from ACP's existing navigation, uses existing ACP design tokens/components, and works at desktop and mobile widths.
2. Directory, user details, sent table, details, confirmation, progress/results, and history show all requested fields and meaningful loading, empty, error, and pagination states.
3. Search/filter controls reset and pass correct parameters; initial sent page is 10 rows at most; **Load 10 More** appends returned rows.
4. Confirmation requires a reason, presents complete recipient information and the warning, and cannot submit twice while pending.
5. Only API-returned recipient outcomes can be displayed as successful, failed, or skipped. Missing backend responses never appear as a successful recall or persisted history.
6. Keyboard access, visible focus, dialog labels, table readability, and narrow-screen scrolling are verified manually.
7. `npx tsc --noEmit` and `npm run build` pass from `ACP-V2/` after UI changes. No real Google credentials are used in this preview.
