# Repository Guidelines

## Project Structure & Module Organization

This repository is a React 19, TypeScript, Vite, and Tailwind CSS preview. Application code lives in `src/`: `pages/` contains screens and workflow components, `components/` contains shared UI, `store.tsx` holds client state and navigation, and `data.ts` supplies demo records. Static images and icons live in `public/`. The entry points are `index.html`, `src/main.tsx`, and `src/App.tsx`. Keep new code near the screen or component that owns it.

## Build, Test, and Development Commands

Run commands from this directory (`ACP-V2/`):

- `npm install` installs dependencies when running outside the parent workspace.
- `npm run dev` starts Vite at `http://localhost:5188/`.
- `npm run build` produces the deployable bundle in `dist/`.
- `npm run preview` serves that bundle locally on port 5188.
- `npm run format` formats the project with `oxfmt`; review the resulting diff before committing.
- `npx tsc --noEmit` checks TypeScript types independently of the Vite build.

## Coding Style & Naming Conventions

Use TypeScript and functional React components. Follow the existing two-space indentation, double-quoted strings, and semicolons. Name component files and exported components in PascalCase (`RecipientPicker.tsx`); use camelCase for utilities and state (`recipientCsv.ts`, `store.tsx`). Keep shared visual tokens in `src/index.css` and reuse components from `src/components/` where practical. Run `npm run format` on changed code.

## Testing Guidelines

There is currently no test runner, test suite, or coverage target. Before submitting a change, run `npm run build` and `npx tsc --noEmit`, then manually check the affected flow in the local preview. If adding automated tests, introduce a test script and document the chosen framework; use names such as `RecipientPicker.test.tsx` or `recipientCsv.test.ts`.

## Commit & Pull Request Guidelines

The short history uses brief, past-tense summaries such as `Added the customer logo`; keep commits focused and descriptive. Pull requests should explain the user-facing change, list validation performed, and include screenshots for UI changes. Link an issue when one exists.

## Security & Configuration

This app uses browser-local demo data and is not a production security boundary. Never commit real service-account keys, credentials, or environment secrets; `.gitignore` excludes `.env*`, `*.key`, and service-account JSON files. Use the demo Workspace flow for local inspection, and treat real Workspace operations as requiring a verified backend.
