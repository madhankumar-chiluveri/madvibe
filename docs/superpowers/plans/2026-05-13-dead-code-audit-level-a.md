# Dead Code Audit — Level A Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all code with zero references in both frontend and backend — 2 dead schema tables, 1 dead file in src/, 3 dead convex files, and 2 dead seed functions.

**Architecture:** Pure deletion. No new code. Each task removes one dead artifact and verifies the bundle still compiles. Final task runs full `convex dev` + `next build` to confirm zero regressions.

**Tech Stack:** Convex 1.17, Next.js 15 App Router, TypeScript

---

## Files Modified

| File | Action |
|---|---|
| `convex/schema.ts` | Remove `focusSessions` table (lines 693–701) and `notifications` table (lines 703–722) |
| `convex/feed.ts` | Remove `seedDemoArticles` function (lines 196–337) |
| `convex/ledger.ts` | Remove `seedDefaultCategories` function (lines 89–126) |
| `convex/notifications.ts` | **Delete** entire file |
| `convex/maddyOrganise.ts` | **Delete** entire file |
| `convex/migrations/wipeOldAutomations.ts` | **Delete** entire file |
| `src/services/fcm.service.ts` | **Delete** entire file |

---

## Task 1: Remove `focusSessions` table from schema

**Files:**
- Modify: `convex/schema.ts:693-701`

- [ ] **Step 1: Remove the `focusSessions` block**

In `convex/schema.ts`, delete lines 693–701 (the `// ── Focus Sessions` comment plus the `focusSessions` table definition):

```ts
  // ── Focus Sessions ─────────────────────────────────────
  focusSessions: defineTable({
    userId: v.string(),
    duration: v.number(), // minutes
    taskNote: v.optional(v.string()),
    pageId: v.optional(v.string()),
    completedAt: v.number(),
    wasCompleted: v.boolean(),
  }).index("by_userId", ["userId"]),
```

Delete those 9 lines entirely. Nothing above or below should change.

- [ ] **Step 2: Verify no remaining references**

Run:
```
grep -r "focusSessions\|focusSession" convex/ src/ --include="*.ts" --include="*.tsx" -l
```
Expected output: `convex/schema.ts` should NOT appear. Zero results = clean.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "chore: remove unused focusSessions schema table"
```

---

## Task 2: Remove `notifications` table from schema

**Files:**
- Modify: `convex/schema.ts:703-722`

- [ ] **Step 1: Remove the `notifications` block**

In `convex/schema.ts`, delete lines 703–722 (the `// ── Notifications` comment plus the `notifications` table definition):

```ts
  // ── Notifications ──────────────────────────────────────
  notifications: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("task_due"), v.literal("budget_alert"), v.literal("bill_reminder"),
      v.literal("breaking_news"), v.literal("ai_insight"), v.literal("weekly_review"),
      v.literal("habit_streak"), v.literal("investment_alert")
    ),
    title: v.string(),
    body: v.string(),
    module: v.union(
      v.literal("overview"), v.literal("feed"), v.literal("brain"),
      v.literal("ledger"), v.literal("ai")
    ),
    actionUrl: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_isRead", ["userId", "isRead"]),
```

Delete those 20 lines entirely.

- [ ] **Step 2: Verify no remaining references**

