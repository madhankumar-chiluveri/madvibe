import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // ── Workspaces ─────────────────────────────────────
  workspaces: defineTable({
    name: v.string(),
    userId: v.string(),
    icon: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

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
    type: v.union(
      v.literal("savings"), v.literal("checking"), v.literal("credit_card"),
      v.literal("cash"), v.literal("investment"), v.literal("loan"), v.literal("wallet")
    ),
    currency: v.string(),
    balance: v.number(),
    institution: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

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
    type: v.union(v.literal("income"), v.literal("expense"), v.literal("transfer"), v.literal("investment")),
    amount: v.number(),
    currency: v.string(),
    categoryId: v.optional(v.id("financeCategories")),
    merchant: v.optional(v.string()),
    description: v.string(),
    notes: v.optional(v.string()),
    date: v.string(), // "YYYY-MM-DD"
    isRecurring: v.boolean(),
    recurringId: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    aiCategorized: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_date", ["userId", "date"])
    .index("by_accountId", ["accountId"]),

  financeBudgets: defineTable({
    userId: v.string(),
    categoryId: v.id("financeCategories"),
    amount: v.number(),
    period: v.union(v.literal("monthly"), v.literal("quarterly"), v.literal("yearly")),
    startDate: v.string(),
    rollover: v.boolean(),
    alertThresholds: v.array(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_category", ["userId", "categoryId"]),

  financeInvestments: defineTable({
    userId: v.string(),
    assetType: v.union(
      v.literal("stock"), v.literal("mutual_fund"), v.literal("etf"),
      v.literal("fd"), v.literal("ppf"), v.literal("gold"),
      v.literal("crypto"), v.literal("real_estate"), v.literal("bond"), v.literal("other")
    ),
    symbol: v.optional(v.string()),
    name: v.string(),
    quantity: v.number(),
    buyPrice: v.number(),
    buyDate: v.string(),
    currentPrice: v.optional(v.number()),
    platform: v.optional(v.string()),
    isSip: v.optional(v.boolean()),
    sipAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  financeGoals: defineTable({
    userId: v.string(),
    name: v.string(),
    targetAmount: v.number(),
    currentAmount: v.number(),
    targetDate: v.string(),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    strategy: v.optional(v.string()),
    createdAt: v.number(),
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
      v.literal("overview"), v.literal("news"), v.literal("kb"),
      v.literal("finance"), v.literal("ai")
    ),
    actionUrl: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_isRead", ["userId", "isRead"]),
});
