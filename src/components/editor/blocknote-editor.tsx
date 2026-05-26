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
import {
  sanitizeBlockNoteDocument,
  sanitizeBlockNoteDocumentForRenderRecovery,
} from "../../../shared/blocknote-content";

// ─── Error boundary ────────────────────────────────────────────────────────
// Catches ProseMirror renderSpec crashes during React render.
// Does NOT attempt in-place recovery (that causes infinite loops).
// Instead signals the outer wrapper via onFatalCrash so it can remount
// a fresh editor instance with safe content.

interface EditorBoundaryProps {
  pageId: Id<"pages">;
  getDoc: () => unknown;
  onFatalCrash: (rawContent: unknown) => void;
  children: ReactNode;
}

interface EditorBoundaryState {
  error: Error | null;
}

class BlockNoteRenderBoundary extends Component<EditorBoundaryProps, EditorBoundaryState> {
  state: EditorBoundaryState = { error: null };
  private hasFiredCrash = false;

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
    // Structured diagnostic log
    const docJson = (() => {
      try { return JSON.stringify(doc)?.slice(0, 3000); } catch { return "[serialize failed]"; }
    })();
    console.error(
      `[BlockNote] Render crash for page ${this.props.pageId}\n` +
      `  Error: ${error?.message}\n` +
      `  Doc blocks: ${Array.isArray(doc) ? doc.length : "N/A"}\n` +
      `  Doc preview: ${docJson}`,
    );
    console.error("[BlockNote] Full crash details:", {
      error,
      componentStack: info.componentStack,
      doc,
    });

    // Signal outer wrapper to remount with safe content.
    // Do NOT call editor.replaceBlocks() here — the ProseMirror view is in a
    // broken state and any state update triggers another render → infinite loop.
    if (!this.hasFiredCrash) {
      this.hasFiredCrash = true;
      this.props.onFatalCrash(doc);
    }
  }

  componentDidUpdate(prevProps: EditorBoundaryProps) {
    if (this.state.error && prevProps.pageId !== this.props.pageId) {
      this.hasFiredCrash = false;
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
            onClick={() => this.props.onFatalCrash(null)}
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

// ─── Skeleton ──────────────────────────────────────────────────────────────

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

// ─── Fatal error display ──────────────────────────────────────────────────
// Shown when recovery is exhausted. Displays the raw document JSON so the
// user (or developer) can diagnose what data is causing the crash.

function EditorFatalError({
  pageId,
  error,
}: {
  pageId: Id<"pages">;
  error: { message: string; rawDoc: unknown; sanitizedDoc: unknown };
}) {
  const [showRaw, setShowRaw] = useState(false);

  const docPreview = (() => {
    try {
      const target = showRaw ? error.rawDoc : error.sanitizedDoc;
      return JSON.stringify(target, null, 2)?.slice(0, 4000) ?? "null";
    } catch {
      return "[Could not serialize document]";
    }
  })();

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-6 text-foreground">
      <div className="text-base font-semibold">Editor failed to load</div>
      <div className="mt-1 text-sm text-muted-foreground">
        {error.message}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Page ID: <code className="rounded bg-foreground/[0.06] px-1.5 py-0.5">{pageId}</code>
        {" · "}
        Debug data saved to{" "}
        <code className="rounded bg-foreground/[0.06] px-1.5 py-0.5">window.__bn_fatal_doc__</code>
        {" and "}
        <code className="rounded bg-foreground/[0.06] px-1.5 py-0.5">window.__bn_fatal_sanitized__</code>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          {showRaw ? "Show sanitized" : "Show raw data"}
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              navigator.clipboard.writeText(
                JSON.stringify({ pageId, raw: error.rawDoc, sanitized: error.sanitizedDoc }, null, 2),
              );
            } catch { /* ignore */ }
          }}
          className="inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          Copy debug JSON
        </button>
      </div>

      <pre className="mt-3 max-h-[300px] overflow-auto rounded-lg border border-red-500/20 bg-background/40 p-3 text-xs text-red-300 whitespace-pre-wrap break-all">
        {docPreview}
      </pre>
    </div>
  );
}

// ─── Outer wrapper ─────────────────────────────────────────────────────────
// Manages recovery state. When a fatal render crash occurs, it generates safe
// fallback content and increments a key so the inner component remounts with
// a brand-new editor instance — no corrupted ProseMirror state carried over.

interface BlockNoteEditorProps {
  pageId: Id<"pages">;
  editable?: boolean;
  isFullWidth?: boolean;
}

const MAX_RECOVERY_ATTEMPTS = 1;

