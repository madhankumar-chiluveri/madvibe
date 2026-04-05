import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import {
  financeAccountTypeValidator,
  financeAssetTypeValidator,
  financeBudgetPeriodValidator,
  financeCreditCardNetworkValidator,
  financeDividendTypeValidator,
  financeGoalPriorityValidator,
  financeIpoStatusValidator,
  financeLoanDirectionValidator,
  financeLoanStatusValidator,
  financeMarketAssetTypeValidator,
  financeMarketHistoryPointValidator,
  financeMarketStatusValidator,
  financeRecurringFrequencyValidator,
  financeTransactionTypeValidator,
  financeTransferDirectionValidator,
} from "./financeShared";
import {
  workspaceInviteStatusValidator,
  workspaceRoleValidator,
} from "./workspaceShared";

export default defineSchema({
  ...authTables,

  // ── Workspaces ─────────────────────────────────────
  workspaces: defineTable({
    name: v.string(),
    userId: v.string(),
    icon: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    role: workspaceRoleValidator,
    invitedByUserId: v.string(),
    joinedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_userId", ["userId"])
    .index("by_workspaceId_userId", ["workspaceId", "userId"]),

  workspaceInvites: defineTable({
    workspaceId: v.id("workspaces"),
    email: v.string(),
    invitedUserId: v.optional(v.string()),
    role: workspaceRoleValidator,
    status: workspaceInviteStatusValidator,
    invitedByUserId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_email", ["workspaceId", "email"])
    .index("by_email_status", ["email", "status"]),

  // ── KB Pages ───────────────────────────────────────
  pages: defineTable({
    workspaceId: v.id("workspaces"),
    parentId: v.union(v.id("pages"), v.null()),
    type: v.union(v.literal("document"), v.literal("database"), v.literal("dashboard")),
    isSpaceRoot: v.optional(v.boolean()),
    title: v.string(),
    icon: v.optional(v.union(v.string(), v.null())),
    coverImage: v.optional(v.union(v.string(), v.null())),
    isFullWidth: v.boolean(),
    isFavourite: v.boolean(),
    isArchived: v.boolean(),
    archivedAt: v.optional(v.union(v.number(), v.null())),
    sortOrder: v.number(),
    createdBy: v.string(),
    updatedAt: v.number(),
    maddyTags: v.optional(v.array(v.string())),
    maddySuggested: v.optional(v.array(v.string())),
    isDailyNote: v.optional(v.boolean()),
    dailyNoteDate: v.optional(v.string()), // "YYYY-MM-DD"
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_parentId", ["parentId"])
    .index("by_workspaceId_archived", ["workspaceId", "isArchived"])
    .index("by_dailyNoteDate", ["workspaceId", "dailyNoteDate"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["workspaceId", "isArchived"],
    }),

  // ── KB Blocks ──────────────────────────────────────
  blocks: defineTable({
    pageId: v.id("pages"),
    type: v.string(),
    content: v.any(),
    parentBlockId: v.optional(v.union(v.id("blocks"), v.null())),
    sortOrder: v.number(),
    properties: v.optional(v.any()),
    updatedAt: v.number(),
  })
    .index("by_pageId", ["pageId"])
    .index("by_parentBlockId", ["parentBlockId"]),

  // ── KB Databases ───────────────────────────────────
  databases: defineTable({
    pageId: v.id("pages"),
    name: v.string(),
    properties: v.array(v.any()),
    defaultViewId: v.optional(v.union(v.id("views"), v.null())),
  }).index("by_pageId", ["pageId"]),

  rows: defineTable({
    databaseId: v.id("databases"),
    pageId: v.optional(v.union(v.id("pages"), v.null())),
    data: v.any(),
    sortOrder: v.number(),
    isArchived: v.optional(v.boolean()),
  })
    .index("by_databaseId", ["databaseId"])
    .index("by_pageId", ["pageId"]),

  views: defineTable({
    databaseId: v.id("databases"),
    name: v.string(),
    type: v.union(
      v.literal("table"),
      v.literal("board"),
      v.literal("list"),
      v.literal("calendar"),
      v.literal("gallery"),
      v.literal("timeline")
    ),
    filters: v.optional(v.any()),
    sorts: v.optional(v.array(v.any())),
    groupBy: v.optional(v.union(v.string(), v.null())),
    visibleProperties: v.optional(v.array(v.string())),
    cardCoverPropertyId: v.optional(v.union(v.string(), v.null())),
  }).index("by_databaseId", ["databaseId"]),

  // ── Maddy Embeddings ───────────────────────────────
  maddyEmbeddings: defineTable({
    pageId: v.id("pages"),
    vector: v.array(v.float64()),
    contentHash: v.string(),
    updatedAt: v.number(),
  })
    .index("by_pageId", ["pageId"])
    .vectorIndex("by_vector", {
      vectorField: "vector",
      dimensions: 768,
      filterFields: [],
    }),

  // ── User Settings ──────────────────────────────────
  userSettings: defineTable({
    userId: v.string(),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
    accentColor: v.optional(v.string()),
    fontFamily: v.optional(v.union(v.literal("default"), v.literal("serif"), v.literal("mono"))),
    maddyEnabled: v.optional(v.boolean()),
    fullWidthDefault: v.optional(v.boolean()),
    // AI provider settings
    openrouterKey: v.optional(v.string()),
    anthropicKey: v.optional(v.string()),
    openaiKey: v.optional(v.string()),
    googleKey: v.optional(v.string()),
    groqKey: v.optional(v.string()),
    ollamaEndpoint: v.optional(v.string()),
    defaultModel: v.optional(v.string()),
    defaultProvider: v.optional(v.string()),
    aiSystemPrompt: v.optional(v.string()),
    aiTemperature: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  // ── News ───────────────────────────────────────────
  ledgerPinConfigs: defineTable({
    userId: v.string(),
    pinHash: v.string(),
    pinSalt: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastVerifiedAt: v.optional(v.number()),
    lastResetEmailSentAt: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  ledgerPinResetTokens: defineTable({
    userId: v.string(),
    email: v.string(),
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_tokenHash", ["tokenHash"]),

  newsArticles: defineTable({
    title: v.string(),
    source: v.string(),
    sourceUrl: v.optional(v.string()),
    url: v.string(),
    summary: v.optional(v.string()),
    content: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    author: v.optional(v.string()),
    category: v.union(
      v.literal("for_you"),
      v.literal("ai_ml"),
      v.literal("tech_it"),
      v.literal("productivity"),
      v.literal("must_know"),
      v.literal("general")
    ),
    tags: v.optional(v.array(v.string())),
    relevanceScore: v.optional(v.number()),
    sentiment: v.optional(v.union(
      v.literal("positive"), v.literal("neutral"), v.literal("negative"), v.literal("mixed")
    )),
    readingTimeMinutes: v.optional(v.number()),
    isBreaking: v.optional(v.boolean()),
    publishedAt: v.number(),
    fetchedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_publishedAt", ["publishedAt"]),

  userNewsInteractions: defineTable({
    userId: v.string(),
    articleId: v.id("newsArticles"),
    status: v.union(
      v.literal("unseen"), v.literal("seen"), v.literal("read"), v.literal("saved"), v.literal("archived")
    ),
    savedToKb: v.optional(v.boolean()),
    reaction: v.optional(v.string()),
    interactedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_articleId", ["userId", "articleId"]),

  userNewsPreferences: defineTable({
    userId: v.string(),
    preferredCategories: v.array(v.string()),
    keywordInterests: v.optional(v.array(v.string())),
    keywordBlocks: v.optional(v.array(v.string())),
    digestEnabled: v.optional(v.boolean()),
    digestTime: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  // ── Finance ────────────────────────────────────────
  financeAccounts: defineTable({
    userId: v.string(),
    name: v.string(),
    type: financeAccountTypeValidator,
    currency: v.string(),
    balance: v.number(),
    institution: v.optional(v.string()),
    accountNumberLast4: v.optional(v.string()),
    notes: v.optional(v.string()),
    color: v.optional(v.string()),
    creditLimit: v.optional(v.number()),
    statementBalance: v.optional(v.number()),
    availableCredit: v.optional(v.number()),
    rewardPoints: v.optional(v.number()),
    billingDay: v.optional(v.number()),
    dueDay: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_type", ["userId", "type"]),

  financeCreditCards: defineTable({
    userId: v.string(),
    accountId: v.id("financeAccounts"),
    issuer: v.string(),
    network: v.optional(financeCreditCardNetworkValidator),
    cardName: v.optional(v.string()),
    lastFour: v.optional(v.string()),
    creditLimit: v.number(),
    statementBalance: v.number(),
    currentBalance: v.number(),
    availableCredit: v.number(),
    billingDay: v.number(),
    dueDay: v.number(),
    minimumDue: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    lastStatementDate: v.optional(v.string()),
    rewardPoints: v.optional(v.number()),
    rewardProgram: v.optional(v.string()),
    autoPayAccountId: v.optional(v.id("financeAccounts")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_accountId", ["accountId"]),

  financeCategories: defineTable({
    userId: v.optional(v.string()), // null = system default
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    parentId: v.optional(v.string()),
    sortOrder: v.number(),
    isSystem: v.optional(v.boolean()),
  })
    .index("by_userId", ["userId"])
    .index("by_type", ["type"]),

  financeTransactions: defineTable({
    userId: v.string(),
    accountId: v.id("financeAccounts"),
    type: financeTransactionTypeValidator,
    amount: v.number(),
    currency: v.string(),
    categoryId: v.optional(v.id("financeCategories")),
    sourceAccountId: v.optional(v.id("financeAccounts")),
    destinationAccountId: v.optional(v.id("financeAccounts")),
    transferDirection: v.optional(financeTransferDirectionValidator),
    transferGroupId: v.optional(v.string()),
    linkedCreditCardId: v.optional(v.id("financeCreditCards")),
    loanId: v.optional(v.id("financeLoans")),
    splitFromTransactionId: v.optional(v.id("financeTransactions")),
    merchant: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.string(),
    notes: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
    date: v.string(), // "YYYY-MM-DD"
    status: v.optional(
      v.union(
        v.literal("posted"),
        v.literal("pending"),
        v.literal("cleared"),
        v.literal("void"),
      ),
    ),
    isRecurring: v.boolean(),
    recurringId: v.optional(v.id("financeRecurring")),
    tags: v.optional(v.array(v.string())),
    aiCategorized: v.optional(v.boolean()),
    originalAmount: v.optional(v.number()),
    originalCurrency: v.optional(v.string()),
    exchangeRate: v.optional(v.number()),
    affectsBalance: v.optional(v.boolean()),
    isSplitParent: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_date", ["userId", "date"])
    .index("by_accountId", ["accountId"])
    .index("by_loanId", ["loanId"])
    .index("by_recurringId", ["recurringId"])
    .index("by_transferGroupId", ["transferGroupId"]),

  financeBudgets: defineTable({
    userId: v.string(),
    categoryId: v.id("financeCategories"),
    amount: v.number(),
    period: financeBudgetPeriodValidator,
    startDate: v.string(),
    rollover: v.boolean(),
    alertThresholds: v.array(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_category", ["userId", "categoryId"]),

  financeInvestments: defineTable({
    userId: v.string(),
    assetType: financeAssetTypeValidator,
    symbol: v.optional(v.string()),
    exchange: v.optional(v.string()),
    name: v.string(),
    quantity: v.number(),
    buyPrice: v.number(),
    buyDate: v.string(),
    currentPrice: v.optional(v.number()),
    currency: v.optional(v.string()),
    platform: v.optional(v.string()),
    accountId: v.optional(v.id("financeAccounts")),
    isSip: v.optional(v.boolean()),
    sipAmount: v.optional(v.number()),
    sipDay: v.optional(v.number()),
    lastSyncedAt: v.optional(v.number()),
    dividendYield: v.optional(v.number()),
    taxType: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_symbol", ["userId", "symbol"]),

  financeInvestmentLots: defineTable({
    userId: v.string(),
    investmentId: v.id("financeInvestments"),
    accountId: v.optional(v.id("financeAccounts")),
    quantity: v.number(),
    remainingQuantity: v.number(),
    buyPrice: v.number(),
    investedAmount: v.number(),
    buyDate: v.string(),
    fees: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_investmentId", ["investmentId"]),

  financeMarketData: defineTable({
    symbol: v.string(),
    assetType: financeMarketAssetTypeValidator,
    displayName: v.optional(v.string()),
    exchange: v.optional(v.string()),
    currency: v.string(),
    price: v.number(),
    previousClose: v.optional(v.number()),
    change: v.optional(v.number()),
    changePercent: v.optional(v.number()),
    marketState: v.optional(financeMarketStatusValidator),
    source: v.string(),
    fetchedAt: v.number(),
    expiresAt: v.number(),
    history: v.optional(v.array(financeMarketHistoryPointValidator)),
  })
    .index("by_symbol", ["symbol"])
    .index("by_symbol_assetType", ["symbol", "assetType"])
    .index("by_expiresAt", ["expiresAt"]),

  financeLoans: defineTable({
    userId: v.string(),
    direction: financeLoanDirectionValidator,
    counterpartyName: v.string(),
    principalAmount: v.number(),
    currentBalance: v.number(),
    currency: v.string(),
    issuedDate: v.string(),
    dueDate: v.optional(v.string()),
    status: financeLoanStatusValidator,
    linkedAccountId: v.optional(v.id("financeAccounts")),
    interestRate: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"])
    .index("by_linkedAccountId", ["linkedAccountId"]),

  financeLoanRepayments: defineTable({
    userId: v.string(),
    loanId: v.id("financeLoans"),
    amount: v.number(),
    currency: v.string(),
    date: v.string(),
    accountId: v.optional(v.id("financeAccounts")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_loanId", ["loanId"]),

  financeRecurring: defineTable({
    userId: v.string(),
    title: v.string(),
    type: financeTransactionTypeValidator,
    amount: v.number(),
    currency: v.string(),
    accountId: v.id("financeAccounts"),
    destinationAccountId: v.optional(v.id("financeAccounts")),
    categoryId: v.optional(v.id("financeCategories")),
    loanId: v.optional(v.id("financeLoans")),
    linkedCreditCardId: v.optional(v.id("financeCreditCards")),
    description: v.string(),
    notes: v.optional(v.string()),
    merchant: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    frequency: financeRecurringFrequencyValidator,
    interval: v.number(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    nextDueDate: v.string(),
    lastProcessedAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_dueDate", ["userId", "nextDueDate"])
    .index("by_accountId", ["accountId"]),

  financeDividends: defineTable({
    userId: v.string(),
    investmentId: v.id("financeInvestments"),
    amount: v.number(),
    currency: v.string(),
    type: financeDividendTypeValidator,
    recordDate: v.string(),
    payoutDate: v.optional(v.string()),
    taxWithheld: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_investmentId", ["investmentId"]),

  financeIPOs: defineTable({
    userId: v.optional(v.string()),
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
    subscriptionStatus: v.optional(v.string()),
    notes: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_userId", ["userId"]),

  financeGoals: defineTable({
    userId: v.string(),
    name: v.string(),
    targetAmount: v.number(),
    currentAmount: v.number(),
    targetDate: v.string(),
    priority: financeGoalPriorityValidator,
    strategy: v.optional(v.string()),
    linkedAccountId: v.optional(v.id("financeAccounts")),
    autoContribute: v.optional(v.number()),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  // ── AI Conversations ───────────────────────────────
  aiConversations: defineTable({
    userId: v.string(),
    title: v.string(),
    model: v.string(),
    provider: v.string(),
    contextModule: v.optional(v.string()),
    contextPageId: v.optional(v.string()),
    isPinned: v.boolean(),
    messageCount: v.number(),
    totalTokens: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_updatedAt", ["userId", "updatedAt"]),

  aiMessages: defineTable({
    conversationId: v.id("aiConversations"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    model: v.optional(v.string()),
    tokensInput: v.optional(v.number()),
    tokensOutput: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_conversationId_createdAt", ["conversationId", "createdAt"]),

  // ── Habits ─────────────────────────────────────────
  habits: defineTable({
    userId: v.string(),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    frequency: v.union(v.literal("daily"), v.literal("weekdays"), v.literal("weekends"), v.literal("custom")),
    customDays: v.optional(v.array(v.number())), // 0=Sun, 6=Sat
    streak: v.number(),
    longestStreak: v.number(),
    isActive: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  habitLogs: defineTable({
    habitId: v.id("habits"),
    userId: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
  })
    .index("by_habitId_date", ["habitId", "date"])
    .index("by_userId_date", ["userId", "date"]),

  // ── Focus Sessions ─────────────────────────────────
  focusSessions: defineTable({
    userId: v.string(),
    duration: v.number(), // minutes
    taskNote: v.optional(v.string()),
    pageId: v.optional(v.string()),
    completedAt: v.number(),
    wasCompleted: v.boolean(),
  }).index("by_userId", ["userId"]),

  // ── Notifications ──────────────────────────────────
  notifications: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("task_due"), v.literal("budget_alert"), v.literal("bill_reminder"),
      v.literal("breaking_news"), v.literal("ai_insight"), v.literal("weekly_review"),
      v.literal("habit_streak"), v.literal("investment_alert")
    ),
    title: v.string(),
    body: v.string(),
    module: v.union(
      v.literal("overview"), v.literal("feed"), v.literal("brain"),
      v.literal("ledger"), v.literal("ai")
    ),
    actionUrl: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_isRead", ["userId", "isRead"]),

  // ── Page Comments ──────────────────────────────────
  comments: defineTable({
    pageId: v.id("pages"),
    workspaceId: v.id("workspaces"),
    parentCommentId: v.optional(v.union(v.id("comments"), v.null())),
    authorId: v.string(),
    authorName: v.optional(v.string()),
    content: v.string(),
    isResolved: v.boolean(),
    resolvedAt: v.optional(v.union(v.number(), v.null())),
    resolvedBy: v.optional(v.union(v.string(), v.null())),
    editedAt: v.optional(v.union(v.number(), v.null())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_pageId", ["pageId"])
    .index("by_parentCommentId", ["parentCommentId"]),

  reminders: defineTable({
    userId: v.string(),
    workspaceId: v.id("workspaces"),
    title: v.string(),
    note: v.optional(v.string()),
    remindAt: v.number(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    pageId: v.optional(v.union(v.id("pages"), v.null())),
    databaseId: v.optional(v.union(v.id("databases"), v.null())),
    rowId: v.optional(v.union(v.id("rows"), v.null())),
    sourceLabel: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    completedAt: v.optional(v.union(v.number(), v.null())),
    notifiedAt: v.optional(v.union(v.number(), v.null())),
    scheduledFunctionId: v.optional(v.id("_scheduled_functions")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_workspaceId_remindAt", ["workspaceId", "remindAt"])
    .index("by_workspaceId_status_remindAt", ["workspaceId", "status", "remindAt"]),
});
