# CLAUDE.md

This file provides guidance to Claude Code (`claude.ai/code`) when working with code in this repository.

## MadVibe - AI-Powered Personal Knowledge OS

A comprehensive "Second Brain" and Personal Operating System built with Next.js 15 and Convex. It integrates knowledge management, productivity tools, and personal finance into a single workspace.

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
SITE_URL=http://localhost:3000
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
THE_NEWS_API_TOKEN=your-the-news-api-token
GNEWS_API_KEY=your-gnews-api-key
GMAIL_SMTP_USER=you@gmail.com
GMAIL_SMTP_APP_PASSWORD=your-16-char-app-password
GMAIL_FROM_NAME=MadVibe Security
```

Google OAuth for Convex/Auth.js uses `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

If Convex is configured with `CUSTOM_AUTH_SITE_URL=https://your-app.vercel.app`, the Next.js app proxies `/api/auth/signin/*` and `/api/auth/callback/*` to `CONVEX_SITE_URL`, falling back to a `.convex.site` URL derived from `NEXT_PUBLIC_CONVEX_URL` so the proxy stays aligned with the same deployment that the client calls. The login page also preserves a safe `redirectTo` query param, and old-style `/api/auth/signin/google?redirectTo=...` requests are bootstrapped server-side via `api.auth.signIn`, with the verifier cookie set in the route handler so the flow can continue without bouncing through `/login`. The Next auth middleware must still match POST `/api/auth` for the client auth proxy, but it explicitly skips code-exchange handling for `/api/auth/*` so the sign-in verifier `code` does not get mistaken for the later post-OAuth callback code when the auth domain is the Vercel app.
That auth proxy path now also rewrites the returned auth cookies with a persistent first-party max-age, while Convex Auth sessions use a long total duration plus a 400-day sliding inactivity window so users stay signed in across browser restarts until they explicitly log out or go inactive for a very long time.
Recent Google-account switching now uses `login_hint` from the workspace switcher, and saved Google accounts there now jump straight to `/api/auth/signin/google` instead of routing through `/login` first. That keeps the fast-switch path as direct as the provider allows when Google accepts the hint. The generic Google button still sends `prompt=select_account` through the auth proxy so users can explicitly choose a different Google account, while the login page itself no longer renders saved-account shortcuts. The workspace switcher itself now wraps long account/workspace text, stays scrollable inside a max-height shell, and opens in centered mobile dialogs so longer names, emails, and invite labels do not get clipped or collide with the close button.

The service worker is intentionally limited to same-origin static app assets (`/manifest.json`, `/app-icon.svg`, and `/icons/*`) and should not cache document routes, auth routes, or `_next` assets. Global Google fonts use `display: "swap"` with `preload: false` to avoid noisy unused-preload warnings on auth-first loads.

The FEED module runs live news ingestion on the server via Convex actions, reading `THE_NEWS_API_TOKEN` (preferred) or `GNEWS_API_KEY` from environment variables.
Ledger security adds another server-only env path: PIN reset emails are sent from Convex Node actions through Gmail SMTP using `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD`, optional `GMAIL_FROM_NAME`, and `SITE_URL` or `CUSTOM_AUTH_SITE_URL` to build the public reset link.

---

## Architecture

### Stack
- Next.js 15 (App Router) - frontend, `src/app/`
- Convex 1.17 - real-time serverless backend, `convex/`
- Zustand - client-only UI state (`src/store/`)
- shadcn/ui + Radix UI + Tailwind CSS - component system
- BlockNote 0.37 - block-based document editor (`src/components/editor/`)
- Framer Motion - animations

### Request Flow
1. React components call Convex queries and mutations via `useQuery` and `useMutation` hooks from `convex/react`.
2. Business logic should live in `convex/*.ts` by default, with a narrow exception for server-only Next.js routes that orchestrate third-party secret-backed workflows.
3. Real-time subscriptions are automatic: Convex re-runs queries when underlying data changes.
4. The `convex/_generated/` folder is auto-generated and must never be edited manually.

