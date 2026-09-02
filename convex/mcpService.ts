/**
 * MCP Service — internal Convex functions callable with the deploy key.
 * These accept userId explicitly so the MCP server can serve Claude/ChatGPT
 * without a user browser session.
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getWorkspaceAccessForUser } from "./workspaceAccess";
import type { WorkspaceRole } from "./workspaceShared";
import {
  financeAccountTypeValidator,
  financeTransactionTypeValidator,
  financeAssetTypeValidator,
  financeBudgetPeriodValidator,
  financeGoalPriorityValidator,
  financeLoanDirectionValidator,
  financeLoanStatusValidator,
  financeRecurringFrequencyValidator,
  financeCreditCardNetworkValidator,
  getTodayDate,
  differenceInDays,
  shiftRecurringDate,
  roundCurrency,
  signedTransactionAmount,
} from "./financeShared";

// ── Role Authorization Helpers ────────────────────────────────────────────────

const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

async function checkWorkspaceAccess(
  ctx: any,
  workspaceId: Id<"workspaces">,
  userId: string,
  minimumRole: WorkspaceRole = "viewer"
) {
  const access = await getWorkspaceAccessForUser(ctx, workspaceId, userId);
  if (!access) {
    throw new Error("Workspace not found or access denied");
  }
  if (ROLE_RANK[access.role] < ROLE_RANK[minimumRole]) {
    throw new Error("You do not have permission to access this workspace");
  }
  return access;
}

async function checkPageAccess(
  ctx: any,
  pageId: Id<"pages">,
  userId: string,
  minimumRole: WorkspaceRole = "viewer"
) {
  const page = await ctx.db.get(pageId);
  if (!page) {
    throw new Error("Page not found");
  }
  const access = await checkWorkspaceAccess(ctx, page.workspaceId, userId, minimumRole);
  return { page, ...access };
}

async function checkDatabaseAccess(
  ctx: any,
  databaseId: Id<"databases">,
  userId: string,
  minimumRole: WorkspaceRole = "viewer"
) {
  const database = await ctx.db.get(databaseId);
  if (!database) {
    throw new Error("Database not found");
  }
  const pageAccess = await checkPageAccess(ctx, database.pageId, userId, minimumRole);
  return { database, ...pageAccess };
}

async function checkRowAccess(
  ctx: any,
  rowId: Id<"rows">,
  userId: string,
  minimumRole: WorkspaceRole = "viewer"
) {
  const row = await ctx.db.get(rowId);
  if (!row) {
    throw new Error("Row not found");
  }
  const databaseAccess = await checkDatabaseAccess(ctx, row.databaseId, userId, minimumRole);
  return { row, ...databaseAccess };
}

async function checkCommentAccess(
  ctx: any,
  commentId: Id<"comments">,
  userId: string,
  minimumRole: WorkspaceRole = "viewer"
) {
  const comment = await ctx.db.get(commentId);
  if (!comment) {
    throw new Error("Comment not found");
  }
  const access = await checkWorkspaceAccess(ctx, comment.workspaceId, userId, minimumRole);
  return { comment, ...access };
}

// ── Loan Status Helper ────────────────────────────────────────────────────────

function resolveLoanStatus(
  loan: {
    dueDate?: string;
    principalAmount: number;
    status?: string;
  },
  currentBalance: number,
  today = getTodayDate(),
) {
  if (loan.status === "written_off") {
    return "written_off" as const;
  }
  if (currentBalance <= 0) {
    return "settled" as const;
  }
  if (loan.dueDate && differenceInDays(loan.dueDate, today) < 0) {
    return "overdue" as const;
  }
  if (currentBalance < loan.principalAmount) {
    return "partially_paid" as const;
  }
  return "active" as const;
}

// ── Database Date Triggers Helper ──────────────────────────────────────────────

function handleStatusAndCompletionDates(properties: any[], data: any, oldData?: any) {
  if (!properties || !data) return data;

  const statusProp = properties.find(
    (p: any) => p.name?.toLowerCase() === "status" && p.type === "select"
  );
  const completedDateProp = properties.find(
    (p: any) =>
      (p.name?.toLowerCase() === "completed date" ||
        p.name?.toLowerCase() === "completion date") &&
      p.type === "date"
  );

  if (statusProp && completedDateProp) {
    const oldStatus = oldData?.[statusProp.id];
    const newStatus = data[statusProp.id];

    const options = statusProp.config?.options || statusProp.options || [];
    const doneOption = options.find((o: any) => o.label?.toLowerCase() === "done");

    const isDone = (val: any) => {
      if (!val) return false;
      const sVal = String(val).toLowerCase();
      if (doneOption) {
        return (
          sVal === String(doneOption.id).toLowerCase() ||
          sVal === String(doneOption.label).toLowerCase() ||
          sVal === "done"
        );
      }
      return sVal === "done";
    };

    const wasDone = isDone(oldStatus);
    const isNowDone = isDone(newStatus);

    if (isNowDone && !wasDone) {
      data[completedDateProp.id] = Date.now();
    } else if (!isNowDone && wasDone) {
      data[completedDateProp.id] = null;
    }
  }

  return data;
}

// ── API Key Management ────────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function hashKey(plainKey: string): Promise<string> {
  const data = new TextEncoder().encode(plainKey);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

/** Called from /api/mcp/token while the user is signed in. */
export const generateApiKey = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const plainKey = `mvmcp_${randomHex(16)}`;
    const keyHash = await hashKey(plainKey);

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { mcpApiKeyHash: keyHash });
    } else {
      await ctx.db.insert("userSettings", { userId: args.userId, mcpApiKeyHash: keyHash });
    }

    return plainKey;
  },
});

/** Validate an API key and return userId. Returns null if invalid. */
export const resolveApiKey = internalQuery({
  args: { keyHash: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("mcpApiKeyHash"), args.keyHash))
      .unique();
    return settings?.userId ?? null;
  },
});

// ── Workspaces ────────────────────────────────────────────────────────────────

export const listWorkspaces = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const owned = await ctx.db
      .query("workspaces")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
      .collect();

    const shared = (
      await Promise.all(memberships.map((m) => ctx.db.get(m.workspaceId)))
    ).filter(Boolean);

    return [...owned, ...shared];
  },
});

// ── Pages ─────────────────────────────────────────────────────────────────────

export const listAllPages = internalQuery({
  args: { userId: v.string(), workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, args.userId, "viewer");
    return await ctx.db
      .query("pages")
      .withIndex("by_workspaceId_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .collect();
  },
});

export const searchPages = internalQuery({
  args: { userId: v.string(), workspaceId: v.id("workspaces"), query: v.string() },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, args.userId, "viewer");
    if (!args.query.trim()) return [];
    return await ctx.db
      .query("pages")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("workspaceId", args.workspaceId)
      )
      .take(20);
  },
});

export const getPageContent = internalQuery({
  args: { userId: v.string(), pageId: v.id("pages") },
  handler: async (ctx, args) => {
    await checkPageAccess(ctx, args.pageId, args.userId, "viewer");
    const page = await ctx.db.get(args.pageId);
    if (!page) return null;

    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .order("asc")
      .take(40);

    function extractText(node: any): string {
      if (!node) return "";
      if (typeof node === "string") return node;
      if (node.text) return node.text;
      if (Array.isArray(node)) return node.map(extractText).join(" ");
      if (node.content) return extractText(node.content);
      return "";
    }

    const content = blocks
      .map((b) => {
        try {
          return typeof b.content === "string" ? b.content : extractText(b.content);
        } catch {
          return "";
        }
      })
      .join("\n")
      .slice(0, 8000);

    return { title: page.title, icon: page.icon, type: page.type, content };
  },
});

