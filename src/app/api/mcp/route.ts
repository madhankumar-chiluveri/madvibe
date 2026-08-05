import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { adminQuery, adminMutation } from "@/mcp/convex-admin";
import { TOOL_DEFINITIONS } from "@/mcp/tools";

export const maxDuration = 60;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
};

// CORS preflight — required for Perplexity and browser-based MCP clients
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

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
    // ── Workspaces ────────────────────────────────────────────────────────────
    case "list_workspaces":
      return q("listWorkspaces", { userId });

    // ── Knowledge Base ────────────────────────────────────────────────────────
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
        parentId: args.parentId,
      });

    case "update_page":
      return m("updatePage", {
        userId,
        id: args.id,
        title: args.title,
        icon: args.icon,
        coverImage: args.coverImage,
        isFullWidth: args.isFullWidth,
        isFavourite: args.isFavourite,
      });

    case "archive_page":
      return m("archivePage", { userId, id: args.id });

    case "restore_page":
      return m("restorePage", { userId, id: args.id });

    case "remove_page":
      return m("removePage", { userId, id: args.id });

    case "move_page":
      return m("movePage", {
        userId,
        id: args.id,
        newParentId: args.newParentId,
        sortOrder: args.sortOrder,
      });

    case "reorder_page":
      return m("reorderPage", {
        userId,
        id: args.id,
        newParentId: args.newParentId,
        targetIndex: args.targetIndex,
      });

    case "get_page_ancestors":
      return q("getAncestors", { userId, id: args.id });

    case "list_subpages":
      return q("listSubpages", {
        userId,
        workspaceId: args.workspaceId,
        parentId: args.parentId,
      });

    case "list_space_roots":
      return q("listSpaceRoots", { userId, workspaceId: args.workspaceId });

    case "list_favourite_pages":
      return q("listFavourites", { userId, workspaceId: args.workspaceId });

    case "list_archived_pages":
      return q("listArchived", { userId, workspaceId: args.workspaceId });

    // ── Databases ─────────────────────────────────────────────────────────────
    case "create_database":
      return m("createDatabase", {
        userId,
        pageId: args.pageId,
        name: args.name,
        properties: args.properties,
      });

    case "update_database_properties":
      return m("updateProperties", {
        userId,
        id: args.id,
        properties: args.properties,
      });

    case "get_database_rows":
      return q("getDatabaseRows", { userId, databaseId: args.databaseId });

    case "get_database_rows_by_page":
      return q("getDatabaseRowsByPage", { userId, pageId: args.pageId });

    case "list_database_rows":
      return q("listRows", { userId, databaseId: args.databaseId });

    case "add_database_row":
      return m("addRow", {
        userId,
        databaseId: args.databaseId,
        data: args.data,
        pageId: args.pageId,
        sortOrder: args.sortOrder,
      });

    case "update_database_row":
      return m("updateRow", {
        userId,
        id: args.id,
        data: args.data,
      });

    case "reorder_database_row":
      return m("reorderRow", {
        userId,
        id: args.id,
        targetIndex: args.targetIndex,
      });

    case "delete_database_row":
      return m("deleteRow", {
        userId,
        id: args.id,
      });

    case "list_database_views":
      return q("listViews", { userId, databaseId: args.databaseId });

    case "create_database_view":
      return m("createView", {
        userId,
        databaseId: args.databaseId,
        name: args.name,
        type: args.type,
      });

    case "update_database_view":
      return m("updateView", {
        userId,
        id: args.id,
        name: args.name,
        type: args.type,
        filters: args.filters,
        sorts: args.sorts,
        groupBy: args.groupBy,
        visibleProperties: args.visibleProperties,
        cardCoverPropertyId: args.cardCoverPropertyId,
      });

    case "import_csv":
      return m("importCsv", {
        userId,
        workspaceId: args.workspaceId,
        parentId: args.parentId,
        name: args.name,
        properties: args.properties,
        rows: args.rows,
      });

    // ── Finance / Ledger ────────────────────────────────────────────────────────
    case "get_finance_dashboard":
      return q("getFinanceDashboard", { userId, month: args.month });

    case "list_accounts":
      return q("listAccounts", { userId });

    case "list_transactions":
      return q("listTransactions", {
        userId,
        limit: args.limit ?? 20,
        type: args.type,
        accountId: args.accountId,
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

    case "create_finance_account":
      return m("createAccount", {
        userId,
        name: args.name,
        type: args.type,
        currency: args.currency,
        balance: args.balance,
        institution: args.institution,
        accountNumberLast4: args.accountNumberLast4,
        notes: args.notes,
        color: args.color,
      });

    case "update_finance_account":
      return m("updateAccount", {
        userId,
        id: args.id,
        name: args.name,
        type: args.type,
        currency: args.currency,
        balance: args.balance,
        institution: args.institution,
        isActive: args.isActive,
        creditLimit: args.creditLimit,
        billingDay: args.billingDay,
        dueDay: args.dueDay,
        color: args.color,
        notes: args.notes,
        accountNumberLast4: args.accountNumberLast4,
      });

    case "delete_finance_account":
      return m("deleteAccount", { userId, id: args.id });

    case "create_finance_transaction":
      return m("createTransaction", {
        userId,
        accountId: args.accountId,
        type: args.type,
        amount: args.amount,
        categoryId: args.categoryId,
        merchant: args.merchant,
        description: args.description,
        notes: args.notes,
        date: args.date,
        isRecurring: args.isRecurring,
        tags: args.tags,
      });

    case "update_finance_transaction":
      return m("updateTransaction", {
        userId,
        id: args.id,
        description: args.description,
        categoryId: args.categoryId,
        merchant: args.merchant,
        notes: args.notes,
        tags: args.tags,
      });

    case "delete_finance_transaction":
      return m("deleteTransaction", { userId, id: args.id });

    case "transfer_between_accounts":
      return m("transferBetweenAccounts", {
        userId,
        fromAccountId: args.fromAccountId,
        toAccountId: args.toAccountId,
        amount: args.amount,
        description: args.description,
        date: args.date,
        notes: args.notes,
        linkedCreditCardId: args.linkedCreditCardId,
      });

    case "set_finance_budget":
      return m("setBudget", {
        userId,
        categoryId: args.categoryId,
        amount: args.amount,
        period: args.period,
        rollover: args.rollover,
      });

    case "update_finance_budget":
      return m("updateBudget", {
        userId,
        id: args.id,
        amount: args.amount,
        period: args.period,
        rollover: args.rollover,
        alertThresholds: args.alertThresholds,
      });

    case "delete_finance_budget":
      return m("deleteBudget", { userId, id: args.id });

    case "create_finance_investment":
      return m("createInvestment", {
        userId,
        assetType: args.assetType,
        symbol: args.symbol,
        name: args.name,
        quantity: args.quantity,
        buyPrice: args.buyPrice,
        buyDate: args.buyDate,
        platform: args.platform,
        isSip: args.isSip,
        sipAmount: args.sipAmount,
        notes: args.notes,
      });

    case "update_finance_investment":
      return m("updateInvestment", {
        userId,
        id: args.id,
        name: args.name,
        quantity: args.quantity,
        currentPrice: args.currentPrice,
        platform: args.platform,
        isSip: args.isSip,
        sipAmount: args.sipAmount,
        sipDay: args.sipDay,
        notes: args.notes,
        dividendYield: args.dividendYield,
        taxType: args.taxType,
      });

    case "delete_finance_investment":
      return m("deleteInvestment", { userId, id: args.id });

    case "create_finance_goal":
      return m("createGoal", {
        userId,
        name: args.name,
        targetAmount: args.targetAmount,
        targetDate: args.targetDate,
        priority: args.priority,
      });

    case "update_finance_goal":
      return m("updateGoal", {
        userId,
        id: args.id,
        name: args.name,
        targetAmount: args.targetAmount,
        targetDate: args.targetDate,
        priority: args.priority,
        strategy: args.strategy,
        notes: args.notes,
        linkedAccountId: args.linkedAccountId,
        autoContribute: args.autoContribute,
      });

    case "update_finance_goal_progress":
      return m("updateGoalProgress", {
        userId,
        id: args.id,
        currentAmount: args.currentAmount,
      });

    case "delete_finance_goal":
      return m("deleteGoal", { userId, id: args.id });

    case "list_finance_categories":
      return q("listCategories", { userId, type: args.type });

    case "create_finance_category":
      return m("createCategory", {
        userId,
        name: args.name,
        icon: args.icon,
        color: args.color,
        type: args.type,
        parentId: args.parentId,
      });

    case "get_finance_budget_progress":
      return q("getBudgetProgress", { userId, month: args.month });

    case "get_cashflow_history":
      return q("getCashflowHistory", { userId, months: args.months });

    case "list_credit_cards":
      return q("listCreditCards", { userId });

    case "get_credit_card_stats":
      return q("getCreditCardStats", { userId });

    case "list_card_transactions":
      return q("listCardTransactions", {
        userId,
        creditCardId: args.creditCardId,
        limit: args.limit,
        startDate: args.startDate,
        endDate: args.endDate,
      });

    case "create_credit_card":
      return m("createCreditCard", {
        userId,
        accountId: args.accountId,
        issuer: args.issuer,
        network: args.network,
        cardName: args.cardName,
        lastFour: args.lastFour,
        creditLimit: args.creditLimit,
        billingDay: args.billingDay,
        dueDay: args.dueDay,
        rewardProgram: args.rewardProgram,
        autoPayAccountId: args.autoPayAccountId,
        cardNumber: args.cardNumber,
        expiryMonth: args.expiryMonth,
        expiryYear: args.expiryYear,
        cvv: args.cvv,
      });

    case "update_credit_card":
      return m("updateCreditCard", {
        userId,
        id: args.id,
        issuer: args.issuer,
        cardName: args.cardName,
        creditLimit: args.creditLimit,
        statementBalance: args.statementBalance,
        currentBalance: args.currentBalance,
        billingDay: args.billingDay,
        dueDay: args.dueDay,
        minimumDue: args.minimumDue,
        dueDate: args.dueDate,
        lastStatementDate: args.lastStatementDate,
        rewardPoints: args.rewardPoints,
        rewardProgram: args.rewardProgram,
        autoPayAccountId: args.autoPayAccountId,
      });

    case "record_card_spend":
      return m("recordCardSpend", {
        userId,
        creditCardId: args.creditCardId,
        accountId: args.accountId,
        amount: args.amount,
        description: args.description,
        merchant: args.merchant,
        categoryId: args.categoryId,
        date: args.date,
        notes: args.notes,
        tags: args.tags,
      });

    case "delete_credit_card":
      return m("deleteCreditCard", { userId, id: args.id });

    case "delete_card_transaction":
      return m("deleteCardTransaction", { userId, id: args.id });

    case "get_loan_summary":
      return q("getLoanSummary", { userId });

    case "create_loan":
      return m("createLoan", {
        userId,
        direction: args.direction,
        counterpartyName: args.counterpartyName,
        principalAmount: args.principalAmount,
        currency: args.currency,
        issuedDate: args.issuedDate,
        dueDate: args.dueDate,
        linkedAccountId: args.linkedAccountId,
        interestRate: args.interestRate,
        notes: args.notes,
      });

    case "update_loan":
      return m("updateLoan", {
        userId,
        id: args.id,
        counterpartyName: args.counterpartyName,
        dueDate: args.dueDate,
        status: args.status,
        interestRate: args.interestRate,
        notes: args.notes,
      });

    case "record_loan_repayment":
      return m("recordLoanRepayment", {
        userId,
        loanId: args.loanId,
        amount: args.amount,
        date: args.date,
        accountId: args.accountId,
        notes: args.notes,
      });

    case "delete_loan":
      return m("deleteLoan", { userId, id: args.id });

    case "list_recurring_transactions":
      return q("listRecurring", { userId, activeOnly: args.activeOnly });

    case "create_recurring_transaction":
      return m("createRecurring", {
        userId,
        title: args.title,
        type: args.type,
        amount: args.amount,
        currency: args.currency,
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
        interval: args.interval,
        startDate: args.startDate,
        endDate: args.endDate,
      });

    case "update_recurring_transaction":
      return m("updateRecurring", {
        userId,
        id: args.id,
        title: args.title,
        amount: args.amount,
        categoryId: args.categoryId,
        description: args.description,
        notes: args.notes,
        endDate: args.endDate,
        isActive: args.isActive,
        nextDueDate: args.nextDueDate,
      });

    case "delete_recurring_transaction":
      return m("deleteRecurring", { userId, id: args.id });

    // ── Habits ────────────────────────────────────────────────────────────────
    case "list_habits":
      return q("listHabits", { userId });

    case "get_todays_habits":
      return q("getTodaysHabits", { userId, date: args.date });

    case "get_weekly_habit_logs":
      return q("getWeeklyHabitLogs", { userId, startDate: args.startDate, endDate: args.endDate });

    case "create_habit":
      return m("createHabit", {
        userId,
        name: args.name,
        icon: args.icon,
        color: args.color,
        frequency: args.frequency,
        customDays: args.customDays,
      });

    case "log_habit":
      return m("logHabit", {
        userId,
        habitId: args.habitId,
        date: args.date,
        completed: args.completed,
      });

    case "delete_habit":
      return m("deleteHabit", { userId, id: args.id });

    // ── Reminders ─────────────────────────────────────────────────────────────
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

    case "update_reminder":
      return m("updateReminder", {
        userId,
        id: args.id,
        title: args.title,
        note: args.note,
        remindAt: args.remindAt,
        sourceLabel: args.sourceLabel,
        sourceUrl: args.sourceUrl,
      });

    case "set_reminder_completed":
      return m("setReminderCompleted", {
        userId,
        id: args.id,
        completed: args.completed,
      });

    case "snooze_reminder":
      return m("snoozeReminder", {
        userId,
        id: args.id,
        remindAt: args.remindAt,
      });

    case "remove_reminder":
      return m("removeReminder", {
        userId,
        id: args.id,
      });

    case "get_reminders_summary":
      return q("getRemindersSummary", {
        userId,
        workspaceId: args.workspaceId,
        now: args.now,
      });

    case "list_due_reminders":
      return q("listDueReminders", {
        userId,
        workspaceId: args.workspaceId,
        now: args.now,
      });

    // ── Comments ──────────────────────────────────────────────────────────────
    case "list_comments_by_page":
      return q("listCommentsByPage", { userId, pageId: args.pageId });

    case "add_comment":
      return m("addComment", {
        userId,
        pageId: args.pageId,
        workspaceId: args.workspaceId,
        content: args.content,
        parentCommentId: args.parentCommentId,
      });

    case "edit_comment":
      return m("editComment", {
        userId,
        id: args.id,
        content: args.content,
      });

    case "remove_comment":
      return m("removeComment", {
        userId,
        id: args.id,
      });

    case "resolve_comment":
      return m("resolveComment", {
        userId,
        id: args.id,
        resolved: args.resolved,
      });

    // ── News ──────────────────────────────────────────────────────────────────
    case "push_news_articles":
      return m("pushNewsArticles", { articles: args.articles });

    case "get_news":
      return q("getNews", { category: args.category, limit: args.limit });

    case "get_daily_tasks_dashboard":
      return q("getDailyTasksDashboard", {
        userId,
        startDate: args.startDate,
        endDate: args.endDate,
        date: args.date,
        projects: args.projects,
      });

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

function ok(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: "2.0", result, id }, { headers: CORS });
}

