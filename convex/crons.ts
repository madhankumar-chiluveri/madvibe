import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Refresh FEED stories every 2 hours; opening the feed also triggers a freshness-aware sync.
crons.interval(
  "sync-latest-feed",
  { hours: 2 },
  api.feedSync.fetchAndProcessFeed,
  {},
);

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

export default crons;
