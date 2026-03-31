"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  Trash2,
  RotateCcw,
  Search,
  FileText,
  Database,
  LayoutDashboard,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function TrashPage() {
  const { resolvedWorkspaceId } = useResolvedWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const archivedPages = useQuery(
    api.pages.listArchived,
    resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : "skip"
  );

  const restorePage = useMutation(api.pages.restore);
  const deletePage = useMutation(api.pages.remove);

  const filtered =
    archivedPages?.filter((p: any) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

  const handleRestore = async (id: string) => {
    try {
      await restorePage({ id: id as any });
      toast.success("Page restored");
    } catch {
      toast.error("Failed to restore page");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePage({ id: id as any });
      toast.success("Page permanently deleted");
      setConfirmDelete(null);
    } catch {
      toast.error("Failed to delete page");
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === "database") return <Database className="w-4 h-4 text-foreground" />;
    if (type === "dashboard") return <LayoutDashboard className="w-4 h-4 text-foreground" />;
    return <FileText className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen">
      <WorkspaceTopBar moduleTitle="Trash" />
      <div className="max-w-3xl mx-auto p-4 md:p-8">

        {archivedPages === undefined ? (
          <div className="text-muted-foreground text-sm animate-pulse">
            Loading…
          </div>
        ) : archivedPages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-medium">Trash is empty</p>
            <p className="text-muted-foreground text-sm">
              Deleted pages will appear here
            </p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter deleted pages…"
                className="pl-9 h-10 md:h-9"
              />
            </div>

            <div className="text-xs text-muted-foreground mb-4">
              {filtered.length} page{filtered.length !== 1 ? "s" : ""} in trash
            </div>

            {/* List */}
            <div className="space-y-2">
              {filtered.map((page: any) => (
                <div
                  key={page._id}
                  className="flex items-center gap-3 px-3 md:px-4 py-3 rounded-xl border hover:bg-accent/30 transition-colors group"
                >
                  {/* Icon */}
                  <span className="text-lg shrink-0">
                    {page.icon ?? getTypeIcon(page.type)}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {page.title || "Untitled"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Deleted{" "}
                      {page.archivedAt
                        ? formatRelativeTime(page.archivedAt)
                        : "recently"}
                    </p>
                  </div>

                  {/* Actions — always visible on mobile, hover on desktop */}
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors md:hidden"
                      onClick={() => handleRestore(page._id)}
                      title="Restore"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-destructive transition-colors md:hidden"
                      onClick={() => setConfirmDelete(page._id)}
                      title="Delete forever"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden md:flex h-7 text-xs gap-1.5"
                      onClick={() => handleRestore(page._id)}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden md:flex h-7 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmDelete(page._id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete forever
                    </Button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && searchQuery && (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No deleted pages match &quot;{searchQuery}&quot;
                </p>
              )}
            </div>
          </>
        )}
      </div>

        {/* Confirm delete dialog */}
        <Dialog
          open={!!confirmDelete}
          onOpenChange={() => setConfirmDelete(null)}
        >
          <DialogContent
            title={
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Delete forever?
              </span>
            }
          >
            <DialogDescription>
              This action cannot be undone. This page and all its content will
              be permanently deleted.
            </DialogDescription>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => confirmDelete && handleDelete(confirmDelete)}
              >
                Delete forever
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}
