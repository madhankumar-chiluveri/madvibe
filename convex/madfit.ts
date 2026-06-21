import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getState = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const state = await ctx.db
      .query("madfitState")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!state) {
      return {
        progress: "{}",
        completedDates: [],
        weightLog: [],
      };
    }

    return state;
  },
});

export const updateProgress = mutation({
  args: { progress: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("madfitState")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        progress: args.progress,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("madfitState", {
        userId,
        progress: args.progress,
        completedDates: [],
        weightLog: [],
        updatedAt: Date.now(),
      });
    }
  },
});

export const markDayComplete = mutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("madfitState")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      const dates = [...existing.completedDates];
      if (!dates.includes(args.date)) {
        dates.push(args.date);
        await ctx.db.patch(existing._id, {
          completedDates: dates,
          updatedAt: Date.now(),
        });
      }
    } else {
      await ctx.db.insert("madfitState", {
        userId,
        progress: "{}",
        completedDates: [args.date],
        weightLog: [],
        updatedAt: Date.now(),
      });
    }
  },
});

export const resetDay = mutation({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("madfitState")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!existing) return;

    let progressObj: Record<string, boolean> = {};
    try {
      progressObj = JSON.parse(existing.progress);
    } catch (e) {}

    args.ids.forEach((id) => {
      delete progressObj[id];
    });

    await ctx.db.patch(existing._id, {
      progress: JSON.stringify(progressObj),
      updatedAt: Date.now(),
    });
  },
});

export const addWeight = mutation({
  args: { v: v.number(), d: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("madfitState")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      const weightLog = [...existing.weightLog, { v: args.v, d: args.d }];
      await ctx.db.patch(existing._id, {
        weightLog,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("madfitState", {
        userId,
        progress: "{}",
        completedDates: [],
        weightLog: [{ v: args.v, d: args.d }],
        updatedAt: Date.now(),
      });
    }
  },
});
