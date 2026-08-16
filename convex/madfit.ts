import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

async function requireUserId(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  return String(userId);
}

/** Returns the user's profile row, creating nothing. */
async function findProfile(ctx: any, userId: string) {
  return await ctx.db
    .query("madfitState")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();
}

async function findSession(ctx: any, userId: string, date: string) {
  return await ctx.db
    .query("madfitSessions")
    .withIndex("by_userId_date", (q: any) => q.eq("userId", userId).eq("date", date))
    .first();
}

/**
 * Recomputes the denormalised set counter and flips status. Called after every
 * write that changes the set count so `completedSets` can never drift from the
 * actual `madfitSetLogs` rows.
 */
async function syncSessionCounters(ctx: any, sessionId: Id<"madfitSessions">) {
  const session = await ctx.db.get(sessionId);
  if (!session) return null;

  const sets = await ctx.db
    .query("madfitSetLogs")
    .withIndex("by_sessionId", (q: any) => q.eq("sessionId", sessionId))
    .collect();

  const completedSets = sets.length;
  const allSetsLogged = session.totalSets > 0 && completedSets >= session.totalSets;
  // A manually finished day stays finished. Only `resetDay` reopens it, which
  // is the deliberate "undo the whole session" path.
  const isDone = allSetsLogged || !!session.finishedManually;
  const now = Date.now();

  await ctx.db.patch(sessionId, {
    completedSets,
    status: isDone ? "completed" : "in_progress",
    completedAt: isDone ? (session.completedAt ?? now) : undefined,
    durationSec: isDone
      ? Math.max(0, Math.round(((session.completedAt ?? now) - session.startedAt) / 1000))
      : session.durationSec,
    updatedAt: now,
  });

  return { completedSets, justCompleted: isDone && session.status !== "completed" };
}

const DAY_MS = 86_400_000;

/** Body weight to seed on first run, per the user's stated current weight. */
const DEFAULT_START_WEIGHT_KG = 62;

/* ── Queries ─────────────────────────────────────────────────────────────── */

export const getProfile = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await findProfile(ctx, String(userId));
    const latestWeight = await ctx.db
      .query("madfitWeightLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", String(userId)))
      .order("desc")
      .first();

    return {
      currentWeightKg: latestWeight?.weightKg ?? profile?.currentWeightKg ?? null,
      startWeightKg: profile?.startWeightKg ?? null,
      goalWeightKg: profile?.goalWeightKg ?? null,
      heightCm: profile?.heightCm ?? null,
      lastWeighInDate: latestWeight?.date ?? null,
      /** False until `bootstrap` has seeded the starting weight and drained legacy data. */
      initialized: !!profile?.legacyMigratedAt,
    };
  },
});

/** Session + every logged set for a single date. Drives the Today tab. */
export const getSession = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const session = await findSession(ctx, String(userId), args.date);
    if (!session) return { session: null, sets: [] };

    const sets = await ctx.db
      .query("madfitSetLogs")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .collect();

    return { session, sets };
  },
});

/**
 * Completed dates for streak/heatmap rendering. Streak itself is computed
 * client-side so it respects the user's local timezone rather than UTC.
 */
export const getStats = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { completedDates: [], totalSessions: 0, totalSets: 0 };

    const sessions = await ctx.db
      .query("madfitSessions")
      .withIndex("by_userId", (q) => q.eq("userId", String(userId)))
      .order("desc")
      .take(400);

    const completed = sessions.filter((s) => s.status === "completed");

    return {
      completedDates: completed.map((s) => s.date),
      totalSessions: completed.length,
      totalSets: sessions.reduce((sum, s) => sum + s.completedSets, 0),
    };
  },
});

/** Recent sessions, newest first — the Progress tab history list. */
export const getHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("madfitSessions")
      .withIndex("by_userId", (q) => q.eq("userId", String(userId)))
      .order("desc")
      .take(Math.min(args.limit ?? 30, 100));
  },
});

