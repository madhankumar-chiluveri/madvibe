"use client";

import { useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/workspace");
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <img src="/app-icon.png" alt="MADVERSE" className="w-14 h-14 rounded-2xl animate-pulse" />
        <p className="text-muted-foreground text-sm">Loading MADVERSE…</p>
      </div>
    </div>
  );
}