Run:
```
grep -r "\"notifications\"\|notifications\." convex/ src/ --include="*.ts" --include="*.tsx" -l
```
Expected: only `convex/_generated/api.d.ts` (auto-gen, will be regenerated later). No src/ or hand-written convex/ files.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "chore: remove unused notifications schema table"
```

---

## Task 3: Delete `convex/notifications.ts`

**Files:**
- Delete: `convex/notifications.ts`

- [ ] **Step 1: Confirm zero callers one more time**

Run:
```
grep -r "api\.notifications\.\|internal\.notifications\." convex/ src/ --include="*.ts" --include="*.tsx"
```
Expected: no matches.

- [ ] **Step 2: Delete the file**

Delete `convex/notifications.ts` entirely (the whole file — 80 lines of `listNotifications`, `getUnreadCount`, `markRead`, `markAllRead`, `createNotification`).

- [ ] **Step 3: Commit**

```bash
git add -u convex/notifications.ts
git commit -m "chore: delete unused notifications convex module"
```

---

## Task 4: Delete `convex/maddyOrganise.ts`

**Files:**
- Delete: `convex/maddyOrganise.ts`

- [ ] **Step 1: Confirm zero src/ callers**

Run:
```
grep -r "maddyOrganise\|organiseWorkspace" src/ --include="*.ts" --include="*.tsx"
```
Expected: no matches.

- [ ] **Step 2: Delete the file**

Delete `convex/maddyOrganise.ts` entirely (6-line re-export wrapper).

- [ ] **Step 3: Commit**

```bash
git add -u convex/maddyOrganise.ts
git commit -m "chore: delete maddyOrganise.ts redundant re-export wrapper"
```

---

## Task 5: Delete `convex/migrations/wipeOldAutomations.ts`

**Files:**
- Delete: `convex/migrations/wipeOldAutomations.ts`

- [ ] **Step 1: Confirm not wired to any cron or caller**

Run:
```
grep -r "wipeOldAutomations" convex/ src/ --include="*.ts" --include="*.tsx" -l
```
Expected: only `convex/_generated/api.d.ts` (auto-gen). No hand-written callers.

- [ ] **Step 2: Delete the file**

Delete `convex/migrations/wipeOldAutomations.ts` entirely.

- [ ] **Step 3: Check if migrations/ directory is now empty**

Run:
```
ls convex/migrations/
```
If empty, delete the directory too:
```bash
rmdir convex/migrations
```

- [ ] **Step 4: Commit**

```bash
git add -u convex/migrations/
git commit -m "chore: delete wipeOldAutomations one-time migration (already ran)"
```

---

## Task 6: Remove `seedDemoArticles` from `convex/feed.ts`

**Files:**
- Modify: `convex/feed.ts:196-337`

- [ ] **Step 1: Remove the function**

In `convex/feed.ts`, delete lines 196–337 (the full `export const seedDemoArticles = action({...});` block). The function starts at line 196 and ends at line 337 (closing `});`).

The line immediately before (195) should be blank or a comment. The line immediately after (338) is a blank line before `export const insertArticle`.

- [ ] **Step 2: Verify `insertArticle` and `bulkUpsertArticles` still exist**

Run:
```
grep -n "export const insertArticle\|export const bulkUpsertArticles" convex/feed.ts
```
Both must still be present — they are called internally by `feedSync.ts`.

- [ ] **Step 3: Commit**

```bash
git add convex/feed.ts
git commit -m "chore: remove seedDemoArticles dead seed function from feed.ts"
```

---

## Task 7: Remove `seedDefaultCategories` from `convex/ledger.ts`

**Files:**
- Modify: `convex/ledger.ts:89-126`

- [ ] **Step 1: Remove the function**

In `convex/ledger.ts`, delete lines 89–126 (the full `export const seedDefaultCategories = mutation({...});` block). The line immediately after (127) is a blank line, then line 128 is `// ── Transactions ──`.

- [ ] **Step 2: Verify the Transactions section is intact**

Run:
```
grep -n "listTransactions\|createTransaction" convex/ledger.ts
```
Both must still appear at their new (shifted) line numbers.

- [ ] **Step 3: Commit**

```bash
git add convex/ledger.ts
git commit -m "chore: remove seedDefaultCategories dead seed function from ledger.ts"
```

---

## Task 8: Delete `src/services/fcm.service.ts`

**Files:**
- Delete: `src/services/fcm.service.ts`

- [ ] **Step 1: Confirm zero imports**

Run:
```
grep -r "fcm\.service\|fcmService\|FCMService" src/ --include="*.ts" --include="*.tsx"
```
Expected: no matches (file references only itself).

- [ ] **Step 2: Delete the file**

Delete `src/services/fcm.service.ts` entirely.

- [ ] **Step 3: Check if services/ directory is now empty**

Run:
```
ls src/services/
```
If empty, delete the directory:
```bash
rmdir src/services
```

- [ ] **Step 4: Commit**

```bash
git add -u src/services/
git commit -m "chore: delete unused FCM service (push uses web-push via convex/push.ts)"
```

---

## Task 9: Verify full clean build

- [ ] **Step 1: Run Convex bundler**

```
npx convex dev --once
```
Expected: `✓ Deployed` with zero errors. The `_generated/api.d.ts` regenerates automatically — removed tables and functions will no longer appear.

- [ ] **Step 2: Run Next.js build**

```
npm run build
```
Expected: `✓ Compiled successfully` with zero TypeScript errors.

- [ ] **Step 3: Confirm removed symbols are gone from generated API**

Run:
```
grep -n "focusSessions\|notifications\|maddyOrganise\|seedDemoArticles\|seedDefaultCategories\|wipeOldAutomations\|fcmService" convex/_generated/api.d.ts
```
Expected: no matches.

- [ ] **Step 4: Final commit (if any generated files changed)**

```bash
git add convex/_generated/
git commit -m "chore: regenerate convex API after Level A dead code removal"
```
