# MadVibe — AI-Powered Personal Knowledge OS

## Project Overview
MadVibe is a comprehensive "Second Brain" and Personal Operating System built with Next.js 15, Convex, and Google Gemini. It integrates knowledge management, productivity tools, and personal finance into a single, AI-pivoted workspace.

## Core Features & Progress
- **📄 Knowledge Base**: 
  - Block-based document editor (BlockNote) with nested paging.
  - Multi-view databases (Table, Board, List, Calendar).
  - Real-time sync via Convex.
- **🤖 Maddy AI**:
  - Semantic search using vector embeddings (768-dim).
  - Auto-tagging and intelligent organization.
  - Chat-based assistant for page summarization and task extraction.
- **📊 Productivity Modules**:
  - **Reminders**: Smart date/time selection with NLP-like chips.
  - **Habits**: Streak tracking and visual progression.
  - **Focus**: Integrated Pomodoro/Focus sessions linked to tasks.
- **💰 Financial Ledger**:
  - Multi-account transaction tracking.
  - Category-based budgeting and investment monitoring.
- **📰 News Feed**:
  - AI-categorized news articles with sentiment analysis and relevance scoring.

## Technical Architecture
- **Framework**: Next.js 15 (App Router).
- **Backend**: Convex (Real-time serverless).
- **AI**: Google Gemini (Flash 1.5) + text-embedding-004.
- **State**: Zustand + React Query (for complex data fetching).
- **Styling**: Tailwind CSS + shadcn/ui + Framer Motion.

## Implementation Rules
- **Convex First**: All business logic must reside in `convex/` functions.
- **Strict Typing**: Use Zod for validation and ensure full TypeScript coverage.
- **Premium UI**: 4px grid system, linear easing animations, and semantic tokens.
- **Persistence**: AGENTS.md and CLAUDE.md must be updated for context continuity.

---
### Continuity Status: 2026-04-04
- **Recent Fixes**: Added Google OAuth support to Convex Auth with `select_account` prompting, corrected local env docs to use `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, added a recent-accounts quick pick to the login page, persisted signed-in account metadata to local storage, introduced a multi-account section in the workspace switcher for add/switch/remove account flows, added a settings-based password-to-Google conversion flow that verifies the old password, re-links the Google auth account to the original user ID, removes password login, stores account provider metadata from live auth status instead of avatar heuristics, now persist database view state in Convex so saved filters, sorts, board grouping, and table column order survive refreshes while the Tasks Tracker template seeds `ID`, `Assigned By`, and editable auto-filled `Created` defaults, moved page/database breadcrumbs into the global pinned workspace header while exposing the existing context pane through a mobile drawer so spaces and navigation are reachable on phones, added a Next.js `/api/auth/[...auth]` proxy so `CUSTOM_AUTH_SITE_URL` can point at the Vercel app while OAuth `signin` and `callback` requests are forwarded to the Convex deployment instead of 404ing, taught that proxy to bootstrap stale `/api/auth/signin/google?redirectTo=...` requests directly via `api.auth.signIn` and set the verifier cookie server-side, preserved `redirectTo` on the login page for both password and Google flows, now pass `login_hint` through that proxy for saved Google accounts while keeping explicit `prompt=select_account` behavior for the generic Google button and add-account flows, kept middleware active for POST `/api/auth` while skipping `/api/auth/*` code-exchange handling so local dev auth still works and production app-domain OAuth does not loop, narrowed the service worker to same-origin static app assets only with correct PNG icon precache paths, disabled automatic Next font preloads to avoid noisy unused-preload warnings on auth pages, fixed cross-account workspace handoff so persisted workspace ids are revalidated against the signed-in user's workspace list before workspace queries run while `workspaces.getWorkspace` now returns `null` for non-owner requests, tightened saved Google account switching so the workspace switcher jumps directly into hinted Google auth instead of routing through `/login`, made the workspace switcher wrap long content and keep its main body scrollable within a max-height shell, fixed project space toggles in the Brain sidebar by removing the forced re-open loop and only auto-expanding the route-matching space when navigation changes, replaced the ledger module's native selects with Brain-style Radix dropdowns so filters and modal forms now use the same premium trigger/menu treatment across transactions, cards, loans, budgets, goals, recurring entries, investments, and IPO tracking, expanded the Transactions tab into an account-aware finance workspace with grouped bank accounts, savings/current account typing, account create-edit-archive flows, and account-filtered activity logging, added collaborative shared workspaces with owner-managed invites, shared workspace membership/roles, live shared workspace visibility in the switcher, settings-based member management, role-aware read-only gating across pages/comments/databases, remote BlockNote refreshes so accepted members see each other's saved page and database updates in real time, split Maddy AI into a dedicated full-screen mobile `/workspace/ai` experience with route-based back behavior while keeping the desktop drawer for sidebar entry points, rebuilt the news feed sync around provider-backed live ingestion with The News API as the primary source, GNews fallback support, deduped article upserts, freshness-aware refreshes whenever `/workspace/feed` opens, and added an Android PWA share-target flow so shared links can open MadVibe from the system share sheet, survive login redirects, and append an unchecked checklist item into an editable workspace page via Convex permissions.
- **Current Focus**: Re-test production Google OAuth with the new proxy route, confirm Convex/Vercel env alignment for `CONVEX_SITE_URL`, `SITE_URL`, and optional `CUSTOM_AUTH_SITE_URL`, validate the password-to-Google conversion flow against real accounts, sanity-check the new shared-workspace invite/member flows and cross-account collaborative editing experience against real multi-user sessions, verify live feed behavior with a real `THE_NEWS_API_TOKEN` (or `GNEWS_API_KEY`) in production, field-test the Android share-target flow after installing the PWA and confirm whether the checklist item format should evolve into richer link cards or task database row capture, then return to dashboard drilldown logic, editor block action polish, and investment asset tracking.
