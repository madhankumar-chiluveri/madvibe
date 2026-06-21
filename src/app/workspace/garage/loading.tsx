export default function GarageLoading() {
  return (
    <div className="flex h-full flex-col bg-background">
      {/* WorkspaceTopBar with Add Vehicle button replica */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 px-4 py-2 md:px-8 border-b border-border/50 bg-background h-[41px]">
        <div className="skeleton-shimmer h-5 w-36 rounded-md" />
        <div className="skeleton-shimmer h-9 w-28 rounded-xl" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6 max-w-5xl mx-auto">
          {/* 3-up summary cards — sm:grid-cols-3 matching GaragePage dashboard */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-card border border-border/60 rounded-xl p-4 flex gap-3.5 items-center shadow-sm h-[72px]"
              >
                <div className="skeleton-shimmer h-10 w-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="skeleton-shimmer h-2.5 w-20 rounded" />
                  <div className="skeleton-shimmer h-5 w-24 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Vehicle bay */}
          <div className="space-y-4">
            <div className="skeleton-shimmer h-4 w-36 rounded" />
            {/* VehicleCard: h-56 with left color border, p-5, flex-col justify-between */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-card border border-border/60 rounded-xl h-56 p-5 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                      <div className="skeleton-shimmer h-5 w-36 rounded" />
                      <div className="skeleton-shimmer h-3 w-24 rounded" />
                      <div className="flex gap-2 mt-2">
                        <div className="skeleton-shimmer h-4 w-14 rounded-full" />
                        <div className="skeleton-shimmer h-4 w-16 rounded-full" />
                      </div>
                    </div>
                    <div className="skeleton-shimmer h-10 w-10 rounded-lg" />
                  </div>
                  <div className="border-t border-border/40 pt-3 space-y-2">
                    <div className="skeleton-shimmer h-4 w-full rounded" />
                    <div className="skeleton-shimmer h-4 w-full rounded" />
                  </div>
                  <div className="skeleton-shimmer h-4 w-28 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
