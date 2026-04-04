import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { requireCommentAccess, requirePageAccess } from "./workspaceAccess";

// ── Mutations ──────────────────────────────────────────────────

export const add = mutation({
  args: {
    pageId: v.id("pages"),
    workspaceId: v.id("workspaces"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const { page } = await requirePageAccess(ctx, args.pageId, "editor");
    if (page.workspaceId !== args.workspaceId) {
      throw new Error("Page does not belong to this workspace");
    }

    const identity = await ctx.auth.getUserIdentity();
    const authorName =
      identity?.name ?? identity?.email ?? "Unknown";

    const now = Date.now();
    return await ctx.db.insert("comments", {
      pageId: args.pageId,
      workspaceId: args.workspaceId,
      parentCommentId: args.parentCommentId ?? null,
      authorId: userId,
      authorName,
      content: args.content.trim(),
      isResolved: false,
      resolvedAt: null,
      resolvedBy: null,
      editedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const edit = mutation({
  args: {
    id: v.id("comments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { comment } = await requireCommentAccess(ctx, args.id, "editor");
    if (comment.authorId !== userId) throw new Error("Unauthorized");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      content: args.content.trim(),
      editedAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { comment } = await requireCommentAccess(ctx, args.id, "editor");
    if (comment.authorId !== userId) throw new Error("Unauthorized");

    // Delete all replies first
    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parentCommentId", (q) =>
        q.eq("parentCommentId", args.id)
      )
      .collect();
    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const resolve = mutation({
  args: {
    id: v.id("comments"),
    resolved: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireCommentAccess(ctx, args.id, "editor");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      isResolved: args.resolved,
      resolvedAt: args.resolved ? now : null,
      resolvedBy: args.resolved ? userId : null,
      updatedAt: now,
    });
  },
});

// ── Queries ───────────────────────────────────────────────────

export const listByPage = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, args.pageId, "viewer");
    const userId = await getAuthUserId(ctx);

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .order("asc")
      .collect();

    return { comments, currentUserId: userId };
  },
});
