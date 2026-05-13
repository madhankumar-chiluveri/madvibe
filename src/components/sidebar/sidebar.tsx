"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams, usePathname, useRouter } from "next/navigation";
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
  Workflow,
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
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";
import { UserMenu } from "./user-menu";
import { WorkspaceSetup } from "./workspace-setup";

const MODULES = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard, href: "/workspace/overview" },
  { id: "feed" as const, label: "Feed", icon: Newspaper, href: "/workspace/feed" },
  { id: "brain" as const, label: "Brain", icon: BookOpen, href: "/workspace/brain" },
  { id: "ledger" as const, label: "Ledger", icon: Wallet, href: "/workspace/ledger" },
  { id: "automation" as const, label: "Automation", icon: Workflow, href: "/workspace/automation" },
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
  { id: "credit_cards", label: "Credit Cards" },
  { id: "loans", label: "Loans & Lending" },
  { id: "investments", label: "Investments" },
  { id: "budget", label: "Budget" },
  { id: "goals", label: "Goals" },
  { id: "recurring", label: "Recurring" },
  { id: "reports", label: "Reports" },
  { id: "market", label: "Market" },
] as const;

const AUTOMATION_PANE_ITEMS = [
  { id: "pinterest-pin-generator", label: "Pinterest Pin Generator", icon: Workflow },
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
  automation: {
    eyebrow: "Automation",
    title: "Automation",
    description: "Keep generators and repeatable workflows organized in one place.",
  },
} as const;

