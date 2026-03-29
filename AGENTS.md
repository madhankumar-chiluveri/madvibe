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
### Continuity Status: 2026-03-29
- **Recent Fixes**: Added Google OAuth support to Convex Auth with `select_account` prompting, corrected local env docs to use `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, added a recent-accounts quick pick to the login page, persisted signed-in account metadata to local storage, introduced a multi-account section in the workspace switcher for add/switch/remove account flows, added a settings-based password-to-Google conversion flow that verifies the old password, re-links the Google auth account to the original user ID, removes password login, and stores account provider metadata from live auth status instead of avatar heuristics, now persist database view state in Convex so saved filters, sorts, board grouping, and table column order survive refreshes while the Tasks Tracker template seeds `ID`, `Assigned By`, and editable auto-filled `Created` defaults, and moved page/database breadcrumbs into the global pinned workspace header while exposing the existing context pane through a mobile drawer so spaces and navigation are reachable on phones.
- **Current Focus**: Finish deployment-side Google OAuth credential setup and end-to-end verification, validate the new password-to-Google conversion flow against real accounts, sanity-check the persistent database view UX and new mobile workspace navigation against real table/page workflows, then return to dashboard drilldown logic, editor block action polish, and investment asset tracking.