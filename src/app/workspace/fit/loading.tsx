export default function FitLoading() {
  return (
    <div className="min-h-full bg-background flex flex-col pb-24 md:pb-6">
      {/* WorkspaceTopBar */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 px-4 py-2 md:px-8 border-b border-border/50 bg-background h-[41px]">
        <div className="skeleton-shimmer h-5 w-32 rounded-md" />
        <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-5 space-y-6">
        {/* 5-tab bar — Today · Plan · Progress · Eat · Learn */}
        <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-muted/40 border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-[44px] rounded-xl" />
          ))}
        </div>

        {/* Hero banner — rounded-3xl gradient with text */}
        <div className="rounded-3xl border border-border overflow-hidden">
          <div className="skeleton-shimmer h-[140px] w-full" />
        </div>

        {/* 3-col stats: 2 StatCards + Ring card */}
        <div className="grid grid-cols-3 gap-3">
          <div className="skeleton-shimmer h-[100px] rounded-2xl border" />
          <div className="skeleton-shimmer h-[100px] rounded-2xl border" />
          <div className="skeleton-shimmer h-[100px] rounded-2xl border" />
        </div>

        {/* Weight tracker card */}
        <div className="skeleton-shimmer h-[100px] rounded-2xl border" />

        {/* Today's workout day card — gradient header + exercise list */}
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="skeleton-shimmer h-[100px] w-full" />
          <div className="p-4 sm:p-5 space-y-3">
            <div className="skeleton-shimmer h-16 rounded-xl border" />
            <div className="skeleton-shimmer h-14 rounded-xl border" />
            <div className="skeleton-shimmer h-14 rounded-xl border" />
          </div>
        </div>
      </div>
    </div>
  );
}