const SNAPPY_EASE_STYLE = {
  transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;

const CONTEXT_PANE_WIDTH_STORAGE_KEY = "madvibe-context-pane-width";
const CONTEXT_PANE_DEFAULT_WIDTH = 320;
const CONTEXT_PANE_MIN_WIDTH = 280;
const CONTEXT_PANE_MAX_WIDTH = 520;

function clampContextPaneWidth(width: number) {
  return Math.max(
    CONTEXT_PANE_MIN_WIDTH,
    Math.min(CONTEXT_PANE_MAX_WIDTH, Math.round(width))
  );
}

function getRouteModule(pathname: string) {
  const segment = pathname.split("/")[2] ?? "";

  if (!pathname.startsWith("/workspace")) return "overview";
  if (!segment) return "overview";
  if (segment === "overview" || segment === "feed" || segment === "ledger" || segment === "automation" || segment === "ai") {
    return segment;
  }
  if (segment === "settings") return "overview";
  return "brain";
}

const ModuleRailItem = memo(function ModuleRailItem({
  mod,
  isActive,
  isDocked,
  showLabel,
  showTooltip,
  onClick,
  onPrefetch,
}: {
  mod: typeof MODULES[number];
  isActive: boolean;
  isDocked?: boolean;
  showLabel: boolean;
  showTooltip: boolean;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  onPrefetch: () => void;
}) {
  const Icon = mod.icon;

  return (
    <div className="group relative flex w-full overflow-hidden">
      <Link
        href={mod.href}
        prefetch
        aria-label={mod.label}
        title={mod.label}
        onClick={onClick}
        onMouseEnter={onPrefetch}
        onFocus={onPrefetch}
        style={SNAPPY_EASE_STYLE}
        className={cn(
          "relative flex h-11 items-center overflow-hidden rounded-lg border text-[13px] font-medium transition-[width,padding,gap,background-color,border-color] duration-300",
          showLabel ? "w-full justify-start gap-3 px-2 py-[5px]" : "w-11 justify-center",
          isActive
            ? "border-transparent bg-[rgba(55,53,47,0.08)] text-foreground dark:bg-[rgba(255,255,255,0.07)]"
            : isDocked
              ? "border-border/60 bg-[rgba(55,53,47,0.08)] text-foreground dark:bg-[rgba(255,255,255,0.07)]"
              : "border-transparent text-muted-foreground hover:bg-[rgba(55,53,47,0.04)] hover:text-foreground dark:hover:bg-[rgba(255,255,255,0.04)]"
        )}
      >
        <Icon
          className={cn(
            "h-[18px] w-[18px]",
            isActive && "text-primary",
            !isActive && isDocked && "text-foreground"
          )}
          strokeWidth={isActive ? 2.4 : 2}
        />
        <span
          style={SNAPPY_EASE_STYLE}
          className={cn(
            "min-w-0 overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-200",
            showLabel
              ? "max-w-[120px] translate-x-0 opacity-100"
              : "max-w-0 -translate-x-1 opacity-0"
          )}
        >
          {mod.label}
        </span>
        {isActive || isDocked ? (
          <span
            className={cn(
              "absolute h-1.5 w-1.5 rounded-full",
              showLabel
                ? "right-3 top-1/2 -translate-y-1/2"
                : "right-1 top-1",
              isActive ? "bg-primary" : "bg-foreground/30"
            )}
          />
        ) : null}
      </Link>

      {showTooltip ? (
        <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-border/60 bg-card px-2 py-1 text-[11px] text-foreground opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
          {mod.label}
        </span>
      ) : null}
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
  const showExpandedRail = false;
  const showExpandedRailLabels = false;

  const handleModuleClick = useCallback(
    (modId: typeof MODULES[number]["id"]) => {
      if (modId === "ai") {
        // setActiveModule is handled by the useEffect synced to pathname
        openMaddyPanel("chat");
        return;
      }

      if (contextPaneCollapsed) {
        setContextPaneCollapsed(false);
      }
    },
    [contextPaneCollapsed, openMaddyPanel, setContextPaneCollapsed]
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
    <div
      style={SNAPPY_EASE_STYLE}
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border/60 bg-sidebar transition-[width] duration-300",
        showExpandedRail ? "w-[208px]" : "w-[72px]"
      )}
    >
      <div className="flex h-16 items-center justify-center border-b border-border/60">
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
            style={SNAPPY_EASE_STYLE}
            className={cn(
              "flex h-11 items-center overflow-hidden rounded-lg border border-border/60 bg-card/80 transition-[width,padding,gap,background-color,border-color] duration-300 hover:bg-[var(--notion-gray-bg)] dark:hover:bg-accent",
              showExpandedRail ? "w-[184px] justify-start gap-3 px-3" : "w-11 justify-center"
            )}
          >
            <AppIcon className="h-6 w-6 rounded-xl" />
            <span
              style={SNAPPY_EASE_STYLE}
              className={cn(
                "min-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold text-foreground transition-all duration-200",
                showExpandedRailLabels
                  ? "max-w-[96px] translate-x-0 opacity-100"
                  : "max-w-0 -translate-x-1 opacity-0"
              )}
            >
              MadVibe
            </span>
          </Link>
          {!showExpandedRail ? (
            <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-border/60 bg-card px-2 py-1 text-[11px] text-foreground opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
              Workspace overview
            </span>
          ) : null}
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4">
        <div className="space-y-2">
          {MODULES.map((mod) => (
            <ModuleRailItem
              key={mod.id}
              mod={mod}
              isActive={active === mod.id}
              isDocked={mod.id === "ai" && maddyPanelOpen}
              showLabel={showExpandedRailLabels}
              showTooltip={!showExpandedRail}
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

      <div className="border-t border-border/60 p-3">
        {contextPaneCollapsed ? (
          <div className="group relative flex">
            <button
              type="button"
              aria-label="Open context pane"
              title="Open context pane"
              onClick={() => setContextPaneCollapsed(false)}
              style={SNAPPY_EASE_STYLE}
              className={cn(
                "flex h-11 items-center overflow-hidden rounded-lg border border-border/60 bg-card/80 text-muted-foreground transition-[width,padding,gap,background-color,border-color] duration-300 hover:bg-[var(--notion-gray-bg)] hover:text-foreground dark:hover:bg-accent",
                showExpandedRail ? "w-full justify-start gap-3 px-3" : "w-11 justify-center"
              )}
            >
              <PanelLeft className="h-[18px] w-[18px]" />
              <span
                style={SNAPPY_EASE_STYLE}
                className={cn(
                  "min-w-0 overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-200",
                  showExpandedRailLabels
                    ? "max-w-[80px] translate-x-0 opacity-100"
                    : "max-w-0 -translate-x-1 opacity-0"
                )}
              >
                Open pane
              </span>
            </button>
            {!showExpandedRail ? (
              <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-border/60 bg-card px-2 py-1 text-[11px] text-foreground opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                Open pane
              </span>
            ) : null}
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
  const [, startTransition] = useTransition();
  const { toggleExpanded, isExpanded, setContextPaneCollapsed, setExpanded } = useAppStore();
  const expanded = isExpanded(page._id);
  const [menuOpen, setMenuOpen] = useState(false);
  const pageHref = `/workspace/${page._id}`;

  const createPage = useMutation(api.pages.create);
  const archivePage = useMutation(api.pages.archive);

  const isActive = pathname === pageHref;

  // Only fire the children query when this item is expanded — avoids N live
  // Convex subscriptions for every page in the sidebar regardless of state.
  const children = useQuery(
    api.pages.list,
    expanded ? { workspaceId, parentId: page._id } : "skip"
  );

  // Show chevron optimistically for all collapsed items (we haven't checked yet).
  // Once expanded and query resolves, reflect the real count.
  const hasChildren = children !== undefined ? Boolean(children.length) : !expanded;
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
          "group flex items-center gap-1 rounded-md px-2 py-[5px] text-[13px] font-medium transition-colors",
          "hover:bg-[rgba(55,53,47,0.04)] dark:hover:bg-[rgba(255,255,255,0.04)]",
          isActive && "bg-[rgba(55,53,47,0.08)] text-foreground dark:bg-[rgba(255,255,255,0.07)]"
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
          onClick={() => startTransition(() => setContextPaneCollapsed(true))}
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
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
        {page.icon}
      </span>
    );
  }

  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
      {fallbackLabel.slice(0, 1).toUpperCase()}
    </span>
  );
}

interface SpaceSectionProps {
  space: any;
  workspaceId: Id<"workspaces">;
  onAddNew: (parentId: Id<"pages"> | null, spaceLabel: string) => void;
  autoExpandToken?: string | null;
}

function SpaceSection({
  space,
  workspaceId,
  onAddNew,
  autoExpandToken = null,
}: SpaceSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleExpanded, isExpanded, setContextPaneCollapsed, setExpanded } = useAppStore();
  const archivePage = useMutation(api.pages.archive);

  const expandKey = `space:${space._id}`;
  const spaceHref = `/workspace/${space._id}`;
  const expanded = isExpanded(expandKey);
  const isHomeActive = pathname === spaceHref;
  const children = useQuery(
    api.pages.list,
    expanded ? { workspaceId, parentId: space._id } : "skip"
  );
  const autoExpandedForRef = useRef<string | null>(null);
  const handlePrefetch = () => router.prefetch(spaceHref);

  useEffect(() => {
    if (!autoExpandToken) {
      autoExpandedForRef.current = null;
      return;
    }

    if (autoExpandedForRef.current === autoExpandToken) {
      return;
    }

    autoExpandedForRef.current = autoExpandToken;
    if (!expanded) {
      setExpanded(expandKey, true);
    }
  }, [autoExpandToken, expandKey, expanded, setExpanded]);

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
    <div className="mb-2 rounded-xl border border-border/60 bg-card/40">
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
              "mx-2 flex items-center gap-2 rounded-md px-2 py-[5px] text-[13px] font-medium transition-colors hover:bg-[rgba(55,53,47,0.04)] dark:hover:bg-[rgba(255,255,255,0.04)]",
              isHomeActive && "bg-[rgba(55,53,47,0.08)] text-foreground dark:bg-[rgba(255,255,255,0.07)]"
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
              <div className="space-y-1.5 px-2 py-1.5">
                <div className="skeleton-shimmer h-3.5 w-3/4 rounded" />
                <div className="skeleton-shimmer h-3.5 w-1/2 rounded" />
                <div className="skeleton-shimmer h-3.5 w-5/6 rounded" />
              </div>
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
            className="mx-2 mt-1 flex w-[calc(100%-16px)] items-center gap-2 rounded-md px-2 py-[5px] text-[13px] font-medium text-muted-foreground transition-colors hover:bg-[rgba(55,53,47,0.04)] hover:text-foreground dark:hover:bg-[rgba(255,255,255,0.04)]"
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
  const params = useParams<{ pageId?: string }>();
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
  const activePageId = params?.pageId as Id<"pages"> | undefined;
  const activeAncestors =
    useQuery(api.pages.getAncestors, activePageId ? { id: activePageId } : "skip") ?? [];
  const createSpace = useMutation(api.pages.createSpace);

  const generalPages = useMemo(
    () => (rootPages ?? []).filter((page: any) => !page.isSpaceRoot),
    [rootPages]
  );
  const activeSpaceId = useMemo<Id<"pages"> | null>(() => {
    if (!activePageId || !spaceRoots?.length) {
      return null;
    }

    const spaceIdSet = new Set(spaceRoots.map((space: any) => String(space._id)));
    if (spaceIdSet.has(String(activePageId))) {
      return activePageId;
    }

    for (const ancestor of activeAncestors) {
      if (spaceIdSet.has(String(ancestor._id))) {
        return ancestor._id as Id<"pages">;
      }
    }

    return null;
  }, [activeAncestors, activePageId, spaceRoots]);

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
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
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
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
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
            <div className="space-y-1.5 px-2 py-1.5">
              <div className="skeleton-shimmer h-3.5 w-3/4 rounded" />
              <div className="skeleton-shimmer h-3.5 w-1/2 rounded" />
              <div className="skeleton-shimmer h-3.5 w-5/6 rounded" />
              <div className="skeleton-shimmer h-3.5 w-2/3 rounded" />
            </div>
          ) : (
            <>
              <div className="mb-2 rounded-xl border border-border/60 bg-card/40">
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
                    className="mx-2 mt-1 flex w-[calc(100%-16px)] items-center gap-2 rounded-md px-2 py-[5px] text-[13px] font-medium text-muted-foreground transition-colors hover:bg-[rgba(55,53,47,0.04)] hover:text-foreground dark:hover:bg-[rgba(255,255,255,0.04)]"
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
                      autoExpandToken={
                        space._id === activeSpaceId
                          ? String(activePageId ?? space._id)
                          : null
                      }
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
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Create a new project space</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Each space gets its own home page and isolated pages, notes, and databases.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={newSpaceName}
              onChange={(event) => setNewSpaceName(event.target.value)}
              placeholder="Space name"
              className="h-10 rounded-xl"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => setCreateSpaceOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
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
  mobile = false,
}: {
  moduleId: keyof typeof PANE_DETAILS;
  children: ReactNode;
  mobile?: boolean;
}) {
  const { toggleContextPaneCollapsed } = useAppStore();
  const details = PANE_DETAILS[moduleId];

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="border-b border-border/60 px-3 py-3">
        <div className="flex items-center gap-2">
          <UserMenu />
          {!mobile ? (
            <button
              type="button"
              aria-label="Hide context pane"
              title="Hide context pane"
              onClick={toggleContextPaneCollapsed}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card/80 text-muted-foreground transition-all hover:bg-[var(--notion-gray-bg)] hover:text-foreground dark:hover:bg-accent"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 px-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {details.eyebrow}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{details.title}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{details.description}</p>
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]",
          mobile && "pb-[calc(5rem+env(safe-area-inset-bottom))]"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function OverviewContextPane() {
  const router = useRouter();
  const { openMaddyPanel, setCommandPaletteOpen, setActiveModule } = useAppStore();

  const goTo = (href: string, moduleId: "overview" | "feed" | "brain" | "ledger" | "automation") => {
    setActiveModule(moduleId);
    router.push(href);
  };

  return (
    <div className="space-y-4 px-2 py-3">
      <div>
        <div className="px-3 py-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
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
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
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
            icon={<Workflow className="h-4 w-4" />}
            label="Open Automation"
            onClick={() => goTo("/workspace/automation", "automation")}
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
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
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

      <div className="rounded-2xl border border-border/60 bg-card/40 px-3 py-3 text-xs leading-5 text-muted-foreground">
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
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
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

      <div className="rounded-2xl border border-border/60 bg-card/40 px-3 py-3 text-xs leading-5 text-muted-foreground">
        The ledger section switcher now lives here so the content canvas gets more room.
      </div>
    </div>
  );
}

function AutomationContextPane() {
  const router = useRouter();
  const { automationTab, setAutomationTab } = useAppStore();

  return (
    <div className="space-y-4 px-2 py-3">
      <div className="px-3 py-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Live Automations
        </span>
      </div>

      <div className="space-y-0.5">
        {AUTOMATION_PANE_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <NavItem
              key={item.id}
              icon={<Icon className="h-4 w-4" />}
              label={item.label}
              active={automationTab === item.id}
              onClick={() => {
                setAutomationTab(item.id);
                router.push("/workspace/automation");
              }}
            />
          );
        })}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/40 px-3 py-3 text-xs leading-5 text-muted-foreground">
        Pinterest pins ship first. Next automations can plug into this same module without growing the global nav again.
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { contextPaneCollapsed, setActiveModule } = useAppStore();
  const { resolvedWorkspaceId, workspaceList, workspaces } = useResolvedWorkspace();
  const [contextPaneWidth, setContextPaneWidth] = useState(CONTEXT_PANE_DEFAULT_WIDTH);
  const [resizingContextPane, setResizingContextPane] = useState(false);
  const contextPaneResizeRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);

  const routeModule = useMemo(() => getRouteModule(pathname), [pathname]);
  const paneModule: keyof typeof PANE_DETAILS =
    routeModule === "feed"
      ? "feed"
      : routeModule === "brain"
        ? "brain"
        : routeModule === "ledger"
          ? "ledger"
          : routeModule === "automation"
            ? "automation"
          : "overview";

  useEffect(() => {
    setActiveModule(routeModule);
  }, [routeModule, setActiveModule]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedWidth = window.localStorage.getItem(CONTEXT_PANE_WIDTH_STORAGE_KEY);
    if (!storedWidth) {
      return;
    }

    const parsedWidth = Number(storedWidth);
    if (!Number.isFinite(parsedWidth)) {
      return;
    }

    setContextPaneWidth(clampContextPaneWidth(parsedWidth));
  }, []);

  useEffect(() => {
    if (!resizingContextPane) {
      return;
    }

    const handleMouseMove = (event: globalThis.MouseEvent) => {
      const dragState = contextPaneResizeRef.current;
      if (!dragState) {
        return;
      }

      const nextWidth = clampContextPaneWidth(
        dragState.startWidth + (event.clientX - dragState.startX)
      );
      setContextPaneWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setResizingContextPane(false);
      contextPaneResizeRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [resizingContextPane]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      CONTEXT_PANE_WIDTH_STORAGE_KEY,
      String(clampContextPaneWidth(contextPaneWidth))
    );
  }, [contextPaneWidth]);

  const handleContextPaneResizeStart = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (contextPaneCollapsed) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      contextPaneResizeRef.current = {
        startX: event.clientX,
        startWidth: contextPaneWidth,
      };
      setResizingContextPane(true);
    },
    [contextPaneCollapsed, contextPaneWidth]
  );

  if (workspaces !== undefined && workspaceList.length === 0) {
    return <WorkspaceSetup />;
  }

  return (
    <div className="hidden h-full shrink-0 md:flex">
      <ModuleRail />

      <aside
        className={cn(
          "relative overflow-hidden border-r border-border/60 bg-sidebar transition-[width,opacity,transform,border-color] duration-300",
          contextPaneCollapsed
            ? "pointer-events-none -translate-x-2 border-transparent opacity-0"
            : "translate-x-0 opacity-100"
        )}
        style={{
          width: contextPaneCollapsed ? 0 : contextPaneWidth,
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        aria-hidden={contextPaneCollapsed}
      >
        <div className="h-full w-full">
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
            ) : paneModule === "automation" ? (
              <AutomationContextPane />
            ) : (
              <OverviewContextPane />
            )}
          </ContextPaneFrame>
        </div>

        {!contextPaneCollapsed ? (
          <button
            type="button"
            aria-label="Resize context pane"
            title="Resize context pane"
            onMouseDown={handleContextPaneResizeStart}
            className="absolute right-0 top-0 z-50 h-full w-2 cursor-col-resize touch-none hover:[&>span]:bg-border"
          >
            <span
              className={cn(
                "pointer-events-none absolute right-0 top-0 h-full w-px bg-border/70 transition-colors",
                resizingContextPane && "bg-primary/90"
              )}
            />
          </button>
        ) : null}
      </aside>
    </div>
  );
}

