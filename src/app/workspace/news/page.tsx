"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app.store";
import { cn } from "@/lib/utils";
import {
  RefreshCw, BookmarkCheck, Rss, Clock, TrendingUp, Flame,
} from "lucide-react";

// ── Category config ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: null,           label: "For You",      color: "bg-violet-500/20 text-violet-700 dark:text-violet-400" },
  { id: "ai_ml",        label: "AI & ML",      color: "bg-blue-500/20 text-blue-700 dark:text-blue-400" },
  { id: "tech_it",      label: "Tech & IT",    color: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400" },
  { id: "productivity", label: "Productivity", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
  { id: "must_know",    label: "Must Know",    color: "bg-orange-500/20 text-orange-700 dark:text-orange-400" },
] as const;

// ── Article Card ──────────────────────────────────────────────────────────────
function ArticleCard({ article }: { article: any }) {
  const catConfig = CATEGORIES.find((c) => c.id === article.category) ?? CATEGORIES[0];
  const publishedAgo = () => {
    const diff = Date.now() - article.publishedAt;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor(diff / 60_000);
    return h > 0 ? `${h}h ago` : `${m}m ago`;
  };

  return (
    <div className="group bg-card border rounded-2xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
      {/* Gradient thumbnail */}
      <div className={cn(
        "h-28 md:h-36 relative overflow-hidden",
        "bg-gradient-to-br",
        article.category === "ai_ml" ? "from-blue-600/30 via-violet-500/20 to-purple-600/30" :
        article.category === "tech_it" ? "from-cyan-600/30 via-teal-500/20 to-emerald-600/30" :
        article.category === "productivity" ? "from-emerald-600/30 via-green-500/20 to-lime-600/30" :
        article.category === "must_know" ? "from-orange-600/30 via-amber-500/20 to-yellow-600/30" :
        "from-violet-600/30 via-pink-500/20 to-rose-600/30"
      )}>
        {article.isBreaking && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Flame className="w-2.5 h-2.5" /> BREAKING
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/30 text-white text-[10px] px-2 py-0.5 rounded-full">
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
        <h3 className="text-sm font-semibold line-clamp-2 leading-snug mb-1.5 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {article.summary}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t">
          <Rss className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-medium">{article.source}</span>
          {article.relevanceScore && article.relevanceScore > 0.92 && (
            <div className="ml-auto flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
              <TrendingUp className="w-3 h-3" /> Trending
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Mobile Article Row ────────────────────────────────────────────────────────
function ArticleRow({ article }: { article: any }) {
  const catConfig = CATEGORIES.find((c) => c.id === article.category) ?? CATEGORIES[0];
  return (
    <div className="flex gap-3 p-3 bg-card border rounded-xl hover:border-primary/30 transition-all cursor-pointer">
      <div className={cn(
        "w-16 h-16 rounded-lg shrink-0",
        "bg-gradient-to-br",
        article.category === "ai_ml" ? "from-blue-500/30 to-violet-500/30" :
        article.category === "tech_it" ? "from-cyan-500/30 to-teal-500/30" :
        article.category === "productivity" ? "from-emerald-500/30 to-green-500/30" :
        "from-violet-500/30 to-pink-500/30"
      )} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", catConfig.color)}>
            {catConfig.label}
          </span>
          {article.isBreaking && (
            <span className="text-[9px] font-bold text-red-500">● BREAKING</span>
          )}
        </div>
        <p className="text-sm font-medium line-clamp-2 leading-snug">{article.title}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{article.source} · {article.readingTimeMinutes ?? 3}m</p>
      </div>
    </div>
  );
}

// ── Main News Page ────────────────────────────────────────────────────────────
export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const articles = useQuery(api.news.listArticles, {
    category: activeCategory ? (activeCategory as any) : undefined,
    limit: 20,
  });

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="text-lg font-bold tracking-tight shrink-0">News Feed</h1>
          <button className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Category tabs — horizontally scrollable */}
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id ?? "for_you"}
                className={cn(
                  "shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all min-h-[36px]",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                )}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
            <button className={cn(
              "shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-all min-h-[36px]",
              "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
            )}>
              <BookmarkCheck className="w-3 h-3" /> Saved
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">
        {articles === undefined ? (
          <>
            {/* Desktop skeleton */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-muted rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
            {/* Mobile skeleton */}
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
              Demo articles will load shortly, or click Refresh to fetch latest content
            </p>
          </div>
        ) : (
          <>
            {/* Desktop — card grid */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article: any) => (
                <ArticleCard key={article._id} article={article} />
              ))}
            </div>
            {/* Mobile — list */}
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
}
