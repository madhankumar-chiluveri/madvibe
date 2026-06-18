import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getWorkspaceAccessForUser,
  requirePageAccess,
  requireWorkspaceAccess,
} from "./workspaceAccess";

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
    const { userId } = await requireWorkspaceAccess(ctx, args.workspaceId, "editor");

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
    const { userId } = await requireWorkspaceAccess(ctx, args.workspaceId, "editor");

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
              text: "Use this space to keep project notes, tasks, databases, and decisions isolated from the rest of your BRAIN.",
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
              text: "Create a task tracker, a project brief, meeting notes, or start from a blank page.",
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
  },
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, args.id, "editor");

    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
    return id;
  },
});

export const archive = mutation({
  args: { id: v.id("pages") },
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, args.id, "editor");

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
    await requirePageAccess(ctx, args.id, "editor");

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
    await requirePageAccess(ctx, args.id, "editor");

    // Delete all blocks
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.id))
      .collect();
    for (const block of blocks) {
      await ctx.db.delete(block._id);
    }

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
    await requirePageAccess(ctx, args.id, "editor");

    await ctx.db.patch(args.id, {
      parentId: args.newParentId,
      sortOrder: args.sortOrder ?? Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const reorderPage = mutation({
  args: {
    id: v.id("pages"),
    newParentId: v.union(v.id("pages"), v.null()),
    targetIndex: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, args.id, "editor");

    const page = await ctx.db.get(args.id);
    if (!page) throw new Error("Page not found");

    // Get siblings in the destination parent
    const siblings = await ctx.db
      .query("pages")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", page.workspaceId))
      .filter((q) =>
        q.and(
          q.eq(q.field("parentId"), args.newParentId),
          q.eq(q.field("isArchived"), false),
          q.neq(q.field("_id"), args.id),
          args.newParentId === null
            ? page.isSpaceRoot === true
              ? q.eq(q.field("isSpaceRoot"), true)
              : q.neq(q.field("isSpaceRoot"), true)
            : true
        )
      )
      .collect();

    // Sort by sortOrder in memory
    siblings.sort((a, b) => a.sortOrder - b.sortOrder);

    let newSortOrder = 1000;
    if (siblings.length === 0) {
      newSortOrder = 1000;
    } else if (args.targetIndex <= 0) {
      newSortOrder = siblings[0].sortOrder - 1000;
    } else if (args.targetIndex >= siblings.length) {
      newSortOrder = siblings[siblings.length - 1].sortOrder + 1000;
    } else {
      const prev = siblings[args.targetIndex - 1];
      const next = siblings[args.targetIndex];
      newSortOrder = (prev.sortOrder + next.sortOrder) / 2;
    }

    await ctx.db.patch(args.id, {
      parentId: args.newParentId,
      sortOrder: newSortOrder,
      updatedAt: Date.now(),
    });
  },
});

export const get = query({
  args: { id: v.id("pages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const page = await ctx.db.get(args.id);
    if (!page) return null;

    const access = await getWorkspaceAccessForUser(ctx, page.workspaceId, String(userId));
    if (!access) {
      return null;
    }

    return page;
  },
});

// Returns the ancestor chain [root → ... → direct parent] for breadcrumb rendering
export const getAncestors = query({
  args: { id: v.id("pages") },
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, args.id, "viewer");

    const ancestors: Array<{
      _id: string;
      title: string;
      icon: string | null | undefined;
    }> = [];

    let page = await ctx.db.get(args.id);
    let depth = 0;

    while (page?.parentId && depth < 10) {
      const parent = await ctx.db.get(page.parentId);
      if (!parent) break;
      ancestors.unshift({
        _id: parent._id,
        title: parent.title,
        icon: parent.icon ?? null,
      });
      page = parent;
      depth++;
    }

    return ancestors;
  },
});

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
    parentId: v.optional(v.union(v.id("pages"), v.null())),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) =>
        q.and(
          q.eq(q.field("parentId"), args.parentId ?? null),
          q.eq(q.field("isArchived"), false)
        )
      )
      .collect();

    return pages.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const listSpaceRoots = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");

    const spaces = await ctx.db
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

    return spaces.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const listAll = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");

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
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");

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
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");

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
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");

    if (!args.query.trim()) return [];

    return await ctx.db
      .query("pages")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .take(20);
  },
});

function extractText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.text) return node.text;
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (node.content) return extractText(node.content);
  return "";
}

// Page title + a short text preview, used by the MCP `get_page_content` tool.
export const getPageContent = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const { page } = await requirePageAccess(ctx, args.pageId, "viewer");

    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .order("asc")
      .take(20);

    const contentPreview = blocks
      .map((b) => {
        try {
          if (typeof b.content === "string") return b.content;
          if (b.content?.content) return extractText(b.content);
          return "";
        } catch {
          return "";
        }
      })
      .join(" ")
      .slice(0, 1000);

    return { title: page.title, contentPreview };
  },
});
