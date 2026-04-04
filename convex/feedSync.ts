import { z } from "zod";
import { action } from "./_generated/server";

type AppNewsCategory =
  | "for_you"
  | "ai_ml"
  | "tech_it"
  | "productivity"
  | "must_know"
  | "general";

type NewsSentiment = "positive" | "neutral" | "negative" | "mixed";
type NewsProvider = "the_news_api" | "gnews";

type SyncArticle = {
  title: string;
  source: string;
  url: string;
  summary?: string;
  category: AppNewsCategory;
  tags?: string[];
  relevanceScore?: number;
  sentiment?: NewsSentiment;
  readingTimeMinutes?: number;
  isBreaking?: boolean;
  publishedAt: number;
  fetchedAt: number;
  sourceUrl?: string;
  thumbnailUrl?: string;
  author?: string;
  content?: string;
};

type SyncPlan = {
  key: string;
  category: Exclude<AppNewsCategory, "for_you" | "general">;
  limit: number;
  baseRelevance: number;
  categories?: string;
  search?: string;
};

const FEED_REFRESH_WINDOW_MS = 20 * 60 * 1000;
const FEED_LANGUAGE = "en";
const FEED_LOCALES = "us,in";
const MAX_RECENT_ARTICLES_TO_CHECK = 40;

const THE_NEWS_API_BASE_URL = "https://api.thenewsapi.com/v1/news/top";
const GNEWS_TOP_HEADLINES_URL = "https://gnews.io/api/v4/top-headlines";
const GNEWS_SEARCH_URL = "https://gnews.io/api/v4/search";

const AI_KEYWORDS = [
  "ai",
  "artificial intelligence",
  "machine learning",
  "llm",
  "model",
  "openai",
  "anthropic",
  "gemini",
  "nvidia",
  "deepmind",
  "copilot",
  "chatgpt",
];

const PRODUCTIVITY_KEYWORDS = [
  "productivity",
  "workflow",
  "project management",
  "knowledge management",
  "deep work",
  "focus mode",
  "remote work",
  "automation",
  "collaboration",
  "note taking",
  "second brain",
];

const POSITIVE_KEYWORDS = [
  "surge",
  "record",
  "growth",
  "launch",
  "beat",
  "raise",
  "win",
  "funding",
  "breakthrough",
  "expands",
];

const NEGATIVE_KEYWORDS = [
  "layoff",
  "breach",
  "ban",
  "lawsuit",
  "decline",
  "crash",
  "war",
  "death",
  "risk",
  "outage",
  "tariff",
  "cuts",
  "investigation",
];

const theNewsPlans: SyncPlan[] = [
  {
    key: "broad",
    category: "must_know",
    limit: 12,
    baseRelevance: 0.84,
    categories: "general,business,politics,science,health,tech",
  },
  {
    key: "ai_ml",
    category: "ai_ml",
    limit: 10,
    baseRelevance: 0.92,
    categories: "tech,business,science",
    search:
      '"AI" | "artificial intelligence" | "machine learning" | "large language model" | OpenAI | Anthropic | Gemini | Nvidia',
  },
  {
    key: "productivity",
    category: "productivity",
    limit: 10,
    baseRelevance: 0.89,
    categories: "tech,business,health,general",
    search:
      '"productivity" | "workflow" | "knowledge management" | "project management" | automation | "deep work" | "focus mode"',
  },
];

const gnewsPlans: SyncPlan[] = [
  {
    key: "tech",
    category: "tech_it",
    limit: 10,
    baseRelevance: 0.87,
    categories: "technology",
  },
  {
    key: "must_know",
    category: "must_know",
    limit: 10,
    baseRelevance: 0.84,
    categories: "business",
  },
  {
    key: "ai_ml",
    category: "ai_ml",
    limit: 10,
    baseRelevance: 0.91,
    search:
      '"AI" OR "artificial intelligence" OR "machine learning" OR OpenAI OR Anthropic OR Gemini',
  },
  {
    key: "productivity",
    category: "productivity",
    limit: 10,
    baseRelevance: 0.88,
    search:
      '"productivity" OR workflow OR automation OR "project management" OR "knowledge management"',
  },
];

