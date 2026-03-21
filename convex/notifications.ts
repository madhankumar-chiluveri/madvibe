import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listNotifications = query({
  args: { unreadOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    let q = ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc");
    const all = await q.take(50);
    return args.unreadOnly ? all.filter((n) => !n.isRead) : all;
  },
});

export const getUnreadCount = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_isRead", (q) =>
        q.eq("userId", userId).eq("isRead", false)
      )
      .collect();
    return unread.length;
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isRead: true });
  },
});

export const markAllRead = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_isRead", (q) =>
        q.eq("userId", userId).eq("isRead", false)
      )
      .collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })));
  },
});

export const createNotification = mutation({
  args: {
    type: v.union(
      v.literal("task_due"), v.literal("budget_alert"), v.literal("bill_reminder"),
      v.literal("breaking_news"), v.literal("ai_insight"), v.literal("weekly_review"),
      v.literal("habit_streak"), v.literal("investment_alert")
    ),
    title: v.string(),
    body: v.string(),
    module: v.union(
      v.literal("overview"), v.literal("news"), v.literal("kb"),
      v.literal("finance"), v.literal("ai")
    ),
    actionUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("notifications", {
      userId,
      ...args,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});
