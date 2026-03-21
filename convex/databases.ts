import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Database CRUD ────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    pageId: v.id("pages"),
    name: v.string(),
    properties: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("databases", {
      pageId: args.pageId,
      name: args.name,
      properties: args.properties,
      defaultViewId: null,
    });
  },
});

export const getByPage = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("databases")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .first();
  },
});

export const get = query({
  args: { id: v.id("databases") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const updateProperties = mutation({
  args: {
    id: v.id("databases"),
    properties: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(args.id, { properties: args.properties });
  },
});

// ── Rows ─────────────────────────────────────────────────────────────────────

export const listRows = query({
  args: { databaseId: v.id("databases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rows")
      .withIndex("by_databaseId", (q) => q.eq("databaseId", args.databaseId))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .order("asc")
      .collect();
  },
});

export const addRow = mutation({
  args: {
    databaseId: v.id("databases"),
    data: v.any(),
    pageId: v.optional(v.union(v.id("pages"), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const siblings = await ctx.db
      .query("rows")
      .withIndex("by_databaseId", (q) => q.eq("databaseId", args.databaseId))
      .collect();

    const maxOrder = siblings.reduce((max, r) => Math.max(max, r.sortOrder), 0);

    return await ctx.db.insert("rows", {
      databaseId: args.databaseId,
      pageId: args.pageId ?? null,
      data: args.data,
      sortOrder: maxOrder + 1000,
      isArchived: false,
    });
  },
});

export const updateRow = mutation({
  args: {
    id: v.id("rows"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(args.id, { data: args.data });
  },
});

export const deleteRow = mutation({
  args: { id: v.id("rows") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});

// ── Views ─────────────────────────────────────────────────────────────────────

export const listViews = query({
  args: { databaseId: v.id("databases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("views")
      .withIndex("by_databaseId", (q) => q.eq("databaseId", args.databaseId))
      .collect();
  },
});

export const createView = mutation({
  args: {
    databaseId: v.id("databases"),
    name: v.string(),
    type: v.union(
      v.literal("table"),
      v.literal("board"),
      v.literal("list"),
      v.literal("calendar"),
      v.literal("gallery"),
      v.literal("timeline")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("views", {
      databaseId: args.databaseId,
      name: args.name,
      type: args.type,
      filters: null,
      sorts: [],
      groupBy: null,
      visibleProperties: undefined,
      cardCoverPropertyId: null,
    });
  },
});

export const importCsv = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    properties: v.array(v.any()), // e.g. [{id: "col1", name: "Column 1", type: "text"}]
    rows: v.array(v.any()),       // array of objects mapping prop IDs to values
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // 1. Create a Database Page natively
    const pageId = await ctx.db.insert("pages", {
      workspaceId: args.workspaceId,
      parentId: null,
      type: "database",
      title: args.name,
      isFullWidth: true,
      isFavourite: false,
      isArchived: false,
      sortOrder: Date.now(),
      createdBy: userId,
      updatedAt: Date.now(),
    });

    // 2. Create the Database record
    const databaseId = await ctx.db.insert("databases", {
      pageId,
      name: args.name,
      properties: args.properties,
      defaultViewId: undefined,
    });

    // 3. Create a Default View (Table)
    const viewId = await ctx.db.insert("views", {
      databaseId,
      name: "Table View",
      type: "table",
      filters: null,
      sorts: [],
      groupBy: null,
      visibleProperties: args.properties.map((p) => p.id),
      cardCoverPropertyId: null,
    });

    // Link the view
    await ctx.db.patch(databaseId, { defaultViewId: viewId });

    // 4. Insert all rows
    for (let i = 0; i < args.rows.length; i++) {
        await ctx.db.insert("rows", {
          databaseId,
          pageId: null, // intentionally null to avoid huge page tables, unless user explicitly opens row
          data: args.rows[i],
          sortOrder: i * 1000,
          isArchived: false,
        });
    }

    return pageId;
  },
});
