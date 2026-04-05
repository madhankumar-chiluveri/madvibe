"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import {
  BellRing,
  Building2,
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
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";
import {
  CreateWorkspaceDialog,
  WorkspaceSwitcherContent,
} from "@/components/workspace/workspace-switcher";

type ActionTone = "neutral" | "amber" | "blue" | "emerald";

function ActionRow({
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
        "group relative flex w-full items-center gap-3 overflow-hidden rounded-[16px] border px-3 py-3 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
        disabled
          ? "cursor-not-allowed border-white/6 bg-white/[0.02] text-zinc-600 shadow-none"
          : "border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-white/12 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.035))]",
        tone === "amber" &&
          !disabled &&
          "hover:border-amber-400/22 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(120,85,18,0.12)]",
        tone === "blue" &&
          !disabled &&
          "hover:border-sky-400/22 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(34,94,147,0.12)]",
        tone === "emerald" &&
          !disabled &&
          "hover:border-emerald-400/22 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(17,94,73,0.12)]"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border transition-colors",
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

      <span className="min-w-0 flex-1">
        <span className="truncate text-sm font-semibold tracking-[-0.01em] text-white">
          {label}
        </span>
        <span className="mt-0.5 block text-[11px] leading-4 text-zinc-500">{meta}</span>
      </span>

      {badge ? (
        <span className="rounded-full border border-amber-400/18 bg-amber-400/[0.1] px-2 py-0.5 text-[10px] font-semibold text-amber-200">
          {badge}
        </span>
      ) : null}

      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500 transition-colors group-hover:text-zinc-300" />
    </button>
  );
}

export function WorkspaceActionMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const setReminderCenterOpen = useAppStore((state) => state.setReminderCenterOpen);
  const { resolvedWorkspaceId } = useResolvedWorkspace();

  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceLoading, setNewSpaceLoading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);

  const createSpace = useMutation(api.pages.createSpace);

  const reminderSummary = useQuery(
    api.reminders.getSummary,
    resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : "skip"
  );
  const overdueCount = reminderSummary?.overdue ?? 0;
  const actionsDisabled = !resolvedWorkspaceId;
  const closeMenus = () => {
    setDesktopOpen(false);
    setMobileOpen(false);
  };

  const handleOpenReminders = () => {
    closeMenus();
    setReminderCenterOpen(true);
  };

  const handleOpenCreateItem = () => {
    if (!resolvedWorkspaceId) return;
    closeMenus();
    setCreateItemOpen(true);
  };

  const handleOpenCreateSpace = () => {
    if (!resolvedWorkspaceId) return;
    closeMenus();
    setCreateSpaceOpen(true);
  };

  const handleOpenImport = () => {
    if (!resolvedWorkspaceId) return;
    closeMenus();
    setImportModalOpen(true);
  };

  const handleOpenWorkspaces = () => {
    closeMenus();
    setWorkspaceSwitcherOpen(true);
  };

  const handleOpenTrash = () => {
    closeMenus();
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

  const actionMenuContent = (
    <>
      <div className="space-y-2">
        <ActionRow
          icon={Building2}
          label="Workspaces"
          meta="Switch or create"
          onClick={handleOpenWorkspaces}
          tone="neutral"
        />
        <ActionRow
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
        <ActionRow
          icon={Plus}
          label="New"
          meta="Page or database"
          onClick={handleOpenCreateItem}
          disabled={actionsDisabled}
          tone="blue"
        />
        <ActionRow
          icon={FolderPlus}
          label="Space"
          meta="Dedicated project home"
          onClick={handleOpenCreateSpace}
          disabled={actionsDisabled}
          tone="emerald"
        />
        <ActionRow
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
          "mt-2 flex w-full items-center gap-3 rounded-[16px] border px-3 py-3 text-left transition-colors",
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
    </>
  );

  return (
    <>
      <DropdownMenu open={desktopOpen} onOpenChange={setDesktopOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Open workspace actions"
            className="relative hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/50 md:flex"
          >
            <MoreHorizontal className="h-4 w-4" />
            {overdueCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-400 px-0.5 text-[9px] font-semibold leading-none text-black">
                {overdueCount > 9 ? "9+" : overdueCount}
              </span>
            ) : null}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={12}
          className="w-[312px] max-w-[calc(100vw-1rem)] rounded-[22px] border-white/10 bg-[#141311]/96 p-2 text-zinc-100 shadow-[0_28px_80px_rgba(0,0,0,0.48)] backdrop-blur-2xl"
        >
          {actionMenuContent}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        aria-label="Open workspace actions"
        onClick={() => setMobileOpen(true)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/50 md:hidden"
      >
        <MoreHorizontal className="h-4 w-4" />
        {overdueCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-400 px-0.5 text-[9px] font-semibold leading-none text-black">
            {overdueCount > 9 ? "9+" : overdueCount}
          </span>
        ) : null}
      </button>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          title="Workspace actions"
          hideTitleVisually={true}
          className="max-h-[min(88vh,calc(100dvh-1.5rem))] w-[min(360px,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-hidden border-white/10 bg-[#141311]/98 p-2 pt-12 text-zinc-100"
        >
          {actionMenuContent}
        </DialogContent>
      </Dialog>

      <Dialog open={createSpaceOpen} onOpenChange={setCreateSpaceOpen}>
        <DialogContent
          title="Create space"
          className="max-h-[min(88vh,calc(100dvh-1.5rem))] w-[min(28rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] border-white/10 bg-[#161513] text-zinc-100"
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

      <Dialog open={workspaceSwitcherOpen} onOpenChange={setWorkspaceSwitcherOpen}>
        <DialogContent
          title="Workspaces"
          hideTitleVisually={true}
          className="flex max-h-[min(88vh,calc(100dvh-1.5rem))] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden border-white/10 bg-[#161513] p-0 text-zinc-100 sm:w-[360px] sm:max-w-[360px]"
        >
          <WorkspaceSwitcherContent
            className="rounded-[24px] pt-12"
            onClose={() => setWorkspaceSwitcherOpen(false)}
            onRequestCreateWorkspace={() => {
              setWorkspaceSwitcherOpen(false);
              setCreateWorkspaceOpen(true);
            }}
          />
        </DialogContent>
      </Dialog>

      <CreateWorkspaceDialog
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
      />

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
