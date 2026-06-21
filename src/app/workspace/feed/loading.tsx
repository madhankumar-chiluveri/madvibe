export default function FeedLoading() {
  return (
    <div className="min-h-full bg-background">
      {/* WorkspaceTopBar */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 px-4 py-2 md:px-8 border-b border-border/50 bg-background h-[41px]">
        <div className="skeleton-shimmer h-5 w-32 rounded-md" />
        <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
      </div>

      {/* Category tabs — sticky top-[41px] matching actual page */}
      <div className="sticky top-[41px] z-10 border-b border-border/60 bg-background">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-9 w-24 shrink-0 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">
        {/* Desktop: 2/3-col grid of article cards — rounded-[10px] matching ArticleCard */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[10px] border border-border overflow-hidden">
              {/* gradient thumbnail h-28 md:h-36 */}
              <div className="skeleton-shimmer h-36 w-full" />
              <div className="p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="skeleton-shimmer h-4 w-14 rounded-full" />
                  <div className="skeleton-shimmer h-3 w-10 rounded ml-auto" />
                </div>
                <div className="skeleton-shimmer h-4 w-full rounded" />
                <div className="skeleton-shimmer h-4 w-5/6 rounded" />
                <div className="skeleton-shimmer h-3 w-3/4 rounded" />
                <div className="pt-2 border-t border-border/40">
                  <div className="skeleton-shimmer h-3 w-24 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: article rows — w-16 h-16 thumbnail + content matching ArticleRow */}
        <div className="md:hidden space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-[10px] border border-border bg-card p-3">
              <div className="skeleton-shimmer w-16 h-16 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton-shimmer h-3.5 w-14 rounded-full" />
                <div className="skeleton-shimmer h-4 w-full rounded" />
                <div className="skeleton-shimmer h-4 w-4/5 rounded" />
                <div className="skeleton-shimmer h-3 w-20 rounded mt-0.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
