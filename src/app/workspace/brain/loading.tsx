export default function BrainLoading() {
  return (
    <div className="min-h-full bg-background">
      {/* WorkspaceTopBar */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 px-4 py-2 md:px-8 border-b border-border/50 bg-background h-[41px]">
        <div className="skeleton-shimmer h-5 w-36 rounded-md" />
        <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
      </div>

      {/* Centered empty state — matches BrainPage's flex-col center layout */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-41px)] px-4 gap-4">
        <div className="skeleton-shimmer h-14 w-14 rounded-2xl" />
        <div className="space-y-2 text-center">
          <div className="skeleton-shimmer h-6 w-20 rounded-md mx-auto" />
          <div className="skeleton-shimmer h-4 w-72 rounded mx-auto" />
          <div className="skeleton-shimmer h-4 w-56 rounded mx-auto" />
        </div>
        <div className="skeleton-shimmer h-9 w-32 rounded-lg" />
      </div>
    </div>
  );
}
