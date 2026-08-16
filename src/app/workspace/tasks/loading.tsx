export default function TasksLoading() {
  return (
    <div className="flex h-full min-h-[560px] flex-col overflow-hidden bg-background">
      {/* WorkspaceTopBar */}
      <div className="flex h-[52px] flex-none items-center justify-between gap-2 border-b border-border/50 bg-background px-4 md:px-8">
        <div className="skeleton-shimmer h-5 w-40 rounded-md" />
        <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
      </div>

      {/* Toolbar: title + range nav + view switch + filters */}
      <div className="flex-none space-y-3 border-b border-border/60 px-4 pb-3 pt-3 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="skeleton-shimmer h-6 w-44 rounded-md" />
          <div className="flex flex-wrap items-center gap-2">
            <div className="skeleton-shimmer h-10 w-[230px] rounded-xl" />
            <div className="skeleton-shimmer h-10 w-[220px] rounded-xl" />
            <div className="skeleton-shimmer h-9 w-24 rounded-xl" />
          </div>
        </div>
        <div className="skeleton-shimmer h-3 w-56 rounded" />
      </div>

      {/* Calendar surface */}
      <div className="min-h-0 flex-1 p-3 md:p-4">
        <div className="skeleton-shimmer h-full w-full rounded-2xl border border-border" />
      </div>
    </div>
  );
}
