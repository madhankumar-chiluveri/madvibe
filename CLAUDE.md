# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MadVibe — AI-Powered Personal Knowledge OS

A comprehensive "Second Brain" and Personal Operating System built with Next.js 15, Convex, and Google Gemini. Integrates knowledge management, productivity tools, and personal finance into a single AI-pivoted workspace.

---

## Commands

```bash
# Development (run both concurrently in separate terminals)
npm run dev           # Next.js dev server
npm run convex:dev    # Convex backend dev server (required for real-time data)

# Production
npm run build
npm run convex:deploy

# Lint
npm run lint
```

**No test framework is configured.** There are no jest/vitest/playwright setups.

---

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in:
```
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=your-deployment-name
CONVEX_SITE_URL=https://your-project.convex.site
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

Google OAuth for Convex/Auth.js uses `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` env names.
If Convex is configured with `CUSTOM_AUTH_SITE_URL=https://your-app.vercel.app`, the Next.js app now proxies `/api/auth/signin/*` and `/api/auth/callback/*` to `CONVEX_SITE_URL`, falling back to a `.convex.site` URL derived from `NEXT_PUBLIC_CONVEX_URL` so the proxy stays aligned with the same deployment that the client calls. The login page also preserves a safe `redirectTo` query param, and old-style `/api/auth/signin/google?redirectTo=...` requests are now bootstrapped server-side via `api.auth.signIn`, with the verifier cookie set in the route handler so the flow can continue without bouncing through `/login`. The Next auth middleware must still match POST `/api/auth` for the client auth proxy, but it explicitly skips code-exchange handling for `/api/auth/*` so the sign-in verifier `code` does not get mistaken for the later post-OAuth callback code when the auth domain is the Vercel app.
The service worker is intentionally limited to same-origin static app assets (`/manifest.json`, `/app-icon.svg`, and `/icons/*`) and should not cache document routes, auth routes, or `_next` assets. Global Google fonts use `display: "swap"` with `preload: false` to avoid noisy unused-preload warnings on auth-first loads.

AI provider API keys (OpenRouter, Anthropic, OpenAI, Google, Groq, Ollama) are stored **per-user** in the `userSettings` Convex table, not as env vars.

---

## Architecture

### Stack
- **Next.js 15** (App Router) — frontend, `src/app/`
- **Convex 1.17** — real-time serverless backend, `convex/`
- **Google Gemini Flash 1.5** + `text-embedding-004` (768-dim) — AI & semantic search
- **Zustand** — client-only UI state (`src/store/`)
- **shadcn/ui + Radix UI + Tailwind CSS** — component system
- **BlockNote 0.37** — block-based document editor (`src/components/editor/`)
- **Framer Motion** — animations

### Request Flow
1. React components call Convex queries/mutations via `useQuery`/`useMutation` hooks from `convex/react`.
2. All business logic lives in `convex/*.ts` — never in Next.js API routes.
3. Real-time subscriptions are automatic: Convex re-runs queries when underlying data changes.
4. The `convex/_generated/` folder is auto-generated — never edit it manually.

### Route Structure (`src/app/`)
```
/                      → redirects to workspace
/login                 → auth (Convex Auth)
/workspace/            → main app shell (sidebar + content)
  overview/            → dashboard
  brain/               → knowledge base (pages, databases)
  [pageId]/            → dynamic BlockNote page editor
  ai/                  → Maddy AI chat
  feed/                → AI-categorized news
  ledger/              → finance tracker
  settings/            → user settings
  trash/               → deleted items
```

### Convex Backend (`convex/`)
Key modules and their responsibilities:
- `schema.ts` — single source of truth for all table shapes and indexes
- `pages.ts`, `blocks.ts` — knowledge base CRUD
- `databases.ts` — multi-view database (table/board/list/calendar rows)
- `maddy.ts` — AI semantic search, embeddings, auto-tagging
- `aiChat.ts` — chat conversation management
- `ledger.ts` — finance accounts, transactions, budgets, investments
- `feed.ts`, `feedSync.ts` — news articles with AI categorization
- `reminders.ts`, `habits.ts` — productivity modules
- `auth.ts`, `auth.config.ts` — Convex Auth integration
- `crons.ts` — scheduled background jobs