export function BlockNoteEditor({
  pageId,
  editable = true,
  isFullWidth = false,
}: BlockNoteEditorProps) {
  const [editorKey, setEditorKey] = useState(0);
  const [recoveryContent, setRecoveryContent] = useState<unknown[] | null>(null);
  const recoveryAttempts = useRef(0);
  const [fatalError, setFatalError] = useState<{
    message: string;
    rawDoc: unknown;
    sanitizedDoc: unknown;
  } | null>(null);

  // Reset recovery state when navigating to a different page
  const lastPageId = useRef(pageId);
  useEffect(() => {
    if (lastPageId.current !== pageId) {
      lastPageId.current = pageId;
      recoveryAttempts.current = 0;
      setFatalError(null);
      setRecoveryContent(null);
      setEditorKey(0);
    }
  }, [pageId]);

  const handleFatalCrash = useCallback((rawContent: unknown) => {
    recoveryAttempts.current += 1;
    const attemptNum = recoveryAttempts.current;

    const safe = sanitizeBlockNoteDocumentForRenderRecovery(rawContent);

    console.error(
      `[BlockNote] Recovery attempt ${attemptNum}/${MAX_RECOVERY_ATTEMPTS} for page ${pageId}`,
      {
        rawContent: rawContent != null ? JSON.stringify(rawContent).slice(0, 2000) : null,
        sanitizedContent: JSON.stringify(safe).slice(0, 2000),
        blockCount: Array.isArray(rawContent) ? rawContent.length : "N/A",
      },
    );

    if (attemptNum > MAX_RECOVERY_ATTEMPTS) {
      // Recovery exhausted — show permanent inline error instead of looping
      console.error(
        `[BlockNote] Recovery exhausted after ${attemptNum - 1} attempt(s) for page ${pageId}. ` +
        `Showing error UI. Raw doc logged to window.__bn_fatal_doc__`,
      );
      if (typeof window !== "undefined") {
        (window as any).__bn_fatal_doc__ = rawContent;
        (window as any).__bn_fatal_sanitized__ = safe;
      }
      setFatalError({
        message: `BlockNote crashed ${attemptNum - 1} time(s) and recovery failed. The document data may be corrupted.`,
        rawDoc: rawContent,
        sanitizedDoc: safe,
      });
      return;
    }

    setRecoveryContent(safe.length > 0 ? safe : []);
    setEditorKey((k) => k + 1);
  }, [pageId]);

  if (fatalError) {
    return <EditorFatalError pageId={pageId} error={fatalError} />;
  }

  return (
    <BlockNoteEditorInner
      key={`${pageId}:${editorKey}`}
      pageId={pageId}
      editable={editable}
      isFullWidth={isFullWidth}
      recoveryContent={recoveryContent}
      onFatalCrash={handleFatalCrash}
    />
  );
}

// ─── Inner editor ──────────────────────────────────────────────────────────
// Owns useCreateBlockNote — gets a fresh editor on every mount.

interface BlockNoteEditorInnerProps {
  pageId: Id<"pages">;
  editable: boolean;
  isFullWidth: boolean;
  recoveryContent: unknown[] | null;
  onFatalCrash: (rawContent: unknown) => void;
}

