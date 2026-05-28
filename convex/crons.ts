import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Feed is now populated by Claude via MCP push_news_articles tool.
// feedSync.ts and external news API keys (THE_NEWS_API_TOKEN, GNEWS_API_KEY) are no longer needed.

// Sync market prices every 15 minutes during market hours (IST 9:15-15:30)
// Convex crons run in UTC; IST = UTC+5:30, so 9:15 IST = 3:45 UTC, 15:30 IST = 10:00 UTC
// We run every 15 min and let the action check market state
crons.interval(
  "sync-market-prices",
  { minutes: 15 },
  api.marketData.syncUserInvestmentPrices,
  {},
);

// Sync market indices (Nifty, Sensex, Gold) every 15 minutes
crons.interval(
  "sync-market-indices",
  { minutes: 15 },
  api.marketData.fetchMarketIndices,
  {},
);

// Process recurring transactions daily at midnight UTC (5:30 AM IST)
crons.daily(
  "process-recurring-transactions",
  { hourUTC: 0, minuteUTC: 0 },
  api.ledgerRecurring.processRecurringTransactions,
  {},
);

// Process daily vehicle reminders (insurance, PUC, warranty) at midnight UTC
crons.daily(
  "garage-reminders",
  { hourUTC: 0, minuteUTC: 5 },
  api.garage.checkGarageReminders,
  {},
);

export default crons;
