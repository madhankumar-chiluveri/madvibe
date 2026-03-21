"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/store/app.store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/app-icon";
import { UserMenu } from "./user-menu";
import { WorkspaceSetup } from "./workspace-setup";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Database,
  LayoutDashboard,
  Plus,
  Search,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  MoreHorizontal,
  Archive,
  Newspaper,
  Wallet,
  Sparkles,
  BookOpen,
  Zap,
  Home,
  FolderOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MaddyPanel } from "@/components/maddy/maddy-panel";
import { CreateSpaceItemModal } from "@/components/modals/create-space-item-modal";
import { ImportModal } from "@/components/modals/import-modal";

// ── Module Tab ────────────────────────────────────────────────────────────────
const MODULES = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard, href: "/workspace/overview" },
  { id: "news" as const,     label: "News",      icon: Newspaper,       href: "/workspace/news" },
  { id: "kb" as const,       label: "Knowledge", icon: BookOpen,        href: "/workspace" },
  { id: "finance" as const,  label: "Finance",   icon: Wallet,          href: "/workspace/finance" },
  { id: "ai" as const,       label: "Maddy AI",  icon: Sparkles,        href: "/workspace/ai" },
] as const;

function ModuleTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const { setActiveModule } = useAppStore();

  const active = MODULES.find((m) => {
    if (m.id === "kb") {
      return (
        pathname.startsWith("/workspace") &&
        !["overview", "news", "finance", "ai"].some((k) => pathname.includes(k))
      );
    }
    return pathname.startsWith(m.href);
  })?.id ?? "overview";

  return (
    <nav className="flex flex-col gap-1 px-3 py-3 border-b">
      {MODULES.map((mod) => {
        const Icon = mod.icon;
        const isActive = active === mod.id;
        return (
          <Link
            key={mod.id}
            href={mod.href}
            onClick={() => setActiveModule(mod.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] md:min-h-0",
              "hover:bg-accent/60",
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} strokeWidth={isActive ? 2.5 : 2} />
            <span>{mod.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ── KB Section (page tree) ─────────────────────────────────────────────────────
interface PageItemProps {
  page: any;
  depth?: number;
  workspaceId: Id<"workspaces">;
}

function PageItem({ page, depth = 0, workspaceId }: PageItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleExpanded, isExpanded } = useAppStore();
  const expanded = isExpanded(page._id);

  const createPage = useMutation(api.pages.create);
  const archivePage = useMutation(api.pages.archive);

  const children = useQuery(api.pages.list, {
    workspaceId,
    parentId: page._id,
  });

  const isActive = pathname === `/workspace/${page._id}`;
  const hasChildren = children && children.length > 0;

  const handleCreate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newId = await createPage({
        workspaceId,
        parentId: page._id,
        type: "document",
        title: "Untitled",
      });
      useAppStore.getState().setExpanded(page._id, true);
      router.push(`/workspace/${newId}`);
    } catch {
      toast.error("Failed to create page");
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await archivePage({ id: page._id });
      toast.success("Page moved to trash");
      if (isActive) router.push("/workspace");
    } catch {
      toast.error("Failed to archive page");
    }
  };

  const typeIcon =
    page.type === "database" ? (
      <Database className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
    ) : page.type === "dashboard" ? (
      <LayoutDashboard className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
    ) : (
      <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
    );

  return (
    <div>
      <Link
        href={`/workspace/${page._id}`}
        className={cn(
          "group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer select-none text-sm",
          "hover:bg-accent/50 transition-colors",
          isActive && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <button
          className={cn(
            "w-4 h-4 flex items-center justify-center rounded shrink-0 min-h-[44px] md:min-h-0",
            "hover:bg-accent text-muted-foreground transition-colors"
          )}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded(page._id);
          }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )
          ) : (
            <span className="w-3 h-3" />
          )}
        </button>

        <span className="text-sm leading-none shrink-0">
          {page.icon ?? typeIcon}
        </span>

        <span className="flex-1 truncate text-sm">
          {page.title || "Untitled"}
        </span>

        <div className="hidden group-hover:flex items-center gap-0.5 ml-auto">
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent"
            onClick={handleCreate}
            title="Add sub-page"
          >
            <Plus className="w-3 h-3 text-muted-foreground" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => router.push(`/workspace/${page._id}`)}>
                <FileText className="w-4 h-4 mr-2" /> Open page
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleArchive}
                className="text-destructive focus:text-destructive"
              >
                <Archive className="w-4 h-4 mr-2" /> Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Link>

      {expanded && hasChildren && (
        <div>
          {children!.map((child: any) => (
            <PageItem
              key={child._id}
              page={child}
              depth={depth + 1}
              workspaceId={workspaceId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── KB Sidebar Content ────────────────────────────────────────────────────────
function SpaceBadge({ page, fallbackLabel }: { page?: any; fallbackLabel: string }) {
  if (page?.icon) {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.06] text-xs">
        {page.icon}
      </span>
    );
  }

  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.08] text-[11px] font-semibold text-zinc-200">
      {fallbackLabel.slice(0, 1).toUpperCase()}
    </span>
  );
}

interface SpaceSectionProps {
  space: any;
  workspaceId: Id<"workspaces">;
  onAddNew: (parentId: Id<"pages"> | null, spaceLabel: string) => void;
}

function SpaceSection({ space, workspaceId, onAddNew }: SpaceSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleExpanded, isExpanded, setExpanded } = useAppStore();
  const archivePage = useMutation(api.pages.archive);
  const children = useQuery(api.pages.list, {
    workspaceId,
    parentId: space._id,
  });

  const expandKey = `space:${space._id}`;
  const expanded = isExpanded(expandKey);
  const isHomeActive = pathname === `/workspace/${space._id}`;

  useEffect(() => {
    setExpanded(expandKey, true);
  }, [expandKey, setExpanded]);

  const handleArchive = async () => {
    try {
      await archivePage({ id: space._id });
      toast.success("Space moved to trash");
      if (isHomeActive) router.push("/workspace");
    } catch {
      toast.error("Failed to archive space");
    }
  };

  return (
    <div className="mb-2 rounded-xl border border-white/6 bg-black/10">
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          className="flex h-5 w-5 items-center justify-center rounded hover:bg-accent/60"
          onClick={() => toggleExpanded(expandKey)}
          aria-label={expanded ? "Collapse space" : "Expand space"}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>

        <SpaceBadge page={space} fallbackLabel={space.title || "S"} />

        <button
          className="flex-1 truncate text-left text-sm font-medium text-foreground"
          onClick={() => router.push(`/workspace/${space._id}`)}
        >
          {space.title}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent/60">
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => router.push(`/workspace/${space._id}`)}>
              <Home className="mr-2 h-4 w-4" /> Open space home
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNew(space._id, space.title)}>
              <Plus className="mr-2 h-4 w-4" /> Add new
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleArchive}
              className="text-destructive focus:text-destructive"
            >
              <Archive className="mr-2 h-4 w-4" /> Move to trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && (
        <div className="pb-2">
          <Link
            href={`/workspace/${space._id}`}
            className={cn(
              "mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/40",
              isHomeActive && "bg-accent text-accent-foreground"
            )}
          >
            <Home className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate">Space Home</span>
          </Link>

          <div className="mt-1 px-1">
            {children === undefined ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">Loading...</div>
            ) : children.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No items yet. Use Add new to create the first page or database.
              </div>
            ) : (
              children.map((child: any) => (
                <PageItem
                  key={child._id}
                  page={child}
                  depth={1}
                  workspaceId={workspaceId}
                />
              ))
            )}
          </div>

          <button
            className="mx-2 mt-1 flex w-[calc(100%-16px)] items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            onClick={() => onAddNew(space._id, space.title)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add new
          </button>
        </div>
      )}
    </div>
  );
}

