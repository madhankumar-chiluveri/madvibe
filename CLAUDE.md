# CLAUDE.md

This file provides guidance to Claude Code (`claude.ai/code`) when working with code in this repository.

## MadVibe - AI-Powered Personal Knowledge OS

A comprehensive "Second Brain" and Personal Operating System built with Next.js 15, Convex, and Google Gemini. It integrates knowledge management, productivity tools, and personal finance into a single AI-pivoted workspace.

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

No test framework is configured. There are no Jest, Vitest, or Playwright setups.

---

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in:

```text
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=your-deployment-name
CONVEX_SITE_URL=https://your-project.convex.site
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
THE_NEWS_API_TOKEN=your-the-news-api-token
GNEWS_API_KEY=your-gnews-api-key
```

Google OAuth for Convex/Auth.js uses `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

If Convex is configured with `CUSTOM_AUTH_SITE_URL=https://your-app.vercel.app`, the Next.js app proxies `/api/auth/signin/*` and `/api/auth/callback/*` to `CONVEX_SITE_URL`, falling back to a `.convex.site` URL derived from `NEXT_PUBLIC_CONVEX_URL` so the proxy stays aligned with the same deployment that the client calls. The login page also preserves a safe `redirectTo` query param, and old-style `/api/auth/signin/google?redirectTo=...` requests are bootstrapped server-side via `api.auth.signIn`, with the verifier cookie set in the route handler so the flow can continue without bouncing through `/login`. The Next auth middleware must still match POST `/api/auth` for the client auth proxy, but it explicitly skips code-exchange handling for `/api/auth/*` so the sign-in verifier `code` does not get mistaken for the later post-OAuth callback code when the auth domain is the Vercel app.
Recent Google-account switching now uses `login_hint` for saved accounts on the login page, and the workspace switcher now sends saved Google accounts straight to `/api/auth/signin/google` instead of routing through `/login` first. That keeps the fast-switch path as direct as the provider allows when Google accepts the hint. The generic Google button and add-account flows still send `prompt=select_account` through the auth proxy so users can explicitly choose a different Google account. The workspace switcher itself now wraps long account/workspace text and stays scrollable inside a max-height shell so longer names, emails, and invite labels do not get clipped.

The service worker is intentionally limited to same-origin static app assets (`/manifest.json`, `/app-icon.svg`, and `/icons/*`) and should not cache document routes, auth routes, or `_next` assets. Global Google fonts use `display: "swap"` with `preload: false` to avoid noisy unused-preload warnings on auth-first loads.

AI provider API keys (OpenRouter, Anthropic, OpenAI, Google, Groq, Ollama) are stored per-user in the `userSettings` Convex table, not as env vars.
The FEED module is different: live news ingestion runs on the server via Convex actions and reads `THE_NEWS_API_TOKEN` (preferred) or `GNEWS_API_KEY` from environment variables. Feed sync no longer depends on a Gemini env key.

---

## Architecture

### Stack
- Next.js 15 (App Router) - frontend, `src/app/`
- Convex 1.17 - real-time serverless backend, `convex/`
- Google Gemini Flash 1.5 + `text-embedding-004` (768-dim) - AI and semantic search
- Zustand - client-only UI state (`src/store/`)
- shadcn/ui + Radix UI + Tailwind CSS - component system
- BlockNote 0.37 - block-based document editor (`src/components/editor/`)
- Framer Motion - animations

### Request Flow
1. React components call Convex queries and mutations via `useQuery` and `useMutation` hooks from `convex/react`.
2. All business logic lives in `convex/*.ts`, never in Next.js API routes.
3. Real-time subscriptions are automatic: Convex re-runs queries when underlying data changes.
4. The `convex/_generated/` folder is auto-generated and must never be edited manually.

### Route Structure (`src/app/`)
```text
/                      -> redirects to workspace
/login                 -> auth (Convex Auth)
/workspace/            -> main app shell (sidebar + content)
  overview/            -> dashboard
  brain/               -> knowledge base (pages, databases)
  [pageId]/            -> dynamic BlockNote page editor
  ai/                  -> Maddy AI chat (dedicated mobile screen, desktop drawer entry remains available)
  feed/                -> AI-categorized news
  ledger/              -> finance tracker
  settings/            -> user settings
  /share               -> Android PWA share-target capture flow for saving shared links into pages
  trash/               -> deleted items
```

### Convex Backend (`convex/`)
Key modules and responsibilities:
- `schema.ts` - single source of truth for all table shapes and indexes
- `pages.ts`, `blocks.ts` - knowledge base CRUD
- `databases.ts` - multi-view database (table/board/list/calendar rows)
- `maddy.ts` - AI semantic search, embeddings, auto-tagging
- `aiChat.ts` - chat conversation management
- `ledger.ts` - finance accounts, transactions, budgets, investments
- `feed.ts`, `feedSync.ts` - news articles, deduped sync, provider normalization, and live refresh on feed open
- `blocks.ts` - BlockNote persistence plus shared-link checklist insertion for the PWA share target
- `reminders.ts`, `habits.ts` - productivity modules
- `auth.ts`, `auth.config.ts` - Convex Auth integration
- `crons.ts` - scheduled background jobs

