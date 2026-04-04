import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { financeCreditCardNetworkValidator } from "./financeShared";

// ── List Credit Cards ─────────────────────────────────────────────────────────

export const listCreditCards = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("financeCreditCards")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

// ── Get Credit Card Stats ─────────────────────────────────────────────────────

export const getCreditCardStats = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const cards = await ctx.db
      .query("financeCreditCards")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const totalLimit = cards.reduce((s, c) => s + c.creditLimit, 0);
    const totalBalance = cards.reduce((s, c) => s + c.currentBalance, 0);
    const totalAvailable = cards.reduce((s, c) => s + c.availableCredit, 0);
    const utilizationPct = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

    return { totalLimit, totalBalance, totalAvailable, utilizationPct, cardCount: cards.length };
  },
});

// ── Create Credit Card ────────────────────────────────────────────────────────

export const createCreditCard = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("financeCreditCards", {
      userId,
      accountId: args.accountId,
      issuer: args.issuer,
      network: args.network,
      cardName: args.cardName,
      lastFour: args.lastFour,
      creditLimit: args.creditLimit,
      statementBalance: 0,
      currentBalance: 0,
      availableCredit: args.creditLimit,
      billingDay: args.billingDay,
      dueDay: args.dueDay,
      rewardProgram: args.rewardProgram,
      autoPayAccountId: args.autoPayAccountId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ── Update Credit Card ────────────────────────────────────────────────────────

export const updateCreditCard = mutation({
  args: {
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const { id, ...updates } = args;
    // Recalculate available credit if limit or balance changed
    const card = await ctx.db.get(id);
    if (card) {
      const newLimit = updates.creditLimit ?? card.creditLimit;
      const newBalance = updates.currentBalance ?? card.currentBalance;
      (updates as any).availableCredit = newLimit - newBalance;
    }
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

// ── Add Credit Card Spend ─────────────────────────────────────────────────────

export const recordCardSpend = mutation({
  args: {
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    const card = await ctx.db.get(args.creditCardId);
    if (!card) throw new Error("Credit card not found");

    // Record as expense transaction linked to the credit card's account
    const txId = await ctx.db.insert("financeTransactions", {
      userId,
      accountId: args.accountId,
      type: "expense",
      amount: args.amount,
      currency: "INR",
      categoryId: args.categoryId,
      linkedCreditCardId: args.creditCardId,
      merchant: args.merchant,
      description: args.description,
      notes: args.notes,
      date: args.date,
      isRecurring: false,
      tags: args.tags,
      affectsBalance: false, // credit card spend doesn't affect bank balance
      createdAt: now,
      updatedAt: now,
    });

    // Update card balance
    const newBalance = card.currentBalance + args.amount;
    const newAvailable = Math.max(0, card.creditLimit - newBalance);
    await ctx.db.patch(args.creditCardId, {
      currentBalance: newBalance,
      availableCredit: newAvailable,
      updatedAt: now,
    });

    return txId;
  },
});

// ── Delete Credit Card ────────────────────────────────────────────────────────

export const deleteCreditCard = mutation({
  args: { id: v.id("financeCreditCards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});

// ── List Transactions for a Card ──────────────────────────────────────────────

export const listCardTransactions = query({
  args: {
    creditCardId: v.id("financeCreditCards"),
    limit: v.optional(v.number()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    let txns = await ctx.db
      .query("financeTransactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    txns = txns.filter((t) => t.linkedCreditCardId === args.creditCardId);
    if (args.startDate) txns = txns.filter((t) => t.date >= args.startDate!);
    if (args.endDate) txns = txns.filter((t) => t.date <= args.endDate!);
    return txns.slice(0, args.limit ?? 50);
  },
});
