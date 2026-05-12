export default function AutomationLoading() {
  return (
    <div className="min-h-full bg-background animate-fade-in-fast">
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 px-4 py-2 md:px-8 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="skeleton-shimmer h-5 w-32 rounded-md" />
        <div className="skeleton-shimmer h-8 w-28 rounded-md" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10 space-y-6">
        <div className="skeleton-shimmer h-24 rounded-2xl" />
        <div className="skeleton-shimmer h-72 rounded-2xl" />
        <div className="skeleton-shimmer h-48 rounded-2xl" />
      </div>
    </div>
  );
}
