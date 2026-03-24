"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  FolderOpen,
  Home,
  LayoutDashboard,
  MoreHorizontal,
  Newspaper,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CreateSpaceItemModal } from "@/components/modals/create-space-item-modal";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";
import { UserMenu } from "./user-menu";
import { WorkspaceSetup } from "./workspace-setup";

const MODULES = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard, href: "/workspace/overview" },
  { id: "feed" as const, label: "Feed", icon: Newspaper, href: "/workspace/feed" },
  { id: "brain" as const, label: "Brain", icon: BookOpen, href: "/workspace/brain" },
  { id: "ledger" as const, label: "Ledger", icon: Wallet, href: "/workspace/ledger" },
  { id: "ai" as const, label: "Maddy AI", icon: Sparkles, href: "/workspace/ai" },
] as const;

const FEED_PANE_ITEMS = [
  { id: null, label: "For You", icon: Sparkles },
  { id: "ai_ml", label: "AI & ML", icon: BookOpen },
  { id: "tech_it", label: "Tech & IT", icon: Search },
  { id: "productivity", label: "Productivity", icon: LayoutDashboard },
  { id: "must_know", label: "Must Know", icon: Newspaper },
] as const;

const LEDGER_PANE_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "transactions", label: "Transactions" },
  { id: "budget", label: "Budget" },
  { id: "investments", label: "Investments" },
] as const;

const PANE_DETAILS = {
  overview: {
    eyebrow: "Workspace",
    title: "Overview",
    description: "Shortcuts and daily actions for the current workspace.",
  },
  feed: {
    eyebrow: "Digest",
    title: "Feed",
    description: "Category filters live here so the page can stay clean.",
  },
  brain: {
    eyebrow: "Knowledge",
    title: "Brain",
    description: "Search, favourites, and spaces stay in one full-height pane.",
  },
  ledger: {
    eyebrow: "Finance",
    title: "Ledger",
    description: "Switch ledger sections without crowding the page header.",
  },
} as const;

function getRouteModule(pathname: string) {
  const segment = pathname.split("/")[2] ?? "";

  if (!pathname.startsWith("/workspace")) return "overview";
  if (!segment) return "overview";
  if (segment === "overview" || segment === "feed" || segment === "ledger" || segment === "ai") {
    return segment;
  }
  if (segment === "settings") return "overview";
  return "brain";
}

const ModuleRailItem = memo(function ModuleRailItem({
  mod,
  isActive,
  isDocked,
  onClick,
  onPrefetch,
}: {
  mod: typeof MODULES[number];
  isActive: boolean;
  isDocked?: boolean;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  onPrefetch: () => void;
}) {
  const Icon = mod.icon;

  return (
    <div className="group relative flex justify-center">
      <Link
        href={mod.href}
        prefetch
        aria-label={mod.label}
        title={mod.label}
        onClick={onClick}
        onMouseEnter={onPrefetch}
        onFocus={onPrefetch}
        className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-all",
          isActive
            ? "border-primary/30 bg-primary/12 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            : isDocked
              ? "border-white/12 bg-white/[0.05] text-zinc-100"
              : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/[0.04] hover:text-foreground"
        )}
      >
        <Icon
          className={cn(
            "h-[18px] w-[18px]",
            isActive && "text-primary",
            !isActive && isDocked && "text-zinc-100"
          )}
          strokeWidth={isActive ? 2.4 : 2}
        />
        {isActive || isDocked ? (
          <span
            className={cn(
              "absolute right-1 top-1 h-1.5 w-1.5 rounded-full",
              isActive ? "bg-primary" : "bg-zinc-200"
            )}
          />
        ) : null}
      </Link>

      <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#181715] px-2 py-1 text-[11px] text-zinc-100 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {mod.label}
      </span>
    </div>
  );
});

