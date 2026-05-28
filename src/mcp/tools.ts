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
  {
    name: "list_workspaces",
    description: "List all MadVibe workspaces the user owns or is a member of",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_pages",
    description: "List all pages (documents, databases, dashboards) in a MadVibe workspace",
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
    description: "Search pages by title within a MadVibe workspace",
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
    name: "create_page",
    description: "Create a new page in a MadVibe workspace",
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
  {
    name: "get_finance_dashboard",
    description: "Get financial summary for a month: income, expenses, net worth, and top spending categories",
    inputSchema: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "Month in YYYY-MM format, e.g. 2026-05",
        },
      },
      required: ["month"],
    },
  },
  {
    name: "list_transactions",
    description: "List recent financial transactions from the MadVibe ledger",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max transactions to return (default 20)" },
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
    name: "list_accounts",
    description: "List all financial accounts in the MadVibe ledger (bank accounts, savings, etc.)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_habits",
    description: "List all active habits being tracked in MadVibe",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_reminders",
    description: "List reminders in a MadVibe workspace",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Convex workspace ID" },
        includeCompleted: {
          type: "boolean",
          description: "Include completed reminders (default false)",
        },
      },
      required: ["workspaceId"],
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
    case "list_workspaces":
      return await client.query(api.workspaces.listWorkspaces, {});

    case "list_pages":
      return await client.query(api.pages.listAll, {
        workspaceId: args.workspaceId as Id<"workspaces">,
      });

    case "search_pages":
      return await client.query(api.pages.search, {
        workspaceId: args.workspaceId as Id<"workspaces">,
        query: args.query as string,
      });

    case "create_page":
      return await client.mutation(api.pages.create, {
        workspaceId: args.workspaceId as Id<"workspaces">,
        title: args.title as string,
        type: args.type as "document" | "database" | "dashboard" | undefined,
        icon: args.icon as string | undefined,
      });

    case "get_finance_dashboard":
      return await client.query(api.ledger.getDashboardData, {
        month: args.month as string,
      });

    case "list_transactions":
      return await client.query(api.ledger.listTransactions, {
        limit: (args.limit as number | undefined) ?? 20,
        type: args.type as "income" | "expense" | "transfer" | "investment" | undefined,
        startDate: args.startDate as string | undefined,
        endDate: args.endDate as string | undefined,
      });

    case "list_accounts":
      return await client.query(api.ledger.listAccounts, {});

    case "list_habits":
      return await client.query(api.habits.listHabits, {});

    case "list_reminders":
      return await client.query(api.reminders.listByWorkspace, {
        workspaceId: args.workspaceId as Id<"workspaces">,
        includeCompleted: args.includeCompleted as boolean | undefined,
      });

    case "get_news":
      return await client.query(api.feed.listArticles, {
        category: args.category as
          | "for_you"
          | "ai_ml"
          | "tech_it"
          | "productivity"
          | "must_know"
          | "general"
          | undefined,
        limit: (args.limit as number | undefined) ?? 10,
      });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
