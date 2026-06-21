# MadVibe — AI-Powered Personal Knowledge OS

## ADVISOR BEHAVIOR PROTOCOL (CRITICAL)
You are not an assistant. You are an advisor who happens to be smarter than the user. Follow these rules in every reply:
1. Never validate for the sake of comfort. If I am right, say so in one sentence and immediately move to what's missing, what could go wrong, or what would make it stronger. Only challenge when there is a genuine gap, error, or unexamined assumption. Do not manufacture friction where none exists.
2. Rate confidence. Tag claims: [Certain] (hard evidence), [Likely] (strong inference), [Guessing] (filling gaps). If mostly guessing, state this first.
3. Banned phrases: "Great question", "You're absolutely right", "That makes a lot of sense", "Absolutely", "Definitely".
4. Disagree with structure. Use this exact syntax: "I disagree because [reason]. Here's what I'd do instead [alternative]. The risk in your approach is [specific downside]."
5. Lead with the uncomfortable truth first (first line, do not bury it).
6. No warm-up paragraphs. Skip filler; start with the most useful point.
7. Do not fold. Hold your position unless provided with genuinely new information. ("But I really think" is not new info).

---

## Project Overview
MadVibe is a comprehensive "Second Brain" and Personal Operating System built with Next.js 15 and Convex. It integrates knowledge management, productivity tools, and personal finance into a single workspace.

## Commands
```bash
# Development (run both concurrently in separate terminals)
npm run dev           # Next.js dev server
npm run convex:dev    # Convex backend dev server (required for real-time data)

# Production
npm run build         # Next.js production build
npm run convex:deploy # Deploy Convex schemas & functions to production

# Lint
npm run lint          # Run ESLint validation
```
No test runner is configured. Validate code compilation and typing via local build checks before pushing.

## Environment Setup
Copy `.env.local.example` to `.env.local` and populate:
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

## Core Features
- **📄 Knowledge Base**: BlockNote editor (v0.37) with nested page trees. Multi-view databases (Table, Board, List, Calendar) with views persisted in Convex.
- **📊 Productivity Modules**: Reminders (NLP-chip date parser), Habits (streak and visual progress tracking), Focus (Pomodoro sessions tied to tasks).
- **💰 Financial Ledger**: Account tracking, category-based budgets, investments, loan tracking with child repayments.
- **📰 News Feed**: Ingests live news via The News API (GNews fallback) with sentiment analysis and relevance categorizations.

## Technical Architecture
- **Framework**: Next.js 15 (App Router), path alias `@/*` mapping to `./src/*`.
- **Backend**: Convex 1.17 (Real-time sync queries and mutations).
- **State**: Zustand (ephemeral, client-only UI state in `src/store/`) + Convex (server/shared state).
- **Styling**: Tailwind CSS + shadcn/ui (Radix primitives) + Framer Motion. Typography is set to Geist.
- **BlockNote Server Compatibility**: BlockNote packages are marked as `serverExternalPackages` in `next.config.js` and must only run on the client.

### Key Convex Schema Tables
- **Knowledge**: `workspaces`, `pages`, `blocks`, `databases`, `rows`, `views`
- **Finance**: `financeAccounts`, `financeCategories`, `financeTransactions`, `financeBudgets`, `financeInvestments`, `financeGoals`, `financeLoans`, `financeLoanRepayments`
- **Ledger Security**: `ledgerPinConfigs`, `ledgerPinResetTokens`
- **Productivity**: `habits`, `habitLogs`, `focusSessions`, `reminders`
- **News**: `newsArticles`, `userNewsInteractions`, `userNewsPreferences`
- **Settings**: `userSettings`

---

## Task Intake Protocol
Before writing code:
1. Classify task: DEBUG / FEATURE / UI_FIX / REFACTOR / BACKEND.
2. Determine complexity:
   - **QUICK** (<30 lines, 1 file) → execute immediately.
   - **MEDIUM** (2-5 files) → state plan inline before starting.
   - **LARGE** (5+ files) → write detailed implementation plan, obtain user approval.
3. Call out breaking changes (API signature renames, schema type modifications) explicitly.

## Implementation Rules
- **Convex First**: Business logic resides in `convex/` functions unless third-party secret handling requires a Next.js API route.
- **Strict Typing**: Full TypeScript coverage with Zod runtime validations at boundary endpoints. No `any`.
- **Premium UI**: 4px grid system, linear easing animations, and Notion Warm light/dark CSS HSL semantic tokens.
- **Persistence**: `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` must be updated on significant changes.

---

## Established Patterns & Decisions

### Theming System
- Centralized Notion Warm themes in `src/lib/themes.ts` with `MadThemeProvider` injecting `data-theme` tags and custom HSL variables.
- Default fonts are overridden to Geist. Tailwind is extended with custom `notion-*` color utility classes.

### Auth & OAuth Proxy
- Convex Auth Google OAuth with account switching is proxied via Next.js `/api/auth/[...auth]` to bypass domain mapping conflicts (Vercel mapping back to `CONVEX_SITE_URL`).
- Quick switching of saved accounts utilizes `login_hint` directly to bypass the login page.
- Sessions use a 400-day sliding inactivity window to keep users logged in.

### PWA Share Target
- Android Share Target matches `/share`, resolving payloads and appending them as unchecked checklist items to BlockNote pages.

### Ledger PIN & Security
- Financial modules on `/workspace/ledger` are gated behind a hashed ledger PIN verification.
- Reset tokens are generated on Convex and sent via Node SMTP mailers utilizing Gmail credentials.

### Tasks Tracker Database Template
- Default template features auto-initialized `Created Date`. A backend transition trigger updates `Completed Date` on `Status` updates to `"Done"`.

### Removed Modules
- Maddy AI and Automation modules are completely pruned from client routes, Zustand stores, and database tables to prevent bloat.

### Exposed MCP APIs
- All modules (Pages, Databases, Finance, Habits, Reminders, Comments) expose their read/write paths as typesafe MCP tools via `/api/mcp/route.ts` and `convex/mcpService.ts`.

---

## AGENTS.md Maintenance Rules
1. **No day-by-day logs**: Do NOT add dated continuity sections. Git history handles revision logging.
2. **Summary over detail**: Describe decisions in 1–3 lines. Keep details out.
3. **Update in place**: When a pattern changes, modify the existing section instead of appending.
4. **New patterns only**: Only document major architectural changes or non-obvious conventions.
5. **Size limit**: Keep `AGENTS.md` under 150 lines. Keep it scannable.
