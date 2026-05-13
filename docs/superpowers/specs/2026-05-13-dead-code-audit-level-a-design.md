# Dead Code Audit — Level A Cleanup

**Date:** 2026-05-13  
**Project:** madvibe  
**Scope:** Remove code with zero references in both frontend (src/) and backend (convex/) — no intentional stubs, no future-planned features.

---

## What Gets Removed

### 1. Schema Tables

| Table | Location | Reason |
|---|---|---|
| `focusSessions` | `convex/schema.ts` | 0 refs in any file |
| `notifications` | `convex/schema.ts` | 0 refs — no UI, no calls, no internal usage |

### 2. Dead Convex Files (delete entirely)

| File | Reason |
|---|---|
| `convex/notifications.ts` | All 5 exports (`listNotifications`, `getUnreadCount`, `markRead`, `markAllRead`, `createNotification`) have 0 callers |
| `convex/maddyOrganise.ts` | Only re-exports `organiseWorkspace` from `maddy.ts`; 0 src/ callers |
| `convex/migrations/wipeOldAutomations.ts` | One-time migration already executed; `internalMutation` not wired to any cron or caller |

### 3. Dead Functions (remove from existing files)

| Function | File | Reason |
|---|---|---|
| `seedDemoArticles` | `convex/feed.ts` | Never called from src/ or other convex files |
| `seedDefaultCategories` | `convex/ledger.ts` | Never called from src/ or other convex files |

### 4. Dead Frontend Files (delete entirely)

| File | Reason |
|---|---|
| `src/services/fcm.service.ts` | Firebase Cloud Messaging service; never imported anywhere — push notifications use `web-push` via `convex/push.ts` instead |

---

## What Does NOT Get Removed

- `convex/push.ts` + `convex/pushHelpers.ts` — used by `src/hooks/use-push.ts`
- `convex/notifications.ts` internal types — no types exported; safe to delete whole file
- Any ledger/investment/maddy functions that are called internally by other convex functions (Level B scope, excluded)

---

## Architecture Impact

- Schema shrinks by 2 tables → fewer indexes, cleaner Convex dashboard
- `_generated/api.d.ts` regenerates automatically on next `convex dev` run
- No frontend component or hook references any removed item — verified by grep
- Push notification system (`use-push.ts`, `push.ts`, `pushHelpers.ts`) unaffected

---

## Execution Order

1. Remove `focusSessions` + `notifications` table blocks from `schema.ts`
2. Delete `convex/notifications.ts`
3. Delete `convex/maddyOrganise.ts`
4. Delete `convex/migrations/wipeOldAutomations.ts`
5. Remove `seedDemoArticles` function from `convex/feed.ts`
6. Remove `seedDefaultCategories` function from `convex/ledger.ts`
7. Delete `src/services/fcm.service.ts`
8. Run `npx convex dev` — verify clean bundle, no errors

---

## Success Criteria

- `npx convex dev` bundles with 0 errors
- `npm run build` passes (Next.js)
- No remaining references to removed items in src/ or convex/ (excluding `_generated/`)
