import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireWorkspaceAccess } from "./workspaceAccess";

async function requireUserId(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
    includeCompleted: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_workspaceId_remindAt", (q) => q.eq("workspaceId", args.workspaceId))
      .order("asc")
      .collect();

    const visible = reminders.filter(
      (reminder) =>
        reminder.userId === userId &&
        (args.includeCompleted ? true : reminder.status === "scheduled")
    );

    return visible.slice(0, args.limit ?? 250);
  },
});

export const getSummary = query({
  args: {
    workspaceId: v.id("workspaces"),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");
    const now = args.now ?? Date.now();

    const scheduled = await ctx.db
      .query("reminders")
      .withIndex("by_workspaceId_status_remindAt", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "scheduled")
      )
      .collect();

    const pending = scheduled.filter((reminder) => reminder.userId === userId);
    const overdue = pending.filter((reminder) => reminder.remindAt <= now).length;

    return {
      total: pending.length,
      overdue,
      upcoming: Math.max(pending.length - overdue, 0),
    };
  },
});

export const listDue = query({
  args: {
    workspaceId: v.id("workspaces"),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");
    const now = args.now ?? Date.now();

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_workspaceId_status_remindAt", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "scheduled").lte("remindAt", now)
      )
      .collect();

    return reminders
      .filter((reminder) => reminder.userId === userId && !reminder.notifiedAt)
      .slice(0, 10);
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    note: v.optional(v.string()),
    remindAt: v.number(),
    pageId: v.optional(v.union(v.id("pages"), v.null())),
    databaseId: v.optional(v.union(v.id("databases"), v.null())),
    rowId: v.optional(v.union(v.id("rows"), v.null())),
    sourceLabel: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");
    const now = Date.now();

    return await ctx.db.insert("reminders", {
      userId,
      workspaceId: args.workspaceId,
      title: args.title,
      note: args.note,
      remindAt: args.remindAt,
      status: "scheduled",
      pageId: args.pageId ?? null,
      databaseId: args.databaseId ?? null,
      rowId: args.rowId ?? null,
      sourceLabel: args.sourceLabel,
      sourceUrl: args.sourceUrl,
      completedAt: null,
      notifiedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("reminders"),
    title: v.optional(v.string()),
    note: v.optional(v.string()),
    remindAt: v.optional(v.number()),
    sourceLabel: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const reminder = await ctx.db.get(args.id);
    if (!reminder || reminder.userId !== userId) throw new Error("Reminder not found");

    await ctx.db.patch(args.id, {
      title: args.title ?? reminder.title,
      note: args.note ?? reminder.note,
      remindAt: args.remindAt ?? reminder.remindAt,
      sourceLabel: args.sourceLabel ?? reminder.sourceLabel,
      sourceUrl: args.sourceUrl ?? reminder.sourceUrl,
      notifiedAt: args.remindAt !== undefined ? null : reminder.notifiedAt ?? null,
      updatedAt: Date.now(),
    });
  },
});

export const setCompleted = mutation({
  args: {
    id: v.id("reminders"),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const reminder = await ctx.db.get(args.id);
    if (!reminder || reminder.userId !== userId) throw new Error("Reminder not found");

    await ctx.db.patch(args.id, {
      status: args.completed ? "completed" : "scheduled",
      completedAt: args.completed ? Date.now() : null,
      notifiedAt: args.completed ? reminder.notifiedAt ?? null : null,
      updatedAt: Date.now(),
    });
  },
});

export const snooze = mutation({
  args: {
    id: v.id("reminders"),
    remindAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const reminder = await ctx.db.get(args.id);
    if (!reminder || reminder.userId !== userId) throw new Error("Reminder not found");

    await ctx.db.patch(args.id, {
      remindAt: args.remindAt,
      status: "scheduled",
      completedAt: null,
      notifiedAt: null,
      updatedAt: Date.now(),
    });
  },
});

export const markNotified = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const reminder = await ctx.db.get(args.id);
    if (!reminder || reminder.userId !== userId) throw new Error("Reminder not found");

    await ctx.db.patch(args.id, {
      notifiedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const reminder = await ctx.db.get(args.id);
    if (!reminder || reminder.userId !== userId) throw new Error("Reminder not found");
    await ctx.db.delete(args.id);
  },
});
