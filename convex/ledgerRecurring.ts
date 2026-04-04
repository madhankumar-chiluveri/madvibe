import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import {
  financeRecurringFrequencyValidator,
  financeTransactionTypeValidator,
  shiftRecurringDate,
  getTodayDate,
  differenceInDays,
} from "./financeShared";

// ── List Recurring ────────────────────────────────────────────────────────────

export const listRecurring = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    let items = await ctx.db
      .query("financeRecurring")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    if (args.activeOnly !== false) items = items.filter((r) => r.isActive);
    const today = getTodayDate();
    return items.map((r) => ({
      ...r,
      daysUntilNext: differenceInDays(r.nextDueDate, today),
    }));
  },
});

// ── Create Recurring ──────────────────────────────────────────────────────────

export const createRecurring = mutation({
  args: {
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("financeRecurring", {
      userId,
      title: args.title,
      type: args.type,
      amount: args.amount,
      currency: args.currency ?? "INR",
      accountId: args.accountId,
      destinationAccountId: args.destinationAccountId,
      categoryId: args.categoryId,
      loanId: args.loanId,
      linkedCreditCardId: args.linkedCreditCardId,
      description: args.description,
      notes: args.notes,
      merchant: args.merchant,
      tags: args.tags,
      frequency: args.frequency,
      interval: args.interval ?? 1,
      startDate: args.startDate,
      endDate: args.endDate,
      nextDueDate: args.startDate,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ── Update Recurring ──────────────────────────────────────────────────────────

export const updateRecurring = mutation({
  args: {
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

// ── Delete Recurring ──────────────────────────────────────────────────────────

export const deleteRecurring = mutation({
  args: { id: v.id("financeRecurring") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});

// ── Process Due Recurring Transactions ───────────────────────────────────────

export const processRecurringTransactions = action({
  handler: async (ctx) => {
    const today = getTodayDate();

    // Get all active recurring items due today or overdue
    const allUsers = await ctx.runQuery(api.ledgerRecurring.getDueRecurring, { date: today });

    let processed = 0;
    for (const item of allUsers) {
      try {
        await ctx.runMutation(api.ledgerRecurring.createTransactionFromRecurring, {
          recurringId: item._id,
          date: today,
        });
        processed++;
      } catch (e) {
        console.error(`Failed to process recurring ${item._id}:`, e);
      }
    }
    return { processed, date: today };
  },
});

export const getDueRecurring = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    // Fetch all active recurring items where nextDueDate <= today
    const all = await ctx.db
      .query("financeRecurring")
      .filter((q) => q.and(q.eq(q.field("isActive"), true), q.lte(q.field("nextDueDate"), args.date)))
      .collect();
    return all;
  },
});

export const createTransactionFromRecurring = mutation({
  args: {
    recurringId: v.id("financeRecurring"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.recurringId);
    if (!item || !item.isActive) return;

    const now = Date.now();
    const txId = await ctx.db.insert("financeTransactions", {
      userId: item.userId,
      accountId: item.accountId,
      type: item.type,
      amount: item.amount,
      currency: item.currency,
      categoryId: item.categoryId,
      loanId: item.loanId,
      linkedCreditCardId: item.linkedCreditCardId,
      description: item.description,
      notes: item.notes,
      merchant: item.merchant,
      tags: item.tags,
      date: args.date,
      isRecurring: true,
      recurringId: args.recurringId,
      createdAt: now,
      updatedAt: now,
    });

    // Update account balance
    const account = await ctx.db.get(item.accountId);
    if (account) {
      const delta = item.type === "income" ? item.amount : -item.amount;
      await ctx.db.patch(item.accountId, { balance: account.balance + delta });
    }

    // Advance next due date
    const nextDue = shiftRecurringDate(item.nextDueDate, item.frequency, item.interval);
    const isExpired = item.endDate && nextDue > item.endDate;
    await ctx.db.patch(args.recurringId, {
      nextDueDate: nextDue,
      lastProcessedAt: now,
      isActive: !isExpired,
      updatedAt: now,
    });

    return txId;
  },
});