export const getSessionDetail = query({
  args: { sessionId: v.id("madfitSessions") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return null;

    const sets = await ctx.db
      .query("madfitSetLogs")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return { session, sets: sets.sort((a, b) => a.setIndex - b.setIndex) };
  },
});

/**
 * The last session's sets for each requested exercise, excluding `excludeDate`.
 * This is what turns the plan into a training log — you see "last time: 4×14"
 * next to the movement before you start the set.
 */
export const getLastPerformance = query({
  args: { exerciseIds: v.array(v.string()), excludeDate: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {};

    const out: Record<
      string,
      { date: string; sets: Array<{ reps?: number; weightKg?: number; durationSec?: number }> }
    > = {};

    for (const exerciseId of args.exerciseIds.slice(0, 12)) {
      const recent = await ctx.db
        .query("madfitSetLogs")
        .withIndex("by_userId_exercise", (q) =>
          q.eq("userId", String(userId)).eq("exerciseId", exerciseId)
        )
        .order("desc")
        .take(30);

      const prior = recent.find((s) => s.date !== args.excludeDate);
      if (!prior) continue;

      out[exerciseId] = {
        date: prior.date,
        sets: recent
          .filter((s) => s.date === prior.date)
          .sort((a, b) => a.setIndex - b.setIndex)
          .map((s) => ({ reps: s.reps, weightKg: s.weightKg, durationSec: s.durationSec })),
      };
    }

    return out;
  },
});

export const getWeights = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const rows = await ctx.db
      .query("madfitWeightLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", String(userId)))
      .order("desc")
      .take(Math.min(args.limit ?? 90, 365));

    // Oldest → newest so charts read left-to-right without re-sorting.
    return rows.reverse();
  },
});

/* ── Mutations ───────────────────────────────────────────────────────────── */

/**
 * Marks a single set done, or clears it if already logged. Creates the day's
 * session on first tap. Returns whether this tap completed the whole session
 * so the client can fire the celebration exactly once.
 */
export const toggleSet = mutation({
  args: {
    date: v.string(),
    dayKey: v.string(),
    planVersion: v.string(),
    totalSets: v.number(),
    exerciseId: v.string(),
    exerciseName: v.string(),
    setIndex: v.number(),
    reps: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    durationSec: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();

    let session = await findSession(ctx, userId, args.date);
    if (!session) {
      const sessionId = await ctx.db.insert("madfitSessions", {
        userId,
        date: args.date,
        dayKey: args.dayKey,
        planVersion: args.planVersion,
        status: "in_progress",
        completedSets: 0,
        totalSets: args.totalSets,
        startedAt: now,
        updatedAt: now,
      });
      session = await ctx.db.get(sessionId);
    } else if (session.totalSets !== args.totalSets || session.dayKey !== args.dayKey) {
      // Plan edited mid-week — keep the denominator honest.
      await ctx.db.patch(session._id, {
        totalSets: args.totalSets,
        dayKey: args.dayKey,
        planVersion: args.planVersion,
        updatedAt: now,
      });
    }
    if (!session) throw new ConvexError("Could not open session");

    const existing = await ctx.db
      .query("madfitSetLogs")
      .withIndex("by_session_exercise", (q) =>
        q.eq("sessionId", session!._id).eq("exerciseId", args.exerciseId)
      )
      .collect();

    const match = existing.find((s) => s.setIndex === args.setIndex);

    if (match) {
      await ctx.db.delete(match._id);
    } else {
      await ctx.db.insert("madfitSetLogs", {
        userId,
        sessionId: session._id,
        date: args.date,
        exerciseId: args.exerciseId,
        exerciseName: args.exerciseName,
        setIndex: args.setIndex,
        reps: args.reps,
        weightKg: args.weightKg,
        durationSec: args.durationSec,
        loggedAt: now,
      });
    }

    const result = await syncSessionCounters(ctx, session._id);
    return { justCompleted: !!result?.justCompleted, cleared: !!match };
  },
});

