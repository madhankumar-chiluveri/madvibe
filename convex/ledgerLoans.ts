import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  financeLoanDirectionValidator,
  financeLoanStatusValidator,
  differenceInDays,
  getTodayDate,
} from "./financeShared";

// ── List Loans ────────────────────────────────────────────────────────────────

export const listLoans = query({
  args: {
    status: v.optional(financeLoanStatusValidator),
    direction: v.optional(financeLoanDirectionValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    let loans = await ctx.db
      .query("financeLoans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    if (args.status) loans = loans.filter((l) => l.status === args.status);
    if (args.direction) loans = loans.filter((l) => l.direction === args.direction);

    // Attach overdue flag and days overdue
    const today = getTodayDate();
    return loans.map((l) => ({
      ...l,
      daysOverdue: l.dueDate && l.status === "active" ? Math.max(0, -differenceInDays(l.dueDate, today)) : 0,
      daysUntilDue: l.dueDate ? differenceInDays(l.dueDate, today) : null,
    }));
  },
});

// ── Loan Summary ──────────────────────────────────────────────────────────────

export const getLoanSummary = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const loans = await ctx.db
      .query("financeLoans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const active = loans.filter((l) => l.status === "active" || l.status === "partially_paid" || l.status === "overdue");
    const totalLent = active.filter((l) => l.direction === "lent").reduce((s, l) => s + l.currentBalance, 0);
    const totalBorrowed = active.filter((l) => l.direction === "borrowed").reduce((s, l) => s + l.currentBalance, 0);
    const overdue = active.filter((l) => l.status === "overdue").length;

    return { totalLent, totalBorrowed, overdue, activeCount: active.length };
  },
});

// ── Create Loan ───────────────────────────────────────────────────────────────

export const createLoan = mutation({
  args: {
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    const loanId = await ctx.db.insert("financeLoans", {
      userId,
      direction: args.direction,
      counterpartyName: args.counterpartyName,
      principalAmount: args.principalAmount,
      currentBalance: args.principalAmount,
      currency: args.currency ?? "INR",
      issuedDate: args.issuedDate,
      dueDate: args.dueDate,
      status: "active",
      linkedAccountId: args.linkedAccountId,
      interestRate: args.interestRate,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // If linked account, create a corresponding transaction
    if (args.linkedAccountId) {
      const account = await ctx.db.get(args.linkedAccountId);
      if (account) {
        const txType = args.direction === "lent" ? "expense" : "income";
        const delta = args.direction === "lent" ? -args.principalAmount : args.principalAmount;
        await ctx.db.insert("financeTransactions", {
          userId,
          accountId: args.linkedAccountId,
          type: txType,
          amount: args.principalAmount,
          currency: args.currency ?? "INR",
          loanId: loanId,
          description: args.direction === "lent"
            ? `Lent to ${args.counterpartyName}`
            : `Borrowed from ${args.counterpartyName}`,
          notes: args.notes,
          date: args.issuedDate,
          isRecurring: false,
          affectsBalance: true,
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.patch(args.linkedAccountId, { balance: account.balance + delta });
      }
    }
    return loanId;
  },
});

// ── Update Loan ───────────────────────────────────────────────────────────────

export const updateLoan = mutation({
  args: {
    id: v.id("financeLoans"),
    counterpartyName: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    status: v.optional(financeLoanStatusValidator),
    interestRate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

// ── Record Repayment ──────────────────────────────────────────────────────────

export const recordLoanRepayment = mutation({
  args: {
    loanId: v.id("financeLoans"),
    amount: v.number(),
    date: v.string(),
    accountId: v.optional(v.id("financeAccounts")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new Error("Loan not found");

    const now = Date.now();
    const newBalance = Math.max(0, loan.currentBalance - args.amount);
    const newStatus = newBalance === 0 ? "settled" : newBalance < loan.principalAmount ? "partially_paid" : loan.status;

    await ctx.db.patch(args.loanId, {
      currentBalance: newBalance,
      status: newStatus,
      updatedAt: now,
    });

    // Record repayment transaction if account provided
    if (args.accountId) {
      const account = await ctx.db.get(args.accountId);
      if (account) {
        const txType = loan.direction === "lent" ? "income" : "expense";
        const delta = loan.direction === "lent" ? args.amount : -args.amount;
        await ctx.db.insert("financeTransactions", {
          userId,
          accountId: args.accountId,
          type: txType,
          amount: args.amount,
          currency: loan.currency,
          loanId: args.loanId,
          description: loan.direction === "lent"
            ? `Repayment from ${loan.counterpartyName}`
            : `Repayment to ${loan.counterpartyName}`,
          notes: args.notes,
          date: args.date,
          isRecurring: false,
          affectsBalance: true,
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.patch(args.accountId, { balance: account.balance + delta });
      }
    }
  },
});

// ── Delete Loan ───────────────────────────────────────────────────────────────

export const deleteLoan = mutation({
  args: { id: v.id("financeLoans") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});
