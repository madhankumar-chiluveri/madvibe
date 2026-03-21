import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listHabits = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("habits")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getTodaysLogs = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("habitLogs")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .collect();
  },
});

export const getWeeklyLogs = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const all = await ctx.db
      .query("habitLogs")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).gte("date", args.startDate)
      )
      .filter((q) => q.lte(q.field("date"), args.endDate))
      .collect();
    return all;
  },
});

export const createHabit = mutation({
  args: {
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    frequency: v.union(
      v.literal("daily"), v.literal("weekdays"),
      v.literal("weekends"), v.literal("custom")
    ),
    customDays: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const count = await ctx.db
      .query("habits")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return await ctx.db.insert("habits", {
      userId,
      ...args,
      streak: 0,
      longestStreak: 0,
      isActive: true,
      sortOrder: count.length,
      createdAt: Date.now(),
    });
  },
});

export const logHabit = mutation({
  args: {
    habitId: v.id("habits"),
    date: v.string(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("habitLogs")
      .withIndex("by_habitId_date", (q) =>
        q.eq("habitId", args.habitId).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        completed: args.completed,
        completedAt: args.completed ? Date.now() : undefined,
      });
    } else {
      await ctx.db.insert("habitLogs", {
        habitId: args.habitId,
        userId,
        date: args.date,
        completed: args.completed,
        completedAt: args.completed ? Date.now() : undefined,
      });
    }

    // Update streak
    if (args.completed) {
      const habit = await ctx.db.get(args.habitId);
      if (habit) {
        const newStreak = habit.streak + 1;
        await ctx.db.patch(args.habitId, {
          streak: newStreak,
          longestStreak: Math.max(habit.longestStreak, newStreak),
        });
      }
    }
  },
});

export const deleteHabit = mutation({
  args: { id: v.id("habits") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false });
  },
});

export const seedDefaultHabits = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const existing = await ctx.db
      .query("habits")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) return;

    const defaults = [
      { name: "Morning Review", icon: "☀️", color: "#f59e0b", frequency: "daily" as const },
      { name: "Read / Learn", icon: "📚", color: "#3b82f6", frequency: "daily" as const },
      { name: "Exercise", icon: "💪", color: "#10b981", frequency: "daily" as const },
      { name: "Log Expenses", icon: "💰", color: "#6366f1", frequency: "daily" as const },
      { name: "Deep Work", icon: "🧠", color: "#8b5cf6", frequency: "weekdays" as const },
    ];

    for (let i = 0; i < defaults.length; i++) {
      await ctx.db.insert("habits", {
        userId,
        ...defaults[i],
        streak: 0,
        longestStreak: 0,
        isActive: true,
        sortOrder: i,
        createdAt: Date.now(),
      });
    }
  },
});