export const createPage = internalMutation({
  args: {
    userId: v.string(),
    workspaceId: v.id("workspaces"),
    title: v.string(),
    type: v.optional(v.union(v.literal("document"), v.literal("database"), v.literal("dashboard"))),
    icon: v.optional(v.string()),
    parentId: v.optional(v.union(v.id("pages"), v.null())),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, args.userId, "editor");
    const siblings = await ctx.db
      .query("pages")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.parentId ?? null))
      .collect();
    const maxOrder = siblings.reduce((max, p) => Math.max(max, p.sortOrder), 0);

    const pageId = await ctx.db.insert("pages", {
      workspaceId: args.workspaceId,
      parentId: args.parentId ?? null,
      type: args.type ?? "document",
      isSpaceRoot: false,
      title: args.title,
      icon: args.icon ?? null,
      coverImage: null,
      isFullWidth: false,
      isFavourite: false,
      isArchived: false,
      archivedAt: null,
      sortOrder: maxOrder + 1000,
      createdBy: args.userId,
      updatedAt: Date.now(),
    });

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

export const updatePage = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("pages"),
    title: v.optional(v.string()),
    icon: v.optional(v.union(v.string(), v.null())),
    coverImage: v.optional(v.union(v.string(), v.null())),
    isFullWidth: v.optional(v.boolean()),
    isFavourite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await checkPageAccess(ctx, args.id, args.userId, "editor");
    const { userId, id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
    return id;
  },
});

