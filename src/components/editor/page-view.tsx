"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn, formatRelativeTime } from "@/lib/utils";
import { PageHeader } from "./page-header";
import { BlockNoteEditor } from "./blocknote-editor";
import { PageBreadcrumb } from "./breadcrumb";
import { PageComments } from "./page-comments";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import { useAppStore } from "@/store/app.store";
import { useEditorStore } from "@/store/editor.store";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface PageViewProps {
  page: any;
}

export function PageView({ page }: PageViewProps) {
  const { fontFamily } = useAppStore();
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const updatePage = useMutation(api.pages.update);

  const [mobileToolbarOpen, setMobileToolbarOpen] = useState(false);

  const fontClass =
    fontFamily === "serif"
      ? "font-serif"
      : fontFamily === "mono"
      ? "font-mono"
      : "font-sans";

  const handleFavourite = useCallback(async () => {
    try {
      await updatePage({ id: page._id, isFavourite: !page.isFavourite });
    } catch {
      toast.error("Failed to update favourite");
    }
  }, [page._id, page.isFavourite, updatePage]);

  const handleFullWidth = useCallback(async () => {
    try {
      await updatePage({ id: page._id, isFullWidth: !page.isFullWidth });
    } catch {
      toast.error("Failed to update width");
    }
  }, [page._id, page.isFullWidth, updatePage]);

  // Save status text shown in the right side of the top bar
  const saveStatusNode = (
    <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
      {saveStatus === "saving" && <span className="text-zinc-400">Saving…</span>}
      {saveStatus === "saved"  && <span className="text-emerald-500">Saved</span>}
      {saveStatus === "error"  && <span className="text-red-400">Save failed</span>}
      {saveStatus === "idle" && page.updatedAt && (
        <span>Edited {formatRelativeTime(page.updatedAt)}</span>
      )}
    </span>
  );

  // Favourite button shown in the right side
  const favouriteNode = (
    <button
      onClick={handleFavourite}
      className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground"
      title={page.isFavourite ? "Remove from favourites" : "Add to favourites"}
    >
      <Star className={cn("w-4 h-4", page.isFavourite && "fill-amber-400 text-amber-400")} />
    </button>
  );

  return (
    <div className={cn("min-h-screen pb-32", fontClass)}>
      {/* ── Sticky top bar (WorkspaceTopBar handles workspace breadcrumb + … menu) */}
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

      {/* ── Page breadcrumb (ancestor trail inside content) */}
      <div className={cn(page.isFullWidth ? "px-4 md:px-10 xl:px-16" : "px-4 md:px-8")}>
        <div className={cn(page.isFullWidth ? "max-w-none" : "max-w-3xl mx-auto")}>
          <PageHeader
            page={page}
            mobileToolbarOpen={mobileToolbarOpen}
            onMobileToolbarToggle={() => setMobileToolbarOpen((v) => !v)}
          />

          <div className="mt-4">
            <BlockNoteEditor pageId={page._id} isFullWidth={page.isFullWidth} />
          </div>

          <PageComments pageId={page._id} workspaceId={page.workspaceId} />
        </div>
      </div>
    </div>
  );
}
