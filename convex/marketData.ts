import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { financeMarketAssetTypeValidator } from "./financeShared";

// ── Fetch Single Market Price ─────────────────────────────────────────────────
// Uses Yahoo Finance unofficial API (no key required) and MFAPI for mutual funds,
// CoinGecko for crypto — all free, no API key needed.

export const fetchMarketPrice = action({
  args: {
    symbol: v.string(),
    assetType: financeMarketAssetTypeValidator,
  },
  handler: async (ctx, args): Promise<{ price: number; change?: number; changePercent?: number; source: string } | null> => {
    const symbol = args.symbol.trim().toUpperCase();

    try {
      if (args.assetType === "crypto") {
        // CoinGecko — free, no key, 50 req/min
        const cgId = CRYPTO_COINGECKO_IDS[symbol] ?? symbol.toLowerCase();
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=inr&include_24hr_change=true`,
          { headers: { "Accept": "application/json" } }
        );
        if (!res.ok) return null;
        const data = await res.json() as Record<string, { inr?: number; inr_24h_change?: number }>;
        const entry = data[cgId];
        if (!entry?.inr) return null;
        return {
          price: entry.inr,
          changePercent: entry.inr_24h_change,
          source: "coingecko",
        };
      }

      if (args.assetType === "mutual_fund") {
        // MFAPI.in — completely free, no key
        // symbol should be the scheme code (e.g. "118989" for Axis Bluechip)
        const res = await fetch(`https://api.mfapi.in/mf/${symbol}/latest`);
        if (!res.ok) return null;
        const data = await res.json() as { data?: { nav: string }[] };
        const nav = parseFloat(data?.data?.[0]?.nav ?? "");
        if (isNaN(nav)) return null;
        return { price: nav, source: "mfapi" };
      }

      // Stocks, ETF, indices — Yahoo Finance (unofficial, free)
      // For Indian stocks append .NS (NSE) or .BO (BSE)
      let yahooSymbol = symbol;
      if (args.assetType === "stock" || args.assetType === "etf") {
        if (!symbol.includes(".") && !symbol.includes("^")) {
          yahooSymbol = `${symbol}.NS`; // default to NSE
        }
      }

      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (!res.ok) return null;
      const json = await res.json() as {
        chart?: {
          result?: Array<{
            meta?: { regularMarketPrice?: number; previousClose?: number; currency?: string; shortName?: string };
          }>;
        };
      };
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) return null;

      const price = meta.regularMarketPrice;
      const prevClose = meta.previousClose ?? price;
      const change = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

      return { price, change, changePercent, source: "yahoo" };
    } catch (e) {
      console.error(`marketData.fetchMarketPrice error for ${symbol}:`, e);
      return null;
    }
  },
});

// ── Sync Prices for All User Investments ─────────────────────────────────────

export const syncUserInvestmentPrices = action({
  handler: async (ctx) => {
    const investments = await ctx.runQuery(api.ledger.listInvestments);
    let updated = 0;

    for (const inv of investments) {
      if (!inv.symbol) continue;
      const result = await ctx.runAction(api.marketData.fetchMarketPrice, {
        symbol: inv.symbol,
        assetType: inv.assetType as any,
      });
      if (result) {
        await ctx.runMutation(api.marketData.upsertMarketData, {
          symbol: inv.symbol,
          assetType: inv.assetType,
          price: result.price,
          change: result.change,
          changePercent: result.changePercent,
          source: result.source,
          currency: "INR",
        });
        // Patch the investment currentPrice too
        await ctx.runMutation(api.ledger.updateInvestment, {
          id: inv._id,
          currentPrice: result.price,
        });
        updated++;
      }
    }
    return { updated };
  },
});

// ── Fetch Market Indices ──────────────────────────────────────────────────────