function KBSidebarContent({ workspaceId }: { workspaceId: Id<"workspaces"> }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setCommandPaletteOpen } = useAppStore();
  const [maddyOpen, setMaddyOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceLoading, setNewSpaceLoading] = useState(false);
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [createItemParentId, setCreateItemParentId] = useState<Id<"pages"> | null>(null);
  const [createItemSpaceLabel, setCreateItemSpaceLabel] = useState("General");

  const rootPages = useQuery(api.pages.list, { workspaceId, parentId: null });
  const spaceRoots = useQuery(api.pages.listSpaceRoots, { workspaceId });
  const favourites = useQuery(api.pages.listFavourites, { workspaceId });
  const createSpace = useMutation(api.pages.createSpace);

  const generalPages = useMemo(
    () => (rootPages ?? []).filter((page: any) => !page.isSpaceRoot),
    [rootPages]
  );

  const handleOpenCreateItem = (parentId: Id<"pages"> | null, spaceLabel: string) => {
    setCreateItemParentId(parentId);
    setCreateItemSpaceLabel(spaceLabel);
    setCreateItemOpen(true);
  };

  const handleCreateSpace = async () => {
    const title = newSpaceName.trim();
    if (!title) {
      toast.error("Enter a space name");
      return;
    }

    setNewSpaceLoading(true);
    try {
      const id = await createSpace({
        workspaceId,
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
      <div className="px-2 pt-2 space-y-0.5">
        <NavItem
          icon={<Search className="w-4 h-4" />}
          label="Search"
          onClick={() => setCommandPaletteOpen(true)}
          kbd="⌘K"
        />
        <NavItem
          icon={<AppIcon className="w-4 h-4 rounded-md" />}
          label="Ask Maddy"
          onClick={() => setMaddyOpen(true)}
        />
      </div>

      {favourites && favourites.length > 0 && (
        <div className="mt-3">
          <div className="px-3 py-1 flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Favourites
            </span>
          </div>
          <div className="px-1">
            {favourites.map((page: any) => (
              <PageItem key={page._id} page={page} workspaceId={workspaceId} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex-1 overflow-y-auto">
        <div className="px-3 py-1 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Spaces
          </span>
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent"
            onClick={() => setCreateSpaceOpen(true)}
            title="New space"
          >
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-1 pb-4">
          {rootPages === undefined || spaceRoots === undefined ? (
            <div className="px-3 py-2 text-xs text-muted-foreground animate-pulse">Loading...</div>
          ) : (
            <>
              <div className="mb-2 rounded-xl border border-white/6 bg-black/10">
                <div className="flex items-center gap-2 px-2 py-2">
                  <SpaceBadge fallbackLabel="G" />
                  <span className="flex-1 text-sm font-medium text-foreground">General</span>
                </div>
                <div className="pb-2">
                  <div className="px-1">
                    {generalPages.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Use General for loose notes and personal pages.
                      </div>
                    ) : (
                      generalPages.map((page: any) => (
                        <PageItem key={page._id} page={page} workspaceId={workspaceId} />
                      ))
                    )}
                  </div>

                  <button
                    className="mx-2 mt-1 flex w-[calc(100%-16px)] items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                    onClick={() => handleOpenCreateItem(null, "General")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add new
                  </button>
                </div>
              </div>

              {spaceRoots.length > 0 ? (
                spaceRoots.map((space: any) => (
                  <SpaceSection
                    key={space._id}
                    space={space}
                    workspaceId={workspaceId}
                    onAddNew={handleOpenCreateItem}
                  />
                ))
              ) : (
                <div className="px-3 py-5 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/40">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Create your first project space</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Keep each project&apos;s tasks, notes, and databases isolated.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 h-8 text-xs"
                    onClick={() => setCreateSpaceOpen(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    New space
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="px-2 pb-2 border-t pt-2 space-y-0.5">
        <NavItem
          icon={<Trash2 className="w-4 h-4" />}
          label="Trash"
          active={pathname === "/workspace/trash"}
          onClick={() => router.push("/workspace/trash")}
        />
        <div className="grid grid-cols-3 gap-1">
          <button
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-sm hover:bg-accent/50 transition-colors min-h-[36px] bg-muted/30"
            onClick={() => handleOpenCreateItem(null, "General")}
          >
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground text-xs font-medium">New</span>
          </button>
          <button
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-sm hover:bg-accent/50 transition-colors min-h-[36px] bg-muted/30"
            onClick={() => setCreateSpaceOpen(true)}
          >
            <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground text-xs font-medium">Space</span>
          </button>
          <button
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-sm hover:bg-accent/50 transition-colors min-h-[36px] bg-muted/30"
            onClick={() => setImportModalOpen(true)}
          >
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground text-xs font-medium">Import</span>
          </button>
        </div>
      </div>

      <Dialog open={createSpaceOpen} onOpenChange={setCreateSpaceOpen}>
        <DialogContent
          title="Create space"
          className="max-w-md border-white/10 bg-[#161513] text-zinc-100"
        >
          <DialogHeader>
            <DialogTitle>Create a new project space</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Each space gets its own home page and isolated pages, notes, and databases.
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

      <CreateSpaceItemModal
        open={createItemOpen}
        onClose={() => setCreateItemOpen(false)}
        workspaceId={workspaceId}
        parentId={createItemParentId}
        spaceLabel={createItemSpaceLabel}
      />

      <ImportModal 
        open={importModalOpen} 
        onClose={() => setImportModalOpen(false)} 
        workspaceId={workspaceId} 
      />
      <MaddyPanel open={maddyOpen} onClose={() => setMaddyOpen(false)} />
    </>
  );
}

// ── Quick Nav helpers for non-KB modules ──────────────────────────────────────

function ModulePlaceholderNav({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    currentWorkspaceId,
    setCurrentWorkspaceId,
    sidebarCollapsed,
    toggleSidebar,
    activeModule,
    setCommandPaletteOpen,
    setQuickCaptureOpen,
  } = useAppStore();

  const workspaces = useQuery(api.workspaces.listWorkspaces);
  const resolvedWorkspaceId =
    currentWorkspaceId && workspaces?.some((w: any) => w._id === currentWorkspaceId)
      ? currentWorkspaceId
      : workspaces && workspaces.length > 0
        ? workspaces[0]._id
        : null;

  useEffect(() => {
    if (!resolvedWorkspaceId || resolvedWorkspaceId === currentWorkspaceId) return;
    setCurrentWorkspaceId(resolvedWorkspaceId);
  }, [resolvedWorkspaceId, currentWorkspaceId, setCurrentWorkspaceId]);

  if (workspaces !== undefined && workspaces.length === 0) {
    return <WorkspaceSetup />;
  }

  // ── Collapsed sidebar ──────────────────────────────────────────────────────
  if (sidebarCollapsed) {
    return (
      <div className="hidden md:flex w-12 flex-col items-center py-3 gap-3 border-r bg-sidebar shrink-0">
        <button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent min-h-[44px]"
          onClick={toggleSidebar}
        >
          <PanelLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent min-h-[44px]"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent min-h-[44px]"
          onClick={() => setQuickCaptureOpen(true)}
        >
          <Zap className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  // Determine which sidebar content to show based on pathname
  const isKB = !["overview", "news", "finance", "ai"].some((m) =>
    pathname.includes(`/workspace/${m}`)
  );

  return (
    <div className="hidden md:flex w-60 shrink-0 flex-col h-full border-r bg-sidebar overflow-hidden">
      {/* Top: workspace header + collapse */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <UserMenu />
        <div className="flex items-center gap-1">
          <button
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent"
            onClick={() => setQuickCaptureOpen(true)}
            title="Quick capture (⌘⇧C)"
          >
            <Zap className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent"
            onClick={toggleSidebar}
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Module tabs */}
      <ModuleTabs />

      {/* Module-specific sidebar content */}
      {isKB && resolvedWorkspaceId ? (
        <KBSidebarContent workspaceId={resolvedWorkspaceId} />
      ) : activeModule === "news" ? (
        <div className="flex-1 flex flex-col">
          <ModulePlaceholderNav
            title="News Feed"
            description="Your personalised AI & productivity news digest"
          />
        </div>
      ) : activeModule === "finance" ? (
        <div className="flex-1 flex flex-col">
          <ModulePlaceholderNav
            title="Finance"
            description="Track income, expenses, budgets & investments"
          />
        </div>
      ) : activeModule === "ai" ? (
        <div className="flex-1 flex flex-col">
          <ModulePlaceholderNav
            title="Maddy AI"
            description="Multi-model AI assistant — free & paid models"
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <ModulePlaceholderNav
            title="Overview"
            description="Your daily command centre"
          />
        </div>
      )}
    </div>
  );
}

// ── Nav item helper ───────────────────────────────────────────────────────────
function NavItem({
  icon,
  label,
  onClick,
  active,
  kbd,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  kbd?: string;
}) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors min-h-[44px] md:min-h-0",
        "hover:bg-accent/50",
        active && "bg-accent text-accent-foreground"
      )}
      onClick={onClick}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {kbd && (
        <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
          {kbd}
        </kbd>
      )}
    </button>
  );
}
