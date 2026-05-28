/**
 * MCP Service — internal Convex functions callable with the deploy key.
 * These accept userId explicitly so the MCP server can serve Claude/ChatGPT
 * without a user browser session.
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// ── API Key management ────────────────────────────────────────────────────────

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
    const ws = await ctx.db.get(args.workspaceId);
    if (!ws) return [];
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
    const page = await ctx.db.get(args.pageId);
    if (!page) return null;

    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .order("asc")
      .take(20);

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
      .slice(0, 4000);

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
  },
  handler: async (ctx, args) => {
    const siblings = await ctx.db
      .query("pages")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    const maxOrder = siblings.reduce((max, p) => Math.max(max, p.sortOrder), 0);

    const pageId = await ctx.db.insert("pages", {
      workspaceId: args.workspaceId,
      parentId: null,
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
      maddyTags: [],
      maddySuggested: [],
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

// ── Databases ─────────────────────────────────────────────────────────────────

export const getDatabaseRows = internalQuery({
  args: { userId: v.string(), databaseId: v.id("databases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rows")
      .withIndex("by_databaseId", (q) => q.eq("databaseId", args.databaseId))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();
  },
});

/** Look up database by page ID, then return its rows + schema in one call. */
export const getDatabaseRowsByPage = internalQuery({
  args: { userId: v.string(), pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const db = await ctx.db
      .query("databases")
      .filter((q) => q.eq(q.field("pageId"), args.pageId))
      .unique();

    if (!db) return null;

    const rows = await ctx.db
      .query("rows")
      .withIndex("by_databaseId", (q) => q.eq("databaseId", db._id))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();

    return { databaseId: db._id, name: db.name, properties: db.properties, rows };
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
    status: v.optional(v.union(v.literal("active"), v.literal("paid_off"), v.literal("defaulted"))),
    direction: v.optional(v.union(v.literal("lent"), v.literal("borrowed"))),
  },
  handler: async (ctx, args) => {
    let loans = await ctx.db
      .query("financeLoans")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    if (args.status) loans = loans.filter((l) => l.status === args.status);
    if (args.direction) loans = loans.filter((l) => l.direction === args.direction);
    return loans;
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

// ── Reminders ─────────────────────────────────────────────────────────────────

export const listReminders = internalQuery({
  args: {
    userId: v.string(),
    workspaceId: v.id("workspaces"),
    includeCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("reminders")
      .withIndex("by_workspaceId_remindAt", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    return args.includeCompleted ? all : all.filter((r) => r.status === "scheduled");
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

// ── News ──────────────────────────────────────────────────────────────────────

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
