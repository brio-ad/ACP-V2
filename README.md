# Brio customer Workspace local preview

This is an isolated copy of the existing React app for testing the customer-facing flow. The original app and its configured port are untouched.

Run from `customer-portal-test`:

```powershell
npm run dev
```

Open http://localhost:5188/. Dependencies resolve from the parent workspace's `node_modules` directory. If running independently outside that workspace, run `npm install` first.

Use `admin@brio.co.in` / `demo1234` for the local preview account. After sign-in, setup validates the structure of a service account JSON file. It checks `GET /api/workspace/capabilities` before any upload; when a secure backend confirms this tenant is supported, it can send `POST /api/workspace/connect`. The repository has no secure authentication, credential storage, Google connection verifier, or administrative API. No upload marks the Workspace connected without a verified API response. **Do not use real service account keys in this preview.** Use **Preview demo Workspace** to inspect the existing signature, delegate, directory, and history workflows with local sample records.

The forwarding, vacation, and domains tabs show integration-required states. All local records are demo data. The browser store is not a tenant security boundary. Production deployment requires backend authentication, tenant authorization for every read/write, encrypted credential storage, permission verification, and real Google Workspace operations.

User Management is a separate sidebar module. It reuses the existing directory search, filters, and pagination and includes an Add user dialog. The first account to complete setup or enter the demo Workspace receives the Super Admin role in local preview data. Add user selects an existing active directory user and grants an Admin or Super Admin role in this browser's demo access list. It does not create a Google account or enforce permissions on a backend.

Email Recall is available from the My Workspace tab. In **Preview demo Workspace**, it uses the existing local directory, sample sent messages, and simulated recall outcomes. Demo recall history is saved in this browser and cleared by Reset demo. No mailbox is changed. When a verified Workspace connection is present, Email Recall uses `/api/email-recall`; the required API contract is in `EMAIL_RECALL_INTEGRATION.md`. The reviewed target layout and acceptance checks are in `EMAIL_RECALL_WORKSPACE_PROMPT.md`. To check the UI code, run `npm test` (Node API contract tests and Vitest/Testing Library interaction tests), `npx tsc --noEmit`, and `npm run build`.