export const archivePage = internalMutation({
  args: { userId: v.string(), id: v.id("pages") },
  handler: async (ctx, args) => {
    await checkPageAccess(ctx, args.id, args.userId, "editor");

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

export const restorePage = internalMutation({
  args: { userId: v.string(), id: v.id("pages") },
  handler: async (ctx, args) => {
    await checkPageAccess(ctx, args.id, args.userId, "editor");

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

export const removePage = internalMutation({
  args: { userId: v.string(), id: v.id("pages") },
  handler: async (ctx, args) => {
    await checkPageAccess(ctx, args.id, args.userId, "editor");

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

export const movePage = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("pages"),
    newParentId: v.union(v.id("pages"), v.null()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await checkPageAccess(ctx, args.id, args.userId, "editor");

    await ctx.db.patch(args.id, {
      parentId: args.newParentId,
      sortOrder: args.sortOrder ?? Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const reorderPage = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("pages"),
    newParentId: v.union(v.id("pages"), v.null()),
    targetIndex: v.number(),
  },
  handler: async (ctx, args) => {
    await checkPageAccess(ctx, args.id, args.userId, "editor");

    const page = await ctx.db.get(args.id);
    if (!page) throw new Error("Page not found");

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

export const getAncestors = internalQuery({
  args: { userId: v.string(), id: v.id("pages") },
  handler: async (ctx, args) => {
    await checkPageAccess(ctx, args.id, args.userId, "viewer");

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

export const listSubpages = internalQuery({
  args: {
    userId: v.string(),
    workspaceId: v.id("workspaces"),
    parentId: v.optional(v.union(v.id("pages"), v.null())),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, args.userId, "viewer");

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

export const listSpaceRoots = internalQuery({
  args: { userId: v.string(), workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, args.userId, "viewer");

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

export const listFavourites = internalQuery({
  args: { userId: v.string(), workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, args.userId, "viewer");

    return await ctx.db
      .query("pages")
      .withIndex("by_workspaceId_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .filter((q) => q.eq(q.field("isFavourite"), true))
      .collect();
  },
});

export const listArchived = internalQuery({
  args: { userId: v.string(), workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, args.userId, "viewer");

    return await ctx.db
      .query("pages")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("isArchived"), true))
      .collect();
  },
});

// ── Databases ─────────────────────────────────────────────────────────────────

export const getDatabaseRows = internalQuery({
  args: { userId: v.string(), databaseId: v.id("databases") },
  handler: async (ctx, args) => {
    await checkDatabaseAccess(ctx, args.databaseId, args.userId, "viewer");
    return await ctx.db
      .query("rows")
      .withIndex("by_databaseId", (q) => q.eq("databaseId", args.databaseId))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();
  },
});

export const getDatabaseRowsByPage = internalQuery({
  args: { userId: v.string(), pageId: v.id("pages") },
  handler: async (ctx, args) => {
    await checkPageAccess(ctx, args.pageId, args.userId, "viewer");
    const db = await ctx.db
      .query("databases")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .first();

    if (!db) return null;

    const rows = await ctx.db
      .query("rows")
      .withIndex("by_databaseId", (q) => q.eq("databaseId", db._id))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();

    return { databaseId: db._id, name: db.name, properties: db.properties, rows };
  },
});

export const createDatabase = internalMutation({
  args: {
    userId: v.string(),
    pageId: v.id("pages"),
    name: v.string(),
    properties: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    await checkPageAccess(ctx, args.pageId, args.userId, "editor");

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

export const updateProperties = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("databases"),
    properties: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    await checkDatabaseAccess(ctx, args.id, args.userId, "editor");
    await ctx.db.patch(args.id, { properties: args.properties });
  },
});

export const listRows = internalQuery({
  args: { userId: v.string(), databaseId: v.id("databases") },
  handler: async (ctx, args) => {
    await checkDatabaseAccess(ctx, args.databaseId, args.userId, "viewer");
    const rows = await ctx.db
      .query("rows")
      .withIndex("by_databaseId", (q) => q.eq("databaseId", args.databaseId))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();

    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const addRow = internalMutation({
  args: {
    userId: v.string(),
    databaseId: v.id("databases"),
    data: v.any(),
    pageId: v.optional(v.union(v.id("pages"), v.null())),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await checkDatabaseAccess(ctx, args.databaseId, args.userId, "editor");

    const database = await ctx.db.get(args.databaseId);
    if (database && database.properties) {
      const data = { ...(args.data ?? {}) };
      for (const property of database.properties) {
        if (
          property.type === "date" &&
          (property.name?.toLowerCase() === "created date" ||
            property.name?.toLowerCase() === "creation date") &&
          (data[property.id] === undefined || data[property.id] === null)
        ) {
          data[property.id] = Date.now();
        } else if (
          property.type === "created_time" &&
          (data[property.id] === undefined || data[property.id] === null)
        ) {
          data[property.id] = Date.now();
        } else if (
          property.config?.defaultValue !== undefined &&
          property.config?.defaultValue !== null &&
          (data[property.id] === undefined || data[property.id] === null)
        ) {
          data[property.id] = property.config.defaultValue;
        }
      }
      args.data = handleStatusAndCompletionDates(database.properties, data);
    }

    let nextSortOrder = args.sortOrder;
    if (nextSortOrder === undefined) {
      const siblings = await ctx.db
        .query("rows")
        .withIndex("by_databaseId", (q) => q.eq("databaseId", args.databaseId))
        .collect();

      const maxOrder = siblings.reduce((max, r) => Math.max(max, r.sortOrder), 0);
      nextSortOrder = maxOrder + 1000;
    }

    return await ctx.db.insert("rows", {
      databaseId: args.databaseId,
      pageId: args.pageId ?? null,
      data: args.data,
      sortOrder: nextSortOrder,
      isArchived: false,
    });
  },
});

export const updateRow = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("rows"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    await checkRowAccess(ctx, args.id, args.userId, "editor");

    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Row not found");

    let updatedData = { ...(row.data ?? {}), ...(args.data ?? {}) };

    const database = await ctx.db.get(row.databaseId);
    if (database && database.properties) {
      updatedData = handleStatusAndCompletionDates(database.properties, updatedData, row.data);
    }

    await ctx.db.patch(args.id, { data: updatedData });
  },
});

export const reorderRow = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("rows"),
    targetIndex: v.number(),
  },
  handler: async (ctx, args) => {
    await checkRowAccess(ctx, args.id, args.userId, "editor");

    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Row not found");

    const siblings = await ctx.db
      .query("rows")
      .withIndex("by_databaseId", (q) => q.eq("databaseId", row.databaseId))
      .filter((q) =>
        q.and(
          q.neq(q.field("isArchived"), true),
          q.neq(q.field("_id"), args.id)
        )
      )
      .collect();

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

    await ctx.db.patch(args.id, { sortOrder: newSortOrder });
  },
});

export const deleteRow = internalMutation({
  args: { userId: v.string(), id: v.id("rows") },
  handler: async (ctx, args) => {
    await checkRowAccess(ctx, args.id, args.userId, "editor");
    await ctx.db.delete(args.id);
  },
});

export const listViews = internalQuery({
  args: { userId: v.string(), databaseId: v.id("databases") },
  handler: async (ctx, args) => {
    await checkDatabaseAccess(ctx, args.databaseId, args.userId, "viewer");
    return await ctx.db
      .query("views")
      .withIndex("by_databaseId", (q) => q.eq("databaseId", args.databaseId))
      .collect();
  },
});

export const createView = internalMutation({
  args: {
    userId: v.string(),
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
    await checkDatabaseAccess(ctx, args.databaseId, args.userId, "editor");

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

export const updateView = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("views"),
    name: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("table"),
      v.literal("board"),
      v.literal("list"),
      v.literal("calendar"),
      v.literal("gallery"),
      v.literal("timeline")
    )),
    filters: v.optional(v.any()),
    sorts: v.optional(v.array(v.any())),
    groupBy: v.optional(v.union(v.string(), v.null())),
    visibleProperties: v.optional(v.array(v.string())),
    cardCoverPropertyId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const view = await ctx.db.get(args.id);
    if (!view) throw new Error("View not found");
    await checkDatabaseAccess(ctx, view.databaseId, args.userId, "editor");

    const { userId, id, ...updates } = args;
    const patchObj: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) patchObj[k] = val;
    }

    if (Object.keys(patchObj).length > 0) {
      await ctx.db.patch(id, patchObj);
    }
  },
});

export const importCsv = internalMutation({
  args: {
    userId: v.string(),
    workspaceId: v.id("workspaces"),
    parentId: v.optional(v.union(v.id("pages"), v.null())),
    name: v.string(),
    properties: v.array(v.any()),
    rows: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, args.userId, "editor");

    const pageId = await ctx.db.insert("pages", {
      workspaceId: args.workspaceId,
      parentId: args.parentId ?? null,
      type: "database",
      title: args.name,
      isFullWidth: true,
      isFavourite: false,
      isArchived: false,
      sortOrder: Date.now(),
      createdBy: args.userId,
      updatedAt: Date.now(),
    });

    const databaseId = await ctx.db.insert("databases", {
      pageId,
      name: args.name,
      properties: args.properties,
      defaultViewId: undefined,
    });

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

    await ctx.db.patch(databaseId, { defaultViewId: viewId });

    for (let i = 0; i < args.rows.length; i++) {
      await ctx.db.insert("rows", {
        databaseId,
        pageId: null,
        data: args.rows[i],
        sortOrder: i * 1000,
        isArchived: false,
      });
    }

    return pageId;
  },
});

// ── Finance ───────────────────────────────────────────────────────────────────

export const listAccounts = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("financeAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const listTransactions = internalQuery({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    type: v.optional(v.union(
      v.literal("income"), v.literal("expense"),
      v.literal("transfer"), v.literal("investment")
    )),
    accountId: v.optional(v.id("financeAccounts")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    let all = await ctx.db
      .query("financeTransactions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(200);
    if (args.type) all = all.filter((t) => t.type === args.type);
    if (args.accountId) all = all.filter((t) => t.accountId === args.accountId);
    if (args.startDate) all = all.filter((t) => t.date >= args.startDate!);
    if (args.endDate) all = all.filter((t) => t.date <= args.endDate!);
    return all.slice(0, limit);
  },
});

export const getFinanceDashboard = internalQuery({
  args: { userId: v.string(), month: v.string() },
  handler: async (ctx, args) => {
    const startDate = `${args.month}-01`;
    const [year, month] = args.month.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${args.month}-${String(lastDay).padStart(2, "0")}`;

    const txns = await ctx.db
      .query("financeTransactions")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", args.userId).gte("date", startDate)
      )
      .filter((q) => q.lte(q.field("date"), endDate))
      .collect();

    const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const accounts = await ctx.db
      .query("financeAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    const netWorth = accounts.reduce((s, a) => s + a.balance, 0);

    return { income, expenses, netWorth, recent: txns.slice(0, 10) };
  },
});

export const listBudgets = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("financeBudgets")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const listGoals = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("financeGoals")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const listInvestments = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("financeInvestments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const listLoans = internalQuery({
  args: {
    userId: v.string(),
    status: v.optional(financeLoanStatusValidator),
    direction: v.optional(financeLoanDirectionValidator),
  },
  handler: async (ctx, args) => {
    const loans = await ctx.db
      .query("financeLoans")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const repayments = await ctx.db
      .query("financeLoanRepayments")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
      .collect();

    const repaymentsByLoan = new Map<string, any[]>();
    for (const repayment of repayments) {
      const key = String(repayment.loanId);
      const existing = repaymentsByLoan.get(key);
      if (existing) {
        existing.push(repayment);
      } else {
        repaymentsByLoan.set(key, [repayment]);
      }
    }

    const today = getTodayDate();
    const mappedLoans = loans.map((loan) => {
      const status = resolveLoanStatus(loan, loan.currentBalance, today);
      const loanRepayments = [...(repaymentsByLoan.get(String(loan._id)) ?? [])].sort(
        (left, right) =>
          right.date.localeCompare(left.date) || right.createdAt - left.createdAt
      );

      return {
        ...loan,
        status,
        daysOverdue:
          loan.dueDate && status === "overdue"
            ? Math.max(0, -differenceInDays(loan.dueDate, today))
            : 0,
        daysUntilDue: loan.dueDate ? differenceInDays(loan.dueDate, today) : null,
        repaymentCount: loanRepayments.length,
        totalRepaid: roundCurrency(loan.principalAmount - loan.currentBalance),
        repayments: loanRepayments,
      };
    });

    let filteredLoans = mappedLoans;
    if (args.direction) {
      filteredLoans = filteredLoans.filter((loan) => loan.direction === args.direction);
    }
    if (args.status) {
      filteredLoans = filteredLoans.filter((loan) => loan.status === args.status);
    }

    return filteredLoans;
  },
});

export const createAccount = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    type: financeAccountTypeValidator,
    currency: v.optional(v.string()),
    balance: v.number(),
    institution: v.optional(v.string()),
    accountNumberLast4: v.optional(v.string()),
    notes: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    const now = Date.now();
    return await ctx.db.insert("financeAccounts", {
      userId,
      name: rest.name,
      type: rest.type,
      currency: rest.currency ?? "INR",
      balance: rest.balance,
      institution: rest.institution,
      accountNumberLast4: rest.accountNumberLast4,
      notes: rest.notes,
      color: rest.color,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateAccount = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("financeAccounts"),
    name: v.optional(v.string()),
    type: v.optional(financeAccountTypeValidator),
    currency: v.optional(v.string()),
    balance: v.optional(v.number()),
    institution: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    creditLimit: v.optional(v.number()),
    billingDay: v.optional(v.number()),
    dueDay: v.optional(v.number()),
    color: v.optional(v.string()),
    notes: v.optional(v.string()),
    accountNumberLast4: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, id, ...updates } = args;
    const account = await ctx.db.get(id);
    if (!account || account.userId !== userId) throw new Error("Account not found");
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteAccount = internalMutation({
  args: { userId: v.string(), id: v.id("financeAccounts") },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.id);
    if (!account || account.userId !== args.userId) throw new Error("Account not found");
    await ctx.db.patch(args.id, { isActive: false, updatedAt: Date.now() });
  },
});

export const createTransaction = internalMutation({
  args: {
    userId: v.string(),
    accountId: v.id("financeAccounts"),
    type: financeTransactionTypeValidator,
    amount: v.number(),
    categoryId: v.optional(v.id("financeCategories")),
    merchant: v.optional(v.string()),
    description: v.string(),
    notes: v.optional(v.string()),
    date: v.string(),
    isRecurring: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    const now = Date.now();
    const id = await ctx.db.insert("financeTransactions", {
      userId,
      accountId: rest.accountId,
      type: rest.type,
      amount: rest.amount,
      currency: "INR",
      categoryId: rest.categoryId,
      merchant: rest.merchant,
      description: rest.description,
      notes: rest.notes,
      date: rest.date,
      isRecurring: rest.isRecurring ?? false,
      tags: rest.tags,
      createdAt: now,
      updatedAt: now,
    });
    const account = await ctx.db.get(rest.accountId);
    if (account) {
      const delta = rest.type === "income" ? rest.amount : -rest.amount;
      await ctx.db.patch(rest.accountId, { balance: account.balance + delta });
    }
    return id;
  },
});

export const updateTransaction = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("financeTransactions"),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("financeCategories")),
    merchant: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId, id, ...updates } = args;
    const tx = await ctx.db.get(id);
    if (!tx || tx.userId !== userId) throw new Error("Transaction not found");
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteTransaction = internalMutation({
  args: { userId: v.string(), id: v.id("financeTransactions") },
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.id);
    if (!tx || tx.userId !== args.userId) throw new Error("Transaction not found");
    const account = await ctx.db.get(tx.accountId);
    if (account) {
      const delta = tx.type === "income" ? -tx.amount : tx.amount;
      await ctx.db.patch(tx.accountId, { balance: account.balance + delta });
    }
    await ctx.db.delete(args.id);
  },
});

export const transferBetweenAccounts = internalMutation({
  args: {
    userId: v.string(),
    fromAccountId: v.id("financeAccounts"),
    toAccountId: v.id("financeAccounts"),
    amount: v.number(),
    description: v.string(),
    date: v.string(),
    notes: v.optional(v.string()),
    linkedCreditCardId: v.optional(v.id("financeCreditCards")),
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    const now = Date.now();
    const groupId = `transfer-${now}-${Math.random().toString(36).slice(2)}`;

    const fromAccount = await ctx.db.get(rest.fromAccountId);
    const toAccount = await ctx.db.get(rest.toAccountId);
    if (!fromAccount || !toAccount) throw new Error("Account not found");

    await ctx.db.insert("financeTransactions", {
      userId,
      accountId: rest.fromAccountId,
      type: "transfer",
      amount: rest.amount,
      currency: fromAccount.currency ?? "INR",
      description: rest.description,
      notes: rest.notes,
      date: rest.date,
      isRecurring: false,
      transferDirection: "out",
      transferGroupId: groupId,
      sourceAccountId: rest.fromAccountId,
      destinationAccountId: rest.toAccountId,
      linkedCreditCardId: rest.linkedCreditCardId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(rest.fromAccountId, { balance: fromAccount.balance - rest.amount, updatedAt: now });

    await ctx.db.insert("financeTransactions", {
      userId,
      accountId: rest.toAccountId,
      type: "transfer",
      amount: rest.amount,
      currency: toAccount.currency ?? "INR",
      description: rest.description,
      notes: rest.notes,
      date: rest.date,
      isRecurring: false,
      transferDirection: "in",
      transferGroupId: groupId,
      sourceAccountId: rest.fromAccountId,
      destinationAccountId: rest.toAccountId,
      linkedCreditCardId: rest.linkedCreditCardId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(rest.toAccountId, { balance: toAccount.balance + rest.amount, updatedAt: now });

    if (rest.linkedCreditCardId) {
      const card = await ctx.db.get(rest.linkedCreditCardId);
      if (card) {
        const newBalance = Math.max(0, card.currentBalance - rest.amount);
        const newAvailable = card.creditLimit - newBalance;
        await ctx.db.patch(rest.linkedCreditCardId, {
          currentBalance: newBalance,
          availableCredit: newAvailable,
          updatedAt: now,
        });
      }
    }

    return groupId;
  },
});

// ── Budgets ───────────────────────────────────────────────────────────────────

export const setBudget = internalMutation({
  args: {
    userId: v.string(),
    categoryId: v.id("financeCategories"),
    amount: v.number(),
    period: v.optional(financeBudgetPeriodValidator),
    rollover: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("financeBudgets")
      .withIndex("by_userId_category", (q) =>
        q.eq("userId", args.userId).eq("categoryId", args.categoryId)
      )
      .first();
    const today = new Date().toISOString().slice(0, 10);
    if (existing) {
      await ctx.db.patch(existing._id, { amount: args.amount, rollover: args.rollover ?? existing.rollover });
    } else {
      await ctx.db.insert("financeBudgets", {
        userId: args.userId,
        categoryId: args.categoryId,
        amount: args.amount,
        period: args.period ?? "monthly",
        startDate: today,
        rollover: args.rollover ?? false,
        alertThresholds: [0.5, 0.75, 0.9, 1.0],
      });
    }
  },
});

export const updateBudget = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("financeBudgets"),
    amount: v.optional(v.number()),
    period: v.optional(financeBudgetPeriodValidator),
    rollover: v.optional(v.boolean()),
    alertThresholds: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const { userId, id, ...updates } = args;
    const budget = await ctx.db.get(id);
    if (!budget || budget.userId !== userId) throw new Error("Budget not found");
    await ctx.db.patch(id, updates);
  },
});

export const deleteBudget = internalMutation({
  args: { userId: v.string(), id: v.id("financeBudgets") },
  handler: async (ctx, args) => {
    const budget = await ctx.db.get(args.id);
    if (!budget || budget.userId !== args.userId) throw new Error("Budget not found");
    await ctx.db.delete(args.id);
  },
});

export const getBudgetProgress = internalQuery({
  args: { userId: v.string(), month: v.string() },
  handler: async (ctx, args) => {
    const startDate = `${args.month}-01`;
    const [year, month] = args.month.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${args.month}-${String(lastDay).padStart(2, "0")}`;

    const budgets = await ctx.db
      .query("financeBudgets")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const txns = await ctx.db
      .query("financeTransactions")
      .withIndex("by_userId_date", (q) => q.eq("userId", args.userId).gte("date", startDate))
      .filter((q) => q.and(q.lte(q.field("date"), endDate), q.eq(q.field("type"), "expense")))
      .collect();

    const spendByCategory: Record<string, number> = {};
    for (const t of txns) {
      const key = t.categoryId ?? "uncategorized";
      spendByCategory[key] = (spendByCategory[key] ?? 0) + t.amount;
    }

    return budgets.map((b) => ({
      ...b,
      spent: spendByCategory[b.categoryId] ?? 0,
    }));
  },
});

// ── Investments ───────────────────────────────────────────────────────────────

export const createInvestment = internalMutation({
  args: {
    userId: v.string(),
    assetType: financeAssetTypeValidator,
    symbol: v.optional(v.string()),
    name: v.string(),
    quantity: v.number(),
    buyPrice: v.number(),
    buyDate: v.string(),
    platform: v.optional(v.string()),
    isSip: v.optional(v.boolean()),
    sipAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    const now = Date.now();
    return await ctx.db.insert("financeInvestments", {
      userId, ...rest, createdAt: now, updatedAt: now,
    });
  },
});

export const updateInvestment = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("financeInvestments"),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    currentPrice: v.optional(v.number()),
    platform: v.optional(v.string()),
    isSip: v.optional(v.boolean()),
    sipAmount: v.optional(v.number()),
    sipDay: v.optional(v.number()),
    notes: v.optional(v.string()),
    dividendYield: v.optional(v.number()),
    taxType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, id, ...updates } = args;
    const inv = await ctx.db.get(id);
    if (!inv || inv.userId !== userId) throw new Error("Investment not found");
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteInvestment = internalMutation({
  args: { userId: v.string(), id: v.id("financeInvestments") },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.id);
    if (!inv || inv.userId !== args.userId) throw new Error("Investment not found");
    await ctx.db.delete(args.id);
  },
});

// ── Goals ─────────────────────────────────────────────────────────────────────

export const createGoal = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    targetAmount: v.number(),
    targetDate: v.string(),
    priority: financeGoalPriorityValidator,
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    return await ctx.db.insert("financeGoals", {
      userId, ...rest, currentAmount: 0, createdAt: Date.now(),
    });
  },
});

export const updateGoal = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("financeGoals"),
    name: v.optional(v.string()),
    targetAmount: v.optional(v.number()),
    targetDate: v.optional(v.string()),
    priority: v.optional(financeGoalPriorityValidator),
    strategy: v.optional(v.string()),
    notes: v.optional(v.string()),
    linkedAccountId: v.optional(v.id("financeAccounts")),
    autoContribute: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, id, ...updates } = args;
    const goal = await ctx.db.get(id);
    if (!goal || goal.userId !== userId) throw new Error("Goal not found");
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const updateGoalProgress = internalMutation({
  args: { userId: v.string(), id: v.id("financeGoals"), currentAmount: v.number() },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== args.userId) throw new Error("Goal not found");
    await ctx.db.patch(args.id, { currentAmount: args.currentAmount });
  },
});

