"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import {
  BellRing,
  ChevronRight,
  FileUp,
  FolderPlus,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CreateSpaceItemModal } from "@/components/modals/create-space-item-modal";
import { ImportModal } from "@/components/modals/import-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";

type ActionTone = "neutral" | "amber" | "blue" | "emerald";

function ActionTile({
  icon: Icon,
  label,
  meta,
  onClick,
  disabled = false,
  badge,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  meta: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string | null;
  tone?: ActionTone;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex min-h-[92px] flex-col justify-between overflow-hidden rounded-[18px] border px-3 py-3.5 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
        disabled
          ? "cursor-not-allowed border-white/6 bg-white/[0.02] text-zinc-600 shadow-none"
          : "border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-px hover:border-white/12 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.035))]",
        tone === "amber" &&
          !disabled &&
          "hover:border-amber-400/22 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_28px_rgba(120,85,18,0.14)]",
        tone === "blue" &&
          !disabled &&
          "hover:border-sky-400/22 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_28px_rgba(34,94,147,0.14)]",
        tone === "emerald" &&
          !disabled &&
          "hover:border-emerald-400/22 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_28px_rgba(17,94,73,0.14)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-[12px] border transition-colors",
            disabled && "border-white/6 bg-white/[0.02] text-zinc-600",
            !disabled &&
              tone === "neutral" &&
              "border-white/10 bg-black/24 text-zinc-100 group-hover:border-white/14",
            !disabled &&
              tone === "amber" &&
              "border-amber-400/16 bg-amber-400/[0.08] text-amber-100 group-hover:border-amber-300/26",
            !disabled &&
              tone === "blue" &&
              "border-sky-400/16 bg-sky-400/[0.08] text-sky-100 group-hover:border-sky-300/26",
            !disabled &&
              tone === "emerald" &&
              "border-emerald-400/16 bg-emerald-400/[0.08] text-emerald-100 group-hover:border-emerald-300/26"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>

        {badge ? (
          <span className="rounded-full border border-amber-400/18 bg-amber-400/[0.1] px-2 py-0.5 text-[10px] font-semibold text-amber-200">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-4 min-w-0">
        <div className="truncate text-sm font-semibold tracking-[-0.01em] text-white">
          {label}
        </div>
        <p className="mt-1 text-[11px] leading-4 text-zinc-500">{meta}</p>
      </div>
    </button>
  );
}

export function WorkspaceActionMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentWorkspaceId, setReminderCenterOpen } = useAppStore();

  const [open, setOpen] = useState(false);
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceLoading, setNewSpaceLoading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const workspaces = useQuery(api.workspaces.listWorkspaces) ?? [];
  const createSpace = useMutation(api.pages.createSpace);

  const resolvedWorkspaceId = useMemo<Id<"workspaces"> | null>(() => {
    if (
      currentWorkspaceId &&
      workspaces.some((workspace: any) => workspace._id === currentWorkspaceId)
    ) {
      return currentWorkspaceId;
    }

    return workspaces[0]?._id ?? null;
  }, [currentWorkspaceId, workspaces]);

  const currentWorkspace = useMemo(
    () =>
      workspaces.find((workspace: any) => workspace._id === resolvedWorkspaceId) ??
      null,
    [resolvedWorkspaceId, workspaces]
  );

  const reminderSummary = useQuery(
    api.reminders.getSummary,
    resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : "skip"
  );
  const overdueCount = reminderSummary?.overdue ?? 0;
  const actionsDisabled = !resolvedWorkspaceId;
  const workspaceLabel = currentWorkspace?.name ?? "Workspace";

  const closeMenu = () => setOpen(false);

  const handleOpenReminders = () => {
    closeMenu();
    setReminderCenterOpen(true);
  };

  const handleOpenCreateItem = () => {
    if (!resolvedWorkspaceId) return;
    closeMenu();
    setCreateItemOpen(true);
  };

  const handleOpenCreateSpace = () => {
    if (!resolvedWorkspaceId) return;
    closeMenu();
    setCreateSpaceOpen(true);
  };

  const handleOpenImport = () => {
    if (!resolvedWorkspaceId) return;
    closeMenu();
    setImportModalOpen(true);
  };

  const handleOpenTrash = () => {
    closeMenu();
    if (pathname !== "/workspace/trash") {
      router.push("/workspace/trash");
    }
  };

  const handleCreateSpace = async () => {
    const title = newSpaceName.trim();
    if (!title) {
      toast.error("Enter a space name");
      return;
    }

    if (!resolvedWorkspaceId) {
      toast.error("Workspace is still loading");
      return;
    }

    setNewSpaceLoading(true);
    try {
      const id = await createSpace({
        workspaceId: resolvedWorkspaceId,
        title,
      });
      setCreateSpaceOpen(false);
      setNewSpaceName("");
      router.push(`/workspace/${id}`);
    } catch {
      toast.error("Failed to create space");
    } finally {
      setNewSpaceLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Open workspace actions"
            className="group pointer-events-auto relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#161513]/90 text-zinc-100 shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all hover:border-white/16 hover:bg-[#1a1917]"
          >
            <MoreHorizontal className="h-4 w-4" />
            {overdueCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-semibold leading-none text-black shadow-[0_0_18px_rgba(251,191,36,0.45)]">
                {overdueCount > 9 ? "9+" : overdueCount}
              </span>
            ) : null}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={12}
          className="w-[332px] rounded-[22px] border-white/10 bg-[#141311]/96 p-2 text-zinc-100 shadow-[0_28px_80px_rgba(0,0,0,0.48)] backdrop-blur-2xl"
        >
          <div className="rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Workspace
                </div>
                <div className="mt-1 truncate text-sm font-semibold tracking-[-0.01em] text-white">
                  {workspaceLabel}
                </div>
              </div>
              {overdueCount > 0 ? (
                <span className="shrink-0 rounded-full border border-amber-400/18 bg-amber-400/[0.1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                  {overdueCount} overdue
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[11px] leading-4 text-zinc-500">
              Quick access to the actions you actually use.
            </p>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <ActionTile
              icon={BellRing}
              label="Reminders"
              meta={
                overdueCount > 0
                  ? `${overdueCount} overdue waiting`
                  : "Upcoming and overdue"
              }
              badge={overdueCount > 0 ? `${overdueCount}` : null}
              onClick={handleOpenReminders}
              tone="amber"
            />
            <ActionTile
              icon={Plus}
              label="New"
              meta="Page or database"
              onClick={handleOpenCreateItem}
              disabled={actionsDisabled}
              tone="blue"
            />
            <ActionTile
              icon={FolderPlus}
              label="Space"
              meta="Dedicated project home"
              onClick={handleOpenCreateSpace}
              disabled={actionsDisabled}
              tone="emerald"
            />
            <ActionTile
              icon={FileUp}
              label="Import"
              meta="Markdown or CSV"
              onClick={handleOpenImport}
              disabled={actionsDisabled}
            />
          </div>

          <button
            type="button"
            onClick={handleOpenTrash}
            className={cn(
              "mt-2 flex w-full items-center gap-3 rounded-[16px] border px-3 py-2.5 text-left transition-colors",
              pathname === "/workspace/trash"
                ? "border-red-400/16 bg-red-400/[0.08] text-red-100"
                : "border-white/8 bg-white/[0.03] text-zinc-200 hover:border-red-400/16 hover:bg-red-400/[0.08] hover:text-red-100"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-[11px] border",
                pathname === "/workspace/trash"
                  ? "border-red-400/16 bg-red-400/[0.08]"
                  : "border-white/8 bg-black/20"
              )}
            >
              <Trash2 className="h-4 w-4" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold tracking-[-0.01em]">
                {pathname === "/workspace/trash" ? "Trash open" : "Trash"}
              </span>
              <span className="mt-0.5 block text-[11px] text-zinc-500">
                Deleted pages and spaces
              </span>
            </span>

            <ChevronRight className="h-4 w-4 text-zinc-500" />
          </button>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createSpaceOpen} onOpenChange={setCreateSpaceOpen}>
        <DialogContent
          title="Create space"
          className="max-w-md border-white/10 bg-[#161513] text-zinc-100"
        >
          <DialogHeader>
            <DialogTitle>Create a new project space</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Each space gets its own home page and isolated pages, notes, and
              databases.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={newSpaceName}
              onChange={(event) => setNewSpaceName(event.target.value)}
              placeholder="Space name"
              className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-white/15"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl text-zinc-300 hover:bg-white/[0.06] hover:text-white"
              onClick={() => setCreateSpaceOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-white text-black hover:bg-zinc-200"
              onClick={handleCreateSpace}
              disabled={newSpaceLoading}
            >
              {newSpaceLoading ? "Creating..." : "Create space"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {resolvedWorkspaceId ? (
        <CreateSpaceItemModal
          open={createItemOpen}
          onClose={() => setCreateItemOpen(false)}
          workspaceId={resolvedWorkspaceId}
          parentId={null}
          spaceLabel="General"
        />
      ) : null}

      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        workspaceId={resolvedWorkspaceId}
      />
    </>
  );
}
