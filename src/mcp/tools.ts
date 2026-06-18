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
        parentId: { type: "string", description: "Optional Convex parent page ID" },
      },
      required: ["workspaceId", "title"],
    },
  },
  {
    name: "update_page",
    description: "Update a page's metadata (title, icon, cover image, full width or favorite status)",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex page ID" },
        title: { type: "string", description: "New page title" },
        icon: { type: "string", description: "New icon emoji, or null to clear" },
        coverImage: { type: "string", description: "New cover image URL, or null to clear" },
        isFullWidth: { type: "boolean", description: "Set page to full width layout" },
        isFavourite: { type: "boolean", description: "Toggle favorite page status" },
      },
      required: ["id"],
    },
  },
  {
    name: "archive_page",
    description: "Archive a page and all its subpages recursively",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex page ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "restore_page",
    description: "Restore an archived page and all its subpages recursively",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex page ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "remove_page",
    description: "Permanently delete a page and all its content blocks",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex page ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "move_page",
    description: "Move a page to a new parent page, or to the workspace root",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex page ID" },
        newParentId: { type: "string", description: "New Convex parent page ID, or null for workspace root" },
        sortOrder: { type: "number", description: "Optional sort order value" },
      },
      required: ["id", "newParentId"],
    },
  },
  {
    name: "reorder_page",
    description: "Change the sorting index of a page among its siblings",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex page ID" },
        newParentId: { type: "string", description: "Convex parent page ID, or null for workspace root" },
        targetIndex: { type: "number", description: "0-based index to place the page at" },
      },
      required: ["id", "newParentId", "targetIndex"],
    },
  },
  {
    name: "get_page_ancestors",
    description: "Get the lineage of parent pages for a specific page, useful for breadcrumbs",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex page ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_subpages",
    description: "List pages directly nested under a parent page (or top-level pages if parentId is null)",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Convex workspace ID" },
        parentId: { type: "string", description: "Convex parent page ID, or null for top-level pages" },
      },
      required: ["workspaceId"],
    },
  },
  {
    name: "list_space_roots",
    description: "List all project spaces in a workspace",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Convex workspace ID" },
      },
      required: ["workspaceId"],
    },
  },
  {
    name: "list_favourite_pages",
    description: "List all favorited pages in a workspace",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Convex workspace ID" },
      },
      required: ["workspaceId"],
    },
  },
  {
    name: "list_archived_pages",
    description: "List all archived pages in a workspace",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Convex workspace ID" },
      },
      required: ["workspaceId"],
    },
  },

  // ── Databases ───────────────────────────────────────────────────────────────
  {
    name: "create_database",
    description: "Create a database on a specific page",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Convex page ID" },
        name: { type: "string", description: "Database name" },
        properties: { type: "array", description: "Database schema properties definition" },
      },
      required: ["pageId", "name", "properties"],
    },
  },
  {
    name: "update_database_properties",
    description: "Update schema columns (properties) of a database",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex database ID" },
        properties: { type: "array", description: "Array of property schema columns definitions" },
      },
      required: ["id", "properties"],
    },
  },
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
  {
    name: "list_database_rows",
    description: "List sorted active rows for a database",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: { type: "string", description: "Convex database ID" },
      },
      required: ["databaseId"],
    },
  },
  {
    name: "add_database_row",
    description: "Add a new row to a database with cell values",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: { type: "string", description: "Convex database ID" },
        data: { type: "object", description: "Key-value pair data mapping column IDs to cell values" },
        pageId: { type: "string", description: "Optional linked Convex page ID" },
        sortOrder: { type: "number", description: "Optional sort order value" },
      },
      required: ["databaseId", "data"],
    },
  },
  {
    name: "update_database_row",
    description: "Update cell values in an existing database row",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex database row ID" },
        data: { type: "object", description: "Key-value pair data mapping column IDs to new cell values" },
      },
      required: ["id", "data"],
    },
  },
  {
    name: "reorder_database_row",
    description: "Reorder a database row to a target index",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex database row ID" },
        targetIndex: { type: "number", description: "0-based target sorting position index" },
      },
      required: ["id", "targetIndex"],
    },
  },
  {
    name: "delete_database_row",
    description: "Permanently delete a database row",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex database row ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_database_views",
    description: "List all saved views for a database",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: { type: "string", description: "Convex database ID" },
      },
      required: ["databaseId"],
    },
  },
  {
    name: "create_database_view",
    description: "Create a new view for a database",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: { type: "string", description: "Convex database ID" },
        name: { type: "string", description: "View name" },
        type: { type: "string", enum: ["table", "board", "list", "calendar", "gallery", "timeline"], description: "View layout type" },
      },
      required: ["databaseId", "name", "type"],
    },
  },
  {
    name: "update_database_view",
    description: "Update the configuration parameters of a database view",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex view ID" },
        name: { type: "string", description: "New view name" },
        type: { type: "string", enum: ["table", "board", "list", "calendar", "gallery", "timeline"] },
        filters: { type: "object", description: "Filters configuration" },
        sorts: { type: "array", description: "Sorts configuration" },
        groupBy: { type: "string", description: "Property ID to group by" },
        visibleProperties: { type: "array", items: { type: "string" }, description: "Visible property column IDs" },
        cardCoverPropertyId: { type: "string", description: "Card cover image property ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "import_csv",
    description: "Create a database and seed rows from CSV properties and record arrays",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Convex workspace ID" },
        parentId: { type: "string", description: "Optional Convex parent page ID" },
        name: { type: "string", description: "Database and page title" },
        properties: { type: "array", description: "Array of property columns definition" },
        rows: { type: "array", description: "Array of row data mapping property IDs to values" },
      },
      required: ["workspaceId", "name", "properties", "rows"],
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
        accountId: { type: "string", description: "Filter by financial account ID" },
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
          enum: ["active", "partially_paid", "settled", "overdue", "written_off"],
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
  {
    name: "create_finance_account",
    description: "Create a new bank, cash, savings, or investment account",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Account name" },
        type: { type: "string", enum: ["savings", "checking", "credit_card", "cash", "investment", "loan", "wallet"] },
        currency: { type: "string", description: "Default currency (default: INR)" },
        balance: { type: "number", description: "Initial balance amount" },
        institution: { type: "string", description: "Bank or platform institution name" },
        accountNumberLast4: { type: "string", description: "Last 4 digits of the account number" },
        notes: { type: "string", description: "Optional notes" },
        color: { type: "string", description: "The theme color code or name" },
      },
      required: ["name", "type", "balance"],
    },
  },
  {
    name: "update_finance_account",
    description: "Update details of a financial account in the ledger",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex account ID" },
        name: { type: "string" },
        type: { type: "string", enum: ["savings", "checking", "credit_card", "cash", "investment", "loan", "wallet"] },
        currency: { type: "string" },
        balance: { type: "number" },
        institution: { type: "string" },
        isActive: { type: "boolean" },
        creditLimit: { type: "number" },
        billingDay: { type: "number" },
        dueDay: { type: "number" },
        color: { type: "string" },
        notes: { type: "string" },
        accountNumberLast4: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_finance_account",
    description: "Archive/deactivate a financial account",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex account ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_finance_transaction",
    description: "Record a new expense, income, or investment transaction in the ledger",
    inputSchema: {
      type: "object",
      properties: {
        accountId: { type: "string", description: "Convex financial account ID" },
        type: { type: "string", enum: ["income", "expense", "transfer", "investment"] },
        amount: { type: "number", description: "Transaction amount" },
        categoryId: { type: "string", description: "Optional category ID" },
        merchant: { type: "string", description: "Optional merchant name" },
        description: { type: "string", description: "Brief description of transaction" },
        notes: { type: "string", description: "Additional notes" },
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        isRecurring: { type: "boolean", description: "Whether this is recurring (default: false)" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["accountId", "type", "amount", "description", "date"],
    },
  },
  {
    name: "update_finance_transaction",
    description: "Update details of an existing transaction",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex transaction ID" },
        description: { type: "string" },
        categoryId: { type: "string" },
        merchant: { type: "string" },
        notes: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_finance_transaction",
    description: "Permanently delete a transaction and reverse its balance effects",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex transaction ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "transfer_between_accounts",
    description: "Transfer funds from one account to another, creating matched transactions",
    inputSchema: {
      type: "object",
      properties: {
        fromAccountId: { type: "string", description: "Source Convex account ID" },
        toAccountId: { type: "string", description: "Destination Convex account ID" },
        amount: { type: "number", description: "Amount to transfer" },
        description: { type: "string", description: "Transfer description" },
        date: { type: "string", description: "Date YYYY-MM-DD" },
        notes: { type: "string", description: "Optional notes" },
        linkedCreditCardId: { type: "string", description: "Optional credit card ID being paid off" },
      },
      required: ["fromAccountId", "toAccountId", "amount", "description", "date"],
    },
  },
  {
    name: "set_finance_budget",
    description: "Set or create a budget for a spending category",
    inputSchema: {
      type: "object",
      properties: {
        categoryId: { type: "string", description: "Convex category ID" },
        amount: { type: "number", description: "Budget limit amount" },
        period: { type: "string", enum: ["monthly", "quarterly", "yearly"] },
        rollover: { type: "boolean", description: "Enable rolling over unused budget limits" },
      },
      required: ["categoryId", "amount"],
    },
  },
  {
    name: "update_finance_budget",
    description: "Update budget configuration",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex budget ID" },
        amount: { type: "number" },
        period: { type: "string", enum: ["monthly", "quarterly", "yearly"] },
        rollover: { type: "boolean" },
        alertThresholds: { type: "array", items: { type: "number" } },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_finance_budget",
    description: "Delete a category budget",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex budget ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_finance_investment",
    description: "Record a new asset purchase/investment holding",
    inputSchema: {
      type: "object",
      properties: {
        assetType: { type: "string", enum: ["stock", "mutual_fund", "etf", "fd", "ppf", "gold", "crypto", "real_estate", "bond", "other"] },
        symbol: { type: "string", description: "Ticker symbol, e.g. INFY, BTC" },
        name: { type: "string", description: "Asset name" },
        quantity: { type: "number", description: "Units purchased" },
        buyPrice: { type: "number", description: "Price per unit" },
        buyDate: { type: "string", description: "Date YYYY-MM-DD" },
        platform: { type: "string", description: "Investment platform" },
        isSip: { type: "boolean", description: "Whether it is an active SIP (regular investment)" },
        sipAmount: { type: "number", description: "SIP amount details" },
        notes: { type: "string" },
      },
      required: ["assetType", "name", "quantity", "buyPrice", "buyDate"],
    },
  },
  {
    name: "update_finance_investment",
    description: "Update details of an investment asset",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex investment ID" },
        name: { type: "string" },
        quantity: { type: "number" },
        currentPrice: { type: "number" },
        platform: { type: "string" },
        isSip: { type: "boolean" },
        sipAmount: { type: "number" },
        sipDay: { type: "number" },
        notes: { type: "string" },
        dividendYield: { type: "number" },
        taxType: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_finance_investment",
    description: "Remove an investment holding from tracking",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex investment ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_finance_goal",
    description: "Create a savings goal",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Goal name" },
        targetAmount: { type: "number" },
        targetDate: { type: "string", description: "Date YYYY-MM-DD" },
        priority: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["name", "targetAmount", "targetDate", "priority"],
    },
  },
  {
    name: "update_finance_goal",
    description: "Update details of a financial savings goal",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex goal ID" },
        name: { type: "string" },
        targetAmount: { type: "number" },
        targetDate: { type: "string" },
        priority: { type: "string", enum: ["high", "medium", "low"] },
        strategy: { type: "string" },
        notes: { type: "string" },
        linkedAccountId: { type: "string" },
        autoContribute: { type: "number" },
      },
      required: ["id"],
    },
  },
  {
    name: "update_finance_goal_progress",
    description: "Update the currently accumulated amount on a savings goal",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex goal ID" },
        currentAmount: { type: "number", description: "New progress amount" },
      },
      required: ["id", "currentAmount"],
    },
  },
  {
    name: "delete_finance_goal",
    description: "Delete a savings goal",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex goal ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_finance_categories",
    description: "List all standard and custom transaction categories",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["income", "expense"] },
      },
    },
  },
  {
    name: "create_finance_category",
    description: "Create a custom category for transactions",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        icon: { type: "string", description: "Category icon symbol/emoji" },
        color: { type: "string", description: "Theme color code" },
        type: { type: "string", enum: ["income", "expense"] },
        parentId: { type: "string", description: "Optional parent category ID" },
      },
      required: ["name", "icon", "color", "type"],
    },
  },
  {
    name: "get_finance_budget_progress",
    description: "Retrieve budget consumption stats for a month",
    inputSchema: {
      type: "object",
      properties: {
        month: { type: "string", description: "Month in YYYY-MM format" },
      },
      required: ["month"],
    },
  },
  {
    name: "get_cashflow_history",
    description: "Get cash flow history summary (income/expenses) for recent months",
    inputSchema: {
      type: "object",
      properties: {
        months: { type: "number", description: "Number of months to retrieve (default: 6)" },
      },
    },
  },
  {
    name: "list_credit_cards",
    description: "List all credit cards tracked in the ledger",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_credit_card_stats",
    description: "Retrieve credit card statistics (utilization percentage, total limits, outstanding balance)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_card_transactions",
    description: "Retrieve spend transactions charged to a specific credit card",
    inputSchema: {
      type: "object",
      properties: {
        creditCardId: { type: "string", description: "Convex credit card ID" },
        limit: { type: "number", description: "Limit count" },
        startDate: { type: "string", description: "YYYY-MM-DD" },
        endDate: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["creditCardId"],
    },
  },
  {
    name: "create_credit_card",
    description: "Create a credit card record, linking it to a ledger account",
    inputSchema: {
      type: "object",
      properties: {
        accountId: { type: "string", description: "Linked Convex account ID" },
        issuer: { type: "string", description: "Bank/Card Issuer, e.g. HDFC, ICICI" },
        network: { type: "string", enum: ["visa", "mastercard", "rupay", "amex", "discover", "other"] },
        cardName: { type: "string", description: "Card name, e.g. Regalia, Millennia" },
        lastFour: { type: "string", description: "Last 4 digits" },
        creditLimit: { type: "number" },
        billingDay: { type: "number" },
        dueDay: { type: "number" },
        rewardProgram: { type: "string" },
        autoPayAccountId: { type: "string", description: "Convex account for autopay" },
        cardNumber: { type: "string" },
        expiryMonth: { type: "number" },
        expiryYear: { type: "number" },
        cvv: { type: "string" },
      },
      required: ["accountId", "issuer", "creditLimit", "billingDay", "dueDay"],
    },
  },
  {
    name: "update_credit_card",
    description: "Update metadata or balance parameters of a credit card",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex credit card ID" },
        issuer: { type: "string" },
        cardName: { type: "string" },
        creditLimit: { type: "number" },
        statementBalance: { type: "number" },
        currentBalance: { type: "number" },
        billingDay: { type: "number" },
        dueDay: { type: "number" },
        minimumDue: { type: "number" },
        dueDate: { type: "string" },
        lastStatementDate: { type: "string" },
        rewardPoints: { type: "number" },
        rewardProgram: { type: "string" },
        autoPayAccountId: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "record_card_spend",
    description: "Add a spend transaction to a credit card, increasing its balance and decreasing available credit limit",
    inputSchema: {
      type: "object",
      properties: {
        creditCardId: { type: "string", description: "Convex credit card ID" },
        accountId: { type: "string", description: "Linked Convex account ID" },
        amount: { type: "number" },
        description: { type: "string" },
        merchant: { type: "string" },
        categoryId: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        notes: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["creditCardId", "accountId", "amount", "description", "date"],
    },
  },
  {
    name: "delete_credit_card",
    description: "Delete a credit card from tracking",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex credit card ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_card_transaction",
    description: "Delete a card spend transaction, reversing credit card balance and limit usage",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex transaction ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "get_loan_summary",
    description: "Retrieve outstanding loans summary (total lent, borrowed, and overdue)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_loan",
    description: "Create a loan entry — tracking money lent to someone or borrowed from someone",
    inputSchema: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["lent", "borrowed"] },
        counterpartyName: { type: "string", description: "Name of person or entity" },
        principalAmount: { type: "number" },
        currency: { type: "string" },
        issuedDate: { type: "string", description: "YYYY-MM-DD" },
        dueDate: { type: "string", description: "YYYY-MM-DD" },
        linkedAccountId: { type: "string", description: "Linked Convex account ID" },
        interestRate: { type: "number" },
        notes: { type: "string" },
      },
      required: ["direction", "counterpartyName", "principalAmount", "issuedDate"],
    },
  },
  {
    name: "update_loan",
    description: "Update loan details",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex loan ID" },
        counterpartyName: { type: "string" },
        dueDate: { type: "string" },
        status: { type: "string", enum: ["active", "partially_paid", "settled", "overdue", "written_off"] },
        interestRate: { type: "number" },
        notes: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "record_loan_repayment",
    description: "Record a repayment transaction for a loan, reducing its outstanding balance",
    inputSchema: {
      type: "object",
      properties: {
        loanId: { type: "string", description: "Convex loan ID" },
        amount: { type: "number", description: "Repayment amount" },
        date: { type: "string", description: "YYYY-MM-DD" },
        accountId: { type: "string", description: "Optional Convex payment source account ID" },
        notes: { type: "string" },
      },
      required: ["loanId", "amount", "date"],
    },
  },
  {
    name: "delete_loan",
    description: "Delete a loan record and reverse its linked transaction effects",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex loan ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_recurring_transactions",
    description: "List recurring transaction entries",
    inputSchema: {
      type: "object",
      properties: {
        activeOnly: { type: "boolean" },
      },
    },
  },
  {
    name: "create_recurring_transaction",
    description: "Create a recurring transaction scheduler entry",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        type: { type: "string", enum: ["income", "expense", "transfer", "investment"] },
        amount: { type: "number" },
        currency: { type: "string" },
        accountId: { type: "string" },
        destinationAccountId: { type: "string" },
        categoryId: { type: "string" },
        loanId: { type: "string" },
        linkedCreditCardId: { type: "string" },
        description: { type: "string" },
        notes: { type: "string" },
        merchant: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        frequency: { type: "string", enum: ["daily", "weekly", "monthly", "quarterly", "yearly"] },
        interval: { type: "number" },
        startDate: { type: "string", description: "YYYY-MM-DD" },
        endDate: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["title", "type", "amount", "accountId", "description", "frequency", "startDate"],
    },
  },
  {
    name: "update_recurring_transaction",
    description: "Update details of a recurring transaction entry",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex recurring transaction ID" },
        title: { type: "string" },
        amount: { type: "number" },
        categoryId: { type: "string" },
        description: { type: "string" },
        notes: { type: "string" },
        endDate: { type: "string" },
        isActive: { type: "boolean" },
        nextDueDate: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_recurring_transaction",
    description: "Delete a recurring transaction entry",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex recurring transaction ID" },
      },
      required: ["id"],
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
  {
    name: "get_weekly_habit_logs",
    description: "Retrieve habit log entries for a weekly range",
    inputSchema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "YYYY-MM-DD" },
        endDate: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "create_habit",
    description: "Create a new habit to track",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        icon: { type: "string", description: "Habit icon emoji" },
        color: { type: "string", description: "Habit theme color code" },
        frequency: { type: "string", enum: ["daily", "weekdays", "weekends", "custom"] },
        customDays: { type: "array", items: { type: "number" }, description: "0 for Sunday, 1 for Monday, etc. when custom frequency" },
      },
      required: ["name", "icon", "color", "frequency"],
    },
  },
  {
    name: "log_habit",
    description: "Log habit completion status for a date",
    inputSchema: {
      type: "object",
      properties: {
        habitId: { type: "string", description: "Convex habit ID" },
        date: { type: "string", description: "YYYY-MM-DD" },
        completed: { type: "boolean" },
      },
      required: ["habitId", "date", "completed"],
    },
  },
  {
    name: "delete_habit",
    description: "Deactivate and archive a habit",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex habit ID" },
      },
      required: ["id"],
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
  {
    name: "update_reminder",
    description: "Update parameters of an existing reminder",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex reminder ID" },
        title: { type: "string" },
        note: { type: "string" },
        remindAt: { type: "number", description: "Unix timestamp in ms" },
        sourceLabel: { type: "string" },
        sourceUrl: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "set_reminder_completed",
    description: "Mark a reminder as completed or incomplete",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex reminder ID" },
        completed: { type: "boolean" },
      },
      required: ["id", "completed"],
    },
  },
  {
    name: "snooze_reminder",
    description: "Snooze a reminder to a later timestamp",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex reminder ID" },
        remindAt: { type: "number", description: "New Unix timestamp in ms" },
      },
      required: ["id", "remindAt"],
    },
  },
  {
    name: "remove_reminder",
    description: "Permanently delete a reminder",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex reminder ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "get_reminders_summary",
    description: "Get summary metrics of reminders in a workspace (total scheduled, overdue, upcoming)",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Convex workspace ID" },
        now: { type: "number", description: "Optional current Unix timestamp in ms" },
      },
      required: ["workspaceId"],
    },
  },
  {
    name: "list_due_reminders",
    description: "List overdue scheduled reminders that haven't been notified yet",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Convex workspace ID" },
        now: { type: "number", description: "Optional current Unix timestamp in ms" },
      },
      required: ["workspaceId"],
    },
  },

  // ── Comments ────────────────────────────────────────────────────────────────
  {
    name: "list_comments_by_page",
    description: "List discussion comments on a specific page",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Convex page ID" },
      },
      required: ["pageId"],
    },
  },
  {
    name: "add_comment",
    description: "Add a comment to a page",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Convex page ID" },
        workspaceId: { type: "string", description: "Convex workspace ID" },
        content: { type: "string", description: "Comment text" },
        parentCommentId: { type: "string", description: "Optional parent comment ID for threaded replies" },
      },
      required: ["pageId", "workspaceId", "content"],
    },
  },
  {
    name: "edit_comment",
    description: "Edit the text content of a comment that you authored",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex comment ID" },
        content: { type: "string", description: "Updated comment text" },
      },
      required: ["id", "content"],
    },
  },
  {
    name: "remove_comment",
    description: "Permanently delete a comment and its threaded replies",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex comment ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "resolve_comment",
    description: "Resolve or unresolve a page comment thread",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex comment ID" },
        resolved: { type: "boolean" },
      },
      required: ["id", "resolved"],
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
        parentId: args.parentId as Id<"pages"> | undefined,
      });

    case "update_page":
      return await client.mutation(api.pages.update, {
        id: args.id as Id<"pages">,
        title: args.title as string | undefined,
        icon: args.icon as string | null | undefined,
        coverImage: args.coverImage as string | null | undefined,
        isFullWidth: args.isFullWidth as boolean | undefined,
        isFavourite: args.isFavourite as boolean | undefined,
      });

    case "archive_page":
      return await client.mutation(api.pages.archive, {
        id: args.id as Id<"pages">,
      });

    case "restore_page":
      return await client.mutation(api.pages.restore, {
        id: args.id as Id<"pages">,
      });

    case "remove_page":
      return await client.mutation(api.pages.remove, {
        id: args.id as Id<"pages">,
      });

    case "move_page":
      return await client.mutation(api.pages.move, {
        id: args.id as Id<"pages">,
        newParentId: args.newParentId as Id<"pages"> | null,
        sortOrder: args.sortOrder as number | undefined,
      });

    case "reorder_page":
      return await client.mutation(api.pages.reorderPage, {
        id: args.id as Id<"pages">,
        newParentId: args.newParentId as Id<"pages"> | null,
        targetIndex: args.targetIndex as number,
      });

    case "get_page_ancestors":
      return await client.query(api.pages.getAncestors, {
        id: args.id as Id<"pages">,
      });

    case "list_subpages":
      return await client.query(api.pages.list, {
        workspaceId: args.workspaceId as Id<"workspaces">,
        parentId: args.parentId as Id<"pages"> | null | undefined,
      });

    case "list_space_roots":
      return await client.query(api.pages.listSpaceRoots, {
        workspaceId: args.workspaceId as Id<"workspaces">,
      });

    case "list_favourite_pages":
      return await client.query(api.pages.listFavourites, {
        workspaceId: args.workspaceId as Id<"workspaces">,
      });

    case "list_archived_pages":
      return await client.query(api.pages.listArchived, {
        workspaceId: args.workspaceId as Id<"workspaces">,
      });

    // ── Databases ─────────────────────────────────────────────────────────────
    case "create_database":
      return await client.mutation(api.databases.create, {
        pageId: args.pageId as Id<"pages">,
        name: args.name as string,
        properties: args.properties as any[],
      });

    case "update_database_properties":
      return await client.mutation(api.databases.updateProperties, {
        id: args.id as Id<"databases">,
        properties: args.properties as any[],
      });

    case "get_database_rows":
      return await client.query(api.databases.listRows, {
        databaseId: args.databaseId as Id<"databases">,
      });

    case "get_database_rows_by_page":
      return await client.query(api.databases.getByPage, {
        pageId: args.pageId as Id<"pages">,
      });

    case "list_database_rows":
      return await client.query(api.databases.listRows, {
        databaseId: args.databaseId as Id<"databases">,
      });

    case "add_database_row":
      return await client.mutation(api.databases.addRow, {
        databaseId: args.databaseId as Id<"databases">,
        data: args.data,
        pageId: args.pageId as Id<"pages"> | null | undefined,
        sortOrder: args.sortOrder as number | undefined,
      });

    case "update_database_row":
      return await client.mutation(api.databases.updateRow, {
        id: args.id as Id<"rows">,
        data: args.data,
      });

    case "reorder_database_row":
      return await client.mutation(api.databases.reorderRow, {
        id: args.id as Id<"rows">,
        targetIndex: args.targetIndex as number,
      });

    case "delete_database_row":
      return await client.mutation(api.databases.deleteRow, {
        id: args.id as Id<"rows">,
      });

    case "list_database_views":
      return await client.query(api.databases.listViews, {
        databaseId: args.databaseId as Id<"databases">,
      });

    case "create_database_view":
      return await client.mutation(api.databases.createView, {
        databaseId: args.databaseId as Id<"databases">,
        name: args.name as string,
        type: args.type as any,
      });

    case "update_database_view":
      return await client.mutation(api.databases.updateView, {
        id: args.id as Id<"views">,
        name: args.name as string | undefined,
        type: args.type as any,
        filters: args.filters,
        sorts: args.sorts as any[] | undefined,
        groupBy: args.groupBy as string | null | undefined,
        visibleProperties: args.visibleProperties as string[] | undefined,
        cardCoverPropertyId: args.cardCoverPropertyId as string | null | undefined,
      });

    case "import_csv":
      return await client.mutation(api.databases.importCsv, {
        workspaceId: args.workspaceId as Id<"workspaces">,
        parentId: args.parentId as Id<"pages"> | null | undefined,
        name: args.name as string,
        properties: args.properties as any[],
        rows: args.rows as any[],
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
        type: args.type as any,
        accountId: args.accountId as Id<"financeAccounts"> | undefined,
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

    case "create_finance_account":
      return await client.mutation(api.ledger.createAccount, {
        name: args.name as string,
        type: args.type as any,
        currency: args.currency as string | undefined,
        balance: args.balance as number,
        institution: args.institution as string | undefined,
        accountNumberLast4: args.accountNumberLast4 as string | undefined,
        notes: args.notes as string | undefined,
        color: args.color as string | undefined,
      });

    case "update_finance_account":
      return await client.mutation(api.ledger.updateAccountFull, {
        id: args.id as Id<"financeAccounts">,
        name: args.name as string | undefined,
        type: args.type as any,
        currency: args.currency as string | undefined,
        balance: args.balance as number | undefined,
        institution: args.institution as string | undefined,
        isActive: args.isActive as boolean | undefined,
        creditLimit: args.creditLimit as number | undefined,
        billingDay: args.billingDay as number | undefined,
        dueDay: args.dueDay as number | undefined,
        color: args.color as string | undefined,
        notes: args.notes as string | undefined,
        accountNumberLast4: args.accountNumberLast4 as string | undefined,
      });

    case "delete_finance_account":
      return await client.mutation(api.ledger.deleteAccount, {
        id: args.id as Id<"financeAccounts">,
      });

    case "create_finance_transaction":
      return await client.mutation(api.ledger.createTransaction, {
        accountId: args.accountId as Id<"financeAccounts">,
        type: args.type as any,
        amount: args.amount as number,
        categoryId: args.categoryId as Id<"financeCategories"> | undefined,
        merchant: args.merchant as string | undefined,
        description: args.description as string,
        notes: args.notes as string | undefined,
        date: args.date as string,
        isRecurring: args.isRecurring as boolean | undefined,
        tags: args.tags as string[] | undefined,
      });

    case "update_finance_transaction":
      return await client.mutation(api.ledger.updateTransaction, {
        id: args.id as Id<"financeTransactions">,
        description: args.description as string | undefined,
        categoryId: args.categoryId as Id<"financeCategories"> | undefined,
        merchant: args.merchant as string | undefined,
        notes: args.notes as string | undefined,
        tags: args.tags as string[] | undefined,
      });

    case "delete_finance_transaction":
      return await client.mutation(api.ledger.deleteTransaction, {
        id: args.id as Id<"financeTransactions">,
      });

    case "transfer_between_accounts":
      return await client.mutation(api.ledger.transferBetweenAccounts, {
        fromAccountId: args.fromAccountId as Id<"financeAccounts">,
        toAccountId: args.toAccountId as Id<"financeAccounts">,
        amount: args.amount as number,
        description: args.description as string,
        date: args.date as string,
        notes: args.notes as string | undefined,
        linkedCreditCardId: args.linkedCreditCardId as Id<"financeCreditCards"> | undefined,
      });

    case "set_finance_budget":
      return await client.mutation(api.ledger.setBudget, {
        categoryId: args.categoryId as Id<"financeCategories">,
        amount: args.amount as number,
        period: args.period as any,
        rollover: args.rollover as boolean | undefined,
      });

    case "update_finance_budget":
      return await client.mutation(api.ledger.updateBudget, {
        id: args.id as Id<"financeBudgets">,
        amount: args.amount as number | undefined,
        period: args.period as any,
        rollover: args.rollover as boolean | undefined,
        alertThresholds: args.alertThresholds as number[] | undefined,
      });

    case "delete_finance_budget":
      return await client.mutation(api.ledger.deleteBudget, {
        id: args.id as Id<"financeBudgets">,
      });

    case "create_finance_investment":
      return await client.mutation(api.ledger.createInvestment, {
        assetType: args.assetType as any,
        symbol: args.symbol as string | undefined,
        name: args.name as string,
        quantity: args.quantity as number,
        buyPrice: args.buyPrice as number,
        buyDate: args.buyDate as string,
        platform: args.platform as string | undefined,
        isSip: args.isSip as boolean | undefined,
        sipAmount: args.sipAmount as number | undefined,
        notes: args.notes as string | undefined,
      });

    case "update_finance_investment":
      return await client.mutation(api.ledger.updateInvestment, {
        id: args.id as Id<"financeInvestments">,
        name: args.name as string | undefined,
        quantity: args.quantity as number | undefined,
        currentPrice: args.currentPrice as number | undefined,
        platform: args.platform as string | undefined,
        isSip: args.isSip as boolean | undefined,
        sipAmount: args.sipAmount as number | undefined,
        sipDay: args.sipDay as number | undefined,
        notes: args.notes as string | undefined,
        dividendYield: args.dividendYield as number | undefined,
        taxType: args.taxType as string | undefined,
      });

    case "delete_finance_investment":
      return await client.mutation(api.ledger.deleteInvestment, {
        id: args.id as Id<"financeInvestments">,
      });

    case "create_finance_goal":
      return await client.mutation(api.ledger.createGoal, {
        name: args.name as string,
        targetAmount: args.targetAmount as number,
        targetDate: args.targetDate as string,
        priority: args.priority as any,
      });

    case "update_finance_goal":
      return await client.mutation(api.ledger.updateGoal, {
        id: args.id as Id<"financeGoals">,
        name: args.name as string | undefined,
        targetAmount: args.targetAmount as number | undefined,
        targetDate: args.targetDate as string | undefined,
        priority: args.priority as any,
        strategy: args.strategy as string | undefined,
        notes: args.notes as string | undefined,
        linkedAccountId: args.linkedAccountId as Id<"financeAccounts"> | undefined,
        autoContribute: args.autoContribute as number | undefined,
      });

    case "update_finance_goal_progress":
      return await client.mutation(api.ledger.updateGoalProgress, {
        id: args.id as Id<"financeGoals">,
        currentAmount: args.currentAmount as number,
      });

    case "delete_finance_goal":
      return await client.mutation(api.ledger.deleteGoal, {
        id: args.id as Id<"financeGoals">,
      });

    case "list_finance_categories":
      return await client.query(api.ledger.listCategories, {
        type: args.type as any,
      });

    case "create_finance_category":
      return await client.mutation(api.ledger.createCategory, {
        name: args.name as string,
        icon: args.icon as string,
        color: args.color as string,
        type: args.type as any,
        parentId: args.parentId as string | undefined,
      });

    case "get_finance_budget_progress":
      return await client.query(api.ledger.getBudgetProgress, {
        month: args.month as string,
      });

    case "get_cashflow_history":
      return await client.query(api.ledger.getCashflowHistory, {
        months: args.months as number | undefined,
      });

    case "list_credit_cards":
      return await client.query(api.ledgerCards.listCreditCards, {});

    case "get_credit_card_stats":
      return await client.query(api.ledgerCards.getCreditCardStats, {});

    case "list_card_transactions":
      return await client.query(api.ledgerCards.listCardTransactions, {
        creditCardId: args.creditCardId as Id<"financeCreditCards">,
        limit: args.limit as number | undefined,
        startDate: args.startDate as string | undefined,
        endDate: args.endDate as string | undefined,
      });

    case "create_credit_card":
      return await client.mutation(api.ledgerCards.createCreditCard, {
        accountId: args.accountId as Id<"financeAccounts">,
        issuer: args.issuer as string,
        network: args.network as any,
        cardName: args.cardName as string | undefined,
        lastFour: args.lastFour as string | undefined,
        creditLimit: args.creditLimit as number,
        billingDay: args.billingDay as number,
        dueDay: args.dueDay as number,
        rewardProgram: args.rewardProgram as string | undefined,
        autoPayAccountId: args.autoPayAccountId as Id<"financeAccounts"> | undefined,
        cardNumber: args.cardNumber as string | undefined,
        expiryMonth: args.expiryMonth as number | undefined,
        expiryYear: args.expiryYear as number | undefined,
        cvv: args.cvv as string | undefined,
      });

    case "update_credit_card":
      return await client.mutation(api.ledgerCards.updateCreditCard, {
        id: args.id as Id<"financeCreditCards">,
        issuer: args.issuer as string | undefined,
        cardName: args.cardName as string | undefined,
        creditLimit: args.creditLimit as number | undefined,
        statementBalance: args.statementBalance as number | undefined,
        currentBalance: args.currentBalance as number | undefined,
        billingDay: args.billingDay as number | undefined,
        dueDay: args.dueDay as number | undefined,
        minimumDue: args.minimumDue as number | undefined,
        dueDate: args.dueDate as string | undefined,
        lastStatementDate: args.lastStatementDate as string | undefined,
        rewardPoints: args.rewardPoints as number | undefined,
        rewardProgram: args.rewardProgram as string | undefined,
        autoPayAccountId: args.autoPayAccountId as Id<"financeAccounts"> | undefined,
      });

    case "record_card_spend":
      return await client.mutation(api.ledgerCards.recordCardSpend, {
        creditCardId: args.creditCardId as Id<"financeCreditCards">,
        accountId: args.accountId as Id<"financeAccounts">,
        amount: args.amount as number,
        description: args.description as string,
        merchant: args.merchant as string | undefined,
        categoryId: args.categoryId as Id<"financeCategories"> | undefined,
        date: args.date as string,
        notes: args.notes as string | undefined,
        tags: args.tags as string[] | undefined,
      });

    case "delete_credit_card":
      return await client.mutation(api.ledgerCards.deleteCreditCard, {
        id: args.id as Id<"financeCreditCards">,
      });

    case "delete_card_transaction":
      return await client.mutation(api.ledgerCards.deleteCardTransaction, {
        id: args.id as Id<"financeTransactions">,
      });

    case "get_loan_summary":
      return await client.query(api.ledgerLoans.getLoanSummary, {});

    case "create_loan":
      return await client.mutation(api.ledgerLoans.createLoan, {
        direction: args.direction as any,
        counterpartyName: args.counterpartyName as string,
        principalAmount: args.principalAmount as number,
        currency: args.currency as string | undefined,
        issuedDate: args.issuedDate as string,
        dueDate: args.dueDate as string | undefined,
        linkedAccountId: args.linkedAccountId as Id<"financeAccounts"> | undefined,
        interestRate: args.interestRate as number | undefined,
        notes: args.notes as string | undefined,
      });

    case "update_loan":
      return await client.mutation(api.ledgerLoans.updateLoan, {
        id: args.id as Id<"financeLoans">,
        counterpartyName: args.counterpartyName as string | undefined,
        dueDate: args.dueDate as string | undefined,
        status: args.status as any,
        interestRate: args.interestRate as number | undefined,
        notes: args.notes as string | undefined,
      });

    case "record_loan_repayment":
      return await client.mutation(api.ledgerLoans.recordLoanRepayment, {
        loanId: args.loanId as Id<"financeLoans">,
        amount: args.amount as number,
        date: args.date as string,
        accountId: args.accountId as Id<"financeAccounts"> | undefined,
        notes: args.notes as string | undefined,
      });

    case "delete_loan":
      return await client.mutation(api.ledgerLoans.deleteLoan, {
        id: args.id as Id<"financeLoans">,
      });

    case "list_recurring_transactions":
      return await client.query(api.ledgerRecurring.listRecurring, {
        activeOnly: args.activeOnly as boolean | undefined,
      });

    case "create_recurring_transaction":
      return await client.mutation(api.ledgerRecurring.createRecurring, {
        title: args.title as string,
        type: args.type as any,
        amount: args.amount as number,
        currency: args.currency as string | undefined,
        accountId: args.accountId as Id<"financeAccounts">,
        destinationAccountId: args.destinationAccountId as Id<"financeAccounts"> | undefined,
        categoryId: args.categoryId as Id<"financeCategories"> | undefined,
        loanId: args.loanId as Id<"financeLoans"> | undefined,
        linkedCreditCardId: args.linkedCreditCardId as Id<"financeCreditCards"> | undefined,
        description: args.description as string,
        notes: args.notes as string | undefined,
        merchant: args.merchant as string | undefined,
        tags: args.tags as string[] | undefined,
        frequency: args.frequency as any,
        interval: args.interval as number | undefined,
        startDate: args.startDate as string,
        endDate: args.endDate as string | undefined,
      });

    case "update_recurring_transaction":
      return await client.mutation(api.ledgerRecurring.updateRecurring, {
        id: args.id as Id<"financeRecurring">,
        title: args.title as string | undefined,
        amount: args.amount as number | undefined,
        categoryId: args.categoryId as Id<"financeCategories"> | undefined,
        description: args.description as string | undefined,
        notes: args.notes as string | undefined,
        endDate: args.endDate as string | undefined,
        isActive: args.isActive as boolean | undefined,
        nextDueDate: args.nextDueDate as string | undefined,
      });

    case "delete_recurring_transaction":
      return await client.mutation(api.ledgerRecurring.deleteRecurring, {
        id: args.id as Id<"financeRecurring">,
      });

    // ── Habits ────────────────────────────────────────────────────────────────
    case "list_habits":
      return await client.query(api.habits.listHabits, {});

    case "get_todays_habits":
      return await client.query(api.habits.getTodaysLogs, {
        date: args.date as string,
      });

    case "get_weekly_habit_logs":
      return await client.query(api.habits.getWeeklyLogs, {
        startDate: args.startDate as string,
        endDate: args.endDate as string,
      });

    case "create_habit":
      return await client.mutation(api.habits.createHabit, {
        name: args.name as string,
        icon: args.icon as string,
        color: args.color as string,
        frequency: args.frequency as any,
        customDays: args.customDays as number[] | undefined,
      });

    case "log_habit":
      return await client.mutation(api.habits.logHabit, {
        habitId: args.habitId as Id<"habits">,
        date: args.date as string,
        completed: args.completed as boolean,
      });

    case "delete_habit":
      return await client.mutation(api.habits.deleteHabit, {
        id: args.id as Id<"habits">,
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

    case "update_reminder":
      return await client.mutation(api.reminders.update, {
        id: args.id as Id<"reminders">,
        title: args.title as string | undefined,
        note: args.note as string | undefined,
        remindAt: args.remindAt as number | undefined,
        sourceLabel: args.sourceLabel as string | undefined,
        sourceUrl: args.sourceUrl as string | undefined,
      });

    case "set_reminder_completed":
      return await client.mutation(api.reminders.setCompleted, {
        id: args.id as Id<"reminders">,
        completed: args.completed as boolean,
      });

    case "snooze_reminder":
      return await client.mutation(api.reminders.snooze, {
        id: args.id as Id<"reminders">,
        remindAt: args.remindAt as number,
      });

    case "remove_reminder":
      return await client.mutation(api.reminders.remove, {
        id: args.id as Id<"reminders">,
      });

    case "get_reminders_summary":
      return await client.query(api.reminders.getSummary, {
        workspaceId: args.workspaceId as Id<"workspaces">,
        now: args.now as number | undefined,
      });

    case "list_due_reminders":
      return await client.query(api.reminders.listDue, {
        workspaceId: args.workspaceId as Id<"workspaces">,
        now: args.now as number | undefined,
      });

    // ── Comments ──────────────────────────────────────────────────────────────
    case "list_comments_by_page":
      return await client.query(api.comments.listByPage, {
        pageId: args.pageId as Id<"pages">,
      });

    case "add_comment":
      return await client.mutation(api.comments.add, {
        pageId: args.pageId as Id<"pages">,
        workspaceId: args.workspaceId as Id<"workspaces">,
        content: args.content as string,
        parentCommentId: args.parentCommentId as Id<"comments"> | undefined,
      });

    case "edit_comment":
      return await client.mutation(api.comments.edit, {
        id: args.id as Id<"comments">,
        content: args.content as string,
      });

    case "remove_comment":
      return await client.mutation(api.comments.remove, {
        id: args.id as Id<"comments">,
      });

    case "resolve_comment":
      return await client.mutation(api.comments.resolve, {
        id: args.id as Id<"comments">,
        resolved: args.resolved as boolean,
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
        category: args.category as any,
        limit: (args.limit as number | undefined) ?? 10,
      });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