function ModuleRail() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    contextPaneCollapsed,
    maddyPanelOpen,
    openMaddyPanel,
    setActiveModule,
    setContextPaneCollapsed,
  } = useAppStore();

  const active = useMemo(() => getRouteModule(pathname), [pathname]);

  const handleModuleClick = useCallback(
    (modId: typeof MODULES[number]["id"]) => {
      if (modId === "ai") {
        setActiveModule("ai");
        openMaddyPanel("chat");
        return;
      }

      setActiveModule(modId);
      setContextPaneCollapsed(false);
    },
    [openMaddyPanel, setActiveModule, setContextPaneCollapsed]
  );

  const handlePrefetch = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router]
  );

  useEffect(() => {
    MODULES.forEach((module) => {
      router.prefetch(module.href);
    });
  }, [router]);

  return (
    <div className="flex h-full w-[72px] shrink-0 flex-col border-r border-border/80 bg-sidebar/95">
      <div className="flex h-16 items-center justify-center border-b border-border/80">
        <div className="group relative">
          <Link
            href="/workspace/overview"
            prefetch
            aria-label="Open workspace overview"
            title="Open workspace overview"
            onClick={() => {
              setActiveModule("overview");
              setContextPaneCollapsed(false);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] transition-all hover:border-white/16 hover:bg-white/[0.05]"
          >
            <AppIcon className="h-6 w-6 rounded-xl" />
          </Link>
          <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#181715] px-2 py-1 text-[11px] text-zinc-100 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
            Workspace overview
          </span>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-2">
          {MODULES.map((mod) => (
            <ModuleRailItem
              key={mod.id}
              mod={mod}
              isActive={active === mod.id}
              isDocked={mod.id === "ai" && maddyPanelOpen}
              onClick={(event) => {
                if (mod.id === "ai") {
                  event.preventDefault();
                }
                handleModuleClick(mod.id);
              }}
              onPrefetch={() => handlePrefetch(mod.href)}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-border/80 p-3">
        {contextPaneCollapsed ? (
          <div className="group relative flex justify-center">
            <button
              type="button"
              aria-label="Open context pane"
              title="Open context pane"
              onClick={() => setContextPaneCollapsed(false)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-muted-foreground transition-all hover:border-white/16 hover:bg-white/[0.05] hover:text-foreground"
            >
              <PanelLeft className="h-[18px] w-[18px]" />
            </button>
            <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#181715] px-2 py-1 text-[11px] text-zinc-100 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
              Open pane
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface PageItemProps {
  page: any;
  depth?: number;
  workspaceId: Id<"workspaces">;
}

function PageItem({ page, depth = 0, workspaceId }: PageItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleExpanded, isExpanded, setContextPaneCollapsed, setExpanded } = useAppStore();
  const expanded = isExpanded(page._id);
  const [menuOpen, setMenuOpen] = useState(false);
  const pageHref = `/workspace/${page._id}`;

  const createPage = useMutation(api.pages.create);
  const archivePage = useMutation(api.pages.archive);
  const children = useQuery(api.pages.list, {
    workspaceId,
    parentId: page._id,
  });

  const isActive = pathname === pageHref;
  const hasChildren = Boolean(children?.length);
  const handlePrefetch = () => router.prefetch(pageHref);

  useEffect(() => {
    if (isActive) {
      setExpanded(page._id, true);
    }
  }, [isActive, page._id, setExpanded]);

  const handleOpenPage = () => {
    setContextPaneCollapsed(true);
    router.push(pageHref);
  };

  const handleCreate = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      const newId = await createPage({
        workspaceId,
        parentId: page._id,
        type: "document",
        title: "Untitled",
      });
      setExpanded(page._id, true);
      router.push(`/workspace/${newId}`);
    } catch {
      toast.error("Failed to create page");
    }
  };

  const handleArchive = async () => {
    try {
      await archivePage({ id: page._id });
      toast.success("Page moved to trash");
      if (isActive) router.push("/workspace/brain");
    } catch {
      toast.error("Failed to archive page");
    }
  };

  const typeIcon =
    page.type === "database" ? (
      <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    ) : page.type === "dashboard" ? (
      <LayoutDashboard className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    ) : (
      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    );

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors",
          "hover:bg-accent/50",
          isActive && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <button
          type="button"
          className={cn(
            "flex h-8 w-4 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent",
            "min-h-[36px] md:min-h-0"
          )}
          onClick={(event) => {
            event.stopPropagation();
            if (hasChildren) toggleExpanded(page._id);
          }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : (
            <span className="h-3 w-3" />
          )}
        </button>

        <Link
          href={pageHref}
          prefetch
          className="flex min-w-0 flex-1 items-center gap-1.5"
          onClick={() => setContextPaneCollapsed(true)}
          onMouseEnter={handlePrefetch}
          onFocus={handlePrefetch}
        >
          <span className="shrink-0 text-sm leading-none">{page.icon ?? typeIcon}</span>
          <span className="flex-1 truncate text-sm">{page.title || "Untitled"}</span>
        </Link>

        <div
          className={cn(
            "ml-auto flex items-center gap-0.5 transition-opacity",
            menuOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
          )}
        >
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-accent"
            onClick={handleCreate}
            title="Add sub-page"
          >
            <Plus className="h-3 w-3 text-muted-foreground" />
          </button>

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-accent"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" sideOffset={6} className="w-48">
              <DropdownMenuItem onClick={handleOpenPage}>
                <FileText className="mr-2 h-4 w-4" />
                Open page
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleArchive}
                className="text-destructive focus:text-destructive"
              >
                <Archive className="mr-2 h-4 w-4" />
                Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {expanded && hasChildren ? (
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
      ) : null}
    </div>
  );
}

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
  const { toggleExpanded, isExpanded, setContextPaneCollapsed, setExpanded } = useAppStore();
  const archivePage = useMutation(api.pages.archive);
  const children = useQuery(api.pages.list, {
    workspaceId,
    parentId: space._id,
  });

  const expandKey = `space:${space._id}`;
  const spaceHref = `/workspace/${space._id}`;
  const expanded = isExpanded(expandKey);
  const isHomeActive = pathname === spaceHref;
  const handlePrefetch = () => router.prefetch(spaceHref);

  useEffect(() => {
    if (!expanded) {
      setExpanded(expandKey, true);
    }
  }, [expandKey, expanded, setExpanded]);

  const handleOpenSpace = () => {
    setContextPaneCollapsed(true);
    router.push(spaceHref);
  };

  const handleArchive = async () => {
    try {
      await archivePage({ id: space._id });
      toast.success("Space moved to trash");
      if (isHomeActive) router.push("/workspace/brain");
    } catch {
      toast.error("Failed to archive space");
    }
  };

  return (
    <div className="mb-2 rounded-xl border border-white/6 bg-black/10">
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
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
          type="button"
          className="flex-1 truncate text-left text-sm font-medium text-foreground"
          onClick={handleOpenSpace}
          onMouseEnter={handlePrefetch}
          onFocus={handlePrefetch}
        >
          {space.title}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent/60"
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={handleOpenSpace}>
              <Home className="mr-2 h-4 w-4" />
              Open space home
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNew(space._id, space.title)}>
              <Plus className="mr-2 h-4 w-4" />
              Add new
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleArchive}
              className="text-destructive focus:text-destructive"
            >
              <Archive className="mr-2 h-4 w-4" />
              Move to trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded ? (
        <div className="pb-2">
          <Link
            href={spaceHref}
            prefetch
            className={cn(
              "mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/40",
              isHomeActive && "bg-accent text-accent-foreground"
            )}
            onClick={() => setContextPaneCollapsed(true)}
            onMouseEnter={handlePrefetch}
            onFocus={handlePrefetch}
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
            type="button"
            className="mx-2 mt-1 flex w-[calc(100%-16px)] items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            onClick={() => onAddNew(space._id, space.title)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add new
          </button>
        </div>
      ) : null}
    </div>
  );
}

