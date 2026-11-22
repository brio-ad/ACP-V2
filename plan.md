# Email Recall UI implementation plan

Based on [spec.md](spec.md). This plan covers the ACP **UI only**. It does not include a server, Google Workspace integration, mailbox mutation, or audit database. The existing Email Recall components and API client are the starting point. Check off each task when its test criteria pass.

## 1. Navigation and shared design

- [ ] **U1.1 Review existing UI.** Confirm the Email Recall route and My Workspace tab in `src/App.tsx`, `src/store.tsx`, and `src/pages/CustomerDetail.tsx`; follow `EMAIL_RECALL_WORKSPACE_PROMPT.md` for the target layout.
  - **Test:** The My Workspace tab reaches Email Recall, and its active state remains clear on both directory and user details screens. The sidebar and mobile menu have no Email Recall item.
- [ ] **U1.2 Match ACP visual patterns.** Reuse shared controls, Brio tokens, typography, spacing, table and dialog styles in `src/components/ui.tsx` and `src/index.css`.
  - **Test:** Compare the feature at desktop and mobile widths with neighboring ACP screens; no unrelated screens change; controls have visible focus states.

## 2. User directory and details

- [ ] **U2.1 Finish the directory table.** Show name, primary email, organizational unit, department, and account status with loading, empty, error/retry, and pagination states. Keep search by name/email and status/OU filters.
  - **Test:** Render records with complete and missing fields; filters reset the cursor and pass parameters to the API; additional pages append without duplicate users; an API error does not show preview users as live data.
- [ ] **U2.2 Finish the dedicated user page.** Show profile, primary email, OU, department, account status, title/phone when present, and a return path that preserves directory context.
  - **Test:** Clicking a user opens a full page rather than a modal/drawer; back returns to the prior directory state; missing optional details display `—`; the page remains usable on a narrow screen.

## 3. Sent Emails and message details

- [ ] **U3.1 Finish the Sent Emails table.** Show the eight specified columns, up to 10 initial rows, newest-first dates from API data, compact recipients, Internal/External/Mixed status, and attachment indicator.
  - **Test:** Multiple recipients render as first address plus `+N`; long subjects/addresses do not hide the action; keyboard users can open a row; a narrow screen can scroll the table.
- [ ] **U3.2 Wire search, filters, and pagination.** Pass subject/recipient query, date range, recipient type, and continuation token through `src/emailRecallApi.ts`. Reset rows/cursor when criteria change; append on **Load 10 More**.
  - **Test:** Request parameters match controls; a changed filter starts a fresh page; 10 more returned rows append once; no-next-token hides the load action; loading and no-results states are distinct.
- [ ] **U3.3 Finish message details.** Show complete available headers, sender, sent time, safe preview, and attachment names, with BCC **Unavailable** when not returned.
  - **Test:** Full To/CC/BCC lists are inspectable; missing BCC is not misreported as none; HTML in message content cannot execute; detail loading/error states are clear.

## 4. Recall interaction

- [ ] **U4.1 Finish confirmation dialog.** Show subject, sender, all recipient lists, internal/external counts, the non-guarantee warning, and required reason options including Other text.
  - **Test:** Blank reason and blank Other cannot submit; full recipient lists remain readable; repeated clicks while submitting create one request; cancel leaves the selected email intact or closes predictably.
- [ ] **U4.2 Finish processing/results view.** Render only API-returned operation status and per-recipient outcomes; poll by operation ID while processing; show successful, failed, and skipped counts and details.
  - **Test:** Processing changes to final state from successive API responses; temporary polling errors offer retry without discarding the ID; no response or failed POST never creates a success display.
- [ ] **U4.3 Finish Recall history UI.** Show paginated history rows and results detail with admin, reason, date, status, and recipient-wise outcomes.
  - **Test:** Opening a result shows the matching operation; pagination appends distinct records; reload reads from API rather than browser-only state; empty and service-error states are explicit.

## 5. Integration boundary and verification

- [ ] **U5.1 Align client types and errors.** Keep the current `/api/email-recall` endpoint family and adjust TypeScript response types for any UI fields added. Handle unavailable service, permission, mailbox, expired cursor, and rate-limit errors with clear text and retry where appropriate.
  - **Test:** Each API failure leaves the screen usable; preview data never substitutes for failed live calls; no credentials or mail content are persisted in browser storage.
- [ ] **U5.2 Make preview states honest.** If local sample data is used to visually review the flow, label the whole experience **Demo preview** and label simulated outcomes. Keep the live/API path separate. Otherwise, show service-unavailable states until a backend exists.
  - **Test:** No screen or notification claims that a real email was recalled or that history was durably saved when only local preview data is present.
- [ ] **U5.3 Run project checks and manual review.** Format changed code, review the diff, run `npx tsc --noEmit` and `npm run build` from `ACP-V2/`, then manually traverse the full UI path at desktop/mobile widths and with keyboard navigation.
  - **Test:** Typecheck and build pass; all screens and dialogs remain responsive and accessible; no unrelated UI is changed.

## Done definition

The UI is done when all tasks above pass and an admin can inspect the complete Email Recall journey in ACP with truthful API or labeled preview states. Production recall behavior depends on a separate backend integration.

## Implementation and verification status (2026-11-20)

The directory, user details, sent-email table, message details, recall confirmation and results, and history components are implemented against `/api/email-recall`. No local mail or recall outcomes are simulated. The API client tests, TypeScript check, and production build pass (`npm test`, `npx tsc --noEmit`, `npm run build`).

The manual desktop, mobile, and keyboard checks in U1.1, U1.2, and U5.3 remain open. The browser tool could not connect to the local preview server, so those criteria are not marked complete. The full data journey also requires the API service described in `EMAIL_RECALL_INTEGRATION.md`; this checkout has no backend.
