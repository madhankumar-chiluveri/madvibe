"use client";

import { useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar/sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAppStore } from "@/store/app.store";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src="/app-icon.png" alt="MADVERSE" className="w-12 h-12 rounded-2xl animate-pulse" />
          <p className="text-muted-foreground text-sm">Loading MADVERSE…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />

      {/* Main content — add bottom padding on mobile for nav bar */}
      <main className="flex-1 overflow-y-auto min-w-0 pb-16 md:pb-0">
        {children}
      </main>

      {/* Overlays */}
      <CommandPalette />

      {/* Mobile bottom nav — hidden on desktop */}
      <MobileNav />
    </div>
  );
}
