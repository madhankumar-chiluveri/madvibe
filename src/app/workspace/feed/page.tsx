"use client";

import { memo, useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";
import { Rss, Clock, TrendingUp, Flame, RefreshCw } from "lucide-react";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";

// ── Category config ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: null, label: "For You", color: "bg-notion-gray-bg text-notion-gray-text" },
  { id: "ai_ml", label: "AI & ML", color: "bg-notion-blue-bg text-notion-blue-text" },
  { id: "tech_it", label: "Tech & IT", color: "bg-notion-purple-bg text-notion-purple-text" },
  { id: "productivity", label: "Productivity", color: "bg-notion-green-bg text-notion-green-text" },
  { id: "must_know", label: "Must Know", color: "bg-notion-orange-bg text-notion-orange-text" },
] as const;

type Category = typeof CATEGORIES[number];

function getCategoryGradient(category: string | null) {
  switch (category) {
    case "ai_ml":       return "from-[var(--notion-blue-bg)] via-[var(--notion-blue-bg)] to-[var(--notion-purple-bg)]";
    case "tech_it":     return "from-[var(--notion-purple-bg)] via-[var(--notion-purple-bg)] to-[var(--notion-gray-bg)]";
    case "productivity": return "from-[var(--notion-green-bg)] via-[var(--notion-green-bg)] to-[var(--notion-yellow-bg)]";
    case "must_know":   return "from-[var(--notion-orange-bg)] via-[var(--notion-orange-bg)] to-[var(--notion-red-bg)]";
    default:            return "from-[var(--notion-gray-bg)] via-[var(--notion-gray-bg)] to-[var(--notion-brown-bg)]";
  }
}

function getCategoryGradientSmall(category: string | null) {
  switch (category) {
    case "ai_ml":       return "from-[var(--notion-blue-bg)] to-[var(--notion-purple-bg)]";
    case "tech_it":     return "from-[var(--notion-purple-bg)] to-[var(--notion-gray-bg)]";
    case "productivity": return "from-[var(--notion-green-bg)] to-[var(--notion-yellow-bg)]";
    case "must_know":   return "from-[var(--notion-orange-bg)] to-[var(--notion-red-bg)]";
    default:            return "from-[var(--notion-gray-bg)] to-[var(--notion-brown-bg)]";
  }
}

function openArticle(url?: string) {
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

function formatSyncAge(timestamp?: number | null) {
  if (!timestamp) return "Waiting for the first live sync.";

  const diff = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(diff / 60_000));
  if (minutes < 60) return `Updated ${minutes}m ago.`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago.`;

  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago.`;
}

