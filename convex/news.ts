import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Queries ───────────────────────────────────────────────────────────────────

export const listArticles = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("for_you"),
        v.literal("ai_ml"),
        v.literal("tech_it"),
        v.literal("productivity"),
        v.literal("must_know"),
        v.literal("general")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    let articles;
    if (args.category) {
      articles = await ctx.db
        .query("newsArticles")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .take(limit);
    } else {
      articles = await ctx.db
        .query("newsArticles")
        .withIndex("by_publishedAt")
        .order("desc")
        .take(limit);
    }
    return articles;
  },
});

export const getTopArticles = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 3;
    return await ctx.db
      .query("newsArticles")
      .withIndex("by_publishedAt")
      .order("desc")
      .take(limit);
  },
});

export const getUserPreferences = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("userNewsPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const getUserInteractions = query({
  args: { articleId: v.id("newsArticles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("userNewsInteractions")
      .withIndex("by_userId_articleId", (q) =>
        q.eq("userId", userId).eq("articleId", args.articleId)
      )
      .first();
  },
});

export const getSavedArticles = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const interactions = await ctx.db
      .query("userNewsInteractions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "saved"))
      .order("desc")
      .take(50);
    const articles = await Promise.all(
      interactions.map((i) => ctx.db.get(i.articleId))
    );
    return articles.filter(Boolean);
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const updateInteraction = mutation({
  args: {
    articleId: v.id("newsArticles"),
    status: v.union(
      v.literal("unseen"),
      v.literal("seen"),
      v.literal("read"),
      v.literal("saved"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("userNewsInteractions")
      .withIndex("by_userId_articleId", (q) =>
        q.eq("userId", userId).eq("articleId", args.articleId)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { status: args.status, interactedAt: Date.now() });
    } else {
      await ctx.db.insert("userNewsInteractions", {
        userId,
        articleId: args.articleId,
        status: args.status,
        interactedAt: Date.now(),
      });
    }
  },
});

export const updatePreferences = mutation({
  args: {
    preferredCategories: v.array(v.string()),
    keywordInterests: v.optional(v.array(v.string())),
    keywordBlocks: v.optional(v.array(v.string())),
    digestEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("userNewsPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("userNewsPreferences", { userId, ...args });
    }
  },
});

// ── Actions (seed demo data) ──────────────────────────────────────────────────

export const seedDemoArticles = action({
  handler: async (ctx) => {
    const articles = [
      {
        title: "GPT-5 Leaked: What We Know About OpenAI's Next Frontier Model",
        source: "The Verge",
        url: "https://www.theverge.com",
        summary: "OpenAI's next model reportedly achieves PhD-level reasoning on benchmarks, surpassing GPT-4o by a significant margin across all domains.",
        category: "ai_ml" as const,
        tags: ["openai", "gpt-5", "llm"],
        relevanceScore: 0.97,
        sentiment: "positive" as const,
        readingTimeMinutes: 5,
        isBreaking: true,
        publishedAt: Date.now() - 1 * 60 * 60 * 1000,
        fetchedAt: Date.now(),
      },
      {
        title: "Claude 3.5 Sonnet Now Beats GPT-4o on Coding Tasks",
        source: "Anthropic Blog",
        url: "https://anthropic.com",
        summary: "Anthropic's latest benchmark results show Claude 3.5 Sonnet outperforming GPT-4o on HumanEval, SWE-bench, and real-world development tasks.",
        category: "ai_ml" as const,
        tags: ["anthropic", "claude", "coding"],
        relevanceScore: 0.95,
        sentiment: "positive" as const,
        readingTimeMinutes: 4,
        publishedAt: Date.now() - 2 * 60 * 60 * 1000,
        fetchedAt: Date.now(),
      },
      {
        title: "Cursor IDE Surpasses 1M Developers — The AI-First Code Editor Era",
        source: "TechCrunch",
        url: "https://techcrunch.com",
        summary: "Cursor, the AI-powered fork of VS Code, has crossed 1 million active developers just 18 months after launch.",
        category: "tech_it" as const,
        tags: ["cursor", "ide", "developer-tools"],
        relevanceScore: 0.91,
        sentiment: "positive" as const,
        readingTimeMinutes: 3,
        publishedAt: Date.now() - 3 * 60 * 60 * 1000,
        fetchedAt: Date.now(),
      },
      {
        title: "The 2025 AI Productivity Stack: What Every Knowledge Worker Needs",
        source: "Ness Labs",
        url: "https://nesslabs.com",
        summary: "A comprehensive breakdown of AI tools for deep work, note-taking, writing, and project management — and how to build a sustainable workflow.",
        category: "productivity" as const,
        tags: ["productivity", "ai-tools", "workflow", "pkm"],
        relevanceScore: 0.93,
        sentiment: "positive" as const,
        readingTimeMinutes: 8,
        publishedAt: Date.now() - 5 * 60 * 60 * 1000,
        fetchedAt: Date.now(),
      },
      {
        title: "Notion AI 2.0 Launches — Full Workspace Intelligence Is Here",
        source: "Notion",
        url: "https://notion.so",
        summary: "Notion AI now works across your entire workspace — summarizing meetings, answering questions from your docs, and building automations in plain English.",
        category: "productivity" as const,
        tags: ["notion", "ai", "productivity"],
        relevanceScore: 0.89,
        sentiment: "positive" as const,
        readingTimeMinutes: 4,
        publishedAt: Date.now() - 6 * 60 * 60 * 1000,
        fetchedAt: Date.now(),
      },
      {
        title: "Google Gemini 2.0 Flash Is Now Free — Best Free AI Model in 2025",
        source: "Google AI Blog",
        url: "https://ai.google.dev",
        summary: "Gemini 2.0 Flash is now available free of charge with a generous rate limit, making it the most capable free AI model available to developers.",
        category: "ai_ml" as const,
        tags: ["google", "gemini", "free-ai"],
        relevanceScore: 0.96,
        sentiment: "positive" as const,
        readingTimeMinutes: 3,
        publishedAt: Date.now() - 8 * 60 * 60 * 1000,
        fetchedAt: Date.now(),
      },
      {
        title: "OpenRouter Now Routes 500+ Models — The API Layer Quietly Winning",
        source: "HackerNews",
        url: "https://news.ycombinator.com",
        summary: "OpenRouter has become the de-facto standard for multi-model AI access, now supporting 500+ models from 50+ providers with a single API.",
        category: "ai_ml" as const,
        tags: ["openrouter", "api", "multi-model"],
        relevanceScore: 0.90,
        sentiment: "positive" as const,
        readingTimeMinutes: 5,
        publishedAt: Date.now() - 10 * 60 * 60 * 1000,
        fetchedAt: Date.now(),
      },
      {
        title: "Second Brain Systems: How Top Researchers Structure Their PKM",
        source: "Forte Labs",
        url: "https://fortelabs.com",
        summary: "A deep-dive into how researchers, writers, and builders structure their personal knowledge management systems using PARA, Zettelkasten, and hybrid methods.",
        category: "productivity" as const,
        tags: ["pkm", "second-brain", "zettelkasten", "para"],
        relevanceScore: 0.88,
        sentiment: "neutral" as const,
        readingTimeMinutes: 12,
        publishedAt: Date.now() - 12 * 60 * 60 * 1000,
        fetchedAt: Date.now(),
      },
      {
        title: "India's Nifty 50 Hits All-Time High — What's Driving the Rally?",
        source: "Economic Times",
        url: "https://economictimes.com",
        summary: "Nifty 50 crosses 24,000 for the first time, driven by FII inflows, strong corporate earnings, and optimism on rate cuts.",
        category: "must_know" as const,
        tags: ["nifty", "stocks", "india", "markets"],
        relevanceScore: 0.85,
        sentiment: "positive" as const,
        readingTimeMinutes: 4,
        publishedAt: Date.now() - 14 * 60 * 60 * 1000,
        fetchedAt: Date.now(),
      },
      {
        title: "The Context Window Wars: 1M Tokens Is the New Default",
        source: "The Rundown AI",
        url: "https://rundown.ai",
        summary: "With Gemini 1.5 Pro, Claude 3, and Llama 3.1 all shipping million-token context windows, RAG may be less critical than it once was.",
        category: "ai_ml" as const,
        tags: ["context-window", "rag", "llm"],
        relevanceScore: 0.92,
        sentiment: "neutral" as const,
        readingTimeMinutes: 6,
        publishedAt: Date.now() - 18 * 60 * 60 * 1000,
        fetchedAt: Date.now(),
      },
    ];

    for (const article of articles) {
      await ctx.runMutation("news:insertArticle" as any, article);
    }
    return { inserted: articles.length };
  },
});

export const insertArticle = mutation({
  args: {
    title: v.string(),
    source: v.string(),
    url: v.string(),
    summary: v.optional(v.string()),
    category: v.union(
      v.literal("for_you"), v.literal("ai_ml"), v.literal("tech_it"),
      v.literal("productivity"), v.literal("must_know"), v.literal("general")
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
    sourceUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    author: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("newsArticles", args);
  },
});