const theNewsArticleSchema = z.object({
  uuid: z.string().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  snippet: z.string().nullable().optional(),
  url: z.string(),
  image_url: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  published_at: z.string(),
  source: z.string(),
  categories: z.array(z.string()).optional().default([]),
  relevance_score: z.number().nullable().optional(),
  locale: z.string().nullable().optional(),
});

const theNewsResponseSchema = z.object({
  data: z.array(theNewsArticleSchema).default([]),
});

const gnewsArticleSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  url: z.string(),
  image: z.string().nullable().optional(),
  publishedAt: z.string(),
  source: z.object({
    name: z.string(),
    url: z.string().nullable().optional(),
  }),
});

const gnewsResponseSchema = z.object({
  articles: z.array(gnewsArticleSchema).default([]),
});

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

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

function compactText(...parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .map((part) => part.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string | undefined, maxLength: number) {
  if (!text) return undefined;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function countKeywordMatches(text: string, keywords: string[]) {
  const lowerText = text.toLowerCase();
  return keywords.filter((keyword) => lowerText.includes(keyword)).length;
}

function inferCategory(text: string, sourceCategories: string[], fallback: SyncPlan["category"]) {
  const aiMatches = countKeywordMatches(text, AI_KEYWORDS);
  const productivityMatches = countKeywordMatches(text, PRODUCTIVITY_KEYWORDS);
  const lowerCategories = sourceCategories.map((category) => category.toLowerCase());

  if (fallback === "ai_ml" || aiMatches >= 2) return "ai_ml";
  if (fallback === "productivity" || productivityMatches >= 2) return "productivity";
  if (
    lowerCategories.includes("tech") ||
    lowerCategories.includes("technology") ||
    lowerCategories.includes("science") ||
    lowerCategories.includes("science_technology")
  ) {
    return aiMatches > 0 ? "ai_ml" : "tech_it";
  }

  return fallback === "tech_it" ? "tech_it" : "must_know";
}

function inferSentiment(text: string): NewsSentiment {
  const positiveHits = countKeywordMatches(text, POSITIVE_KEYWORDS);
  const negativeHits = countKeywordMatches(text, NEGATIVE_KEYWORDS);

  if (positiveHits > 0 && negativeHits > 0) return "mixed";
  if (negativeHits > 0) return "negative";
  if (positiveHits > 0) return "positive";
  return "neutral";
}

function inferReadingTimeMinutes(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function inferIsBreaking(publishedAt: number, category: AppNewsCategory, text: string) {
  const ageMs = Date.now() - publishedAt;
  if (ageMs <= 90 * 60 * 1000 && category !== "productivity") return true;
  return /breaking|just in|developing/i.test(text);
}

function buildTags(text: string, sourceCategories: string[], rawKeywords?: string | null) {
  const tags = new Set<string>();

  for (const category of sourceCategories) {
    tags.add(category.toLowerCase().replace(/\s+/g, "_"));
  }

  for (const piece of (rawKeywords ?? "").split(/[;,]/)) {
    const tag = piece.trim().toLowerCase();
    if (tag) tags.add(tag);
  }

  if (countKeywordMatches(text, AI_KEYWORDS) > 0) tags.add("ai");
  if (countKeywordMatches(text, PRODUCTIVITY_KEYWORDS) > 0) tags.add("productivity");
  if (/markets?|stocks?|earnings?|inflation|rates?/i.test(text)) tags.add("markets");
  if (/startup|funding|ipo/i.test(text)) tags.add("startup");

  return Array.from(tags).slice(0, 6);
}

function buildRelevanceScore(
  text: string,
  sourceCategories: string[],
  baseRelevance: number,
  providerScore?: number | null
) {
  if (providerScore !== null && providerScore !== undefined) {
    return clamp(providerScore, 0.65, 0.99);
  }

  let score = baseRelevance;
  score += Math.min(0.05, countKeywordMatches(text, AI_KEYWORDS) * 0.02);
  score += Math.min(0.04, countKeywordMatches(text, PRODUCTIVITY_KEYWORDS) * 0.02);
  if (
    sourceCategories.some((category) =>
      ["tech", "technology", "science", "business", "politics"].includes(
        category.toLowerCase()
      )
    )
  ) {
    score += 0.02;
  }
  return clamp(score, 0.7, 0.97);
}

function buildSourceUrl(source: string) {
  if (!source) return undefined;
  if (source.startsWith("http://") || source.startsWith("https://")) return source;
  return `https://${source}`;
}

function chooseProvider() {
  const theNewsApiToken = process.env.THE_NEWS_API_TOKEN ?? process.env.THENEWS_API_TOKEN;
  const gnewsApiKey = process.env.GNEWS_API_KEY;

  if (theNewsApiToken) {
    return { provider: "the_news_api" as const, credential: theNewsApiToken };
  }
  if (gnewsApiKey) {
    return { provider: "gnews" as const, credential: gnewsApiKey };
  }
  return null;
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`News provider error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function fetchFromTheNewsApi(apiToken: string) {
  const aggregated = new Map<string, SyncArticle>();

  for (const plan of theNewsPlans) {
    const params = new URLSearchParams({
      api_token: apiToken,
      language: FEED_LANGUAGE,
      locale: FEED_LOCALES,
      limit: String(plan.limit),
      sort: "published_at",
    });

    if (plan.categories) params.set("categories", plan.categories);
    if (plan.search) {
      params.set("search", plan.search);
      params.set("search_fields", "title,description,keywords,main_text");
    }

    const response = theNewsResponseSchema.parse(
      await fetchJson(`${THE_NEWS_API_BASE_URL}?${params.toString()}`)
    );

    for (const article of response.data) {
      const text = compactText(
        article.title,
        article.description,
        article.snippet,
        article.keywords
      );
      const publishedAt = new Date(article.published_at).getTime();

      if (!article.title || !article.url || Number.isNaN(publishedAt)) continue;

      const category = inferCategory(text, article.categories, plan.category);
      const normalizedUrl = normalizeArticleUrl(article.url);
      const nextArticle: SyncArticle = {
        title: article.title,
        source: article.source,
        sourceUrl: buildSourceUrl(article.source),
        url: normalizedUrl,
        summary: truncate(compactText(article.description, article.snippet), 260),
        category,
        tags: buildTags(text, article.categories, article.keywords),
        relevanceScore: buildRelevanceScore(
          text,
          article.categories,
          plan.baseRelevance,
          article.relevance_score
        ),
        sentiment: inferSentiment(text),
        readingTimeMinutes: inferReadingTimeMinutes(text),
        isBreaking: inferIsBreaking(publishedAt, category, text),
        publishedAt,
        fetchedAt: Date.now(),
        thumbnailUrl: article.image_url ?? undefined,
        content: truncate(article.snippet ?? undefined, 400),
      };

      const existing = aggregated.get(normalizedUrl);
      if (
        !existing ||
        (nextArticle.relevanceScore ?? 0) > (existing.relevanceScore ?? 0) ||
        nextArticle.publishedAt > existing.publishedAt
      ) {
        aggregated.set(normalizedUrl, nextArticle);
      }
    }
  }

  return Array.from(aggregated.values()).sort((a, b) => b.publishedAt - a.publishedAt);
}

async function fetchFromGNews(apiKey: string) {
  const aggregated = new Map<string, SyncArticle>();

  for (const plan of gnewsPlans) {
    const params = new URLSearchParams({
      lang: FEED_LANGUAGE,
      country: "us",
      max: String(plan.limit),
      apikey: apiKey,
    });

    const baseUrl = plan.search ? GNEWS_SEARCH_URL : GNEWS_TOP_HEADLINES_URL;
    if (plan.search) {
      params.set("q", plan.search);
      params.set("in", "title,description");
    } else if (plan.categories) {
      params.set("category", plan.categories);
    }

    const response = gnewsResponseSchema.parse(await fetchJson(`${baseUrl}?${params.toString()}`));

    for (const article of response.articles) {
      const text = compactText(article.title, article.description, article.content);
      const publishedAt = new Date(article.publishedAt).getTime();

      if (!article.title || !article.url || Number.isNaN(publishedAt)) continue;

      const inferredSourceCategories =
        plan.category === "tech_it"
          ? ["technology"]
          : plan.category === "ai_ml"
            ? ["tech"]
            : plan.category === "productivity"
              ? ["business"]
              : ["business", "general"];

      const category = inferCategory(text, inferredSourceCategories, plan.category);
      const normalizedUrl = normalizeArticleUrl(article.url);
      const nextArticle: SyncArticle = {
        title: article.title,
        source: article.source.name,
        sourceUrl: article.source.url ?? undefined,
        url: normalizedUrl,
        summary: truncate(article.description ?? undefined, 260),
        category,
        tags: buildTags(text, inferredSourceCategories),
        relevanceScore: buildRelevanceScore(text, inferredSourceCategories, plan.baseRelevance),
        sentiment: inferSentiment(text),
        readingTimeMinutes: inferReadingTimeMinutes(text),
        isBreaking: inferIsBreaking(publishedAt, category, text),
        publishedAt,
        fetchedAt: Date.now(),
        thumbnailUrl: article.image ?? undefined,
        content: truncate(article.content ?? undefined, 400),
      };

      const existing = aggregated.get(normalizedUrl);
      if (
        !existing ||
        (nextArticle.relevanceScore ?? 0) > (existing.relevanceScore ?? 0) ||
        nextArticle.publishedAt > existing.publishedAt
      ) {
        aggregated.set(normalizedUrl, nextArticle);
      }
    }
  }

  return Array.from(aggregated.values()).sort((a, b) => b.publishedAt - a.publishedAt);
}

async function fetchArticlesForProvider(provider: NewsProvider, credential: string) {
  if (provider === "the_news_api") {
    return fetchFromTheNewsApi(credential);
  }
  return fetchFromGNews(credential);
}

export const fetchAndProcessFeed = action({
  args: {},
  handler: async (ctx) => {
    const providerConfig = chooseProvider();

    if (!providerConfig) {
      console.warn(
        "feedSync: Missing THE_NEWS_API_TOKEN/THENEWS_API_TOKEN and GNEWS_API_KEY. Skipping feed sync."
      );
      return {
        success: false,
        reason: "Missing news provider key",
      };
    }

    const recentArticles = (await ctx.runQuery("feed:listArticles" as any, {
      limit: MAX_RECENT_ARTICLES_TO_CHECK,
    })) as Array<{ fetchedAt?: number }>;
    const lastFetchedAt = recentArticles.reduce(
      (latest, article) => Math.max(latest, article.fetchedAt ?? 0),
      0
    );

    if (lastFetchedAt && Date.now() - lastFetchedAt < FEED_REFRESH_WINDOW_MS) {
      return {
        success: true,
        skipped: true,
        provider: providerConfig.provider,
        reason: "Feed refreshed recently",
        fetchedAt: lastFetchedAt,
      };
    }

    try {
      const articles = await fetchArticlesForProvider(
        providerConfig.provider,
        providerConfig.credential
      );

      if (articles.length === 0) {
        return {
          success: true,
          skipped: true,
          provider: providerConfig.provider,
          reason: "Provider returned no articles",
        };
      }

      const upsertResult = await ctx.runMutation("feed:bulkUpsertArticles" as any, {
        articles,
      });

      return {
        success: true,
        provider: providerConfig.provider,
        fetched: articles.length,
        ...upsertResult,
      };
    } catch (error) {
      console.error("Error in fetchAndProcessFeed:", error);
      return {
        success: false,
        provider: providerConfig.provider,
        error: String(error),
      };
    }
  },
});