export const deleteGoal = internalMutation({
  args: { userId: v.string(), id: v.id("financeGoals") },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== args.userId) throw new Error("Goal not found");
    await ctx.db.delete(args.id);
  },
});

// ── Custom Categories ─────────────────────────────────────────────────────────

export const listCategories = internalQuery({
  args: { userId: v.string(), type: v.optional(v.union(v.literal("income"), v.literal("expense"))) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("financeCategories");
    const all = await q.collect();
    const filtered = all.filter(
      (c) => c.isSystem === true || c.userId === args.userId
    );
    if (args.type) return filtered.filter((c) => c.type === args.type);
    return filtered;
  },
});

export const createCategory = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    parentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    return await ctx.db.insert("financeCategories", {
      userId,
      name: rest.name,
      icon: rest.icon,
      color: rest.color,
      type: rest.type,
      parentId: rest.parentId,
      sortOrder: Date.now(),
      isSystem: false,
    });
  },
});

// ── Credit Cards ──────────────────────────────────────────────────────────────

export const listCreditCards = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("financeCreditCards")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getCreditCardStats = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("financeCreditCards")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const totalLimit = cards.reduce((s, c) => s + c.creditLimit, 0);
    const totalBalance = cards.reduce((s, c) => s + c.currentBalance, 0);
    const totalAvailable = cards.reduce((s, c) => s + c.availableCredit, 0);
    const utilizationPct = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

    return { totalLimit, totalBalance, totalAvailable, utilizationPct, cardCount: cards.length };
  },
});

