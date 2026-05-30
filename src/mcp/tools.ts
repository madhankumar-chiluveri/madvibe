import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const TOOL_DEFINITIONS: McpTool[] = [
  // ── Workspaces ──────────────────────────────────────────────────────────────
  {
    name: "list_workspaces",
    description: "List all MadVibe workspaces the user owns or is a member of",
    inputSchema: { type: "object", properties: {} },
  },

  // ── Knowledge Base ──────────────────────────────────────────────────────────
  {
    name: "list_pages",
    description: "List all pages (documents, databases, dashboards) in a workspace",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Convex workspace ID" },
      },
      required: ["workspaceId"],
    },
  },
  {
    name: "search_pages",
    description: "Search pages by title within a workspace",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Convex workspace ID" },
        query: { type: "string", description: "Title search query" },
      },
      required: ["workspaceId", "query"],
    },
  },
  {
    name: "get_page_content",
    description: "Read the text content of a page/document by its page ID. Use this to see what's inside a page.",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Convex page ID" },
      },
      required: ["pageId"],
    },
  },
  {
    name: "create_page",
    description: "Create a new page in a workspace",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Convex workspace ID" },
        title: { type: "string", description: "Page title" },
        type: {
          type: "string",
          enum: ["document", "database", "dashboard"],
          description: "Page type (default: document)",
        },
        icon: { type: "string", description: "Optional emoji icon, e.g. 📝" },
      },
      required: ["workspaceId", "title"],
    },
  },

  // ── Databases ───────────────────────────────────────────────────────────────
  {
    name: "get_database_rows",
    description: "Get all rows from a MadVibe database using its database ID",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: { type: "string", description: "Convex database ID (from databases table)" },
      },
      required: ["databaseId"],
    },
  },
  {
    name: "get_database_rows_by_page",
    description: "Get all rows from a database-type page using its page ID. Use this when you have a page ID from list_pages — no need to know the internal database ID.",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Convex page ID of a database-type page" },
      },
      required: ["pageId"],
    },
  },

  // ── Finance / Ledger ────────────────────────────────────────────────────────
  {
    name: "get_finance_dashboard",
    description: "Get financial summary for a month: income, expenses, net worth, and top spending categories",
    inputSchema: {
      type: "object",
      properties: {
        month: { type: "string", description: "Month in YYYY-MM format, e.g. 2026-05" },
      },
      required: ["month"],
    },
  },
  {
    name: "list_accounts",
    description: "List all financial accounts in the ledger (bank, savings, credit, etc.)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_transactions",
    description: "List recent financial transactions with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max transactions (default 20)" },
        type: {
          type: "string",
          enum: ["income", "expense", "transfer", "investment"],
          description: "Filter by transaction type",
        },
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" },
      },
    },
  },
  {
    name: "list_budgets",
    description: "List all spending budgets set in the MadVibe ledger",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_goals",
    description: "List all financial savings goals",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_investments",
    description: "List all investment holdings tracked in the ledger",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_loans",
    description: "List loans — money lent to others or borrowed from others",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["active", "paid_off", "defaulted"],
          description: "Filter by loan status",
        },
        direction: {
          type: "string",
          enum: ["lent", "borrowed"],
          description: "Filter: lent = you gave money, borrowed = you owe money",
        },
      },
    },
  },

  // ── Habits ──────────────────────────────────────────────────────────────────
  {
    name: "list_habits",
    description: "List all active habits being tracked",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_todays_habits",
    description: "Get today's habit completion log showing which habits were done",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format (today's date)" },
      },
      required: ["date"],
    },
  },

  // ── Reminders ───────────────────────────────────────────────────────────────
  {
    name: "list_reminders",
    description: "List reminders in a workspace (scheduled, not yet completed)",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Convex workspace ID" },
        includeCompleted: { type: "boolean", description: "Include completed reminders" },
      },
      required: ["workspaceId"],
    },
  },
  {
    name: "create_reminder",
    description: "Create a new reminder in a workspace",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Convex workspace ID" },
        title: { type: "string", description: "Reminder title" },
        remindAt: {
          type: "number",
          description: "Unix timestamp in milliseconds when to trigger the reminder",
        },
        note: { type: "string", description: "Optional additional note" },
      },
      required: ["workspaceId", "title", "remindAt"],
    },
  },

  // ── News Feed ───────────────────────────────────────────────────────────────
  {
    name: "push_news_articles",
    description: "Push one or more news articles into the MadVibe feed. Use this to curate and publish articles into specific category tabs. Deduplicates by URL and title automatically.",
    inputSchema: {
      type: "object",
      properties: {
        articles: {
          type: "array",
          description: "Array of articles to push",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Article headline" },
              source: { type: "string", description: "Publication name, e.g. TechCrunch" },
              url: { type: "string", description: "Full article URL" },
              summary: { type: "string", description: "2-3 sentence summary" },
              category: {
                type: "string",
                enum: ["for_you", "ai_ml", "tech_it", "productivity", "must_know", "general"],
                description: "Which feed tab this article belongs to",
              },
              tags: { type: "array", items: { type: "string" }, description: "Topic tags" },
              sentiment: {
                type: "string",
                enum: ["positive", "neutral", "negative", "mixed"],
              },
              author: { type: "string" },
              thumbnailUrl: { type: "string" },
              content: { type: "string", description: "Full article text if available" },
              publishedAt: {
                type: "number",
                description: "Unix timestamp in milliseconds when article was published",
              },
            },
            required: ["title", "source", "url", "category", "publishedAt"],
          },
        },
      },
      required: ["articles"],
    },
  },
  {
    name: "get_news",
    description: "Get latest news articles from the MadVibe feed",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["for_you", "ai_ml", "tech_it", "productivity", "must_know", "general"],
          description: "Filter by category",
        },
        limit: { type: "number", description: "Max articles (default 10)" },
      },
    },
  },
];

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  client: ConvexHttpClient
): Promise<unknown> {
  switch (name) {
    // ── Workspaces ────────────────────────────────────────────────────────────
    case "list_workspaces":
      return await client.query(api.workspaces.listWorkspaces, {});

    // ── Knowledge Base ────────────────────────────────────────────────────────
    case "list_pages":
      return await client.query(api.pages.listAll, {
        workspaceId: args.workspaceId as Id<"workspaces">,
      });

    case "search_pages":
      return await client.query(api.pages.search, {
        workspaceId: args.workspaceId as Id<"workspaces">,
        query: args.query as string,
      });

    case "get_page_content":
      return await client.query(api.pages.getPageContent, {
        pageId: args.pageId as Id<"pages">,
      });

    case "create_page":
      return await client.mutation(api.pages.create, {
        workspaceId: args.workspaceId as Id<"workspaces">,
        title: args.title as string,
        type: args.type as "document" | "database" | "dashboard" | undefined,
        icon: args.icon as string | undefined,
      });

    // ── Databases ─────────────────────────────────────────────────────────────
    case "get_database_rows":
      return await client.query(api.databases.listRows, {
        databaseId: args.databaseId as Id<"databases">,
      });

    // ── Finance ───────────────────────────────────────────────────────────────
    case "get_finance_dashboard":
      return await client.query(api.ledger.getDashboardData, {
        month: args.month as string,
      });

    case "list_accounts":
      return await client.query(api.ledger.listAccounts, {});

    case "list_transactions":
      return await client.query(api.ledger.listTransactions, {
        limit: (args.limit as number | undefined) ?? 20,
        type: args.type as "income" | "expense" | "transfer" | "investment" | undefined,
        startDate: args.startDate as string | undefined,
        endDate: args.endDate as string | undefined,
      });

    case "list_budgets":
      return await client.query(api.ledger.listBudgets, {});

    case "list_goals":
      return await client.query(api.ledger.listGoals, {});

    case "list_investments":
      return await client.query(api.ledger.listInvestments, {});

    case "list_loans":
      return await client.query(api.ledgerLoans.listLoans, {
        status: args.status as any,
        direction: args.direction as "lent" | "borrowed" | undefined,
      });

    // ── Habits ────────────────────────────────────────────────────────────────
    case "list_habits":
      return await client.query(api.habits.listHabits, {});

    case "get_todays_habits":
      return await client.query(api.habits.getTodaysLogs, {
        date: args.date as string,
      });

    // ── Reminders ─────────────────────────────────────────────────────────────
    case "list_reminders":
      return await client.query(api.reminders.listByWorkspace, {
        workspaceId: args.workspaceId as Id<"workspaces">,
        includeCompleted: args.includeCompleted as boolean | undefined,
      });

    case "create_reminder":
      return await client.mutation(api.reminders.create, {
        workspaceId: args.workspaceId as Id<"workspaces">,
        title: args.title as string,
        remindAt: args.remindAt as number,
        note: args.note as string | undefined,
      });

    // ── News ──────────────────────────────────────────────────────────────────
    case "push_news_articles":
      return await client.mutation(api.feed.bulkUpsertArticles, {
        articles: (args.articles as Record<string, unknown>[]).map((a) => ({
          ...a,
          fetchedAt: Date.now(),
          publishedAt: a.publishedAt as number,
        })) as any,
      });

    case "get_news":
      return await client.query(api.feed.listArticles, {
        category: args.category as
          | "for_you" | "ai_ml" | "tech_it" | "productivity" | "must_know" | "general"
          | undefined,
        limit: (args.limit as number | undefined) ?? 10,
      });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
