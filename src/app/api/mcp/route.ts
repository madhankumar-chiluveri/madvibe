import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { adminQuery, adminMutation } from "@/mcp/convex-admin";
import { TOOL_DEFINITIONS } from "@/mcp/tools";

export const maxDuration = 60;

function extractApiKey(req: NextRequest): string | null {
  const qKey = req.nextUrl.searchParams.get("key");
  if (qKey) return qKey;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || null;
  return null;
}

async function resolveUserId(plainKey: string): Promise<string | null> {
  const keyHash = createHash("sha256").update(plainKey).digest("hex");
  return await adminQuery("mcpService:resolveApiKey", { keyHash }) as string | null;
}

async function dispatch(
  userId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const q = (fn: string, a: Record<string, unknown>) =>
    adminQuery(`mcpService:${fn}`, a);
  const m = (fn: string, a: Record<string, unknown>) =>
    adminMutation(`mcpService:${fn}`, a);

  switch (toolName) {
    case "list_workspaces":
      return q("listWorkspaces", { userId });

    case "list_pages":
      return q("listAllPages", { userId, workspaceId: args.workspaceId });

    case "search_pages":
      return q("searchPages", { userId, workspaceId: args.workspaceId, query: args.query });

    case "get_page_content":
      return q("getPageContent", { userId, pageId: args.pageId });

    case "create_page":
      return m("createPage", {
        userId,
        workspaceId: args.workspaceId,
        title: args.title,
        type: args.type,
        icon: args.icon,
      });

    case "get_database_rows":
      return q("getDatabaseRows", { userId, databaseId: args.databaseId });

    case "get_finance_dashboard":
      return q("getFinanceDashboard", { userId, month: args.month });

    case "list_accounts":
      return q("listAccounts", { userId });

    case "list_transactions":
      return q("listTransactions", {
        userId,
        limit: args.limit ?? 20,
        type: args.type,
        startDate: args.startDate,
        endDate: args.endDate,
      });

    case "list_budgets":
      return q("listBudgets", { userId });

    case "list_goals":
      return q("listGoals", { userId });

    case "list_investments":
      return q("listInvestments", { userId });

    case "list_loans":
      return q("listLoans", { userId, status: args.status, direction: args.direction });

    case "list_habits":
      return q("listHabits", { userId });

    case "get_todays_habits":
      return q("getTodaysHabits", { userId, date: args.date });

    case "list_reminders":
      return q("listReminders", {
        userId,
        workspaceId: args.workspaceId,
        includeCompleted: args.includeCompleted,
      });

    case "create_reminder":
      return m("createReminder", {
        userId,
        workspaceId: args.workspaceId,
        title: args.title,
        remindAt: args.remindAt,
        note: args.note,
      });

    case "push_news_articles":
      return m("pushNewsArticles", { articles: args.articles });

    case "get_news":
      return q("getNews", { category: args.category, limit: args.limit ?? 10 });

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

function ok(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: "2.0", result, id });
}

function err(id: unknown, code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", error: { code, message }, id });
}

export async function POST(req: NextRequest) {
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    return err(null, -32001, "Unauthorized. Get connector URL from /api/mcp/token while signed in.");
  }

  const userId = await resolveUserId(apiKey);
  if (!userId) {
    return err(null, -32001, "Invalid or revoked API key. Regenerate at /api/mcp/token.");
  }

  let body: { method?: string; params?: Record<string, unknown>; id?: unknown };
  try {
    body = await req.json();
  } catch {
    return err(null, -32700, "Parse error: invalid JSON");
  }

  const { method, params = {}, id } = body;

  try {
    switch (method) {
      case "initialize":
        return ok(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "madvibe", version: "1.0.0" },
        });

      case "notifications/initialized":
        return new Response(null, { status: 204 });

      case "ping":
        return ok(id, {});

      case "tools/list":
        return ok(id, { tools: TOOL_DEFINITIONS });

      case "tools/call": {
        const toolName = (params as any).name as string;
        const toolArgs = (params as any).arguments ?? {};
        if (!toolName) return err(id, -32602, "Missing tool name");
        const result = await dispatch(userId, toolName, toolArgs);
        return ok(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      }

      default:
        return err(id, -32601, `Method not found: ${method}`);
    }
  } catch (e: unknown) {
    return err(id, -32603, e instanceof Error ? e.message : "Internal error");
  }
}

export async function GET() {
  return Response.json({
    name: "MadVibe MCP Server",
    version: "1.0.0",
    auth: "Persistent API key — visit /api/mcp/token while signed in",
    tools: TOOL_DEFINITIONS.map((t) => t.name),
  });
}