export const listCardTransactions = internalQuery({
  args: {
    userId: v.string(),
    creditCardId: v.id("financeCreditCards"),
    limit: v.optional(v.number()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let txns = await ctx.db
      .query("financeTransactions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    txns = txns.filter((t) => t.linkedCreditCardId === args.creditCardId);
    if (args.startDate) txns = txns.filter((t) => t.date >= args.startDate!);
    if (args.endDate) txns = txns.filter((t) => t.date <= args.endDate!);
    return txns.slice(0, args.limit ?? 50);
  },
});

export const createCreditCard = internalMutation({
  args: {
    userId: v.string(),
    accountId: v.id("financeAccounts"),
    issuer: v.string(),
    network: v.optional(financeCreditCardNetworkValidator),
    cardName: v.optional(v.string()),
    lastFour: v.optional(v.string()),
    creditLimit: v.number(),
    billingDay: v.number(),
    dueDay: v.number(),
    rewardProgram: v.optional(v.string()),
    autoPayAccountId: v.optional(v.id("financeAccounts")),
    cardNumber: v.optional(v.string()),
    expiryMonth: v.optional(v.number()),
    expiryYear: v.optional(v.number()),
    cvv: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    const now = Date.now();

    let derivedLastFour = rest.lastFour;
    if (rest.cardNumber && rest.cardNumber.trim().length >= 4) {
      derivedLastFour = rest.cardNumber.trim().slice(-4);
    }

    return await ctx.db.insert("financeCreditCards", {
      userId,
      accountId: rest.accountId,
      issuer: rest.issuer,
      network: rest.network,
      cardName: rest.cardName,
      lastFour: derivedLastFour,
      creditLimit: rest.creditLimit,
      statementBalance: 0,
      currentBalance: 0,
      availableCredit: rest.creditLimit,
      billingDay: rest.billingDay,
      dueDay: rest.dueDay,
      rewardProgram: rest.rewardProgram,
      autoPayAccountId: rest.autoPayAccountId,
      cardNumber: rest.cardNumber,
      expiryMonth: rest.expiryMonth,
      expiryYear: rest.expiryYear,
      cvv: rest.cvv,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateCreditCard = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("financeCreditCards"),
    issuer: v.optional(v.string()),
    cardName: v.optional(v.string()),
    creditLimit: v.optional(v.number()),
    statementBalance: v.optional(v.number()),
    currentBalance: v.optional(v.number()),
    billingDay: v.optional(v.number()),
    dueDay: v.optional(v.number()),
    minimumDue: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    lastStatementDate: v.optional(v.string()),
    rewardPoints: v.optional(v.number()),
    rewardProgram: v.optional(v.string()),
    autoPayAccountId: v.optional(v.id("financeAccounts")),
  },
  handler: async (ctx, args) => {
    const { userId, id, ...updates } = args;
    const card = await ctx.db.get(id);
    if (!card || card.userId !== userId) throw new Error("Credit card not found");

    const newLimit = updates.creditLimit ?? card.creditLimit;
    const newBalance = updates.currentBalance ?? card.currentBalance;
    (updates as any).availableCredit = newLimit - newBalance;

    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const recordCardSpend = internalMutation({
  args: {
    userId: v.string(),
    creditCardId: v.id("financeCreditCards"),
    accountId: v.id("financeAccounts"),
    amount: v.number(),
    description: v.string(),
    merchant: v.optional(v.string()),
    categoryId: v.optional(v.id("financeCategories")),
    date: v.string(),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    const now = Date.now();
    const card = await ctx.db.get(rest.creditCardId);
    if (!card || card.userId !== userId) throw new Error("Credit card not found");

    const txId = await ctx.db.insert("financeTransactions", {
      userId,
      accountId: rest.accountId,
      type: "expense",
      amount: rest.amount,
      currency: "INR",
      categoryId: rest.categoryId,
      linkedCreditCardId: rest.creditCardId,
      merchant: rest.merchant,
      description: rest.description,
      notes: rest.notes,
      date: rest.date,
      isRecurring: false,
      tags: rest.tags,
      affectsBalance: false,
      createdAt: now,
      updatedAt: now,
    });

    const newBalance = card.currentBalance + rest.amount;
    const newAvailable = Math.max(0, card.creditLimit - newBalance);
    await ctx.db.patch(rest.creditCardId, {
      currentBalance: newBalance,
      availableCredit: newAvailable,
      updatedAt: now,
    });

    return txId;
  },
});

export const deleteCreditCard = internalMutation({
  args: { userId: v.string(), id: v.id("financeCreditCards") },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.id);
    if (!card || card.userId !== args.userId) throw new Error("Credit card not found");
    await ctx.db.delete(args.id);
  },
});

export const deleteCardTransaction = internalMutation({
  args: { userId: v.string(), id: v.id("financeTransactions") },
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.id);
    if (!tx || tx.userId !== args.userId) throw new Error("Transaction not found");

    if (tx.linkedCreditCardId) {
      const card = await ctx.db.get(tx.linkedCreditCardId);
      if (card) {
        const newBalance = Math.max(0, card.currentBalance - tx.amount);
        const newAvailable = Math.min(card.creditLimit, card.creditLimit - newBalance);
        await ctx.db.patch(tx.linkedCreditCardId, {
          currentBalance: newBalance,
          availableCredit: newAvailable,
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.delete(args.id);
  },
});

// ── Loans ─────────────────────────────────────────────────────────────────────

export const getLoanSummary = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const loans = await ctx.db
      .query("financeLoans")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const active = loans.filter((loan) => {
      const status = resolveLoanStatus(loan, loan.currentBalance);
      return status === "active" || status === "partially_paid" || status === "overdue";
    });

    const totalLent = active
      .filter((loan) => loan.direction === "lent")
      .reduce((sum, loan) => sum + loan.currentBalance, 0);
    const totalBorrowed = active
      .filter((loan) => loan.direction === "borrowed")
      .reduce((sum, loan) => sum + loan.currentBalance, 0);
    const overdue = active.filter((loan) => resolveLoanStatus(loan, loan.currentBalance) === "overdue").length;

    return {
      totalLent,
      totalBorrowed,
      overdue,
      activeCount: active.length,
    };
  },
});

export const createLoan = internalMutation({
  args: {
    userId: v.string(),
    direction: financeLoanDirectionValidator,
    counterpartyName: v.string(),
    principalAmount: v.number(),
    currency: v.optional(v.string()),
    issuedDate: v.string(),
    dueDate: v.optional(v.string()),
    linkedAccountId: v.optional(v.id("financeAccounts")),
    interestRate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    const now = Date.now();
    const currency = rest.currency ?? "INR";

    const loanId = await ctx.db.insert("financeLoans", {
      userId,
      direction: rest.direction,
      counterpartyName: rest.counterpartyName,
      principalAmount: rest.principalAmount,
      currentBalance: rest.principalAmount,
      currency,
      issuedDate: rest.issuedDate,
      dueDate: rest.dueDate,
      status: resolveLoanStatus(
        {
          dueDate: rest.dueDate,
          principalAmount: rest.principalAmount,
        },
        rest.principalAmount
      ),
      linkedAccountId: rest.linkedAccountId,
      interestRate: rest.interestRate,
      notes: rest.notes,
      createdAt: now,
      updatedAt: now,
    });

    if (rest.linkedAccountId) {
      const account = await ctx.db.get(rest.linkedAccountId);
      if (!account || account.userId !== userId) {
        throw new Error("Account not found");
      }

      const delta = rest.direction === "lent" ? -rest.principalAmount : rest.principalAmount;

      await ctx.db.insert("financeTransactions", {
        userId,
        accountId: rest.linkedAccountId,
        type: rest.direction === "lent" ? "expense" : "income",
        amount: rest.principalAmount,
        currency,
        loanId,
        description:
          rest.direction === "lent"
            ? `Lent to ${rest.counterpartyName}`
            : `Borrowed from ${rest.counterpartyName}`,
        notes: rest.notes,
        date: rest.issuedDate,
        isRecurring: false,
        affectsBalance: true,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(rest.linkedAccountId, {
        balance: roundCurrency(account.balance + delta),
      });
    }

    return loanId;
  },
});

export const updateLoan = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("financeLoans"),
    counterpartyName: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    status: v.optional(financeLoanStatusValidator),
    interestRate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, id, ...updates } = args;
    const loan = await ctx.db.get(id);
    if (!loan || loan.userId !== userId) throw new Error("Loan not found");

    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const recordLoanRepayment = internalMutation({
  args: {
    userId: v.string(),
    loanId: v.id("financeLoans"),
    amount: v.number(),
    date: v.string(),
    accountId: v.optional(v.id("financeAccounts")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    const loan = await ctx.db.get(rest.loanId);
    if (!loan || loan.userId !== userId) throw new Error("Loan not found");
    if (rest.amount <= 0) throw new Error("Repayment amount must be greater than zero");
    if (rest.amount > loan.currentBalance) {
      throw new Error("Repayment amount cannot exceed outstanding balance");
    }

    const now = Date.now();
    const newBalance = roundCurrency(loan.currentBalance - rest.amount);

    await ctx.db.insert("financeLoanRepayments", {
      userId,
      loanId: rest.loanId,
      amount: rest.amount,
      currency: loan.currency,
      date: rest.date,
      accountId: rest.accountId,
      notes: rest.notes,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(rest.loanId, {
      currentBalance: newBalance,
      status: resolveLoanStatus(loan, newBalance),
      updatedAt: now,
    });

    if (rest.accountId) {
      const account = await ctx.db.get(rest.accountId);
      if (!account || account.userId !== userId) {
        throw new Error("Account not found");
      }

      const delta = loan.direction === "lent" ? rest.amount : -rest.amount;

      await ctx.db.insert("financeTransactions", {
        userId,
        accountId: rest.accountId,
        type: loan.direction === "lent" ? "income" : "expense",
        amount: rest.amount,
        currency: loan.currency,
        loanId: rest.loanId,
        description:
          loan.direction === "lent"
            ? `Repayment from ${loan.counterpartyName}`
            : `Repayment to ${loan.counterpartyName}`,
        notes: rest.notes,
        date: rest.date,
        isRecurring: false,
        affectsBalance: true,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(rest.accountId, {
        balance: roundCurrency(account.balance + delta),
      });
    }
  },
});

export const deleteLoan = internalMutation({
  args: { userId: v.string(), id: v.id("financeLoans") },
  handler: async (ctx, args) => {
    const loan = await ctx.db.get(args.id);
    if (!loan || loan.userId !== args.userId) throw new Error("Loan not found");

    const transactions = await ctx.db
      .query("financeTransactions")
      .withIndex("by_loanId", (q) => q.eq("loanId", args.id))
      .collect();

    for (const transaction of transactions) {
      const account = await ctx.db.get(transaction.accountId);
      if (account) {
        await ctx.db.patch(transaction.accountId, {
          balance: roundCurrency(
            account.balance - signedTransactionAmount(transaction)
          ),
        });
      }
      await ctx.db.delete(transaction._id);
    }

    const repayments = await ctx.db
      .query("financeLoanRepayments")
      .withIndex("by_loanId", (q) => q.eq("loanId", args.id))
      .collect();

    for (const repayment of repayments) {
      await ctx.db.delete(repayment._id);
    }

    await ctx.db.delete(args.id);
  },
});

// ── Recurring Transactions ────────────────────────────────────────────────────

export const listRecurring = internalQuery({
  args: { userId: v.string(), activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    let items = await ctx.db
      .query("financeRecurring")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    if (args.activeOnly !== false) items = items.filter((r) => r.isActive);
    const today = getTodayDate();
    return items.map((r) => ({
      ...r,
      daysUntilNext: differenceInDays(r.nextDueDate, today),
    }));
  },
});

export const createRecurring = internalMutation({
  args: {
    userId: v.string(),
    title: v.string(),
    type: financeTransactionTypeValidator,
    amount: v.number(),
    currency: v.optional(v.string()),
    accountId: v.id("financeAccounts"),
    destinationAccountId: v.optional(v.id("financeAccounts")),
    categoryId: v.optional(v.id("financeCategories")),
    loanId: v.optional(v.id("financeLoans")),
    linkedCreditCardId: v.optional(v.id("financeCreditCards")),
    description: v.string(),
    notes: v.optional(v.string()),
    merchant: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    frequency: financeRecurringFrequencyValidator,
    interval: v.optional(v.number()),
    startDate: v.string(),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    const now = Date.now();
    return await ctx.db.insert("financeRecurring", {
      userId,
      title: rest.title,
      type: rest.type,
      amount: rest.amount,
      currency: rest.currency ?? "INR",
      accountId: rest.accountId,
      destinationAccountId: rest.destinationAccountId,
      categoryId: rest.categoryId,
      loanId: rest.loanId,
      linkedCreditCardId: rest.linkedCreditCardId,
      description: rest.description,
      notes: rest.notes,
      merchant: rest.merchant,
      tags: rest.tags,
      frequency: rest.frequency,
      interval: rest.interval ?? 1,
      startDate: rest.startDate,
      endDate: rest.endDate,
      nextDueDate: rest.startDate,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateRecurring = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("financeRecurring"),
    title: v.optional(v.string()),
    amount: v.optional(v.number()),
    categoryId: v.optional(v.id("financeCategories")),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    endDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    nextDueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, id, ...updates } = args;
    const rec = await ctx.db.get(id);
    if (!rec || rec.userId !== userId) throw new Error("Recurring item not found");
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteRecurring = internalMutation({
  args: { userId: v.string(), id: v.id("financeRecurring") },
  handler: async (ctx, args) => {
    const rec = await ctx.db.get(args.id);
    if (!rec || rec.userId !== args.userId) throw new Error("Recurring item not found");
    await ctx.db.delete(args.id);
  },
});

export const getCashflowHistory = internalQuery({
  args: { userId: v.string(), months: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const n = args.months ?? 6;
    const now = new Date();
    const results: { month: string; label: string; income: number; expenses: number }[] = [];

    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const mm = String(month).padStart(2, "0");
      const startDate = `${year}-${mm}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "short" });

      const txns = await ctx.db
        .query("financeTransactions")
        .withIndex("by_userId_date", (q) => q.eq("userId", args.userId).gte("date", startDate))
        .filter((q) => q.lte(q.field("date"), endDate))
        .collect();

      const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expenses = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      results.push({ month: `${year}-${mm}`, label, income, expenses });
    }
    return results;
  },
});

// ── Habits ────────────────────────────────────────────────────────────────────

export const listHabits = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("habits")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getTodaysHabits = internalQuery({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("habitLogs")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();
  },
});

export const getWeeklyHabitLogs = internalQuery({
  args: { userId: v.string(), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("habitLogs")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", args.userId).gte("date", args.startDate)
      )
      .filter((q) => q.lte(q.field("date"), args.endDate))
      .collect();
  },
});

export const createHabit = internalMutation({
  args: {
    userId: v.string(),
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
    const { userId, ...rest } = args;
    const count = await ctx.db
      .query("habits")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return await ctx.db.insert("habits", {
      userId,
      ...rest,
      streak: 0,
      longestStreak: 0,
      isActive: true,
      sortOrder: count.length,
      createdAt: Date.now(),
    });
  },
});

export const logHabit = internalMutation({
  args: {
    userId: v.string(),
    habitId: v.id("habits"),
    date: v.string(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== args.userId) throw new Error("Habit not found");

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
        userId: args.userId,
        date: args.date,
        completed: args.completed,
        completedAt: args.completed ? Date.now() : undefined,
      });
    }

    if (args.completed) {
      const newStreak = habit.streak + 1;
      await ctx.db.patch(args.habitId, {
        streak: newStreak,
        longestStreak: Math.max(habit.longestStreak, newStreak),
      });
    } else {
      await ctx.db.patch(args.habitId, {
        streak: Math.max(0, habit.streak - 1),
      });
    }
  },
});

export const deleteHabit = internalMutation({
  args: { userId: v.string(), id: v.id("habits") },
  handler: async (ctx, args) => {
    const habit = await ctx.db.get(args.id);
    if (!habit || habit.userId !== args.userId) throw new Error("Habit not found");
    await ctx.db.patch(args.id, { isActive: false });
  },
});

// ── Reminders ─────────────────────────────────────────────────────────────────

export const listReminders = internalQuery({
  args: {
    userId: v.string(),
    workspaceId: v.id("workspaces"),
    includeCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, args.userId, "viewer");
    const all = await ctx.db
      .query("reminders")
      .withIndex("by_workspaceId_remindAt", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    return args.includeCompleted ? all : all.filter((r) => r.status === "scheduled");
  },
});

export const getRemindersSummary = internalQuery({
  args: {
    userId: v.string(),
    workspaceId: v.id("workspaces"),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, args.userId, "viewer");
    const now = args.now ?? Date.now();

    const scheduled = await ctx.db
      .query("reminders")
      .withIndex("by_workspaceId_status_remindAt", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "scheduled")
      )
      .collect();

    const pending = scheduled.filter((reminder) => reminder.userId === args.userId);
    const overdue = pending.filter((reminder) => reminder.remindAt <= now).length;

    return {
      total: pending.length,
      overdue,
      upcoming: Math.max(pending.length - overdue, 0),
    };
  },
});

export const listDueReminders = internalQuery({
  args: {
    userId: v.string(),
    workspaceId: v.id("workspaces"),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, args.userId, "viewer");
    const now = args.now ?? Date.now();

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_workspaceId_status_remindAt", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "scheduled").lte("remindAt", now)
      )
      .collect();

    return reminders
      .filter((reminder) => reminder.userId === args.userId && !reminder.notifiedAt)
      .slice(0, 10);
  },
});

export const createReminder = internalMutation({
  args: {
    userId: v.string(),
    workspaceId: v.id("workspaces"),
    title: v.string(),
    remindAt: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await checkWorkspaceAccess(ctx, args.workspaceId, args.userId, "viewer");
    const now = Date.now();
    return await ctx.db.insert("reminders", {
      userId: args.userId,
      workspaceId: args.workspaceId,
      title: args.title,
      note: args.note,
      remindAt: args.remindAt,
      status: "scheduled",
      pageId: null,
      databaseId: null,
      rowId: null,
      completedAt: null,
      notifiedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateReminder = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("reminders"),
    title: v.optional(v.string()),
    note: v.optional(v.string()),
    remindAt: v.optional(v.number()),
    sourceLabel: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.id);
    if (!reminder || reminder.userId !== args.userId) throw new Error("Reminder not found");

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

export const setReminderCompleted = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("reminders"),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.id);
    if (!reminder || reminder.userId !== args.userId) throw new Error("Reminder not found");

    await ctx.db.patch(args.id, {
      status: args.completed ? "completed" : "scheduled",
      completedAt: args.completed ? Date.now() : null,
      notifiedAt: args.completed ? reminder.notifiedAt ?? null : null,
      updatedAt: Date.now(),
    });
  },
});

export const snoozeReminder = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("reminders"),
    remindAt: v.number(),
  },
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.id);
    if (!reminder || reminder.userId !== args.userId) throw new Error("Reminder not found");

    await ctx.db.patch(args.id, {
      remindAt: args.remindAt,
      status: "scheduled",
      completedAt: null,
      notifiedAt: null,
      updatedAt: Date.now(),
    });
  },
});

export const removeReminder = internalMutation({
  args: { userId: v.string(), id: v.id("reminders") },
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.id);
    if (!reminder || reminder.userId !== args.userId) throw new Error("Reminder not found");
    await ctx.db.delete(args.id);
  },
});

// ── Comments ──────────────────────────────────────────────────────────────────

export const listCommentsByPage = internalQuery({
  args: { userId: v.string(), pageId: v.id("pages") },
  handler: async (ctx, args) => {
    await checkPageAccess(ctx, args.pageId, args.userId, "viewer");

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .order("asc")
      .collect();

    return { comments, currentUserId: args.userId };
  },
});

export const addComment = internalMutation({
  args: {
    userId: v.string(),
    pageId: v.id("pages"),
    workspaceId: v.id("workspaces"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const { page } = await checkPageAccess(ctx, args.pageId, args.userId, "editor");
    if (page.workspaceId !== args.workspaceId) {
      throw new Error("Page does not belong to this workspace");
    }

    const user = await ctx.db.get(args.userId as Id<"users">);
    const authorName = user?.name ?? user?.email ?? "Unknown";

    const now = Date.now();
    return await ctx.db.insert("comments", {
      pageId: args.pageId,
      workspaceId: args.workspaceId,
      parentCommentId: args.parentCommentId ?? null,
      authorId: args.userId,
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

export const editComment = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("comments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { comment } = await checkCommentAccess(ctx, args.id, args.userId, "editor");
    if (comment.authorId !== args.userId) throw new Error("Unauthorized");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      content: args.content.trim(),
      editedAt: now,
      updatedAt: now,
    });
  },
});

export const removeComment = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const { comment } = await checkCommentAccess(ctx, args.id, args.userId, "editor");
    if (comment.authorId !== args.userId) throw new Error("Unauthorized");

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

export const resolveComment = internalMutation({
  args: {
    userId: v.string(),
    id: v.id("comments"),
    resolved: v.boolean(),
  },
  handler: async (ctx, args) => {
    await checkCommentAccess(ctx, args.id, args.userId, "editor");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      isResolved: args.resolved,
      resolvedAt: args.resolved ? now : null,
      resolvedBy: args.resolved ? args.userId : null,
      updatedAt: now,
    });
  },
});

// ── News Feed ─────────────────────────────────────────────────────────────────

export const pushNewsArticles = internalMutation({
  args: {
    articles: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const recent = await ctx.db
      .query("newsArticles")
      .withIndex("by_publishedAt")
      .order("desc")
      .take(400);

    const byUrl = new Map(recent.map((a) => [a.url, a._id]));
    let inserted = 0;
    let skipped = 0;

    for (const article of args.articles) {
      if (byUrl.has(article.url)) { skipped++; continue; }
      await ctx.db.insert("newsArticles", { ...article, fetchedAt: Date.now() });
      inserted++;
    }
    return { inserted, skipped };
  },
});

export const getNews = internalQuery({
  args: {
    category: v.optional(v.union(
      v.literal("for_you"), v.literal("ai_ml"), v.literal("tech_it"),
      v.literal("productivity"), v.literal("must_know"), v.literal("general")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    if (args.category) {
      return await ctx.db
        .query("newsArticles")
        .withIndex("by_publishedAt")
        .order("desc")
        .filter((q) => q.eq(q.field("category"), args.category))
        .take(limit);
    }
    return await ctx.db
        .query("newsArticles")
        .withIndex("by_publishedAt")
        .order("desc")
        .take(limit);
  },
});

export const getDailyTasksDashboard = internalQuery({
  args: {
    userId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    date: v.optional(v.string()),
    projects: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const allWorkspaces = await ctx.db.query("workspaces").collect();
    const authorizedWorkspaces = [];
    for (const w of allWorkspaces) {
      const access = await getWorkspaceAccessForUser(ctx, w._id, args.userId);
      if (access) authorizedWorkspaces.push(w);
    }

    let targetStart = args.startDate;
    let targetEnd = args.endDate;
    if (args.date) {
      targetStart = args.date;
      targetEnd = args.date;
    }

    const dayMap = new Map<string, any[]>();
    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let pendingTasks = 0;

    const formatToDateStr = (raw: unknown): string | null => {
      if (!raw) return null;
      let ts: number | null = null;
      if (typeof raw === "number") ts = raw;
      else if (typeof raw === "string") {
        const parsed = Date.parse(raw);
        if (!isNaN(parsed)) ts = parsed;
        else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      }
      if (ts === null) return null;
      const istDate = new Date(ts + 5.5 * 3600 * 1000);
      return istDate.toISOString().slice(0, 10);
    };

    const extractText = (val: unknown): string => {
      if (!val) return "";
      if (typeof val === "string") return val.trim();
      if (Array.isArray(val)) {
        return val
          .map((item: any) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object") {
              if (typeof item.text === "string") return item.text;
              if (Array.isArray(item.content)) {
                return item.content
                  .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
                  .join("");
              }
            }
            return "";
          })
          .join("");
      }
      return String(val).trim();
    };

    for (const ws of authorizedWorkspaces) {
      const pages = await ctx.db
        .query("pages")
        .withIndex("by_workspaceId_archived", (q) =>
          q.eq("workspaceId", ws._id).eq("isArchived", false)
        )
        .collect();

      const pagesMap = new Map(pages.map((p) => [p._id, p]));

      const resolveSpaceName = (pageId: any): string => {
        let current = pagesMap.get(pageId);
        let depth = 0;
        while (current && depth < 10) {
          if (current.isSpaceRoot) return current.title;
          if (!current.parentId) return current.title;
          current = pagesMap.get(current.parentId);
          depth++;
        }
        return ws.name || "Main Workspace";
      };

      const dbPages = pages.filter((p) => p.type === "database");

      for (const page of dbPages) {
        const spaceName = resolveSpaceName(page._id);
        const projectName = page.title || "Untitled Database";

        if (args.projects && args.projects.length > 0) {
          const match = args.projects.some(
            (proj) =>
              projectName.toLowerCase().includes(proj.toLowerCase()) ||
              spaceName.toLowerCase().includes(proj.toLowerCase())
          );
          if (!match) continue;
        }

        const db = await ctx.db
          .query("databases")
          .withIndex("by_pageId", (q) => q.eq("pageId", page._id))
          .first();

        if (!db) continue;

        const titleProp =
          db.properties.find((p: any) => p.name?.toLowerCase() === "task") ??
          db.properties.find((p: any) => p.type === "title") ??
          db.properties.find((p: any) => p.name?.toLowerCase() === "name");

        const dateProps = db.properties.filter(
          (p: any) =>
            p.type === "date" ||
            p.type === "created_time" ||
            (p.name && p.name.toLowerCase().includes("date"))
        );

        const statusProp = db.properties.find(
          (p: any) => p.name?.toLowerCase() === "status" && p.type === "select"
        );

        const assignedToProp = db.properties.find((p: any) =>
          p.name?.toLowerCase().includes("assign")
        );

        const rows = await ctx.db
          .query("rows")
          .withIndex("by_databaseId", (q) => q.eq("databaseId", db._id))
          .filter((q) => q.neq(q.field("isArchived"), true))
          .collect();

        for (const row of rows) {
          const taskName = titleProp
            ? extractText(row.data[titleProp.id]) || "Untitled"
            : "Untitled";

          let statusVal = "pending";
          if (statusProp && row.data[statusProp.id]) {
            const val = row.data[statusProp.id];
            const options = statusProp.config?.options || statusProp.options || [];
            const opt = options.find((o: any) => o.id === val || o.label === val);
            statusVal = opt ? opt.label : String(val);
          }

          const statusLower = statusVal.toLowerCase();
          if (statusLower === "done" || statusLower === "completed") {
            completedTasks++;
          } else if (statusLower === "in_progress" || statusLower === "in progress") {
            inProgressTasks++;
          } else {
            pendingTasks++;
          }
          totalTasks++;

          const taskDates = new Set<string>();

          for (const dateProp of dateProps) {
            const rawVal = row.data[dateProp.id];
            const dateStr = formatToDateStr(rawVal);
            if (dateStr) taskDates.add(dateStr);
          }

          const createdDateStr = formatToDateStr(row._creationTime);
          if (createdDateStr) taskDates.add(createdDateStr);

          const completedProp = db.properties.find(
            (p: any) => p.name?.toLowerCase().includes("complet")
          );
          const completedDateStr = completedProp
            ? formatToDateStr(row.data[completedProp.id])
            : null;

          const assignedTo = assignedToProp
            ? extractText(row.data[assignedToProp.id])
            : null;

          for (const dateStr of taskDates) {
            if (targetStart && dateStr < targetStart) continue;
            if (targetEnd && dateStr > targetEnd) continue;

            if (!dayMap.has(dateStr)) {
              dayMap.set(dateStr, []);
            }

            const existingInDay = dayMap.get(dateStr)!;
            if (!existingInDay.some((t) => t.rowId === row._id)) {
              existingInDay.push({
                rowId: row._id,
                taskName,
                spaceName,
                projectName,
                status: statusVal,
                assignedTo,
                createdDate: createdDateStr,
                completedDate: completedDateStr,
                workspaceName: ws.name,
              });
            }
          }
        }
      }
    }

    const sortedDates = Array.from(dayMap.keys()).sort();
    const days = sortedDates.map((date) => ({
      date,
      count: dayMap.get(date)!.length,
      tasks: dayMap.get(date)!,
    }));

    return {
      summary: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        dateFilter: {
          startDate: targetStart ?? null,
          endDate: targetEnd ?? null,
        },
      },
      days,
    };
  },
});
