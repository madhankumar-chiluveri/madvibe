"use client";

import { Sidebar } from "@/components/sidebar/sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { WorkspaceActionMenu } from "@/components/layout/workspace-action-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MaddyPanel } from "@/components/maddy/maddy-panel";
import { ReminderCenter } from "@/components/reminders/reminder-center";
import { ReminderNotificationBridge } from "@/components/reminders/reminder-notification-bridge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const maddyPanelOpen = useAppStore((state) => state.maddyPanelOpen);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop sidebar - hidden on mobile */}
      <Sidebar />

      {/* Main content - add bottom padding on mobile for nav bar */}
      <main className="relative flex-1 overflow-y-auto min-w-0 pb-16 md:pb-0">
        <div
          className={cn(
            "pointer-events-none fixed right-5 top-4 z-40 hidden items-center justify-end transition-all duration-200 md:flex xl:right-6",
            maddyPanelOpen && "translate-y-1 opacity-0"
          )}
        >
          <WorkspaceActionMenu />
        </div>
        {children}
      </main>

      <MaddyPanel />

      {/* Overlays */}
      <CommandPalette />
      <ReminderCenter />
      <ReminderNotificationBridge />

      {/* Mobile bottom nav - hidden on desktop */}
      <MobileNav />
    </div>
  );
}
