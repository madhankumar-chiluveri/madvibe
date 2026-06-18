"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { Star, Download } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import { PageBreadcrumb } from "./breadcrumb";
import { PageComments } from "./page-comments";
import { Button } from "@/components/ui/button";

// The editor pulls in @blocknote/* + 15 ProseMirror packages + Shiki — by far
// the heaviest module graph in the app. Loading it via next/dynamic splits it
// into its own chunk so the page shell (top bar, header, breadcrumb) renders
// immediately and the editor graph only compiles/loads when a doc is actually
// opened. ssr:false because BlockNote is client-only.
const BlockNoteEditor = dynamic(
  () => import("./blocknote-editor").then((m) => ({ default: m.BlockNoteEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="mt-2 space-y-3" aria-hidden>
        <div className="skeleton-shimmer h-4 w-full rounded-md" />
        <div className="skeleton-shimmer h-4 w-5/6 rounded-md" />
        <div className="skeleton-shimmer h-4 w-2/3 rounded-md" />
      </div>
    ),
  }
);
import { PageHeader } from "./page-header";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";
import { useEditorStore } from "@/store/editor.store";

function inlineContentToMarkdown(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (item.type === "text") {
          let text = item.text || "";
          if (item.styles?.code) {
            text = `\`${text}\``;
          }
          if (item.styles?.bold) {
            text = `**${text}**`;
          }
          if (item.styles?.italic) {
            text = `*${text}*`;
          }
          if (item.styles?.strike) {
            text = `~~${text}~~`;
          }
          return text;
        } else if (item.type === "link") {
          const linkText = inlineContentToMarkdown(item.content);
          return `[${linkText}](${item.href})`;
        }
        return "";
      })
      .join("");
  }
  return "";
}

function blocksToMarkdown(blocks: any[], depth = 0): string {
  if (!blocks || !Array.isArray(blocks)) return "";

  const indent = "  ".repeat(depth);

  return blocks
    .map((block) => {
      const text = inlineContentToMarkdown(block.content);
      let prefix = "";
      let suffix = "\n";

      switch (block.type) {
        case "heading": {
          const level = block.props?.level ?? 1;
          prefix = "#".repeat(level) + " ";
          suffix = "\n\n";
          break;
        }
        case "bulletListItem":
          prefix = "- ";
          break;
        case "numberedListItem":
          prefix = "1. ";
          break;
        case "checkListItem":
        case "todo": {
          const checked = block.props?.checked ?? false;
          prefix = checked ? "- [x] " : "- [ ] ";
          break;
        }
        case "codeBlock": {
          const lang = block.props?.language ?? "";
          prefix = `\`\`\`${lang}\n`;
          suffix = `\n\`\`\`\n\n`;
          break;
        }
        case "image": {
          const url = block.props?.url ?? "";
          const caption = block.props?.caption ?? "Image";
          return `![${caption}](${url})\n\n`;
        }
        case "paragraph":
        default:
          prefix = "";
          suffix = "\n\n";
          break;
      }

      let md = `${indent}${prefix}${text}${suffix}`;

      if (block.children && block.children.length > 0) {
        md += blocksToMarkdown(block.children, depth + 1);
      }

      return md;
    })
    .join("");
}

interface PageViewProps {
  page: any;
}

export function PageView({ page }: PageViewProps) {
  const { fontFamily } = useAppStore();
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const updatePage = useMutation(api.pages.update);
  const { currentWorkspace } = useResolvedWorkspace();
  const blocks = useQuery(api.blocks.listByPage, { pageId: page._id });

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

  const handleExportMarkdown = useCallback(() => {
    if (!blocks || blocks.length === 0) {
      toast.error("Content is loading or empty");
      return;
    }

    const primaryBlock = blocks[0];
    if (!primaryBlock || !primaryBlock.content) {
      toast.error("No content to export");
      return;
    }

    const markdown = blocksToMarkdown(primaryBlock.content);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${page.title || "Untitled"}.md`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Markdown exported successfully");
  }, [blocks, page.title]);

  const saveStatusNode = (
    <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
      {!canEditWorkspace && <span>View only</span>}
      {canEditWorkspace && saveStatus === "saving" && <span className="text-muted-foreground">Saving...</span>}
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

  const exportNode = (
    <Button
      onClick={handleExportMarkdown}
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      title="Export to Markdown"
    >
      <Download className="h-4 w-4" />
    </Button>
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
            {exportNode}
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
