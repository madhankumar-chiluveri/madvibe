"use client";

import { Component, useEffect, useRef, useCallback, useState, type ErrorInfo, type ReactNode } from "react";
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
import { sanitizeBlockNoteDocument } from "../../../shared/blocknote-content";

interface EditorBoundaryProps {
  pageId: Id<"pages">;
  getDoc: () => unknown;
  onRecover: () => void;
  children: ReactNode;
}

interface EditorBoundaryState {
  error: Error | null;
}

class BlockNoteRenderBoundary extends Component<EditorBoundaryProps, EditorBoundaryState> {
  state: EditorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const doc = (() => {
      try {
        return this.props.getDoc();
      } catch {
        return null;
      }
    })();

    if (typeof window !== "undefined") {
      (window as any).__bn_failed_doc__ = doc;
      (window as any).__bn_failed_pageId__ = this.props.pageId;
    }
    console.error("[BlockNote] renderSpec crash for page", this.props.pageId, {
      error,
      componentStack: info.componentStack,
      doc,
    });
  }

  componentDidUpdate(prevProps: EditorBoundaryProps) {
    if (this.state.error && prevProps.pageId !== this.props.pageId) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      const message =
        this.state.error instanceof Error ? this.state.error.message : String(this.state.error);
      return (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-6 text-foreground">
          <div className="text-base font-semibold text-foreground">Document failed to render</div>
          <div className="mt-1 text-sm text-muted-foreground">
            BlockNote crashed while loading this page. Failing document logged to console as{" "}
            <code className="rounded bg-foreground/[0.06] px-1.5 py-0.5 text-xs">
              window.__bn_failed_doc__
            </code>
            .
          </div>
          <pre className="mt-3 max-h-[160px] overflow-auto rounded-lg border border-red-500/20 bg-background/40 p-3 text-xs text-red-300">
            {message}
          </pre>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              this.props.onRecover();
            }}
            className="mt-4 inline-flex h-9 items-center rounded-xl bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reload editor
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const lastSavedSnapshot = useRef<string | null>(null);

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
    lastSavedSnapshot.current = null;
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
        // Guard against legacy/corrupted blocks that would crash BlockNote's
        // ProseMirror renderSpec ("Invalid array passed to renderSpec").
        // Drop null/undefined entries and anything without a string `type`.
        nextRemoteContent = sanitizeBlockNoteDocument(blockContent);
      }
    } catch {
      nextRemoteContent = [];
    }

    const remoteSnapshot = JSON.stringify(sanitizeForConvex(nextRemoteContent));
    const previousRemoteSnapshot = lastRemoteSnapshot.current;
    lastRemoteSnapshot.current = remoteSnapshot;

    if (typeof window !== "undefined") {
      (window as any).__bn_failed_incoming_doc__ = nextRemoteContent;
    }

    if (!isInitialized.current) {
      isInitialized.current = true;
      if (nextRemoteContent.length > 0) {
        try {
          editor.replaceBlocks(editor.document, nextRemoteContent as any);
        } catch (err) {
          console.error("[BlockNote] Initial replaceBlocks failed for nextRemoteContent:", nextRemoteContent, err);
          if (typeof window !== "undefined") {
            (window as any).__bn_failed_incoming_doc__ = nextRemoteContent;
          }
          throw err;
        }
      }

      const t = setTimeout(() => setIsLoadingContent(false), 60);
      return () => clearTimeout(t);
    }

    // CRITICAL FIX: If we are the active editor, never pull content from the 
    // network after the initial load. BlockNote (without a true Yjs provider)
    // cannot seamlessly merge document states — calling replaceBlocks() steals 
    // cursor focus and forces empty new lines.
    if (editable) {
      return;
    }

    if (remoteSnapshot === previousRemoteSnapshot) {
      return;
    }

    const editorSnapshot = JSON.stringify(sanitizeForConvex(editor.document));
    if (editorSnapshot === remoteSnapshot) {
      return;
    }

    try {
      editor.replaceBlocks(editor.document, nextRemoteContent as any);
    } catch (err) {
      console.error("[BlockNote] Subsequent replaceBlocks failed for nextRemoteContent:", nextRemoteContent, err);
      if (typeof window !== "undefined") {
        (window as any).__bn_failed_incoming_doc__ = nextRemoteContent;
      }
      throw err;
    }
  }, [blocks, editor, editable, setDirty, setSaveStatus]);

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
        const sanitizedBlocks = sanitizeForConvex(
          sanitizeBlockNoteDocument(editorBlocks),
        );
        lastSavedSnapshot.current = JSON.stringify(sanitizedBlocks);

        await upsert({
          id: blockId.current ?? undefined,
          pageId,
          type: "document",
          content: sanitizedBlocks,
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
        <BlockNoteRenderBoundary
          pageId={pageId}
          getDoc={() => {
            try {
              return editor?.document ?? null;
            } catch {
              return null;
            }
          }}
          onRecover={() => {
            try {
              editor.replaceBlocks(editor.document, [] as any);
            } catch (recoverError) {
              console.error("[BlockNote] recovery failed", recoverError);
            }
          }}
        >
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
        </BlockNoteRenderBoundary>
      </div>
    </div>
  );
}