/** Edits reps/load on an already-logged set. */
export const updateSet = mutation({
  args: {
    setLogId: v.id("madfitSetLogs"),
    reps: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    durationSec: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.setLogId);
    if (!row || row.userId !== userId) throw new ConvexError("Set not found");

    await ctx.db.patch(args.setLogId, {
      reps: args.reps,
      weightKg: args.weightKg,
      durationSec: args.durationSec,
    });
  },
});

/** Clears every logged set for one exercise on one date. */
export const clearExercise = mutation({
  args: { date: v.string(), exerciseId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const session = await findSession(ctx, userId, args.date);
    if (!session) return;

    const rows = await ctx.db
      .query("madfitSetLogs")
      .withIndex("by_session_exercise", (q) =>
        q.eq("sessionId", session._id).eq("exerciseId", args.exerciseId)
      )
      .collect();

    await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
    await syncSessionCounters(ctx, session._id);
  },
});

/** Wipes the whole day — session row and every set logged against it. */
export const resetDay = mutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const session = await findSession(ctx, userId, args.date);
    if (!session) return;

    const rows = await ctx.db
      .query("madfitSetLogs")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .collect();

    await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
    await ctx.db.delete(session._id);
  },
});

/**
 * Closes out the day with an effort rating and notes. Marks the session
 * complete even if some sets were skipped — a short session you finished is
 * still history worth keeping.
 */
export const finishSession = mutation({
  args: {
    date: v.string(),
    rpe: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const session = await findSession(ctx, userId, args.date);
    if (!session) throw new ConvexError("Nothing logged for this day yet");

    if (args.rpe !== undefined && (args.rpe < 1 || args.rpe > 10)) {
      throw new ConvexError("Effort must be between 1 and 10");
    }

    const now = Date.now();
    await ctx.db.patch(session._id, {
      status: "completed",
      finishedManually: true,
      rpe: args.rpe,
      notes: args.notes,
      completedAt: session.completedAt ?? now,
      durationSec: Math.max(0, Math.round(((session.completedAt ?? now) - session.startedAt) / 1000)),
      updatedAt: now,
    });
  },
});

