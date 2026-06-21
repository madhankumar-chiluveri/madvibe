"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar/sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileNav } from "@/components/layout/mobile-nav";

// Heavy components loaded after first paint — framer-motion, reminder logic, etc.
const ReminderCenter = dynamic(
  () => import("@/components/reminders/reminder-center").then((m) => ({ default: m.ReminderCenter })),
  { ssr: false }
);
const ReminderNotificationBridge = dynamic(
  () => import("@/components/reminders/reminder-notification-bridge").then((m) => ({ default: m.ReminderNotificationBridge })),
  { ssr: false }
);
const InviteAcceptor = dynamic(
  () => import("@/components/workspace/invite-acceptor").then((m) => ({ default: m.InviteAcceptor })),
  { ssr: false }
);

const PREFETCH_ROUTES = [
  "/workspace/overview",
  "/workspace/feed",
  "/workspace/brain",
  "/workspace/ledger",
  "/workspace/fit",
  "/workspace/settings",
  "/workspace/trash",
];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // Prefetch all primary routes on mount so navigation feels instant.
  // IMPORTANT: only in production. In `next dev`, router.prefetch() forces
  // webpack to compile every prefetched route bundle at once on first
  // workspace entry — compiling 6 heavy routes (incl. the 2,900-line ledger
  // page + recharts) simultaneously is the single biggest cause of the dev
  // server feeling unusable. In dev, routes compile lazily on real navigation.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    PREFETCH_ROUTES.forEach((route) => router.prefetch(route));
  }, [router]);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop sidebar - hidden on mobile */}
      <Sidebar />

      {/* Main content - add bottom padding on mobile for nav bar */}
      <main className="relative min-w-0 flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* Overlays */}
      <CommandPalette />
      <ReminderCenter />
      <ReminderNotificationBridge />
      <InviteAcceptor />

      {/* Mobile bottom nav - hidden on desktop */}
      <MobileNav />
    </div>
  );
}
