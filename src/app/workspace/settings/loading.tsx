export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* WorkspaceTopBar */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 px-4 py-2 md:px-8 border-b border-border/50 bg-background h-[41px]">
        <div className="skeleton-shimmer h-5 w-36 rounded-md" />
        <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {/* Mobile: scrollable pill tabs — 4 items */}
        <div className="flex md:hidden overflow-x-auto gap-2 mb-6 pb-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-10 w-28 shrink-0 rounded-full" />
          ))}
        </div>

        {/* Desktop: sidebar nav (w-44) + content (flex-1) */}
        <div className="flex gap-8">
          <nav className="hidden md:block w-44 shrink-0">
            <div className="space-y-0.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer h-9 w-full rounded-lg" />
              ))}
            </div>
          </nav>

          {/* Content — mirrors SettingSection blocks for Appearance tab */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Theme switcher section */}
            <div className="space-y-3 border-b border-border/40 pb-6">
              <div className="skeleton-shimmer h-3.5 w-32 rounded" />
              <div className="skeleton-shimmer h-28 w-full rounded-2xl" />
            </div>
            {/* Color mode section: 3 option cards */}
            <div className="space-y-3 border-b border-border/40 pb-6">
              <div className="skeleton-shimmer h-3.5 w-24 rounded" />
              <div className="grid grid-cols-3 gap-2 md:flex md:gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton-shimmer h-[72px] flex-1 rounded-xl border" />
                ))}
              </div>
            </div>
            {/* Accent colour section: color dots */}
            <div className="space-y-3 border-b border-border/40 pb-6">
              <div className="skeleton-shimmer h-3.5 w-28 rounded" />
              <div className="flex flex-wrap gap-2.5">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="skeleton-shimmer h-9 w-9 rounded-full" />
                ))}
              </div>
            </div>
            {/* Font family section: 3 option cards */}
            <div className="space-y-3">
              <div className="skeleton-shimmer h-3.5 w-24 rounded" />
              <div className="grid grid-cols-3 gap-2 md:flex md:gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton-shimmer h-[72px] flex-1 rounded-xl border" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
