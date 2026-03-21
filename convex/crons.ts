import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Fetch and process tech news every 3 hours
crons.interval(
  "sync-latest-news",
  { hours: 3 },
  api.newsSync.fetchAndProcessNews,
);

export default crons;
