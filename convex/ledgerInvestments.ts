import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  financeAssetTypeValidator,
  financeDividendTypeValidator,
  financeIpoStatusValidator,
  calculateXirr,
  getTodayDate,
  differenceInDays,
} from "./financeShared";

// ── Portfolio Summary ─────────────────────────────────────────────────────────

export const getPortfolioSummary = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const investments = await ctx.db
      .query("financeInvestments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    let totalInvested = 0;
    let totalCurrentValue = 0;

    const holdings = investments.map((inv) => {
      const invested = inv.quantity * inv.buyPrice;
      const current = inv.quantity * (inv.currentPrice ?? inv.buyPrice);
      const pnl = current - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      totalInvested += invested;
      totalCurrentValue += current;
      return { ...inv, invested, current, pnl, pnlPct };
    });

    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    // Simple XIRR — use all buy lots as negative cashflows + current value as final positive
    const cashflows = investments.map((inv) => ({
      amount: -(inv.quantity * inv.buyPrice),
      date: inv.buyDate,
    }));
    if (totalCurrentValue > 0) {
      cashflows.push({ amount: totalCurrentValue, date: getTodayDate() });
    }
    const xirr = calculateXirr(cashflows);

    return {
      totalInvested,
      totalCurrentValue,
      totalPnl,
      totalPnlPct,
      xirr,
      holdingCount: investments.length,
      holdings,
    };
  },
});

// ── Portfolio By Asset Class ──────────────────────────────────────────────────

export const getPortfolioByAssetClass = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const investments = await ctx.db
      .query("financeInvestments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const byClass: Record<string, { invested: number; current: number; count: number }> = {};
    for (const inv of investments) {
      const invested = inv.quantity * inv.buyPrice;
      const current = inv.quantity * (inv.currentPrice ?? inv.buyPrice);
      if (!byClass[inv.assetType]) {
        byClass[inv.assetType] = { invested: 0, current: 0, count: 0 };
      }
      byClass[inv.assetType].invested += invested;
      byClass[inv.assetType].current += current;
      byClass[inv.assetType].count += 1;
    }

    const totalCurrent = Object.values(byClass).reduce((s, v) => s + v.current, 0);
    return Object.entries(byClass).map(([assetType, data]) => ({
      assetType,
      ...data,
      pnl: data.current - data.invested,
      allocationPct: totalCurrent > 0 ? (data.current / totalCurrent) * 100 : 0,
    }));
  },
});

// ── Investment Lots ───────────────────────────────────────────────────────────