### Key Convex Schema Tables
Vector search: `maddyEmbeddings` (768-dim, `by_embedding` vector index)
Knowledge: `workspaces`, `pages`, `blocks`, `databases`, `rows`, `views`
Finance: `financeAccounts`, `financeCategories`, `financeTransactions`, `financeBudgets`, `financeInvestments`, `financeGoals`
AI: `aiConversations`, `aiMessages`
Productivity: `habits`, `habitLogs`, `focusSessions`, `reminders`
News: `newsArticles`, `userNewsInteractions`, `userNewsPreferences`
Settings: `userSettings`

### Path Alias
`@/*` maps to `./src/*` (configured in `tsconfig.json`).

### BlockNote Server Components
BlockNote packages (`@blocknote/core`, `@blocknote/react`, `@blocknote/mantine`) are listed in `next.config.js` `serverExternalPackages` — they must only be used in client components.

---

## Implementation Rules

- **Convex First**: All business logic must reside in `convex/` functions (queries, mutations, actions). Next.js API routes are not used.
- **Strict Typing**: Full TypeScript coverage. Use Zod for runtime validation at boundaries.
- **UI System**: 4px grid, linear easing animations, semantic color tokens via CSS HSL variables. Dark mode is class-based.
- **State split**: Convex for server/shared state; Zustand only for ephemeral client-only UI state.
- **Context continuity**: Update AGENTS.md and CLAUDE.md when making significant architectural changes.

---

### { "project": "madvibe", "status": "active", "updatedAt": "2026-03-30" }
- **Recent Fixes**: Added Google OAuth support to Convex Auth with `select_account` prompting, corrected Google env docs to `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, added login-page recent account quick picks, persisted signed-in account metadata in local storage, introduced account add/switch/remove controls in the workspace dropdown, added a settings-based password-to-Google conversion flow that verifies the old password, re-links the Google auth account to the original user ID, removes password login, derives saved-account provider metadata from actual auth status, now persist database view state in Convex so saved filters, sorts, board grouping, and table column order survive refreshes while the Tasks Tracker template defaults to `ID`, `Assigned By`, and editable auto-filled `Created`, moved page/database breadcrumbs into the pinned workspace header while exposing the existing context pane through a mobile drawer so spaces and project navigation are available on phones, and added a Next.js OAuth proxy route so `CUSTOM_AUTH_SITE_URL` can safely use the Vercel domain while `signin` and `callback` requests are forwarded to the Convex deployment, with fallback derivation from `NEXT_PUBLIC_CONVEX_URL`, server-side bootstrap for stale `/api/auth/signin/google?redirectTo=...` requests, preserved `redirectTo` support on the login page, middleware still active for POST `/api/auth` while skipping `/api/auth/*` code-exchange handling, a narrowed static-only service worker with corrected icon precache paths, disabled global font preloads to avoid unused font preload warnings during auth-first entry, and fixed cross-account workspace handoff so persisted workspace ids are revalidated against the signed-in user's workspace list before workspace queries run while `workspaces.getWorkspace` now returns `null` for non-owner requests, and fixed project space toggles in the Brain sidebar by removing the forced re-open loop and only auto-expanding the route-matching space when navigation changes.
- **Current Focus**: Re-test production Google OAuth with the new proxy route, verify `CONVEX_SITE_URL` / `SITE_URL` / optional `CUSTOM_AUTH_SITE_URL` values across Convex and Vercel, validate the password-to-Google conversion flow with a real Google account, sanity-check the persistent database view UX and new mobile workspace navigation with live table/page workflows, verify that account switching now lands on the new account's active space immediately, then continue dashboard drilldown logic, editor block action polish, and investment asset tracking.
