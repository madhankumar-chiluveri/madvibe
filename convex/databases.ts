import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireDatabaseAccess,
  requirePageAccess,
  requireRowAccess,
  requireViewAccess,
  requireWorkspaceAccess,
} from "./workspaceAccess";

const viewTypeValidator = v.union(
  v.literal("table"),
  v.literal("board"),
  v.literal("list"),
  v.literal("calendar"),
  v.literal("gallery"),
  v.literal("timeline")
);

// ── Database CRUD ────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    pageId: v.id("pages"),
    name: v.string(),
    properties: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, args.pageId, "editor");

    const databaseId = await ctx.db.insert("databases", {
      pageId: args.pageId,
      name: args.name,
      properties: args.properties,
      defaultViewId: null,
    });

    const viewId = await ctx.db.insert("views", {
      databaseId,
      name: "Default view",
      type: "table",
      filters: null,
      sorts: [],
      groupBy: null,
      visibleProperties: args.properties
        .map((property: any) => String(property?.id ?? ""))
        .filter(Boolean),
      cardCoverPropertyId: null,
    });

    await ctx.db.patch(databaseId, { defaultViewId: viewId });

    return databaseId;
  },
});

export const getByPage = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    await requirePageAccess(ctx, args.pageId, "viewer");

    return await ctx.db
      .query("databases")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .first();
  },
});

export const get = query({
  args: { id: v.id("databases") },
  handler: async (ctx, args) => {
    await requireDatabaseAccess(ctx, args.id, "viewer");
    return await ctx.db.get(args.id);
  },
});

export const updateProperties = mutation({
  args: {
    id: v.id("databases"),
    properties: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    await requireDatabaseAccess(ctx, args.id, "editor");
    await ctx.db.patch(args.id, { properties: args.properties });
  },
});

// ── Rows ─────────────────────────────────────────────────────────────────────

export const listRows = query({
  args: { databaseId: v.id("databases") },
  handler: async (ctx, args) => {
    await requireDatabaseAccess(ctx, args.databaseId, "viewer");

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
    await requireDatabaseAccess(ctx, args.databaseId, "editor");

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
    await requireRowAccess(ctx, args.id, "editor");
    await ctx.db.patch(args.id, { data: args.data });
  },
});

export const deleteRow = mutation({
  args: { id: v.id("rows") },
  handler: async (ctx, args) => {
    await requireRowAccess(ctx, args.id, "editor");
    await ctx.db.delete(args.id);
  },
});

// ── Views ─────────────────────────────────────────────────────────────────────

export const replaceRows = mutation({
  args: {
    databaseId: v.id("databases"),
    rows: v.array(
      v.object({
        data: v.any(),
        sortOrder: v.number(),
        pageId: v.optional(v.union(v.id("pages"), v.null())),
        isArchived: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireDatabaseAccess(ctx, args.databaseId, "editor");

    const existingRows = await ctx.db
      .query("rows")
      .withIndex("by_databaseId", (q) => q.eq("databaseId", args.databaseId))
      .collect();

    for (const row of existingRows) {
      await ctx.db.delete(row._id);
    }

    for (const row of args.rows) {
      await ctx.db.insert("rows", {
        databaseId: args.databaseId,
        pageId: row.pageId ?? null,
        data: row.data,
        sortOrder: row.sortOrder,
        isArchived: row.isArchived ?? false,
      });
    }
  },
});

export const listViews = query({
  args: { databaseId: v.id("databases") },
  handler: async (ctx, args) => {
    await requireDatabaseAccess(ctx, args.databaseId, "viewer");

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
    type: viewTypeValidator,
  },
  handler: async (ctx, args) => {
    await requireDatabaseAccess(ctx, args.databaseId, "editor");

    const viewId = await ctx.db.insert("views", {
      databaseId: args.databaseId,
      name: args.name,
      type: args.type,
      filters: null,
      sorts: [],
      groupBy: null,
      visibleProperties: undefined,
      cardCoverPropertyId: null,
    });

    const database = await ctx.db.get(args.databaseId);
    if (database && !database.defaultViewId) {
      await ctx.db.patch(args.databaseId, { defaultViewId: viewId });
    }

    return viewId;
  },
});

export const ensureDefaultView = mutation({
  args: {
    databaseId: v.id("databases"),
  },
  handler: async (ctx, args) => {
    await requireDatabaseAccess(ctx, args.databaseId, "editor");

    const database = await ctx.db.get(args.databaseId);
    if (!database) {
      throw new Error("Database not found");
    }

    if (database.defaultViewId) {
      const defaultView = await ctx.db.get(database.defaultViewId);
      if (defaultView) {
        return defaultView._id;
      }
    }

    const existingViews = await ctx.db
      .query("views")
      .withIndex("by_databaseId", (q) => q.eq("databaseId", args.databaseId))
      .collect();

    const fallbackView = existingViews[0] ?? null;
    if (fallbackView) {
      await ctx.db.patch(args.databaseId, { defaultViewId: fallbackView._id });
      return fallbackView._id;
    }

    const viewId = await ctx.db.insert("views", {
      databaseId: args.databaseId,
      name: "Default view",
      type: "table",
      filters: null,
      sorts: [],
      groupBy: null,
      visibleProperties: (database.properties ?? [])
        .map((property: any) => String(property?.id ?? ""))
        .filter(Boolean),
      cardCoverPropertyId: null,
    });

    await ctx.db.patch(args.databaseId, { defaultViewId: viewId });
    return viewId;
  },
});

export const updateView = mutation({
  args: {
    id: v.id("views"),
    name: v.optional(v.string()),
    type: v.optional(viewTypeValidator),
    filters: v.optional(v.any()),
    sorts: v.optional(v.array(v.any())),
    groupBy: v.optional(v.union(v.string(), v.null())),
    visibleProperties: v.optional(v.array(v.string())),
    cardCoverPropertyId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireViewAccess(ctx, args.id, "editor");

    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.type !== undefined) {
      updates.type = args.type;
    }
    if (args.filters !== undefined) {
      updates.filters = args.filters;
    }
    if (args.sorts !== undefined) {
      updates.sorts = args.sorts;
    }
    if (args.groupBy !== undefined) {
      updates.groupBy = args.groupBy;
    }
    if (args.visibleProperties !== undefined) {
      updates.visibleProperties = args.visibleProperties;
    }
    if (args.cardCoverPropertyId !== undefined) {
      updates.cardCoverPropertyId = args.cardCoverPropertyId;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.id, updates);
    }
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
    const { userId } = await requireWorkspaceAccess(ctx, args.workspaceId, "editor");

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