export function MobileWorkspaceContextSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const { setActiveModule } = useAppStore();
  const previousPathnameRef = useRef(pathname);
  const { resolvedWorkspaceId, workspaceList, workspaces } = useResolvedWorkspace();

  const routeModule = useMemo(() => getRouteModule(pathname), [pathname]);
  const paneModule: keyof typeof PANE_DETAILS =
    routeModule === "feed"
      ? "feed"
      : routeModule === "brain"
        ? "brain"
        : routeModule === "ledger"
          ? "ledger"
          : routeModule === "automation"
            ? "automation"
          : "overview";

  useEffect(() => {
    setActiveModule(routeModule);
  }, [routeModule, setActiveModule]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return;
    }

    previousPathnameRef.current = pathname;

    if (open) {
      onOpenChange(false);
    }
  }, [onOpenChange, open, pathname]);

  if (workspaces !== undefined && workspaceList.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Workspace navigation"
        hideTitleVisually
        className="left-0 top-0 h-[100dvh] w-[min(360px,88vw)] max-w-[88vw] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-r border-border/60 bg-sidebar p-0"
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <ContextPaneFrame moduleId={paneModule} mobile>
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
            ) : paneModule === "automation" ? (
              <AutomationContextPane />
            ) : (
              <OverviewContextPane />
            )}
          </ContextPaneFrame>
        </div>
      </DialogContent>
    </Dialog>
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
        "flex min-h-[44px] w-full items-center gap-2 rounded-md px-2 py-[5px] text-[13px] font-medium transition-colors md:min-h-0",
        "hover:bg-[rgba(55,53,47,0.04)] dark:hover:bg-[rgba(255,255,255,0.04)]",
        active && "bg-[rgba(55,53,47,0.08)] text-foreground dark:bg-[rgba(255,255,255,0.07)]"
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


