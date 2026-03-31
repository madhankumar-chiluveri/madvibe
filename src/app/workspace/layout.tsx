"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar/sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";

// Heavy components loaded after first paint — framer-motion, reminder logic, etc.
const MaddyPanel = dynamic(
  () => import("@/components/maddy/maddy-panel").then((m) => ({ default: m.MaddyPanel })),
  { ssr: false }
);
const ReminderCenter = dynamic(
  () => import("@/components/reminders/reminder-center").then((m) => ({ default: m.ReminderCenter })),
  { ssr: false }
);
const ReminderNotificationBridge = dynamic(
  () => import("@/components/reminders/reminder-notification-bridge").then((m) => ({ default: m.ReminderNotificationBridge })),
  { ssr: false }
);

const PREFETCH_ROUTES = [
  "/workspace/overview",
  "/workspace/feed",
  "/workspace/brain",
  "/workspace/ledger",
  "/workspace/settings",
  "/workspace/trash",
];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  useResolvedWorkspace();

  // Prefetch all primary routes on mount so navigation feels instant
  useEffect(() => {
    PREFETCH_ROUTES.forEach((route) => router.prefetch(route));
  }, [router]);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop sidebar - hidden on mobile */}
      <Sidebar />

      {/* Main content - add bottom padding on mobile for nav bar */}
      <main className="relative flex-1 overflow-y-auto min-w-0 pb-16 md:pb-0">
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