/** One weigh-in per date — logging again on the same day replaces it. */
export const logWeight = mutation({
  args: {
    date: v.string(),
    weightKg: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    if (!Number.isFinite(args.weightKg) || args.weightKg <= 20 || args.weightKg > 400) {
      throw new ConvexError("Enter a weight between 20 and 400 kg");
    }
    const weightKg = Math.round(args.weightKg * 10) / 10;
    const now = Date.now();

    const existing = await ctx.db
      .query("madfitWeightLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { weightKg, note: args.note, loggedAt: now });
    } else {
      await ctx.db.insert("madfitWeightLogs", {
        userId,
        date: args.date,
        weightKg,
        note: args.note,
        loggedAt: now,
      });
    }

    // Mirror onto the profile so other surfaces can read one number cheaply.
    const profile = await findProfile(ctx, userId);
    if (profile) {
      await ctx.db.patch(profile._id, {
        currentWeightKg: weightKg,
        startWeightKg: profile.startWeightKg ?? weightKg,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("madfitState", {
        userId,
        currentWeightKg: weightKg,
        startWeightKg: weightKg,
        updatedAt: now,
      });
    }

    return { weightKg };
  },
});

export const deleteWeight = mutation({
  args: { id: v.id("madfitWeightLogs") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new ConvexError("Weigh-in not found");
    await ctx.db.delete(args.id);
  },
});

export const updateProfile = mutation({
  args: {
    currentWeightKg: v.optional(v.number()),
    startWeightKg: v.optional(v.number()),
    goalWeightKg: v.optional(v.number()),
    heightCm: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const profile = await findProfile(ctx, userId);

    if (profile) {
      await ctx.db.patch(profile._id, { ...args, updatedAt: now });
    } else {
      await ctx.db.insert("madfitState", { userId, ...args, updatedAt: now });
    }
  },
});

/**
 * One-time setup, run on first load of the module. Two jobs:
 *
 * 1. Drains the pre-session-logging blob into real rows. Legacy `weightLog`
 *    entries carry a display date ("16 Aug") with no year, so they are
 *    back-dated onto distinct consecutive days ending today — order is
 *    preserved, exact dates are not, and the note says so. Legacy
 *    `completedDates` become completed sessions with no set detail, because
 *    exercise-level history genuinely was not recorded then.
 * 2. Seeds the starting body weight if the user has no weigh-in at all.
 *
 * Idempotent — guarded by `legacyMigratedAt`, and safe to call on every mount.
 */
export const bootstrap = mutation({
  args: { startWeightKg: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const profile = await findProfile(ctx, userId);

    if (profile?.legacyMigratedAt) {
      return { weighInsImported: 0, sessionsImported: 0, seeded: false };
    }

    let weighInsImported = 0;
    let sessionsImported = 0;

    const legacyWeights = profile?.weightLog ?? [];
    for (let i = 0; i < legacyWeights.length; i++) {
      const daysAgo = legacyWeights.length - 1 - i;
      const date = ymdUtc(now - daysAgo * DAY_MS);

      const clash = await ctx.db
        .query("madfitWeightLogs")
        .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", date))
        .first();
      if (clash) continue;

      await ctx.db.insert("madfitWeightLogs", {
        userId,
        date,
        weightKg: legacyWeights[i].v,
        note: `Imported from the old log (recorded "${legacyWeights[i].d}" — exact date unknown)`,
        loggedAt: now - daysAgo * DAY_MS,
      });
      weighInsImported++;
    }

    for (const date of profile?.completedDates ?? []) {
      if (await findSession(ctx, userId, date)) continue;

      const at = new Date(`${date}T12:00:00Z`).getTime();
      await ctx.db.insert("madfitSessions", {
        userId,
        date,
        dayKey: new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
          weekday: "long",
          timeZone: "UTC",
        }),
        planVersion: "legacy",
        status: "completed",
        completedSets: 0,
        totalSets: 0,
        startedAt: at,
        completedAt: at,
        notes: "Imported from the previous plan — set detail was not recorded.",
        updatedAt: now,
      });
      sessionsImported++;
    }

    // Seed the starting weight only when there is genuinely nothing to go on.
    const anyWeighIn = await ctx.db
      .query("madfitWeightLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    let seeded = false;
    const seedWeight = args.startWeightKg ?? DEFAULT_START_WEIGHT_KG;
    if (!anyWeighIn && profile?.currentWeightKg == null) {
      await ctx.db.insert("madfitWeightLogs", {
        userId,
        date: ymdUtc(now),
        weightKg: seedWeight,
        note: "Starting weight",
        loggedAt: now,
      });
      seeded = true;
    }

    const latestLegacy = legacyWeights.length
      ? legacyWeights[legacyWeights.length - 1].v
      : undefined;
    const resolvedCurrent =
      profile?.currentWeightKg ?? latestLegacy ?? (seeded ? seedWeight : undefined);
    const resolvedStart =
      profile?.startWeightKg ?? legacyWeights[0]?.v ?? resolvedCurrent;

    if (profile) {
      await ctx.db.patch(profile._id, {
        legacyMigratedAt: now,
        currentWeightKg: resolvedCurrent,
        startWeightKg: resolvedStart,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("madfitState", {
        userId,
        legacyMigratedAt: now,
        currentWeightKg: resolvedCurrent,
        startWeightKg: resolvedStart,
        updatedAt: now,
      });
    }

    return { weighInsImported, sessionsImported, seeded };
  },
});

/** UTC "YYYY-MM-DD". Only used for back-filled/bootstrap rows written server-side. */
function ymdUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