function err(id: unknown, code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", error: { code, message }, id }, { headers: CORS });
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
      case "notifications/cancelled":
        return new Response(null, { status: 202, headers: CORS });

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
        if (typeof method === "string" && method.startsWith("notifications/")) {
          return new Response(null, { status: 202, headers: CORS });
        }
        return err(id, -32601, `Method not found: ${method}`);
    }
  } catch (e: unknown) {
    return err(id, -32603, e instanceof Error ? e.message : "Internal error");
  }
}

export async function GET(req: NextRequest) {
  if (req.headers.get("accept")?.includes("text/event-stream")) {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      return new Response("Unauthorized", { status: 401, headers: CORS });
    }
    const userId = await resolveUserId(apiKey);
    if (!userId) {
      return new Response("Invalid API key. Regenerate at /api/mcp/token.", {
        status: 401,
        headers: CORS,
      });
    }

    const encoder = new TextEncoder();
    const postUrl = req.url;

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`event: endpoint\ndata: ${postUrl}\n\n`));

        const ping = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            clearInterval(ping);
          }
        }, 25_000);

        setTimeout(() => {
          clearInterval(ping);
          try { controller.close(); } catch {}
        }, 55_000);
      },
    });

    return new Response(stream, {
      headers: {
        ...CORS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  }

  return Response.json(
    {
      name: "MadVibe MCP Server",
      version: "1.0.0",
      auth: "Persistent API key — visit /api/mcp/token while signed in",
      tools: TOOL_DEFINITIONS.map((t) => t.name),
    },
    { headers: CORS }
  );
}
