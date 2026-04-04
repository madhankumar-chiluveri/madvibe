"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MaddyScreen } from "@/components/maddy/maddy-panel";
import { AppIcon } from "@/components/ui/app-icon";
import { DEFAULT_WORKSPACE_ROUTE } from "@/lib/routes";
import { useAppStore } from "@/store/app.store";

const DESKTOP_BREAKPOINT = "(min-width: 768px)";

export default function AIPage() {
  const router = useRouter();
  const openMaddyPanel = useAppStore((state) => state.openMaddyPanel);
  const closeMaddyPanel = useAppStore((state) => state.closeMaddyPanel);
  const setActiveModule = useAppStore((state) => state.setActiveModule);
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    setActiveModule("ai");
  }, [setActiveModule]);

  useEffect(() => {
    closeMaddyPanel();
  }, [closeMaddyPanel]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_BREAKPOINT);
    const syncBreakpoint = () => setIsDesktop(mediaQuery.matches);

    syncBreakpoint();
    mediaQuery.addEventListener("change", syncBreakpoint);
    return () => mediaQuery.removeEventListener("change", syncBreakpoint);
  }, []);

  useEffect(() => {
    if (isDesktop !== true) {
      return;
    }

    openMaddyPanel("chat");
    router.replace(DEFAULT_WORKSPACE_ROUTE);
  }, [isDesktop, openMaddyPanel, router]);

  const handleDismiss = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(DEFAULT_WORKSPACE_ROUTE);
  }, [router]);

  if (isDesktop === null || isDesktop) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <AppIcon variant="loader" className="h-12 w-12" />
          <p className="text-sm text-muted-foreground">Opening Maddy AI...</p>
        </div>
      </div>
    );
  }

  return <MaddyScreen onDismiss={handleDismiss} />;
}
