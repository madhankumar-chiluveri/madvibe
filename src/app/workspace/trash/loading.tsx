export default function TrashLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* WorkspaceTopBar */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 px-4 py-2 md:px-8 border-b border-border/50 bg-background h-[41px]">
        <div className="skeleton-shimmer h-5 w-28 rounded-md" />
        <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {/* Search bar — pl-9 h-10 md:h-9 with icon inside */}
        <div className="relative mb-4">
          <div className="skeleton-shimmer h-10 md:h-9 w-full rounded-lg" />
        </div>

        {/* Count text */}
        <div className="skeleton-shimmer h-3 w-28 rounded mb-4" />

        {/* List items — rounded-xl border matching TrashPage rows */}
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 md:px-4 py-3 rounded-xl border"
            >
              {/* Page icon */}
              <div className="skeleton-shimmer h-7 w-7 rounded shrink-0" />
              {/* Page info */}
              <div className="flex-1 space-y-1.5">
                <div
                  className="skeleton-shimmer h-4 rounded"
                  style={{ width: `${45 + (i % 3) * 18}%` }}
                />
                <div className="skeleton-shimmer h-3 w-32 rounded" />
              </div>
              {/* Action buttons — desktop only */}
              <div className="hidden md:flex gap-1 shrink-0">
                <div className="skeleton-shimmer h-7 w-16 rounded-md" />
                <div className="skeleton-shimmer h-7 w-24 rounded-md" />
              </div>
              {/* Mobile icon buttons */}
              <div className="flex md:hidden gap-1 shrink-0">
                <div className="skeleton-shimmer h-9 w-9 rounded-lg" />
                <div className="skeleton-shimmer h-9 w-9 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
