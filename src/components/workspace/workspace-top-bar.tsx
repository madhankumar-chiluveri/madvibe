"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { ChevronRight, PanelLeft } from "lucide-react";
import { WorkspaceActionMenu } from "@/components/layout/workspace-action-menu";
import { MobileWorkspaceContextSheet } from "@/components/sidebar/sidebar";

interface WorkspaceTopBarProps {
  moduleTitle?: string;
  breadcrumbContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export function WorkspaceTopBar({
  moduleTitle,
  breadcrumbContent,
  rightContent,
  className,
  sticky = true,
}: WorkspaceTopBarProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { currentWorkspace } = useResolvedWorkspace();

  return (
    <div
      className={cn(
        sticky ? "sticky top-0 z-40" : "relative z-10",
        "flex items-center justify-between gap-2 px-4 py-2 md:px-8",
        "border-b border-border/50 bg-background",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Open workspace navigation"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-[var(--notion-gray-bg)] hover:text-foreground dark:hover:bg-accent md:hidden"
          onClick={() => setMobileNavOpen(true)}
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 items-center gap-1 text-[13px] text-muted-foreground select-none">
          <span className="flex items-center gap-1 shrink-0">
            {currentWorkspace?.icon && (
              <span className="text-sm leading-none">{currentWorkspace.icon}</span>
            )}
            <span className="max-w-[120px] truncate text-[14px] font-semibold text-foreground md:max-w-[160px]">
              {currentWorkspace?.name ?? "Workspace"}
            </span>
          </span>

          {breadcrumbContent ? (
            <>
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
              <div className="min-w-0">{breadcrumbContent}</div>
            </>
          ) : moduleTitle ? (
            <>
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
              <span className="truncate text-[14px] font-semibold text-foreground">
                {moduleTitle}
              </span>
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
