"use client";

import { cn } from "@/lib/utils";
import { PageHeader } from "./page-header";
import { BlockNoteEditor } from "./blocknote-editor";
import { useAppStore } from "@/store/app.store";
import { MaddyInlinePanel } from "@/components/maddy/maddy-panel";

interface PageViewProps {
  page: any;
}

export function PageView({ page }: PageViewProps) {
  const { fontFamily } = useAppStore();

  const fontClass =
    fontFamily === "serif"
      ? "font-serif"
      : fontFamily === "mono"
      ? "font-mono"
      : "font-sans";

  return (
    <div
      className={cn(
        "min-h-screen pb-32",
        fontClass,
        page.isFullWidth ? "px-8" : "px-8"
      )}
    >
      <div className={cn(page.isFullWidth ? "max-w-none" : "max-w-3xl mx-auto")}>
        <PageHeader page={page} />
        <div className="mt-4">
          <BlockNoteEditor pageId={page._id} isFullWidth={page.isFullWidth} />
        </div>
      </div>
    </div>
  );
}