export const listInvestmentLots = query({
  args: { investmentId: v.id("financeInvestments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("financeInvestmentLots")
      .withIndex("by_investmentId", (q) => q.eq("investmentId", args.investmentId))
      .order("desc")
      .collect();
  },
});

export const addInvestmentLot = mutation({
  args: {
    investmentId: v.id("financeInvestments"),
    accountId: v.optional(v.id("financeAccounts")),
    quantity: v.number(),
    buyPrice: v.number(),
    buyDate: v.string(),
    fees: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    const investedAmount = args.quantity * args.buyPrice + (args.fees ?? 0);

    const lotId = await ctx.db.insert("financeInvestmentLots", {
      userId,
      investmentId: args.investmentId,
      accountId: args.accountId,
      quantity: args.quantity,
      remainingQuantity: args.quantity,
      buyPrice: args.buyPrice,
      investedAmount,
      buyDate: args.buyDate,
      fees: args.fees,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Update parent investment's aggregate quantity and buy price (weighted avg)
    const inv = await ctx.db.get(args.investmentId);
    if (inv) {
      const newQty = inv.quantity + args.quantity;
      const newAvgBuy = (inv.quantity * inv.buyPrice + args.quantity * args.buyPrice) / newQty;
      await ctx.db.patch(args.investmentId, { quantity: newQty, buyPrice: newAvgBuy, updatedAt: now });
    }
    return lotId;
  },
});

// ── Dividends ─────────────────────────────────────────────────────────────────

export const listDividends = query({
  args: { investmentId: v.optional(v.id("financeInvestments")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (args.investmentId) {
      return await ctx.db
        .query("financeDividends")
        .withIndex("by_investmentId", (q) => q.eq("investmentId", args.investmentId!))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("financeDividends")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const createDividend = mutation({
  args: {
    investmentId: v.id("financeInvestments"),
    amount: v.number(),
    currency: v.optional(v.string()),
    type: financeDividendTypeValidator,
    recordDate: v.string(),
    payoutDate: v.optional(v.string()),
    taxWithheld: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("financeDividends", {
      userId,
      investmentId: args.investmentId,
      amount: args.amount,
      currency: args.currency ?? "INR",
      type: args.type,
      recordDate: args.recordDate,
      payoutDate: args.payoutDate,
      taxWithheld: args.taxWithheld,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

export const deleteDividend = mutation({
  args: { id: v.id("financeDividends") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});

// ── IPOs ──────────────────────────────────────────────────────────────────────

export const listIPOs = query({
  args: { status: v.optional(financeIpoStatusValidator) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    // Return global IPOs (no userId) + user's personal watchlist
    const all = await ctx.db.query("financeIPOs").collect();
    let filtered = all.filter((ipo) => !ipo.userId || ipo.userId === userId);
    if (args.status) filtered = filtered.filter((ipo) => ipo.status === args.status);
    return filtered.sort((a, b) => (b.createdAt - a.createdAt));
  },
});

export const createIPO = mutation({
  args: {
    companyName: v.string(),
    symbol: v.optional(v.string()),
    exchange: v.optional(v.string()),
    status: financeIpoStatusValidator,
    openDate: v.optional(v.string()),
    closeDate: v.optional(v.string()),
    lotSize: v.optional(v.number()),
    priceBandMin: v.optional(v.number()),
    priceBandMax: v.optional(v.number()),
    gmp: v.optional(v.number()),
    expectedListingDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("financeIPOs", {
      userId,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateIPO = mutation({
  args: {
    id: v.id("financeIPOs"),
    status: v.optional(financeIpoStatusValidator),
    gmp: v.optional(v.number()),
    subscriptionStatus: v.optional(v.string()),
    expectedListingDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteIPO = mutation({
  args: { id: v.id("financeIPOs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});

// ── Goal Projection ───────────────────────────────────────────────────────────

export const getGoalProjection = query({
  args: { goalId: v.id("financeGoals") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) return null;

    const remaining = goal.targetAmount - goal.currentAmount;
    const daysToTarget = goal.targetDate ? differenceInDays(goal.targetDate) : null;

    // Calculate avg monthly savings from last 3 months
    const now = new Date();
    let totalSavings = 0;
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const startDate = `${d.getFullYear()}-${mm}-01`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const endDate = `${d.getFullYear()}-${mm}-${String(lastDay).padStart(2, "0")}`;
      const txns = await ctx.db
        .query("financeTransactions")
        .withIndex("by_userId_date", (q) => q.eq("userId", userId).gte("date", startDate))
        .filter((q) => q.lte(q.field("date"), endDate))
        .collect();
      const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expenses = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      totalSavings += Math.max(0, income - expenses);
    }
    const avgMonthlySavings = totalSavings / 3;
    const monthsToGoal = avgMonthlySavings > 0 ? remaining / avgMonthlySavings : null;
    const projectedDate = monthsToGoal != null
      ? new Date(now.getFullYear(), now.getMonth() + Math.ceil(monthsToGoal), 1).toISOString().slice(0, 10)
      : null;

    return {
      goal,
      remaining,
      daysToTarget,
      avgMonthlySavings,
      monthsToGoal,
      projectedDate,
      onTrack: daysToTarget != null && monthsToGoal != null
        ? monthsToGoal * 30 <= daysToTarget
        : null,
    };
  },
});
