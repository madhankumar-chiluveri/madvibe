export default function LedgerLoading() {
  return (
    <div className="min-h-full bg-background">
      {/* Sticky header: TopBar + 8-tab strip — matches LedgerPage sticky block */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 px-4 py-2 md:px-8 border-b border-border/50">
          <div className="skeleton-shimmer h-5 w-40 rounded-md" />
          <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
        </div>
        <div className="border-b border-border/70">
          <div className="max-w-5xl mx-auto px-4 py-2">
            <div className="flex gap-1 overflow-hidden">
              {/* 8 tabs: icon-only on mobile (w-10), icon+label on sm+ (w-20) */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer h-9 w-10 sm:w-20 shrink-0 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard content — max-w-5xl matching LedgerPage */}
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-6 space-y-4">
        {/* 4 gradient metric cards — grid-cols-2 md:grid-cols-4 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-[120px] rounded-2xl" />
          ))}
        </div>

        {/* Cash Flow + Expense Breakdown charts — grid md:grid-cols-2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border rounded-2xl p-4 space-y-3">
            <div className="skeleton-shimmer h-4 w-36 rounded" />
            <div className="skeleton-shimmer h-[180px] w-full rounded-lg" />
          </div>
          <div className="bg-card border rounded-2xl p-4 space-y-3">
            <div className="skeleton-shimmer h-4 w-32 rounded" />
            <div className="skeleton-shimmer h-[180px] w-full rounded-lg" />
          </div>
        </div>

        {/* Accounts list — grid sm:grid-cols-2 */}
        <div className="bg-card border rounded-2xl p-4 space-y-3">
          <div className="skeleton-shimmer h-4 w-24 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-xl px-3 py-2.5">
                <div className="skeleton-shimmer h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="skeleton-shimmer h-4 w-28 rounded" />
                  <div className="skeleton-shimmer h-3 w-16 rounded" />
                </div>
                <div className="skeleton-shimmer h-4 w-16 rounded shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Insight card */}
        <div className="skeleton-shimmer h-20 rounded-2xl border" />
      </div>
    </div>
  );
}