### Route Structure (`src/app/`)
```text
/                      -> redirects to workspace
/login                 -> auth (Convex Auth)
/ledger-pin-reset     -> public reset-link landing page for authenticated Ledger PIN changes
/workspace/            -> main app shell (sidebar + content)
  overview/            -> dashboard
  brain/               -> knowledge base (pages, databases)
  [pageId]/            -> dynamic BlockNote page editor
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
- `ledger.ts` - finance accounts, transactions, budgets, investments
- `ledgerSecurity.ts`, `ledgerSecurityNode.ts` - hashed Ledger PIN storage, verification, token issuing, and Gmail reset delivery
- `feed.ts`, `feedSync.ts` - news articles, deduped sync, provider normalization, and live refresh on feed open
- `blocks.ts` - BlockNote persistence plus shared-link checklist insertion for the PWA share target
- `reminders.ts`, `habits.ts` - productivity modules
- `auth.ts`, `auth.config.ts` - Convex Auth integration
- `crons.ts` - scheduled background jobs

### Key Convex Schema Tables
Knowledge: `workspaces`, `pages`, `blocks`, `databases`, `rows`, `views`
Finance: `financeAccounts`, `financeCategories`, `financeTransactions`, `financeBudgets`, `financeInvestments`, `financeGoals`, `financeLoans`, `financeLoanRepayments`
Ledger security: `ledgerPinConfigs`, `ledgerPinResetTokens`
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

- Convex First: Keep shared business logic in `convex/` functions whenever possible. Use a Next.js API route only when a server-only secret boundary is the better fit for third-party orchestration.
- Strict Typing: Full TypeScript coverage. Use Zod for runtime validation at boundaries.
- UI System: 4px grid, linear easing animations, semantic color tokens via CSS HSL variables. Dark mode is class-based.
- State split: Convex for server/shared state; Zustand only for ephemeral client-only UI state.
- Context continuity: Update `AGENTS.md` and `CLAUDE.md` when making significant architectural changes.

---

### { "project": "madvibe", "status": "active", "updatedAt": "2026-04-05" }
- Recent Fix: Added Google OAuth support to Convex Auth with `select_account` prompting, corrected Google env docs to `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, persisted signed-in account metadata in local storage, introduced account add/switch/remove controls in the workspace dropdown, added a settings-based password-to-Google conversion flow that verifies the old password, re-links the Google auth account to the original user ID, removes password login, derives saved-account provider metadata from actual auth status, now persist database view state in Convex so saved filters, sorts, board grouping, and table column order survive refreshes while the Tasks Tracker template defaults to `ID`, `Assigned By`, and editable auto-filled `Created`, moved page/database breadcrumbs into the pinned workspace header while exposing the existing context pane through a mobile drawer so spaces and project navigation are available on phones, added a Next.js OAuth proxy route so `CUSTOM_AUTH_SITE_URL` can safely use the Vercel domain while `signin` and `callback` requests are forwarded to the Convex deployment with fallback derivation from `NEXT_PUBLIC_CONVEX_URL`, added server-side bootstrap for stale `/api/auth/signin/google?redirectTo=...` requests, preserved `redirectTo` support on the login page, kept middleware active for POST `/api/auth` while skipping `/api/auth/*` code-exchange handling, narrowed the service worker to static-only app assets with corrected icon precache paths, disabled global font preloads to avoid unused font preload warnings during auth-first entry, fixed cross-account workspace handoff so persisted workspace ids are revalidated against the signed-in user's workspace list before workspace queries run while `workspaces.getWorkspace` now returns `null` for non-owner requests, tightened saved Google account switching so the workspace switcher now jumps directly into hinted Google auth instead of routing through `/login`, removed saved-account cards from the login page, made the profile/workspace menus open as centered mobile dialogs with safer close-button spacing, made the workspace switcher wrap long content and stay scrollable within a max-height shell, fixed project space toggles in the Brain sidebar by removing the forced re-open loop and only auto-expanding the route-matching space when navigation changes, replaced the ledger module's native selects with Brain-style Radix dropdowns so transaction filters and ledger forms now share the same premium dropdown treatment used in the Brain module, expanded the Transactions tab into an account-aware finance workspace with grouped bank accounts, savings/current account typing, account create-edit-archive flows, account-filtered activity logging, and a stripped-back actions-only header, taught ledger loans to store partial repayments as child `financeLoanRepayments` records with optional repayment-source accounts and visible repayment history/notes on each loan card, pinned the ledger header plus horizontal tab rail as one sticky shell, lifted ledger modals above the mobile bottom bar, added delete confirmations across the remaining ledger record flows, added collaborative shared workspaces with owner-managed invites, shared workspace membership and roles, shared workspace visibility in the switcher, settings-based member management, role-aware read-only gating across pages/comments/databases, remote BlockNote refreshes so accepted members see each other's saved updates across the same workspace, added Ledger PIN protection with hashed Convex-backed PIN storage, a session-scoped unlock gate over `/workspace/ledger`, Settings-based PIN setup, and reset-only PIN changes via emailed links, hardened BlockNote storage with shared schema-aware sanitization so legacy malformed page JSON no longer crashes ProseMirror `renderSpec`, replaced database date selection dialogs with inline Notion-style popovers, flattened the database toolbar/table surface while removing visible-row count strips, increasing select-pill contrast, resolved database table horizontal scroll failures by adding `overflow-x-auto` to the `notion-table-scroll` container in `table-view.tsx`, enabled horizontal scrolling with `overflow-y: clip` in `globals.css` to fix vertical header pinning (`thead` adjusted to `top-[52px]`), and added `overflow-clip` to the database card wrapper in `database-view.tsx` to preserve rounded corners.
- Design System Refresh (2026-05-13): Switched the app from Inter to Geist, added centralized Notion Warm light/dark token objects in `src/lib/themes.ts`, wired `MadThemeProvider` for persisted `madvibe-theme` CSS var injection and `data-theme` tagging, replaced global HSL tuple tokens with Notion semantic variables in `globals.css`, moved Tailwind colors to RGB variable channels with new `notion-*` utilities, refreshed shadcn primitives (button, input, textarea, dialog, dropdown-menu, select), restyled workspace shell surfaces (sidebar, top bar, mobile nav), updated Overview/Feed/Ledger module visuals to Notion card and semantic color treatment, and added a Settings appearance theme switcher for selecting Notion Warm.
- Auth Persistence: Next middleware and the custom `/api/auth/[...auth]` OAuth proxy now stamp persistent auth cookies, while Convex Auth sessions use a long total duration plus a 400-day sliding inactivity window so users stay signed in across browser restarts until they explicitly log out or go inactive for a very long time.
- BlockNote Table/Text renderSpec and Sidebar Tooltip Fixes (2026-05-25): Resolved the ProseMirror `RangeError: Invalid array passed to renderSpec` crash by flattening `tableCell` blocks directly into pure inline content arrays (matching standard BlockNote cell structure), adding a robust fallback ID generator for legacy/duplicate block IDs, stripping default property values (such as textAlignment: "left", textColor/backgroundColor: "default") to match BlockNote's native clean JSON schema and prevent DOM serializer mismatches, and ensuring that every block's `props` object is always fully defined (defaulting to `{}`) to prevent internal React/ProseMirror property read failures. Removed both the native title and custom hover tooltip span for the top-left sidebar app icon.
- Login UI Refresh (2026-05-28): Rebuilt `/login` around a MadVibe-specific premium auth experience with a themed animated knowledge-workspace backdrop, floating Brain/Focus/Feed/Ledger product signals, a refined glass auth panel, icon-led email/password fields, improved Google and submit button treatments, reduced-motion-aware Framer Motion entrance states, and removed the `$0 forever` sales footer. The global PWA install prompt now stays hidden on `/login` so it does not cover mobile auth controls.
- Ledger Transactions Tab Removal (2026-05-28): Removed the Transactions tab entirely from the Personal Ledger module, including pruning the unused legacy/V2 TransactionsTab components, layout routing mount checks, type mappings, and navigation items across the global sidebar, header tab rails, and store.
- Ledger Reports Tab Removal (2026-05-28): Removed the Reports tab completely from the Personal Ledger module, including pruning the unused local ReportsTab component, layout routing mount checks, type mappings, and navigation items across the global sidebar, header tab rails, and store.
- Credit Card Modal Refactoring (2026-05-28): Removed the Linked Account selector field from the Add Credit Card modal (under-the-hood auto-links to the first available bank account), replaced the Last 4 Digits field with complete Card Number, Expiry Month, Expiry Year, and CVV fields, updated the Convex database schema (`financeCreditCards`) and mutation endpoints (`createCreditCard`) to safely validate, parse, and persist complete credit card details with automatic `lastFour` digit derivation, and added an under-the-hood automatic bank account bootstrapping flow (creates a premium `"Main Account"` savings account on the fly if the user has zero accounts) so that saving a credit card is never blocked by a setup requirement.
- Credit Card Workspace & Transaction Management (2026-05-28): Introduced a premium tabbed Card Details Workspace resembling the garage vehicle UI. Features a unified detail header with a back button, network card icons, live utilization-driven status badges, and statement cycles. Integrated a horizontally-scrollable tab rail for Overview (reveals full credentials and lists cycles), Record Spend (spends, charges, and lent amounts with template selectors), and Spends History (registry logs and category badges). Includes an Edit Card Specifications Dialog to update card metadata, and a `deleteCardTransaction` Convex mutation that reverses card balance and credit limits upon transaction deletion.
- Automation Module Removal (2026-05-30): Removed the Automation module end-to-end with no dangling dependencies — deleted `src/app/workspace/automation/`, `src/components/automation/`, `src/app/api/generate-pin/`, `convex/automations/`, `src/components/settings/oci-config-section.tsx`, and `scripts/crawl4ai_amazon_product.py`; stripped automation nav/entries from the sidebar, mobile nav, command palette, workspace layout prefetch routes, and the Settings Integrations section; removed `automationTab`/`AutomationTab`/`"automation"` from the Zustand store and `ActiveModule`; dropped the `automations`, `automationRuns`, `pinCopyProducts`, `pinManagerPins`, and `ociUploadLog` Convex tables plus the `oci` field on `userSettings` (data wiped via a one-time cleanup mutation before the schema push); and removed the Pinterest/OpenRouter/Crawl4AI env vars from `.env.local.example` and the `.crawl4ai*`/`.playwright-browsers` `.gitignore` entries. Garage image/document URLs are entered manually (never used the OCI uploader), so Garage is unaffected.
- Maddy AI Removal (2026-05-30): Removed Maddy AI, its panel, and all backend logic with no dangling dependencies — deleted `convex/maddy.ts`, `convex/aiChat.ts`, `src/components/maddy/`, `src/app/workspace/ai/`, `src/app/api/agent/`, the dead `src/api/` Gemini client, and `src/types/maddy.ts`; stripped the AI nav item/panel/docking from sidebar, mobile nav, command palette, and workspace layout, plus the `maddyPanel`/`maddyEnabled`/AI-provider-key state from the Zustand store and the `"ai"` `ActiveModule`/route; removed the Settings "Maddy AI" section, the editor auto-tag button, and the "Build with Maddy" create-modal option; dropped the `maddyEmbeddings`, `aiConversations`, and `aiMessages` Convex tables, the `maddyTags`/`maddySuggested` fields on `pages`, and the AI-provider/`maddyEnabled` fields on `userSettings` (data wiped via a one-time cleanup mutation before the schema push). MCP is kept: its lone `api.maddy.getPageForMaddy` call was relocated to `api.pages.getPageContent`. Ledger/Garage "Insight" cards (local heuristics) were de-branded; the unused `.maddy-gradient-*` CSS and the `madvibe-agent` env vars were removed.
- Browser Autofill Style Override (2026-06-18): Overrode browser autofill styling globally in `src/app/globals.css` to prevent the default bluish background highlight and retain theme-conforming text color and input backgrounds on credential selection.
- Login Left Showcase Clear (2026-06-18): Kept the split-screen layout grid structure but removed the `MadVibeShowcase` component and its nested preview cards/graphics/texts from the left section of the desktop view, leaving it completely empty. Cleaned up all unused code (components like `MadVibeShowcase`, `MemoryWeave`, and `PreviewRow`) from `login-visuals.tsx`. Refactored `LoginBackdrop` to use a uniform background and grid structure without diagonal lines or color separations. Centered the login form card to the middle of the screen, removed the "AI workspace" and "Private" pill details, increased the font size of the "MadVibe" logo text to match the icon height, and updated the description to read "Continue into your notes, tasks, ledger, etc.".
- Current Focus: Re-test production Google OAuth with the new proxy route, verify `CONVEX_SITE_URL`, `SITE_URL`, and optional `CUSTOM_AUTH_SITE_URL` values across Convex and Vercel, validate the password-to-Google conversion flow with a real Google account, sanity-check the shared-workspace invite/member flows and cross-account collaborative editing experience with real multi-user sessions, test Ledger PIN reset delivery with real `GMAIL_SMTP_USER` / `GMAIL_SMTP_APP_PASSWORD` credentials plus `SITE_URL`, then continue dashboard drilldown logic, editor block action polish, and investment asset tracking.
- Tasks Tracker Template & Date Triggers (2026-06-18): Rebuilt the default Tasks Tracker database template with `S.No` (ID type), `Task` (title/primary text type), `Assigned to` (Select with Madhan/Sanjit/Rohit, defaulting to Madhan), `Status` (Select with Not Started/In Progress/Done/Halted, defaulting to Not Started), `Assigned By` (Select with Rohit/Praneeth, defaulting to Rohit), `Created Date` (Date type), and `Completed Date` (Date type). Configured frontend-side `buildInitialRowData` and backend-side `addRow` to automatically initialize `Created Date` to the current timestamp for new rows. Built a Convex backend transition trigger in `updateRow` and `addRow` to automatically populate `Completed Date` with `Date.now()` when `Status` is changed to `Done`, and clear it back to `null` if the status is changed to anything else.
- Expose All GET and POST APIs as MCP Tools (2026-06-19): Exposed all read (GET) and write (POST) APIs across Pages, Databases, Finance, Habits, Reminders, and Comments to the MCP server. Added typesafe, authorized internal mutations and queries in `convex/mcpService.ts` that enforce role permissions against a `userId` argument. Registered JSON schemas and client call handlers in `src/mcp/tools.ts`, and updated the routing endpoint `src/app/api/mcp/route.ts` to dispatch JSON-RPC tool calls. All TypeScript compilation and Convex dev function deploy verification checks completed successfully with 0 errors.


