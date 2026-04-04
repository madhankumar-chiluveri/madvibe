"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";
import {
  LayoutDashboard,
  Newspaper,
  BookOpen,
  Wallet,
  Sparkles,
} from "lucide-react";

const TABS = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard, href: "/workspace/overview" },
  { id: "feed" as const,     label: "FEED",     icon: Newspaper,        href: "/workspace/feed" },
  { id: "brain" as const,    label: "BRAIN",    icon: BookOpen,         href: "/workspace/brain" },
  { id: "ledger" as const,   label: "LEDGER",   icon: Wallet,           href: "/workspace/ledger" },
  { id: "ai" as const,       label: "Maddy AI", icon: Sparkles,         href: "/workspace/ai" },
] as const;

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const setActiveModule = useAppStore((state) => state.setActiveModule);
  const workspaceSegment = pathname.split("/")[2] ?? null;

  const active = TABS.find((t) => {
    if (t.id === "brain") {
      return pathname.startsWith("/workspace") && !["overview", "feed", "ledger", "ai"].includes(workspaceSegment ?? "");
    }
    return workspaceSegment === t.id;
  })?.id ?? "overview";

  useEffect(() => {
    TABS.forEach((tab) => {
      router.prefetch(tab.href);
    });
  }, [router]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t bg-background/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="navigation"
      aria-label="Module navigation"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            prefetch
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] transition-colors",
              "active:scale-95 transition-transform",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              setActiveModule(tab.id);
            }}
            onTouchStart={() => router.prefetch(tab.href)}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className={cn("w-5 h-5", isActive && "fill-primary/20")} strokeWidth={isActive ? 2.5 : 1.8} />
            <span
              className={cn(
                "text-[10px] font-medium leading-none",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
