import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireWorkspaceAccess } from "./workspaceAccess";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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
  handler: async (ctx, args): Promise<Id<"reminders">> => {
    const userId = await requireUserId(ctx);
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");
    const now = Date.now();

    const scheduledFunctionId = args.remindAt > now
      ? await ctx.scheduler.runAt(args.remindAt, internal.push.sendReminderPush, {
        userId,
        title: args.title,
        body: args.note || `Reminder: ${args.title}`,
        url: args.sourceUrl || undefined,
      })
      : undefined;

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
      scheduledFunctionId,
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
  handler: async (ctx, args): Promise<void> => {
    const userId = await requireUserId(ctx);
    const reminder = await ctx.db.get(args.id);
    if (!reminder || reminder.userId !== userId) throw new Error("Reminder not found");

    let scheduledFunctionId = reminder.scheduledFunctionId;

    // Reschedule if remindAt changes
    if (args.remindAt !== undefined && args.remindAt !== reminder.remindAt) {
      if (reminder.scheduledFunctionId) {
        await ctx.scheduler.cancel(reminder.scheduledFunctionId);
      }

      if (args.remindAt > Date.now()) {
        scheduledFunctionId = await ctx.scheduler.runAt(args.remindAt, internal.push.sendReminderPush, {
          userId,
          title: args.title ?? reminder.title,
          body: args.note ?? reminder.note ?? `Reminder: ${args.title ?? reminder.title}`,
          url: args.sourceUrl ?? reminder.sourceUrl ?? undefined,
        });
      } else {
        scheduledFunctionId = undefined;
      }
    }

    await ctx.db.patch(args.id, {
      title: args.title ?? reminder.title,
      note: args.note ?? reminder.note,
      remindAt: args.remindAt ?? reminder.remindAt,
      sourceLabel: args.sourceLabel ?? reminder.sourceLabel,
      sourceUrl: args.sourceUrl ?? reminder.sourceUrl,
      notifiedAt: args.remindAt !== undefined ? null : reminder.notifiedAt ?? null,
      scheduledFunctionId,
      updatedAt: Date.now(),
    });
  },
});

export const setCompleted = mutation({
  args: {
    id: v.id("reminders"),
    completed: v.boolean(),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await requireUserId(ctx);
    const reminder = await ctx.db.get(args.id);
    if (!reminder || reminder.userId !== userId) throw new Error("Reminder not found");

    if (args.completed && reminder.scheduledFunctionId) {
      await ctx.scheduler.cancel(reminder.scheduledFunctionId);
    }

    await ctx.db.patch(args.id, {
      status: args.completed ? "completed" : "scheduled",
      scheduledFunctionId: args.completed ? undefined : reminder.scheduledFunctionId,
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
  handler: async (ctx, args): Promise<void> => {
    const userId = await requireUserId(ctx);
    const reminder = await ctx.db.get(args.id);
    if (!reminder || reminder.userId !== userId) throw new Error("Reminder not found");

    if (reminder.scheduledFunctionId) {
      await ctx.scheduler.cancel(reminder.scheduledFunctionId);
    }

    const scheduledFunctionId = await ctx.scheduler.runAt(args.remindAt, internal.push.sendReminderPush, {
      userId,
      title: reminder.title,
      body: reminder.note || `Reminder: ${reminder.title}`,
      url: reminder.sourceUrl || undefined,
    });

    await ctx.db.patch(args.id, {
      remindAt: args.remindAt,
      scheduledFunctionId,
      status: "scheduled",
      completedAt: null,
      notifiedAt: null,
      updatedAt: Date.now(),
    });
  },
});

export const markNotified = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args): Promise<void> => {
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
  handler: async (ctx, args): Promise<void> => {
    const userId = await requireUserId(ctx);
    const reminder = await ctx.db.get(args.id);
    if (!reminder || reminder.userId !== userId) throw new Error("Reminder not found");
    if (reminder.scheduledFunctionId) {
      await ctx.scheduler.cancel(reminder.scheduledFunctionId);
    }
    await ctx.db.delete(args.id);
  },
});
