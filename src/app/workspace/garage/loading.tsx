export default function GarageLoading() {
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Top Bar Skeleton */}
      <div className="flex h-14 items-center justify-between border-b border-border/60 px-6">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
      </div>

      <div className="flex-1 space-y-6 p-6">
        {/* Metric cards / Summary section */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border/60 rounded-xl flex h-28 flex-col justify-between p-4">
              <div className="space-y-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>

        {/* Vehicles bay grid skeleton */}
        <div className="space-y-4">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card border border-border/60 rounded-xl flex h-52 flex-col justify-between p-5">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="h-6 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-6 w-1/3 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
