# Prompt: make Email Recall a My Workspace tab

Review the existing React app and implement Email Recall as a first-class **My Workspace** tab. Match the layout and interaction pattern already used by the other workspace tabs. Keep Email Recall out of the desktop sidebar and mobile navigation menu; its entry point is the Email Recall tab in My Workspace.

## Review findings

- `CustomerDetail.tsx` owns the My Workspace summary card, the shared `Tabs` strip, and the `customer-tab-panel`. The tab order is Signatures, Delegates, Forwarding, Vacation, Domains, History, Email Recall.
- Signatures uses a `Card` with `RecordsHeading`, toolbar actions, `RecordsViewport` / `RecordsTable`, an empty state, and `TablePagination`.
- Delegates uses the same card and table frame, with a mailbox owner selector, action, empty state, and dialog flows.
- Forwarding, Vacation, and Domains render an integration-required `EmptyState` inside a `Card` in the same panel.
- History uses the same card and table frame, search/filter controls, pagination, expandable results, and dialogs.
- The current Email Recall tab navigates to a separate `email-recall` route. Its directory and history screens use custom headings, raw table wrappers, and a separate page layout. The user details route also loses the workspace summary and tab strip. As a result, the Email Recall tab does not remain visibly selected throughout the flow.

## Expected result

1. Selecting Email Recall keeps the My Workspace header, summary card, shared tab strip, and panel spacing in place. The Email Recall tab is selected on the directory, user details, sent email, and recall workflow views. Switching to another workspace tab works from every Email Recall view.
2. Use the same shared `Tabs`, `Card`, `RecordsHeading`, `RecordsViewport`, `RecordsTable`, `TablePagination`, `EmptyState`, `Button`, `Badge`, and form controls where appropriate. Match the other tabs' typography, toolbar alignment, borders, spacing, responsive behavior, focus states, and scroll containment. Use a normal back control or breadcrumb within the tab panel for user details.
3. Preserve the existing Email Recall functionality: directory search and filters, user details, sent email filters and pagination, message details, confirmation, processing/results, and recall history. Preserve loading, empty, error/retry, and demo preview states. Do not imply that simulated recalls change a real mailbox.
4. Keep Email Recall only in the My Workspace tab strip, including on desktop and mobile. Remove any redundant sidebar or mobile menu item. Update navigation and route state so tab selection and back navigation remain coherent and accessible; tab roles, `aria-selected`, `aria-controls`, and focus behavior must describe the visible panel.
5. Keep the `/api/email-recall` contract and existing backend boundary intact. Scope the feature to the active workspace. Avoid unrelated redesigns of the other tabs.

## Acceptance checks

- In the demo Workspace, each of the seven tabs presents its content under the same workspace summary and tab strip. Email Recall visually fits the Signatures, Delegates, and History panels at desktop and mobile widths.
- Email Recall can be opened from its tab, browsed through a user and sent message, and returned to its directory without losing the selected tab or workspace context. Recall history and result details remain reachable.
- The sidebar and mobile menu show My Workspace and User Management, with no Email Recall item.
- Existing Email Recall tests pass. Add focused UI coverage for tab selection and back navigation, then run `npm test`, `npx tsc --noEmit`, and `npm run build`.
