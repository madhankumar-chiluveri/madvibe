import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    parentId: v.optional(v.union(v.id("pages"), v.null())),
    type: v.optional(v.union(v.literal("document"), v.literal("database"), v.literal("dashboard"))),
    isSpaceRoot: v.optional(v.boolean()),
    title: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const siblings = await ctx.db
      .query("pages")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.parentId ?? null))
      .collect();

    const maxOrder = siblings.reduce((max, p) => Math.max(max, p.sortOrder), 0);

    const pageId = await ctx.db.insert("pages", {
      workspaceId: args.workspaceId,
      parentId: args.parentId ?? null,
      type: args.type ?? "document",
      isSpaceRoot: args.isSpaceRoot ?? false,
      title: args.title ?? "Untitled",
      icon: args.icon ?? null,
      coverImage: null,
      isFullWidth: false,
      isFavourite: false,
      isArchived: false,
      archivedAt: null,
      sortOrder: maxOrder + 1000,
      createdBy: userId,
      updatedAt: Date.now(),
      maddyTags: [],
      maddySuggested: [],
    });

    // Create initial empty block
    await ctx.db.insert("blocks", {
      pageId,
      type: "document",
      content: [{ type: "paragraph", content: [] }],
      parentBlockId: null,
      sortOrder: 1000,
      properties: {},
      updatedAt: Date.now(),
    });

    return pageId;
  },
});

export const createSpace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const siblings = await ctx.db
      .query("pages")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) =>
        q.and(
          q.eq(q.field("parentId"), null),
          q.eq(q.field("isArchived"), false),
          q.eq(q.field("isSpaceRoot"), true)
        )
      )
      .collect();

    const maxOrder = siblings.reduce((max, page) => Math.max(max, page.sortOrder), 0);

    const pageId = await ctx.db.insert("pages", {
      workspaceId: args.workspaceId,
      parentId: null,
      type: "dashboard",
      isSpaceRoot: true,
      title: args.title,
      icon: args.icon ?? null,
      coverImage: null,
      isFullWidth: true,
      isFavourite: false,
      isArchived: false,
      archivedAt: null,
      sortOrder: maxOrder + 1000,
      createdBy: userId,
      updatedAt: Date.now(),
      maddyTags: [],
      maddySuggested: [],
    });

    await ctx.db.insert("blocks", {
      pageId,
      type: "document",
      content: [
        {
          type: "heading",
          props: { level: 1 },
          content: [{ type: "text", text: `${args.title} Home`, styles: {} }],
          children: [],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Use this space to keep project notes, tasks, databases, and decisions isolated from the rest of your knowledge base.",
              styles: {},
            },
          ],
          children: [],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Create a task tracker, a project brief, meeting notes, or let Maddy build a starter page for you.",
              styles: {},
            },
          ],
          children: [],
        },
      ],
      parentBlockId: null,
      sortOrder: 1000,
      properties: {},
      updatedAt: Date.now(),
    });

    return pageId;
  },
});

export const update = mutation({
  args: {
    id: v.id("pages"),
    title: v.optional(v.string()),
    icon: v.optional(v.union(v.string(), v.null())),
    coverImage: v.optional(v.union(v.string(), v.null())),
    isFullWidth: v.optional(v.boolean()),
    isFavourite: v.optional(v.boolean()),
    maddyTags: v.optional(v.array(v.string())),
    maddySuggested: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
    return id;
  },
});

export const archive = mutation({
  args: { id: v.id("pages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const recursiveArchive = async (pageId: any) => {
      const children = await ctx.db
        .query("pages")
        .withIndex("by_parentId", (q) => q.eq("parentId", pageId))
        .collect();

      for (const child of children) {
        await recursiveArchive(child._id);
      }

      await ctx.db.patch(pageId, {
        isArchived: true,
        archivedAt: Date.now(),
        updatedAt: Date.now(),
      });
    };

    await recursiveArchive(args.id);
  },
});

export const restore = mutation({
  args: { id: v.id("pages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const recursiveRestore = async (pageId: any) => {
      const children = await ctx.db
        .query("pages")
        .withIndex("by_parentId", (q) => q.eq("parentId", pageId))
        .collect();

      await ctx.db.patch(pageId, {
        isArchived: false,
        archivedAt: null,
        updatedAt: Date.now(),
      });

      for (const child of children) {
        await recursiveRestore(child._id);
      }
    };

    await recursiveRestore(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("pages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Delete all blocks
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.id))
      .collect();
    for (const block of blocks) {
      await ctx.db.delete(block._id);
    }

    // Delete embedding
    const embedding = await ctx.db
      .query("maddyEmbeddings")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.id))
      .first();
    if (embedding) await ctx.db.delete(embedding._id);

    await ctx.db.delete(args.id);
  },
});

export const move = mutation({
  args: {
    id: v.id("pages"),
    newParentId: v.union(v.id("pages"), v.null()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.id, {
      parentId: args.newParentId,
      sortOrder: args.sortOrder ?? Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const get = query({
  args: { id: v.id("pages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
    parentId: v.optional(v.union(v.id("pages"), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("pages")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) =>
        q.and(
          q.eq(q.field("parentId"), args.parentId ?? null),
          q.eq(q.field("isArchived"), false)
        )
      )
      .order("asc")
      .collect();
  },
});

export const listSpaceRoots = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("pages")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) =>
        q.and(
          q.eq(q.field("parentId"), null),
          q.eq(q.field("isArchived"), false),
          q.eq(q.field("isSpaceRoot"), true)
        )
      )
      .order("asc")
      .collect();
  },
});

export const listAll = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("pages")
      .withIndex("by_workspaceId_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .collect();
  },
});

export const listFavourites = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("pages")
      .withIndex("by_workspaceId_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .filter((q) => q.eq(q.field("isFavourite"), true))
      .collect();
  },
});

export const listArchived = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("pages")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("isArchived"), true))
      .collect();
  },
});

export const search = query({
  args: {
    workspaceId: v.id("workspaces"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (!args.query.trim()) return [];

    return await ctx.db
      .query("pages")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .take(20);
  },
});