function KBSidebarContent({ workspaceId }: { workspaceId: Id<"workspaces"> }) {
  const router = useRouter();
  const { setCommandPaletteOpen } = useAppStore();
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
      <div className="space-y-0.5 px-2 pt-2">
        <NavItem
          icon={<Search className="h-4 w-4" />}
          label="Search"
          onClick={() => setCommandPaletteOpen(true)}
          kbd="Ctrl K"
        />
      </div>

      {favourites && favourites.length > 0 ? (
        <div className="mt-3">
          <div className="flex items-center gap-1.5 px-3 py-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Favourites
            </span>
          </div>
          <div className="px-1">
            {favourites.map((page: any) => (
              <PageItem key={page._id} page={page} workspaceId={workspaceId} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Spaces
          </span>
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-accent"
            onClick={() => setCreateSpaceOpen(true)}
            title="New space"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="px-1 pb-4">
          {rootPages === undefined || spaceRoots === undefined ? (
            <div className="animate-pulse px-3 py-2 text-xs text-muted-foreground">Loading...</div>
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
                    type="button"
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
    </>
  );
}

function ContextPaneFrame({
  moduleId,
  children,
}: {
  moduleId: keyof typeof PANE_DETAILS;
  children: ReactNode;
}) {
  const { toggleContextPaneCollapsed } = useAppStore();
  const details = PANE_DETAILS[moduleId];

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b border-border/80 px-3 py-3">
        <div className="flex items-center gap-2">
          <UserMenu />
          <button
            type="button"
            aria-label="Hide context pane"
            title="Hide context pane"
            onClick={toggleContextPaneCollapsed}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 transition-all hover:border-white/16 hover:bg-white/[0.05] hover:text-white"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 px-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {details.eyebrow}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{details.title}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{details.description}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  );
}

function OverviewContextPane() {
  const router = useRouter();
  const { openMaddyPanel, setCommandPaletteOpen, setActiveModule } = useAppStore();

  const goTo = (href: string, moduleId: "overview" | "feed" | "brain" | "ledger") => {
    setActiveModule(moduleId);
    router.push(href);
  };

  return (
    <div className="space-y-4 px-2 py-3">
      <div>
        <div className="px-3 py-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Quick Actions
          </span>
        </div>
        <div className="space-y-0.5">
          <NavItem
            icon={<Search className="h-4 w-4" />}
            label="Search"
            onClick={() => setCommandPaletteOpen(true)}
            kbd="Ctrl K"
          />
          <NavItem
            icon={<AppIcon className="h-4 w-4 rounded-md" />}
            label="Ask Maddy"
            onClick={() => openMaddyPanel("chat")}
          />
        </div>
      </div>

      <div>
        <div className="px-3 py-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Workspace Shortcuts
          </span>
        </div>
        <div className="space-y-0.5">
          <NavItem
            icon={<BookOpen className="h-4 w-4" />}
            label="Open Brain"
            onClick={() => goTo("/workspace/brain", "brain")}
          />
          <NavItem
            icon={<Newspaper className="h-4 w-4" />}
            label="Open Feed"
            onClick={() => goTo("/workspace/feed", "feed")}
          />
          <NavItem
            icon={<Wallet className="h-4 w-4" />}
            label="Open Ledger"
            onClick={() => goTo("/workspace/ledger", "ledger")}
          />
          <NavItem
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
            onClick={() => router.push("/workspace/settings")}
          />
        </div>
      </div>
    </div>
  );
}

function FeedContextPane() {
  const { feedCategory, setFeedCategory } = useAppStore();

  return (
    <div className="space-y-4 px-2 py-3">
      <div className="px-3 py-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Channels
        </span>
      </div>

      <div className="space-y-0.5">
        {FEED_PANE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavItem
              key={item.label}
              icon={<Icon className="h-4 w-4" />}
              label={item.label}
              active={feedCategory === item.id}
              onClick={() => setFeedCategory(item.id)}
            />
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-xs leading-5 text-muted-foreground">
        Pick a channel here and the desktop feed updates instantly. Mobile keeps the tab row.
      </div>
    </div>
  );
}

function LedgerContextPane() {
  const { ledgerTab, setLedgerTab } = useAppStore();

  return (
    <div className="space-y-4 px-2 py-3">
      <div className="px-3 py-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Views
        </span>
      </div>

      <div className="space-y-0.5">
        {LEDGER_PANE_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            icon={<Wallet className="h-4 w-4" />}
            label={item.label}
            active={ledgerTab === item.id}
            onClick={() => setLedgerTab(item.id)}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-xs leading-5 text-muted-foreground">
        The ledger section switcher now lives here so the content canvas gets more room.
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const {
    contextPaneCollapsed,
    currentWorkspaceId,
    setActiveModule,
    setCurrentWorkspaceId,
  } = useAppStore();

  const routeModule = useMemo(() => getRouteModule(pathname), [pathname]);
  const paneModule: keyof typeof PANE_DETAILS =
    routeModule === "feed"
      ? "feed"
      : routeModule === "brain"
        ? "brain"
        : routeModule === "ledger"
          ? "ledger"
          : "overview";

  const workspaces = useQuery(api.workspaces.listWorkspaces);
  const resolvedWorkspaceId =
    currentWorkspaceId && workspaces?.some((workspace: any) => workspace._id === currentWorkspaceId)
      ? currentWorkspaceId
      : workspaces && workspaces.length > 0
        ? workspaces[0]._id
        : null;

  useEffect(() => {
    if (!resolvedWorkspaceId || resolvedWorkspaceId === currentWorkspaceId) return;
    setCurrentWorkspaceId(resolvedWorkspaceId);
  }, [resolvedWorkspaceId, currentWorkspaceId, setCurrentWorkspaceId]);

  useEffect(() => {
    setActiveModule(routeModule);
  }, [routeModule, setActiveModule]);

  if (workspaces !== undefined && workspaces.length === 0) {
    return <WorkspaceSetup />;
  }

  return (
    <div className="hidden h-full shrink-0 md:flex">
      <ModuleRail />

      <aside
        className={cn(
          "overflow-hidden border-r border-border/80 bg-sidebar transition-[width,opacity,transform,border-color] duration-300",
          contextPaneCollapsed
            ? "pointer-events-none w-0 -translate-x-2 border-transparent opacity-0"
            : "w-[320px] translate-x-0 opacity-100"
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        aria-hidden={contextPaneCollapsed}
      >
        <div className="h-full w-[320px]">
          <ContextPaneFrame moduleId={paneModule}>
            {paneModule === "brain" ? (
              resolvedWorkspaceId ? (
                <KBSidebarContent workspaceId={resolvedWorkspaceId} />
              ) : (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  Loading workspace navigation...
                </div>
              )
            ) : paneModule === "feed" ? (
              <FeedContextPane />
            ) : paneModule === "ledger" ? (
              <LedgerContextPane />
            ) : (
              <OverviewContextPane />
            )}
          </ContextPaneFrame>
        </div>
      </aside>
    </div>
  );
}

function NavItem({
  icon,
  label,
  onClick,
  active,
  kbd,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  kbd?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-[44px] w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors md:min-h-0",
        "hover:bg-accent/50",
        active && "bg-accent text-accent-foreground"
      )}
      onClick={onClick}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {kbd ? (
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {kbd}
        </kbd>
      ) : null}
    </button>
  );
}
