"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import { PageBreadcrumb } from "./breadcrumb";
import { BlockNoteEditor } from "./blocknote-editor";
import { PageComments } from "./page-comments";
import { PageHeader } from "./page-header";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";
import { useEditorStore } from "@/store/editor.store";

interface PageViewProps {
  page: any;
}

export function PageView({ page }: PageViewProps) {
  const { fontFamily } = useAppStore();
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const updatePage = useMutation(api.pages.update);
  const { currentWorkspace } = useResolvedWorkspace();

  const [mobileToolbarOpen, setMobileToolbarOpen] = useState(false);
  const canEditWorkspace = (currentWorkspace?.role ?? "owner") !== "viewer";

  const fontClass =
    fontFamily === "serif"
      ? "font-serif"
      : fontFamily === "mono"
        ? "font-mono"
        : "font-sans";

  const handleFavourite = useCallback(async () => {
    if (!canEditWorkspace) return;

    try {
      await updatePage({ id: page._id, isFavourite: !page.isFavourite });
    } catch {
      toast.error("Failed to update favourite");
    }
  }, [canEditWorkspace, page._id, page.isFavourite, updatePage]);

  const saveStatusNode = (
    <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
      {!canEditWorkspace && <span>View only</span>}
      {canEditWorkspace && saveStatus === "saving" && <span className="text-zinc-400">Saving...</span>}
      {canEditWorkspace && saveStatus === "saved" && <span className="text-emerald-500">Saved</span>}
      {canEditWorkspace && saveStatus === "error" && <span className="text-red-400">Save failed</span>}
      {canEditWorkspace && saveStatus === "idle" && page.updatedAt && (
        <span>Edited {formatRelativeTime(page.updatedAt)}</span>
      )}
    </span>
  );

  const favouriteNode = (
    <button
      onClick={handleFavourite}
      disabled={!canEditWorkspace}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/50 disabled:opacity-50"
      title={page.isFavourite ? "Remove from favourites" : "Add to favourites"}
    >
      <Star className={cn("h-4 w-4", page.isFavourite && "fill-amber-400 text-amber-400")} />
    </button>
  );

  return (
    <div className={cn("min-h-screen pb-32", fontClass)}>
      <WorkspaceTopBar
        breadcrumbContent={
          <PageBreadcrumb
            pageId={page._id}
            pageTitle={page.title}
            pageIcon={page.icon}
          />
        }
        rightContent={
          <div className="flex items-center gap-1">
            {saveStatusNode}
            {favouriteNode}
          </div>
        }
      />

      <div className={cn(page.isFullWidth ? "px-4 md:px-10 xl:px-16" : "px-4 md:px-8")}>
        <div className={cn(page.isFullWidth ? "max-w-none" : "mx-auto max-w-3xl")}>
          <PageHeader
            page={page}
            editable={canEditWorkspace}
            mobileToolbarOpen={mobileToolbarOpen}
            onMobileToolbarToggle={() => setMobileToolbarOpen((value) => !value)}
          />

          <div className="mt-4">
            <BlockNoteEditor
              pageId={page._id}
              editable={canEditWorkspace}
              isFullWidth={page.isFullWidth}
            />
          </div>

          <PageComments
            pageId={page._id}
            workspaceId={page.workspaceId}
            editable={canEditWorkspace}
          />
        </div>
      </div>
    </div>
  );
}
