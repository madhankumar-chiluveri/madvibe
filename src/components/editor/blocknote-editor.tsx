"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { SideMenuController, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useTheme } from "next-themes";
import { cn, sanitizeForConvex } from "@/lib/utils";
import { useEditorStore } from "@/store/editor.store";
import { toast } from "sonner";
import { NotionSideMenu } from "./notion-block-side-menu";

interface BlockNoteEditorProps {
  pageId: Id<"pages">;
  editable?: boolean;
  isFullWidth?: boolean;
}

// Shimmer lines shown while blocks are loading
function EditorSkeleton() {
  return (
    <div className="space-y-3 pt-1 animate-fade-in-fast">
      <div className="skeleton-shimmer h-5 w-3/4 rounded-md" />
      <div className="skeleton-shimmer h-4 w-full rounded-md" />
      <div className="skeleton-shimmer h-4 w-5/6 rounded-md" />
      <div className="skeleton-shimmer h-4 w-4/5 rounded-md" />
      <div className="skeleton-shimmer h-4 w-full rounded-md" />
      <div className="skeleton-shimmer h-4 w-2/3 rounded-md" />
      <div className="skeleton-shimmer h-4 w-11/12 rounded-md" />
      <div className="skeleton-shimmer h-4 w-3/5 rounded-md" />
    </div>
  );
}

export function BlockNoteEditor({
  pageId,
  editable = true,
  isFullWidth = false,
}: BlockNoteEditorProps) {
  const { resolvedTheme } = useTheme();

  const blocks = useQuery(api.blocks.listByPage, { pageId });
  const upsert = useMutation(api.blocks.upsert);

  const { setDirty, setSaving, setSaveStatus } = useEditorStore();

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialized = useRef(false);
  const blockId = useRef<Id<"blocks"> | null>(null);
  const hasPendingSave = useRef(false);
  const mountedPageId = useRef<string>(pageId);
  const lastRemoteSnapshot = useRef<string | null>(null);

  // true = show shimmer, false = show editor
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useCreateBlockNote({
    initialContent: undefined,
    setIdAttribute: true,
    tabBehavior: "prefer-indent",
  });

  // ── Reset state when navigating to a different page ──────────────────────
  useEffect(() => {
    if (mountedPageId.current === pageId) return;
    mountedPageId.current = pageId;

    // Flush any pending save timer for the previous page
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    isInitialized.current = false;
    blockId.current = null;
    hasPendingSave.current = false;
    lastRemoteSnapshot.current = null;
    setSaveStatus("idle");
    setDirty(false);
    // Show shimmer while new page's blocks load
    setIsLoadingContent(true);
  }, [pageId, setDirty, setSaveStatus]);

  // ── Load content once blocks arrive ──────────────────────────────────────
  useEffect(() => {
    if (!blocks) return;

    const primaryBlock = blocks[0] ?? null;
    blockId.current = primaryBlock?._id ?? null;

    let nextRemoteContent: unknown[] = [];
    try {
      let blockContent = primaryBlock?.content;
      if (typeof blockContent === "string") {
        blockContent = JSON.parse(blockContent);
      }
      if (Array.isArray(blockContent)) {
        nextRemoteContent = blockContent;
      }
    } catch {
      nextRemoteContent = [];
    }

    const remoteSnapshot = JSON.stringify(sanitizeForConvex(nextRemoteContent));
    const previousRemoteSnapshot = lastRemoteSnapshot.current;
    lastRemoteSnapshot.current = remoteSnapshot;

    if (!isInitialized.current) {
      isInitialized.current = true;
      if (nextRemoteContent.length > 0) {
        editor.replaceBlocks(editor.document, nextRemoteContent as any);
      }

      const t = setTimeout(() => setIsLoadingContent(false), 60);
      return () => clearTimeout(t);
    }

    if (remoteSnapshot === previousRemoteSnapshot || hasPendingSave.current) {
      return;
    }

    const editorSnapshot = JSON.stringify(sanitizeForConvex(editor.document));
    if (editorSnapshot === remoteSnapshot) {
      return;
    }

    editor.replaceBlocks(editor.document, nextRemoteContent as any);
    setDirty(false);
    setSaveStatus("idle");
  }, [blocks, editor, setDirty, setSaveStatus]);

  // ── beforeunload guard ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasPendingSave.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (savedTimeout.current) clearTimeout(savedTimeout.current);
    };
  }, []);

  const scrollToHashTarget = useCallback(() => {
    if (typeof window === "undefined") return;

    const blockId = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!blockId) return;

    const target = document.getElementById(blockId);
    if (!target) return;

    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("blocknote-anchor-target");

      window.setTimeout(() => {
        target.classList.remove("blocknote-anchor-target");
      }, 1600);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.addEventListener("hashchange", scrollToHashTarget);
    return () => window.removeEventListener("hashchange", scrollToHashTarget);
  }, [scrollToHashTarget]);

  useEffect(() => {
    if (isLoadingContent) return;

    const timeout = window.setTimeout(scrollToHashTarget, 80);
    return () => window.clearTimeout(timeout);
  }, [isLoadingContent, pageId, scrollToHashTarget]);

  // ── Debounced auto-save ───────────────────────────────────────────────────
  const handleChange = useCallback(() => {
    if (!isInitialized.current) return;

    hasPendingSave.current = true;
    setDirty(true);
    setSaveStatus("saving");

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    if (savedTimeout.current) clearTimeout(savedTimeout.current);

    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      try {
        const editorBlocks = editor.document;
        await upsert({
          id: blockId.current ?? undefined,
          pageId,
          type: "document",
          content: sanitizeForConvex(editorBlocks),
          sortOrder: 1000,
          properties: {},
        });
        hasPendingSave.current = false;
        setDirty(false);
        setSaveStatus("saved");
        savedTimeout.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
        toast.error("Failed to save — check your connection");
      } finally {
        setSaving(false);
      }
    }, 500);
  }, [editor, pageId, upsert, setDirty, setSaving, setSaveStatus]);

  return (
    <div className={cn("blocknote-wrapper w-full min-h-[calc(100vh-200px)]", isFullWidth && "full-width-editor")}>

      {/* Shimmer overlay while content loads — covers editor without unmounting it */}
      <div className={cn(
        "transition-opacity duration-200",
        isLoadingContent ? "block" : "hidden"
      )}>
        <EditorSkeleton />
      </div>

      <div className={cn(
        "transition-opacity duration-150",
        isLoadingContent ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
      )}>
        <BlockNoteView
          editor={editor}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          editable={editable}
          onChange={handleChange}
          className="prose-editor"
          sideMenu={false}
        >
          <SideMenuController sideMenu={NotionSideMenu} />
        </BlockNoteView>
      </div>
    </div>
  );
}