### Key Convex Schema Tables
Vector search: `maddyEmbeddings` (768-dim, `by_embedding` vector index)
Knowledge: `workspaces`, `pages`, `blocks`, `databases`, `rows`, `views`
Finance: `financeAccounts`, `financeCategories`, `financeTransactions`, `financeBudgets`, `financeInvestments`, `financeGoals`
AI: `aiConversations`, `aiMessages`
Productivity: `habits`, `habitLogs`, `focusSessions`, `reminders`
News: `newsArticles`, `userNewsInteractions`, `userNewsPreferences`
Feed sync behavior: `/workspace/feed` triggers a freshness-aware background sync, while `convex/crons.ts` keeps the cache warm every 2 hours. The current provider preference is The News API because it offers real-time top stories, category/source filters, and lower production pricing than NewsAPI; GNews remains a fallback if that token is not configured.
Share target behavior: the manifest now registers `/share` as an Android Web Share Target entry point. When the installed PWA receives a shared link, the `/share` screen preserves the payload through login, lets the user pick an editable workspace/page, and appends one unchecked checklist item into the selected page via `blocks.appendSharedLinkTodo`. iOS-style global share-sheet support still requires a native Share Extension and is not part of the web app.
Settings: `userSettings`

### Path Alias
`@/*` maps to `./src/*` (configured in `tsconfig.json`).

### BlockNote Server Components
BlockNote packages (`@blocknote/core`, `@blocknote/react`, `@blocknote/mantine`) are listed in `next.config.js` `serverExternalPackages` and must only be used in client components.

---

## Implementation Rules

- Convex First: All business logic must reside in `convex/` functions (queries, mutations, actions). Next.js API routes are not used.
- Strict Typing: Full TypeScript coverage. Use Zod for runtime validation at boundaries.
- UI System: 4px grid, linear easing animations, semantic color tokens via CSS HSL variables. Dark mode is class-based.
- State split: Convex for server/shared state; Zustand only for ephemeral client-only UI state.
- Context continuity: Update `AGENTS.md` and `CLAUDE.md` when making significant architectural changes.

---

### { "project": "madvibe", "status": "active", "updatedAt": "2026-04-04" }
- Recent Fixes: Added Google OAuth support to Convex Auth with `select_account` prompting, corrected Google env docs to `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, added login-page recent account quick picks, persisted signed-in account metadata in local storage, introduced account add/switch/remove controls in the workspace dropdown, added a settings-based password-to-Google conversion flow that verifies the old password, re-links the Google auth account to the original user ID, removes password login, derives saved-account provider metadata from actual auth status, now persist database view state in Convex so saved filters, sorts, board grouping, and table column order survive refreshes while the Tasks Tracker template defaults to `ID`, `Assigned By`, and editable auto-filled `Created`, moved page/database breadcrumbs into the pinned workspace header while exposing the existing context pane through a mobile drawer so spaces and project navigation are available on phones, added a Next.js OAuth proxy route so `CUSTOM_AUTH_SITE_URL` can safely use the Vercel domain while `signin` and `callback` requests are forwarded to the Convex deployment with fallback derivation from `NEXT_PUBLIC_CONVEX_URL`, added server-side bootstrap for stale `/api/auth/signin/google?redirectTo=...` requests, preserved `redirectTo` support on the login page, kept middleware active for POST `/api/auth` while skipping `/api/auth/*` code-exchange handling, narrowed the service worker to static-only app assets with corrected icon precache paths, disabled global font preloads to avoid unused font preload warnings during auth-first entry, fixed cross-account workspace handoff so persisted workspace ids are revalidated against the signed-in user's workspace list before workspace queries run while `workspaces.getWorkspace` now returns `null` for non-owner requests, tightened saved Google account switching so the workspace switcher now jumps directly into hinted Google auth instead of routing through `/login`, made the workspace switcher wrap long content and stay scrollable within a max-height shell, fixed project space toggles in the Brain sidebar by removing the forced re-open loop and only auto-expanding the route-matching space when navigation changes, replaced the ledger module's native selects with Brain-style Radix dropdowns so transaction filters and ledger forms now share the same premium dropdown treatment used in the Brain module, expanded the Transactions tab into an account-aware finance workspace with grouped bank accounts, savings/current account typing, account create-edit-archive flows, and account-filtered activity logging, added collaborative shared workspaces with owner-managed invites, shared workspace membership and roles, shared workspace visibility in the switcher, settings-based member management, role-aware read-only gating across pages/comments/databases, remote BlockNote refreshes so accepted members see each other's saved updates across the same workspace, and split Maddy AI into a dedicated full-screen mobile `/workspace/ai` screen with route-based back behavior while keeping the desktop drawer for sidebar entry points.
- Current Focus: Re-test production Google OAuth with the new proxy route, verify `CONVEX_SITE_URL`, `SITE_URL`, and optional `CUSTOM_AUTH_SITE_URL` values across Convex and Vercel, validate the password-to-Google conversion flow with a real Google account, sanity-check the shared-workspace invite/member flows and cross-account collaborative editing experience with real multi-user sessions, then continue dashboard drilldown logic, editor block action polish, and investment asset tracking.
