"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Link2,
  Loader2,
  LogIn,
  Search,
  Users,
} from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEFAULT_WORKSPACE_ROUTE } from "@/lib/routes";
import { toast } from "sonner";

type WorkspaceSummary = {
  _id: Id<"workspaces">;
  name: string;
  role: "owner" | "editor" | "viewer";
  memberCount?: number;
  isShared?: boolean;
};

type PageSummary = {
  _id: Id<"pages">;
  title: string;
  type: string;
  isFavourite?: boolean;
  updatedAt?: number;
};

type SharePayload = {
  title: string;
  note: string;
  text: string;
  url: string;
  host: string;
};

type ShareParamsReader = {
  get(name: string): string | null;
};

const LAST_SHARE_WORKSPACE_KEY = "madvibe:last-share-workspace";
const LAST_SHARE_PAGE_KEY = "madvibe:last-share-page";

function extractFirstUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match?.[0] ?? "";
}

function normalizeShareText(value: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function getHostLabel(url: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function parseSharePayload(searchParams: ShareParamsReader): SharePayload {
  const title = normalizeShareText(searchParams.get("title"));
  const rawText = normalizeShareText(searchParams.get("text"));
  const directUrl = normalizeShareText(searchParams.get("url"));
  const extractedUrl = directUrl || extractFirstUrl(rawText);
  const note = extractedUrl
    ? normalizeShareText(rawText.replace(extractedUrl, ""))
    : rawText;

  return {
    title,
    note,
    text: rawText,
    url: extractedUrl,
    host: getHostLabel(extractedUrl),
  };
}

function getPageIcon(type: string) {
  if (type === "dashboard") return LayoutDashboard;
  return FileText;
}

function getShareHeadline(payload: SharePayload) {
  if (payload.title) return payload.title;
  if (payload.note) return payload.note;
  if (payload.url) return payload.url;
  return "No shared link detected yet";
}

export default function ShareCapturePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const appendSharedLinkTodo = useMutation(api.blocks.appendSharedLinkTodo);

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<Id<"workspaces"> | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<Id<"pages"> | null>(null);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const sharePayload = useMemo(() => parseSharePayload(searchParams), [searchParams]);
  const deferredSearch = useDeferredValue(search.trim());

  const workspaces = useQuery(api.workspaces.listWorkspaces);

  const editableWorkspaces = useMemo(
    () =>
      ((workspaces as WorkspaceSummary[] | undefined) ?? []).filter(
        (workspace) => workspace.role !== "viewer"
      ),
    [workspaces]
  );

  const searchedPages = useQuery(
    api.pages.search,
    selectedWorkspaceId && deferredSearch.length > 0
      ? { workspaceId: selectedWorkspaceId, query: deferredSearch }
      : "skip"
  );
  const workspacePages = useQuery(
    api.pages.listAll,
    selectedWorkspaceId && deferredSearch.length === 0
      ? { workspaceId: selectedWorkspaceId }
      : "skip"
  );

  const visiblePages = useMemo(() => {
    const source =
      deferredSearch.length > 0
        ? ((searchedPages as PageSummary[] | undefined) ?? [])
        : ((workspacePages as PageSummary[] | undefined) ?? []);

    return source
      .filter((page) => page.type !== "database")
      .sort((left, right) => {
        if (Boolean(left.isFavourite) !== Boolean(right.isFavourite)) {
          return left.isFavourite ? -1 : 1;
        }

        return (right.updatedAt ?? 0) - (left.updatedAt ?? 0);
      });
  }, [deferredSearch.length, searchedPages, workspacePages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isLoading || isAuthenticated) return;

    const redirectTo = `/share${window.location.search}`;
    router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!editableWorkspaces.length) return;

    setSelectedWorkspaceId((current) => {
      if (current && editableWorkspaces.some((workspace) => workspace._id === current)) {
        return current;
      }

      if (typeof window !== "undefined") {
        const storedWorkspaceId = window.localStorage.getItem(LAST_SHARE_WORKSPACE_KEY);
        const storedWorkspace = editableWorkspaces.find(
          (workspace) => String(workspace._id) === storedWorkspaceId
        );
        if (storedWorkspace) {
          return storedWorkspace._id;
        }
      }

      const collaborativeWorkspace = editableWorkspaces.find(
        (workspace) => workspace.memberCount && workspace.memberCount > 1
      );
      return collaborativeWorkspace?._id ?? editableWorkspaces[0]._id;
    });
  }, [editableWorkspaces]);

  useEffect(() => {
    if (!selectedWorkspaceId || typeof window === "undefined") return;
    window.localStorage.setItem(LAST_SHARE_WORKSPACE_KEY, String(selectedWorkspaceId));
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!visiblePages.length) {
      setSelectedPageId(null);
      return;
    }

    setSelectedPageId((current) => {
      if (current && visiblePages.some((page) => page._id === current)) {
        return current;
      }

      if (typeof window !== "undefined") {
        const storedPageId = window.localStorage.getItem(LAST_SHARE_PAGE_KEY);
        const storedPage = visiblePages.find((page) => String(page._id) === storedPageId);
        if (storedPage) {
          return storedPage._id;
        }
      }

      return visiblePages[0]._id;
    });
  }, [visiblePages]);

  useEffect(() => {
    if (!selectedPageId || typeof window === "undefined") return;
    window.localStorage.setItem(LAST_SHARE_PAGE_KEY, String(selectedPageId));
  }, [selectedPageId]);

  const selectedWorkspace = editableWorkspaces.find(
    (workspace) => workspace._id === selectedWorkspaceId
  );
  const selectedPage = visiblePages.find((page) => page._id === selectedPageId);
  const hasIncomingShare = Boolean(sharePayload.url || sharePayload.title || sharePayload.note);

  async function handleSave() {
    if (!selectedPageId) {
      toast.error("Pick a page to save this link into.");
      return;
    }

    if (!hasIncomingShare) {
      toast.error("No shared content was received.");
      return;
    }

    setIsSaving(true);
    try {
      await appendSharedLinkTodo({
        pageId: selectedPageId,
        sharedTitle: sharePayload.title || undefined,
        sharedText: sharePayload.note || sharePayload.text || undefined,
        sharedUrl: sharePayload.url || undefined,
      });

      toast.success("Shared link added as a checklist item.");
      router.replace(`/workspace/${selectedPageId}`);
    } catch (error) {
      console.error(error);
      toast.error("Could not save the shared link.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleOpenWorkspace() {
    router.push(DEFAULT_WORKSPACE_ROUTE);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(98,148,255,0.16),_transparent_38%),linear-gradient(180deg,_rgba(10,10,12,0.98),_rgba(7,7,9,1))] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-6 flex items-start gap-3 sm:items-center">
          <AppIcon className="h-11 w-11 rounded-3xl border border-foreground/10 bg-foreground/5 p-1.5" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.22em] text-foreground/45">Android Share Target</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Save into MadVibe</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.04] px-6 py-5 text-sm text-foreground/72">
              <Loader2 className="mb-3 h-5 w-5 animate-spin" />
              Loading your workspaces...
            </div>
          </div>
        ) : !isAuthenticated ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md rounded-[28px] border border-foreground/10 bg-foreground/[0.05] p-5 shadow-[0_32px_80px_rgba(0,0,0,0.35)] sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-foreground/10 p-3">
                  <LogIn className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">Sign in to finish saving</h2>
                  <p className="text-sm text-foreground/60">We will bring this shared link back after login.</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  if (typeof window === "undefined") return;
                  const redirectTo = `/share${window.location.search}`;
                  router.push(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
                }}
                className="w-full rounded-2xl"
              >
                Continue to login
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 gap-4 sm:gap-5 lg:grid-cols-[1.12fr_0.88fr]">
            <section className="overflow-hidden rounded-[26px] border border-foreground/10 bg-foreground/[0.05] p-4 shadow-[0_32px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:rounded-[30px] sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/65">Incoming Share</p>
                  <h2 className="mt-1 break-words text-lg font-semibold leading-tight sm:text-xl">
                    {getShareHeadline(sharePayload)}
                  </h2>
                </div>
                {sharePayload.url ? (
                  <a
                    href={sharePayload.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.05] px-3 py-2 text-xs text-foreground/70 transition hover:bg-foreground/[0.08] sm:w-auto sm:justify-start sm:py-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open source
                  </a>
                ) : null}
              </div>

              <div className="rounded-[24px] border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(84,163,255,0.12),rgba(255,255,255,0.03))] p-4 sm:rounded-[26px]">
                <div className="mb-3 flex items-center gap-2 text-sm text-cyan-100/85">
                  <Link2 className="h-4 w-4" />
                  <span className="break-words">{sharePayload.host || "Shared content"}</span>
                </div>
                <p className="break-words text-sm leading-6 text-foreground/88">
                  {sharePayload.note || sharePayload.text || "MadVibe is ready to save this share into a checklist item."}
                </p>
                {sharePayload.url ? (
                  <div className="mt-4 rounded-2xl border border-foreground/10 bg-foreground/20 px-3 py-3 text-xs text-cyan-100/85 break-all">
                    {sharePayload.url}
                  </div>
                ) : null}
                {!hasIncomingShare ? (
                  <p className="mt-4 text-xs text-amber-200/80">
                    Share a link from Chrome, Instagram, YouTube, or another Android app to see it here.
                  </p>
                ) : null}
              </div>

              <div className="mt-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground/82">
                  <Users className="h-4 w-4" />
                  Choose a workspace
                </div>
                {editableWorkspaces.length === 0 ? (
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/20 px-4 py-4 text-sm text-foreground/65">
                    You do not have any editable workspaces yet. Open MadVibe and create or join one first.
                  </div>
                ) : (
                  <div className="grid gap-2 sm:flex sm:gap-2 sm:overflow-x-auto sm:pb-1">
                    {editableWorkspaces.map((workspace) => (
                      <button
                        key={workspace._id}
                        type="button"
                        onClick={() => {
                          setSelectedWorkspaceId(workspace._id);
                          setSearch("");
                        }}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left transition sm:min-w-[180px] sm:w-auto",
                          workspace._id === selectedWorkspaceId
                            ? "border-cyan-300/40 bg-cyan-400/12"
                            : "border-foreground/10 bg-foreground/[0.03] hover:bg-foreground/[0.06]"
                        )}
                      >
                        <div className="break-words text-sm font-semibold text-foreground">{workspace.name}</div>
                        <div className="mt-1 break-words text-xs text-foreground/55">
                          {workspace.role === "owner" ? "Owner access" : "Editor access"}
                          {workspace.memberCount ? ` | ${workspace.memberCount} members` : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-[26px] border border-foreground/10 bg-foreground/[0.04] p-4 shadow-[0_32px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:rounded-[30px] sm:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/42">Checklist Destination</p>
                  <h2 className="mt-1 text-lg font-semibold sm:text-xl">Pick the page</h2>
                </div>
                <div className="max-w-full break-words rounded-2xl border border-foreground/10 bg-foreground/[0.04] px-3 py-2 text-xs text-foreground/60 sm:rounded-full sm:py-1.5">
                  {selectedWorkspace?.name ?? "No workspace selected"}
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search pages in the selected workspace"
                  className="h-11 rounded-2xl border-foreground/10 bg-foreground/20 pl-10 text-foreground placeholder:text-foreground/35"
                />
              </div>

              <div className="space-y-2">
                {visiblePages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-foreground/12 bg-foreground/20 px-4 py-8 text-center text-sm text-foreground/55">
                    {selectedWorkspaceId
                      ? "No pages match this search yet."
                      : "Choose a workspace to load pages."}
                  </div>
                ) : (
                  visiblePages.slice(0, 14).map((page) => {
                    const Icon = getPageIcon(page.type);
                    const isActive = page._id === selectedPageId;

                    return (
                      <button
                        key={page._id}
                        type="button"
                        onClick={() => setSelectedPageId(page._id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                          isActive
                            ? "border-emerald-300/40 bg-emerald-400/12"
                            : "border-foreground/10 bg-foreground/[0.025] hover:bg-foreground/[0.05]"
                        )}
                      >
                        <div
                          className={cn(
                            "shrink-0 rounded-2xl p-2.5",
                            isActive ? "bg-emerald-300/15 text-emerald-100" : "bg-foreground/8 text-foreground/70"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="break-words text-sm font-medium leading-5 text-foreground">
                            {page.title || "Untitled"}
                          </div>
                          <div className="mt-1 text-xs text-foreground/50">
                            {page.type === "dashboard" ? "Space home" : "Document page"}
                          </div>
                        </div>
                        {isActive ? <CheckCircle2 className="h-4 w-4 text-emerald-200" /> : null}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-5 rounded-[24px] border border-foreground/10 bg-foreground/20 p-4">
                <p className="text-sm text-foreground/72">
                  MadVibe will append one unchecked checklist item to the selected page with the shared link embedded as text.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={handleSave}
                    disabled={
                      isSaving ||
                      !selectedPageId ||
                      !selectedWorkspaceId ||
                      !editableWorkspaces.length ||
                      !hasIncomingShare
                    }
                    className="w-full rounded-2xl bg-emerald-500 text-primary-foreground hover:bg-emerald-400 sm:flex-1"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save checklist item
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenWorkspace}
                    className="w-full rounded-2xl border-foreground/12 bg-foreground/[0.03] text-foreground hover:bg-foreground/[0.06] sm:w-auto"
                  >
                    Open app
                  </Button>
                </div>
                {selectedPage ? (
                  <p className="mt-3 break-words text-xs text-foreground/45">
                    Saving into <span className="text-foreground/72">{selectedPage.title || "Untitled"}</span>
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
