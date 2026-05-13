import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const newsCategoryValidator = v.union(
  v.literal("for_you"),
  v.literal("ai_ml"),
  v.literal("tech_it"),
  v.literal("productivity"),
  v.literal("must_know"),
  v.literal("general")
);

const newsSentimentValidator = v.union(
  v.literal("positive"),
  v.literal("neutral"),
  v.literal("negative"),
  v.literal("mixed")
);

const newsArticleFields = {
  title: v.string(),
  source: v.string(),
  url: v.string(),
  summary: v.optional(v.string()),
  category: newsCategoryValidator,
  tags: v.optional(v.array(v.string())),
  relevanceScore: v.optional(v.number()),
  sentiment: v.optional(newsSentimentValidator),
  readingTimeMinutes: v.optional(v.number()),
  isBreaking: v.optional(v.boolean()),
  publishedAt: v.number(),
  fetchedAt: v.number(),
  sourceUrl: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  author: v.optional(v.string()),
  content: v.optional(v.string()),
};

function normalizeArticleUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    parsed.searchParams.delete("utm_term");
    parsed.searchParams.delete("utm_content");
    parsed.searchParams.delete("fbclid");
    parsed.searchParams.delete("gclid");
    parsed.searchParams.delete("ref");
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const listArticles = query({
  args: {
    category: v.optional(newsCategoryValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    if (args.category) {
      return await ctx.db
        .query("newsArticles")
        .withIndex("by_publishedAt")
        .order("desc")
        .filter((q) => q.eq(q.field("category"), args.category))
        .take(limit);
    }
    return await ctx.db
      .query("newsArticles")
      .withIndex("by_publishedAt")
      .order("desc")
      .take(limit);
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

export const insertArticle = mutation({
  args: newsArticleFields,
  handler: async (ctx, args) => {
    return await ctx.db.insert("newsArticles", args);
  },
});

export const bulkUpsertArticles = mutation({
  args: {
    articles: v.array(v.object(newsArticleFields)),
  },
  handler: async (ctx, args) => {
    const recentArticles = await ctx.db
      .query("newsArticles")
      .withIndex("by_publishedAt")
      .order("desc")
      .take(400);

    const existingByUrl = new Map<
      string,
      {
        _id: (typeof recentArticles)[number]["_id"];
        source: string;
        title: string;
        url: string;
        publishedAt: number;
        fetchedAt: number;
      }
    >(
      recentArticles.map((article) => [normalizeArticleUrl(article.url), article] as const)
    );
    const existingByTitle = new Map<
      string,
      {
        _id: (typeof recentArticles)[number]["_id"];
        source: string;
        title: string;
        url: string;
        publishedAt: number;
        fetchedAt: number;
      }
    >(
      recentArticles.map((article) => [
        `${article.source.toLowerCase()}::${article.title.trim().toLowerCase()}`,
        article,
      ] as const)
    );

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const article of args.articles) {
      const normalizedUrl = normalizeArticleUrl(article.url);
      const titleKey = `${article.source.toLowerCase()}::${article.title.trim().toLowerCase()}`;
      const existing = existingByUrl.get(normalizedUrl) ?? existingByTitle.get(titleKey);

      if (!existing) {
        const insertedId = await ctx.db.insert("newsArticles", article);
        const storedArticle = {
          _id: insertedId,
          source: article.source,
          title: article.title,
          url: article.url,
          publishedAt: article.publishedAt,
          fetchedAt: article.fetchedAt,
        };
        existingByUrl.set(normalizedUrl, storedArticle);
        existingByTitle.set(titleKey, storedArticle);
        inserted++;
        continue;
      }

      const incomingIsNewer =
        article.publishedAt > existing.publishedAt || article.fetchedAt > existing.fetchedAt;

      if (!incomingIsNewer) {
        skipped++;
        continue;
      }

      await ctx.db.patch(existing._id, article);

      const patchedArticle = {
        _id: existing._id,
        source: article.source,
        title: article.title,
        url: article.url,
        publishedAt: article.publishedAt,
        fetchedAt: article.fetchedAt,
      };
      existingByUrl.set(normalizedUrl, patchedArticle);
      existingByTitle.set(titleKey, patchedArticle);
      updated++;
    }

    return { inserted, updated, skipped };
  },
});
