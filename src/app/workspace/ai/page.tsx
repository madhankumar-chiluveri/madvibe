"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/ui/app-icon";
import { DEFAULT_WORKSPACE_ROUTE } from "@/lib/routes";
import { useAppStore } from "@/store/app.store";

export default function AIPage() {
  const router = useRouter();
  const openMaddyPanel = useAppStore((state) => state.openMaddyPanel);

  useEffect(() => {
    openMaddyPanel("chat");
    router.replace(DEFAULT_WORKSPACE_ROUTE);
  }, [openMaddyPanel, router]);

  return (
    <div className="flex min-h-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <AppIcon variant="loader" className="h-12 w-12" />
        <p className="text-sm text-muted-foreground">Opening Maddy AI…</p>
      </div>
    </div>
  );
}
