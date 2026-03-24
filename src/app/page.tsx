"use client";

import { useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/ui/app-icon";
import { DEFAULT_WORKSPACE_ROUTE } from "@/lib/routes";

export default function RootPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace(DEFAULT_WORKSPACE_ROUTE);
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <AppIcon variant="loader" className="w-14 h-14" />
        <p className="text-muted-foreground text-sm">Loading MadVibe…</p>
      </div>
    </div>
  );
}