// ── Article Card (desktop) ────────────────────────────────────────────────────
const ArticleCard = memo(function ArticleCard({ article }: { article: any }) {
  const catConfig = CATEGORIES.find((c) => c.id === article.category) ?? CATEGORIES[0];

  const publishedAgo = () => {
    const diff = Date.now() - article.publishedAt;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor(diff / 60_000);
    return h > 0 ? `${h}h ago` : `${m}m ago`;
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => openArticle(article.url)}
      onKeyDown={(e) => e.key === "Enter" && openArticle(article.url)}
      className="group cursor-pointer overflow-hidden rounded-[10px] border border-border bg-card transition-all hover:shadow-[0_10px_24px_rgba(0,0,0,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      {/* Gradient thumbnail */}
      <div
        className={cn(
          "h-28 md:h-36 relative overflow-hidden bg-gradient-to-br",
          getCategoryGradient(article.category)
        )}
      >
        {article.isBreaking && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-notion-red-text px-2 py-0.5 text-[10px] font-bold text-white">
            <Flame className="w-2.5 h-2.5" /> BREAKING
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-foreground/60 px-2 py-0.5 text-[10px] text-white">
          <Clock className="w-2.5 h-2.5" />
          {article.readingTimeMinutes ?? 3}m read
        </div>
      </div>

      <div className="p-3 md:p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", catConfig.color)}>
            {catConfig.label}
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto">{publishedAgo()}</span>
        </div>
        <h3
          className={cn(
            "mb-1.5 line-clamp-2 text-sm font-semibold leading-snug transition-colors",
            article.isRead ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {article.title}
        </h3>
        {article.summary && (
          <p
            className={cn(
              "line-clamp-2 text-xs leading-relaxed",
              article.isRead ? "text-muted-foreground/80" : "text-muted-foreground"
            )}
          >
            {article.summary}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t">
          <Rss className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-medium">{article.source}</span>
          {article.relevanceScore && article.relevanceScore > 0.92 && (
            <div className="ml-auto flex items-center gap-1 text-[10px] font-medium text-notion-green-text">
              <TrendingUp className="w-3 h-3" /> Trending
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Article Row (mobile) ──────────────────────────────────────────────────────
const ArticleRow = memo(function ArticleRow({ article }: { article: any }) {
  const catConfig = CATEGORIES.find((c) => c.id === article.category) ?? CATEGORIES[0];

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => openArticle(article.url)}
      onKeyDown={(e) => e.key === "Enter" && openArticle(article.url)}
      className="flex cursor-pointer gap-3 rounded-[10px] border border-border bg-card p-3 transition-all hover:shadow-[0_8px_18px_rgba(0,0,0,0.1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      <div
        className={cn(
          "w-16 h-16 rounded-lg shrink-0 bg-gradient-to-br",
          getCategoryGradientSmall(article.category)
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", catConfig.color)}>
            {catConfig.label}
          </span>
          {article.isBreaking && (
            <span className="text-[9px] font-bold text-notion-red-text">● BREAKING</span>
          )}
        </div>
        <p
          className={cn(
            "line-clamp-2 text-sm font-medium leading-snug",
            article.isRead ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {article.title}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {article.source} · {article.readingTimeMinutes ?? 3}m
        </p>
      </div>
    </div>
  );
});

// ── Category Tab ──────────────────────────────────────────────────────────────
const CategoryTab = memo(function CategoryTab({
  cat,
  activeCategory,
  onClick,
}: {
  cat: Category;
  activeCategory: string | null;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all min-h-[36px]",
        activeCategory === cat.id
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-notion-gray-bg hover:text-foreground"
      )}
      onClick={onClick}
    >
      {cat.label}
    </button>
  );
});

// ── Main Feed Page ───────────────────────────────────────────────────────────
export default memo(function FeedPage() {
  const { feedCategory, setFeedCategory } = useAppStore();
  const syncFeed = useAction(api.feedSync.fetchAndProcessFeed);
  const articles = useQuery(api.feed.listArticles, {
    category: feedCategory ? (feedCategory as any) : undefined,
    limit: 20,
  });
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "fresh" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    let active = true;

    setSyncState("syncing");
    setSyncMessage("Refreshing the latest stories in the background...");

    void syncFeed({})
      .then((result: any) => {
        if (!active) return;

        if (result?.success) {
          setSyncState("fresh");
          if (result.skipped) {
            setSyncMessage("Feed is already fresh.");
            return;
          }

          const providerLabel =
            result.provider === "the_news_api"
              ? "The News API"
              : result.provider === "gnews"
                ? "GNews"
                : "your news source";
          setSyncMessage(`Pulled fresh stories from ${providerLabel}.`);
          return;
        }

        setSyncState("error");
        setSyncMessage("Add THE_NEWS_API_TOKEN or GNEWS_API_KEY to enable live refresh.");
      })
      .catch(() => {
        if (!active) return;
        setSyncState("error");
        setSyncMessage("Live refresh failed, showing the latest cached stories instead.");
      });

    return () => {
      active = false;
    };
  }, [syncFeed]);

  const latestFetchedAt =
    articles?.reduce(
      (latest: number, article: any) => Math.max(latest, article.fetchedAt ?? 0),
      0
    ) ?? 0;

  return (
    <div className="min-h-full bg-background">
      {/* Sticky top bar */}
      <WorkspaceTopBar moduleTitle="Feed" />
      {/* Category tabs */}
      <div className="sticky top-[41px] z-10 border-b border-border/60 bg-background">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <CategoryTab
                key={cat.id ?? "for_you"}
                cat={cat}
                activeCategory={feedCategory}
                onClick={() => setFeedCategory(cat.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">
        <div className="mb-4 rounded-[10px] border border-border bg-card px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <RefreshCw
                className={cn("h-4 w-4", syncState === "syncing" && "animate-spin")}
              />
              {syncState === "syncing"
                ? "Refreshing live feed"
                : syncState === "error"
                  ? "Live sync unavailable"
                  : "Live feed ready"}
            </div>
            <p className="text-xs text-muted-foreground">
              {syncState === "error" ? syncMessage : formatSyncAge(latestFetchedAt)}
            </p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/80">{syncMessage}</p>
        </div>

        {articles === undefined ? (
          <>
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-muted rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
            <div className="md:hidden space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-muted rounded-xl h-20 animate-pulse" />
              ))}
            </div>
          </>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Rss className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No articles yet</h3>
            <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs">
              Open the feed after adding THE_NEWS_API_TOKEN or GNEWS_API_KEY and it will refresh
              the latest stories automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article: any) => (
                <ArticleCard key={article._id} article={article} />
              ))}
            </div>
            <div className="md:hidden space-y-3">
              {articles.map((article: any) => (
                <ArticleRow key={article._id} article={article} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