function BlockNoteEditorInner({
  pageId,
  editable,
  isFullWidth,
  recoveryContent,
  onFatalCrash,
}: BlockNoteEditorInnerProps) {
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
  const lastIncomingContent = useRef<unknown[]>([]);
  const isRecoveryMount = useRef(recoveryContent !== null);

  const [isLoadingContent, setIsLoadingContent] = useState(!isRecoveryMount.current);
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If this is a recovery mount, start with safe content; otherwise empty.
  const safeInitial = isRecoveryMount.current && recoveryContent && recoveryContent.length > 0
    ? (recoveryContent as any)
    : undefined;

  const editor = useCreateBlockNote({
    initialContent: safeInitial,
    setIdAttribute: true,
    tabBehavior: "prefer-indent",
  });

  // ── Schema diagnostic — log all node toDOM specs on first mount ────────
  useEffect(() => {
    try {
      const tiptap = (editor as any)._tiptapEditor;
      const schema = tiptap?.schema;
      if (!schema) return;

      const issues: string[] = [];
      for (const [name, nodeType] of Object.entries<any>(schema.nodes)) {
        const spec = nodeType.spec;
        if (!spec.toDOM) continue;
        try {
          const testNode = nodeType.createAndFill();
          if (!testNode) {
            issues.push(`${name}: createAndFill returned null`);
            continue;
          }
          const result = spec.toDOM(testNode);
          if (Array.isArray(result)) {
            if (typeof result[0] !== "string") {
              issues.push(
                `${name}: toDOM[0] is ${typeof result[0]} (${JSON.stringify(result[0])}) — NOT a string tag`,
              );
            }
          }
        } catch (err: any) {
          issues.push(`${name}: toDOM threw — ${err?.message}`);
        }
      }
      for (const [name, markType] of Object.entries<any>(schema.marks)) {
        const spec = markType.spec;
        if (!spec.toDOM) continue;
        try {
          const mark = markType.create();
          const result = spec.toDOM(mark, true);
          if (Array.isArray(result)) {
            if (typeof result[0] !== "string") {
              issues.push(
                `mark:${name}: toDOM[0] is ${typeof result[0]} — NOT a string tag`,
              );
            }
          }
        } catch (err: any) {
          issues.push(`mark:${name}: toDOM threw — ${err?.message}`);
        }
      }
      if (issues.length > 0) {
        console.error("[BlockNote] Schema toDOM issues found:", issues);
      } else {
        console.log("[BlockNote] All schema node/mark toDOM specs valid");
      }
    } catch {
      // Diagnostic only — don't break anything
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If we mounted with recovery content, mark as already initialized so the
  // first Convex data arrival doesn't overwrite the safe content.
  useEffect(() => {
    if (isRecoveryMount.current) {
      isInitialized.current = true;
      const content = recoveryContent ?? [];
      lastIncomingContent.current = content;
      lastRemoteSnapshot.current = JSON.stringify(sanitizeForConvex(content));
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reset state when navigating to a different page ──────────────────────
  useEffect(() => {
    if (mountedPageId.current === pageId) return;
    mountedPageId.current = pageId;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    isInitialized.current = false;
    isRecoveryMount.current = false;
    blockId.current = null;
    hasPendingSave.current = false;
    lastRemoteSnapshot.current = null;
    lastSavedSnapshot.current = null;
    lastIncomingContent.current = [];
    setSaveStatus("idle");
    setDirty(false);
    setIsLoadingContent(true);
  }, [pageId, setDirty, setSaveStatus]);

  // ── Load content once blocks arrive ──────────────────────────────────────
  const replaceBlocksWithRenderRecovery = useCallback(
    (content: unknown[], source: unknown, label: string) => {
      try {
        editor.replaceBlocks(editor.document, content as any);
        return content;
      } catch (error) {
        const fallbackContent = sanitizeBlockNoteDocumentForRenderRecovery(source);
        try {
          editor.replaceBlocks(editor.document, fallbackContent as any);
          console.warn(`[BlockNote] ${label} recovered with plain-text-safe content`, {
            error,
            fallbackContent,
          });
          return fallbackContent;
        } catch (recoveryError) {
          console.error(`[BlockNote] ${label} recovery failed`, {
            error,
            recoveryError,
            fallbackContent,
          });
          throw error;
        }
      }
    },
    [editor],
  );

  useEffect(() => {
    if (!blocks) return;

    const primaryBlock = blocks[0] ?? null;
    blockId.current = primaryBlock?._id ?? null;

    let nextRemoteContent: unknown[] = [];
    let rawRemoteContent: unknown = [];
    try {
      let blockContent = primaryBlock?.content;
      if (typeof blockContent === "string") {
        blockContent = JSON.parse(blockContent);
      }
      if (Array.isArray(blockContent)) {
        rawRemoteContent = blockContent;
        nextRemoteContent = sanitizeBlockNoteDocument(blockContent);
      }
    } catch {
      nextRemoteContent = [];
    }

    let remoteSnapshot = JSON.stringify(sanitizeForConvex(nextRemoteContent));
    const previousRemoteSnapshot = lastRemoteSnapshot.current;
    lastIncomingContent.current = nextRemoteContent;

    if (!isInitialized.current) {
      isInitialized.current = true;

      // Log what data is entering the editor for debugging renderSpec crashes
      if (process.env.NODE_ENV === "development" || nextRemoteContent.length > 0) {
        console.log(
          `[BlockNote] Loading page ${pageId}` +
          ` | blocks: ${nextRemoteContent.length}` +
          ` | types: ${nextRemoteContent.map((b: any) => b?.type).join(", ") || "(empty)"}` +
          ` | recovery: ${isRecoveryMount.current}`,
        );
      }

      if (nextRemoteContent.length > 0) {
        nextRemoteContent = replaceBlocksWithRenderRecovery(
          nextRemoteContent,
          rawRemoteContent,
          "Initial replaceBlocks",
        );
        lastIncomingContent.current = nextRemoteContent;
        remoteSnapshot = JSON.stringify(sanitizeForConvex(nextRemoteContent));
      }
      lastRemoteSnapshot.current = remoteSnapshot;

      const t = setTimeout(() => setIsLoadingContent(false), 60);
      return () => clearTimeout(t);
    }

    // If we are the active editor, never pull content from the network after
    // the initial load — replaceBlocks steals cursor focus.
    if (editable) {
      lastRemoteSnapshot.current = remoteSnapshot;
      return;
    }

    if (remoteSnapshot === previousRemoteSnapshot) {
      lastRemoteSnapshot.current = remoteSnapshot;
      return;
    }

    const editorSnapshot = JSON.stringify(sanitizeForConvex(editor.document));
    if (editorSnapshot === remoteSnapshot) {
      lastRemoteSnapshot.current = remoteSnapshot;
      return;
    }

    nextRemoteContent = replaceBlocksWithRenderRecovery(
      nextRemoteContent,
      rawRemoteContent,
      "Subsequent replaceBlocks",
    );
    lastIncomingContent.current = nextRemoteContent;
    lastRemoteSnapshot.current = JSON.stringify(sanitizeForConvex(nextRemoteContent));
  }, [blocks, editor, editable, replaceBlocksWithRenderRecovery, setDirty, setSaveStatus]);

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

    const anchorId = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!anchorId) return;

    const target = document.getElementById(anchorId);
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

      {/* Shimmer overlay while content loads */}
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
          onFatalCrash={onFatalCrash}
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
