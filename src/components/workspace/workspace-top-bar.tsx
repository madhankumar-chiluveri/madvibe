"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useAppStore } from "@/store/app.store";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { ChevronRight, PanelLeft } from "lucide-react";
import { WorkspaceActionMenu } from "@/components/layout/workspace-action-menu";
import { MobileWorkspaceContextSheet } from "@/components/sidebar/sidebar";

interface WorkspaceTopBarProps {
  moduleTitle?: string;
  breadcrumbContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  className?: string;
}

export function WorkspaceTopBar({
  moduleTitle,
  breadcrumbContent,
  rightContent,
  className,
}: WorkspaceTopBarProps) {
  const currentWorkspaceId = useAppStore((s) => s.currentWorkspaceId);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const workspace = useQuery(
    api.workspaces.getWorkspace,
    currentWorkspaceId ? { id: currentWorkspaceId } : "skip"
  );

  return (
    <div
      className={cn(
        "sticky top-0 z-20 flex items-center justify-between gap-2 px-4 md:px-8 py-2",
        "border-b border-border/40 bg-background/80 backdrop-blur-md",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Open workspace navigation"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 transition-colors hover:border-white/16 hover:bg-white/[0.06] hover:text-white md:hidden"
          onClick={() => setMobileNavOpen(true)}
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground select-none">
          <span className="flex items-center gap-1 shrink-0">
            {workspace?.icon && (
              <span className="text-sm leading-none">{workspace.icon}</span>
            )}
            <span className="font-medium text-foreground truncate max-w-[120px] md:max-w-[160px]">
              {workspace?.name ?? "Workspace"}
            </span>
          </span>

          {breadcrumbContent ? (
            <>
              <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
              <div className="min-w-0">{breadcrumbContent}</div>
            </>
          ) : moduleTitle ? (
            <>
              <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
              <span className="text-foreground font-medium truncate">{moduleTitle}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Right: custom content + workspace action menu */}
      <div className="flex items-center gap-1 shrink-0">
        {rightContent}
        <WorkspaceActionMenu />
      </div>

      <MobileWorkspaceContextSheet
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
      />
    </div>
  );
}