export const fetchMarketIndices = action({
  handler: async (ctx) => {
    const INDICES = [
      { symbol: "^NSEI", name: "Nifty 50", assetType: "index" as const },
      { symbol: "^BSESN", name: "Sensex", assetType: "index" as const },
      { symbol: "^NSMIDCP", name: "Nifty Midcap", assetType: "index" as const },
      { symbol: "GC=F", name: "Gold (USD)", assetType: "commodity" as const },
    ];

    for (const idx of INDICES) {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(idx.symbol)}?interval=1d&range=2d`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        if (!res.ok) continue;
        const json = await res.json() as {
          chart?: {
            result?: Array<{
              meta?: { regularMarketPrice?: number; previousClose?: number; shortName?: string };
            }>;
          };
        };
        const meta = json?.chart?.result?.[0]?.meta;
        if (!meta?.regularMarketPrice) continue;
        const price = meta.regularMarketPrice;
        const prevClose = meta.previousClose ?? price;
        const change = price - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

        await ctx.runMutation(api.marketData.upsertMarketData, {
          symbol: idx.symbol,
          assetType: idx.assetType,
          displayName: idx.name,
          price,
          change,
          changePercent,
          source: "yahoo",
          currency: "INR",
        });
      } catch (e) {
        console.error(`Failed to fetch index ${idx.symbol}:`, e);
      }
    }
  },
});

// ── Upsert Market Data ────────────────────────────────────────────────────────

export const upsertMarketData = mutation({
  args: {
    symbol: v.string(),
    assetType: financeMarketAssetTypeValidator,
    displayName: v.optional(v.string()),
    exchange: v.optional(v.string()),
    price: v.number(),
    change: v.optional(v.number()),
    changePercent: v.optional(v.number()),
    source: v.string(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const TTL_MS = 15 * 60 * 1000; // 15 minutes

    const existing = await ctx.db
      .query("financeMarketData")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        price: args.price,
        change: args.change,
        changePercent: args.changePercent,
        source: args.source,
        fetchedAt: now,
        expiresAt: now + TTL_MS,
        displayName: args.displayName ?? existing.displayName,
      });
    } else {
      await ctx.db.insert("financeMarketData", {
        symbol: args.symbol,
        assetType: args.assetType,
        displayName: args.displayName,
        exchange: args.exchange,
        currency: args.currency,
        price: args.price,
        change: args.change,
        changePercent: args.changePercent,
        source: args.source,
        fetchedAt: now,
        expiresAt: now + TTL_MS,
      });
    }
  },
});

// ── Get Market Data ───────────────────────────────────────────────────────────

export const getMarketData = query({
  args: { symbols: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results: Record<string, { price: number; change?: number; changePercent?: number; fetchedAt: number; source: string }> = {};
    for (const sym of args.symbols) {
      const entry = await ctx.db
        .query("financeMarketData")
        .withIndex("by_symbol", (q) => q.eq("symbol", sym))
        .first();
      if (entry) {
        results[sym] = {
          price: entry.price,
          change: entry.change,
          changePercent: entry.changePercent,
          fetchedAt: entry.fetchedAt,
          source: entry.source,
        };
      }
    }
    return results;
  },
});

export const getMarketIndices = query({
  handler: async (ctx) => {
    const SYMBOLS = ["^NSEI", "^BSESN", "^NSMIDCP", "GC=F"];
    const results = [];
    for (const sym of SYMBOLS) {
      const entry = await ctx.db
        .query("financeMarketData")
        .withIndex("by_symbol", (q) => q.eq("symbol", sym))
        .first();
      if (entry) results.push(entry);
    }
    return results;
  },
});

// ── Crypto symbol → CoinGecko ID mapping ─────────────────────────────────────

const CRYPTO_COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  ADA: "cardano",
  XRP: "ripple",
  DOT: "polkadot",
  DOGE: "dogecoin",
  MATIC: "matic-network",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  LTC: "litecoin",
  ATOM: "cosmos",
  UNI: "uniswap",
  NEAR: "near",
};
