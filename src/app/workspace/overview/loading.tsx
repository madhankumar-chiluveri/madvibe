export default function OverviewLoading() {
  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* WorkspaceTopBar */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 px-4 py-2 md:px-8 border-b border-border/50 bg-background h-[41px]">
        <div className="skeleton-shimmer h-5 w-44 rounded-md" />
        <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 md:px-6 md:py-8 space-y-6">
        {/* Page header — title left, badge right, border-b */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-border/60">
          <div className="space-y-1.5">
            <div className="skeleton-shimmer h-7 w-32 rounded-md" />
            <div className="skeleton-shimmer h-3 w-72 rounded" />
          </div>
          <div className="skeleton-shimmer h-7 w-36 rounded-lg" />
        </div>

        {/* OverviewCards — grid-cols-1 sm:2 lg:4, h-[120px] each */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-shimmer h-[120px] rounded-xl border border-border/60" />
          ))}
        </div>

        {/* Main grid: reminders, finance, vehicles summaries */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="skeleton-shimmer h-[280px] rounded-[10px] border border-border" />
          <div className="skeleton-shimmer h-[260px] rounded-[10px] border border-border" />
          <div className="skeleton-shimmer h-[240px] rounded-[10px] border border-border" />
        </div>
      </div>
    </div>
  );
}
