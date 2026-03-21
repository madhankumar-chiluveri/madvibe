import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Accounts ──────────────────────────────────────────────────────────────────

export const listAccounts = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("financeAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const createAccount = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("savings"), v.literal("checking"), v.literal("credit_card"),
      v.literal("cash"), v.literal("investment"), v.literal("loan"), v.literal("wallet")
    ),
    currency: v.optional(v.string()),
    balance: v.number(),
    institution: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("financeAccounts", {
      userId,
      name: args.name,
      type: args.type,
      currency: args.currency ?? "INR",
      balance: args.balance,
      institution: args.institution,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateAccount = mutation({
  args: {
    id: v.id("financeAccounts"),
    name: v.optional(v.string()),
    balance: v.optional(v.number()),
    institution: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

// ── Categories ───────────────────────────────────────────────────────────────

export const listCategories = query({
  args: { type: v.optional(v.union(v.literal("income"), v.literal("expense"))) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    // Return system categories + user custom categories
    let q = ctx.db.query("financeCategories");
    const all = await q.collect();
    const filtered = all.filter(
      (c) => c.isSystem === true || c.userId === userId
    );
    if (args.type) return filtered.filter((c) => c.type === args.type);
    return filtered;
  },
});

export const seedDefaultCategories = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("financeCategories")
      .filter((q) => q.eq(q.field("isSystem"), true))
      .first();
    if (existing) return; // already seeded

    const defaults = [
      { name: "Housing", icon: "🏠", color: "#6366f1", type: "expense" as const, sortOrder: 1 },
      { name: "Transport", icon: "🚗", color: "#f59e0b", type: "expense" as const, sortOrder: 2 },
      { name: "Food & Dining", icon: "🍔", color: "#ef4444", type: "expense" as const, sortOrder: 3 },
      { name: "Utilities", icon: "💡", color: "#3b82f6", type: "expense" as const, sortOrder: 4 },
      { name: "Healthcare", icon: "🏥", color: "#10b981", type: "expense" as const, sortOrder: 5 },
      { name: "Education", icon: "🎓", color: "#8b5cf6", type: "expense" as const, sortOrder: 6 },
      { name: "Shopping", icon: "🛍", color: "#ec4899", type: "expense" as const, sortOrder: 7 },
      { name: "Entertainment", icon: "🎬", color: "#f97316", type: "expense" as const, sortOrder: 8 },
      { name: "Travel", icon: "✈️", color: "#06b6d4", type: "expense" as const, sortOrder: 9 },
      { name: "Business", icon: "💼", color: "#64748b", type: "expense" as const, sortOrder: 10 },
      { name: "Subscriptions", icon: "📱", color: "#a855f7", type: "expense" as const, sortOrder: 11 },
      { name: "Debt Payment", icon: "💳", color: "#dc2626", type: "expense" as const, sortOrder: 12 },
      { name: "Savings", icon: "💰", color: "#16a34a", type: "expense" as const, sortOrder: 13 },
      { name: "Gifts", icon: "🎁", color: "#db2777", type: "expense" as const, sortOrder: 14 },
      { name: "Miscellaneous", icon: "🔧", color: "#78716c", type: "expense" as const, sortOrder: 15 },
      // Income
      { name: "Salary", icon: "💵", color: "#22c55e", type: "income" as const, sortOrder: 1 },
      { name: "Freelance", icon: "💻", color: "#3b82f6", type: "income" as const, sortOrder: 2 },
      { name: "Investment Returns", icon: "📈", color: "#10b981", type: "income" as const, sortOrder: 3 },
      { name: "Business Income", icon: "🏢", color: "#6366f1", type: "income" as const, sortOrder: 4 },
      { name: "Rental Income", icon: "🏘", color: "#f59e0b", type: "income" as const, sortOrder: 5 },
      { name: "Other Income", icon: "💫", color: "#84cc16", type: "income" as const, sortOrder: 6 },
    ];

    for (const cat of defaults) {
      await ctx.db.insert("financeCategories", { ...cat, isSystem: true });
    }
  },
});

// ── Transactions ─────────────────────────────────────────────────────────────

export const listTransactions = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(v.union(v.literal("income"), v.literal("expense"), v.literal("transfer"), v.literal("investment"))),
    accountId: v.optional(v.id("financeAccounts")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const limit = args.limit ?? 50;
    let all = await ctx.db
      .query("financeTransactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);

    if (args.type) all = all.filter((t) => t.type === args.type);
    if (args.accountId) all = all.filter((t) => t.accountId === args.accountId);
    if (args.startDate) all = all.filter((t) => t.date >= args.startDate!);
    if (args.endDate) all = all.filter((t) => t.date <= args.endDate!);

    return all.slice(0, limit);
  },
});

export const createTransaction = mutation({
  args: {
    accountId: v.id("financeAccounts"),
    type: v.union(v.literal("income"), v.literal("expense"), v.literal("transfer"), v.literal("investment")),
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    const id = await ctx.db.insert("financeTransactions", {
      userId,
      accountId: args.accountId,
      type: args.type,
      amount: args.amount,
      currency: "INR",
      categoryId: args.categoryId,
      merchant: args.merchant,
      description: args.description,
      notes: args.notes,
      date: args.date,
      isRecurring: args.isRecurring ?? false,
      tags: args.tags,
      createdAt: now,
      updatedAt: now,
    });
    // Update account balance
    const account = await ctx.db.get(args.accountId);
    if (account) {
      const delta = args.type === "income" ? args.amount : -args.amount;
      await ctx.db.patch(args.accountId, { balance: account.balance + delta });
    }
    return id;
  },
});

export const updateTransaction = mutation({
  args: {
    id: v.id("financeTransactions"),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("financeCategories")),
    merchant: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteTransaction = mutation({
  args: { id: v.id("financeTransactions") },
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.id);
    if (!tx) return;
    // Reverse balance effect
    const account = await ctx.db.get(tx.accountId);
    if (account) {
      const delta = tx.type === "income" ? -tx.amount : tx.amount;
      await ctx.db.patch(tx.accountId, { balance: account.balance + delta });
    }
    await ctx.db.delete(args.id);
  },
});

// ── Dashboard Aggregates ──────────────────────────────────────────────────────

export const getDashboardData = query({
  args: { month: v.string() }, // "YYYY-MM"
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const startDate = `${args.month}-01`;
    const [year, month] = args.month.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${args.month}-${String(lastDay).padStart(2, "0")}`;

    const txns = await ctx.db
      .query("financeTransactions")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).gte("date", startDate)
      )
      .filter((q) => q.lte(q.field("date"), endDate))
      .collect();

    const income = txns
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expenses = txns
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    const accounts = await ctx.db
      .query("financeAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const netWorth = accounts.reduce((s, a) => s + a.balance, 0);

    // Expense by category
    const byCategoryMap: Record<string, number> = {};
    for (const t of txns.filter((t) => t.type === "expense")) {
      const key = t.categoryId ?? "uncategorized";
      byCategoryMap[key] = (byCategoryMap[key] ?? 0) + t.amount;
    }

    return { income, expenses, netWorth, byCategory: byCategoryMap, recent: txns.slice(0, 10) };
  },
});

// ── Budgets ───────────────────────────────────────────────────────────────────

export const listBudgets = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("financeBudgets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const setBudget = mutation({
  args: {
    categoryId: v.id("financeCategories"),
    amount: v.number(),
    period: v.optional(v.union(v.literal("monthly"), v.literal("quarterly"), v.literal("yearly"))),
    rollover: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("financeBudgets")
      .withIndex("by_userId_category", (q) =>
        q.eq("userId", userId).eq("categoryId", args.categoryId)
      )
      .first();
    const today = new Date().toISOString().slice(0, 10);
    if (existing) {
      await ctx.db.patch(existing._id, { amount: args.amount, rollover: args.rollover ?? existing.rollover });
    } else {
      await ctx.db.insert("financeBudgets", {
        userId,
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

// ── Investments ───────────────────────────────────────────────────────────────

export const listInvestments = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("financeInvestments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const createInvestment = mutation({
  args: {
    assetType: v.union(
      v.literal("stock"), v.literal("mutual_fund"), v.literal("etf"),
      v.literal("fd"), v.literal("ppf"), v.literal("gold"),
      v.literal("crypto"), v.literal("real_estate"), v.literal("bond"), v.literal("other")
    ),
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("financeInvestments", {
      userId, ...args, createdAt: now, updatedAt: now,
    });
  },
});

export const deleteInvestment = mutation({
  args: { id: v.id("financeInvestments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── Goals ─────────────────────────────────────────────────────────────────────

export const listGoals = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("financeGoals")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const createGoal = mutation({
  args: {
    name: v.string(),
    targetAmount: v.number(),
    targetDate: v.string(),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("financeGoals", {
      userId, ...args, currentAmount: 0, createdAt: Date.now(),
    });
  },
});

export const updateGoalProgress = mutation({
  args: { id: v.id("financeGoals"), currentAmount: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { currentAmount: args.currentAmount });
  },
});
