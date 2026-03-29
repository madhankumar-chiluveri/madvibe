"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Check,
  Loader2,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  type SavedAccount,
  getAccounts,
  removeAccount,
} from "@/lib/account-manager";
import { DEFAULT_WORKSPACE_ROUTE } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { getWorkspaceSwitchTarget } from "@/lib/workspace-routing";
import { useAppStore } from "@/store/app.store";

type WorkspaceSwitcherContentProps = {
  onClose?: () => void;
  onRequestCreateWorkspace: () => void;
  className?: string;
};

type CreateWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (workspaceId: Id<"workspaces">) => void;
};

function getWorkspaceInitial(name?: string | null) {
  return (name?.trim().slice(0, 1) || "W").toUpperCase();
}

function getAccountInitials(name?: string | null, email?: string | null) {
  const value = name?.trim() || email?.trim() || "User";
  return value
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function AccountsSection({
  currentUserId,
  onClose,
}: {
  currentUserId: string;
  onClose?: () => void;
}) {
  const { signOut } = useAuthActions();
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [pendingAction, setPendingAction] = useState<string | "add" | null>(null);

  useEffect(() => {
    setAccounts(getAccounts());
  }, []);

  const navigateToLogin = (search: string) => {
    onClose?.();
    window.location.assign(`/login${search}`);
  };

  const handleSwitchTo = async (account: SavedAccount) => {
    if (pendingAction) return;

    if (account.userId === currentUserId) {
      onClose?.();
      return;
    }

    setPendingAction(account.userId);
    const params = new URLSearchParams({
      hint: account.email,
      provider: account.provider,
    });

    try {
      await signOut();
    } finally {
      navigateToLogin(`?${params.toString()}`);
    }
  };

  const handleAddAccount = async () => {
    if (pendingAction) return;

    setPendingAction("add");

    try {
      await signOut();
    } finally {
      navigateToLogin("?provider=google");
    }
  };

  const handleRemoveAccount = (userId: string) => {
    removeAccount(userId);
    setAccounts((previous) => previous.filter((account) => account.userId !== userId));
  };

  if (accounts.length === 0) return null;

  return (
    <div className="border-b border-border/70 px-2 py-2">
      <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Accounts
      </div>

      <div className="space-y-1">
        {accounts.map((account) => {
          const isActive = account.userId === currentUserId;
          const isPending = pendingAction === account.userId;
          const initials = getAccountInitials(account.name, account.email);

          return (
            <div key={account.userId} className="group flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSwitchTo(account)}
                disabled={pendingAction !== null}
                className={cn(
                  "flex min-h-12 flex-1 items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors touch-manipulation disabled:cursor-not-allowed disabled:opacity-70",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/60"
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={account.image} />
                  <AvatarFallback className="bg-foreground text-xs text-background">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{account.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {account.email}
                  </div>
                </div>

                <div className="shrink-0 text-muted-foreground">
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isActive ? (
                    <Check className="h-4 w-4 text-foreground" />
                  ) : null}
                </div>
              </button>

              {!isActive ? (
                <button
                  type="button"
                  onClick={() => handleRemoveAccount(account.userId)}
                  disabled={pendingAction !== null}
                  className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground transition-colors touch-manipulation hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                  aria-label={`Remove ${account.email}`}
                  title="Remove account"
                >
                  <X className="mx-auto h-4 w-4" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => void handleAddAccount()}
        disabled={pendingAction !== null}
        className="mt-2 flex min-h-12 w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-primary transition-colors touch-manipulation hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pendingAction === "add" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Add another account
      </button>
    </div>
  );
}

export function WorkspaceSwitcherContent({
  onClose,
  onRequestCreateWorkspace,
  className,
}: WorkspaceSwitcherContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const { theme, setTheme } = useTheme();
  const { currentWorkspaceId, setCurrentWorkspaceId } = useAppStore();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const user = useQuery(api.workspaces.getCurrentUser);
  const workspaces = useQuery(api.workspaces.listWorkspaces);

  const currentUser = user as
    | {
        _id: string;
        name?: string;
        email?: string;
      }
    | null
    | undefined;

  const currentUserId = String(currentUser?._id ?? "");
  const workspaceList = workspaces ?? [];
  const resolvedWorkspaceId = currentWorkspaceId ?? workspaceList[0]?._id ?? null;
  const currentWorkspace =
    workspaceList.find((workspace: any) => workspace._id === resolvedWorkspaceId) ??
    workspaceList[0] ??
    null;

  const displayName = currentUser?.name ?? currentUser?.email ?? "User";
  const workspaceCount = workspaceList.length;

  const handleSelectWorkspace = (workspaceId: Id<"workspaces">) => {
    setCurrentWorkspaceId(workspaceId);
    onClose?.();
    router.push(getWorkspaceSwitchTarget(pathname));
  };

  const handleOpenSettings = () => {
    onClose?.();
    router.push("/workspace/settings");
  };

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    onClose?.();

    try {
      await signOut();
    } finally {
      window.location.assign("/login");
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <AccountsSection currentUserId={currentUserId} onClose={onClose} />

      <div className="border-b border-border/70 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-foreground">
            {getWorkspaceInitial(currentWorkspace?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {currentWorkspace?.name ?? "Workspace"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {workspaceCount === 1 ? "1 workspace" : `${workspaceCount} workspaces`}
            </p>
          </div>
        </div>
        <p className="mt-3 truncate text-xs text-muted-foreground">
          {currentUser?.email ?? displayName}
        </p>
      </div>

      <div className="px-2 py-2">
        <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Workspaces
        </div>

        {workspaces === undefined ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            Loading workspaces...
          </div>
        ) : workspaceList.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            No workspaces yet.
          </div>
        ) : (
          <div className="space-y-1">
            {workspaceList.map((workspace: any) => {
              const isActive = workspace._id === resolvedWorkspaceId;

              return (
                <button
                  key={workspace._id}
                  type="button"
                  onClick={() => handleSelectWorkspace(workspace._id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-accent/60"
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-semibold">
                    {getWorkspaceInitial(workspace.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{workspace.name}</div>
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 transition-opacity",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={onRequestCreateWorkspace}
          className="mt-2 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-accent/60"
        >
          <Plus className="h-4 w-4" />
          New workspace
        </button>
      </div>

      <div className="border-t border-border/70 px-2 py-2">
        <button
          type="button"
          onClick={handleOpenSettings}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent/60"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
          Settings
        </button>
        <button
          type="button"
          onClick={handleToggleTheme}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent/60"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Moon className="h-4 w-4 text-muted-foreground" />
          )}
          Toggle theme
        </button>
        <button
          type="button"
          disabled={isSigningOut}
          onClick={() => void handleSignOut()}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Sign out
        </button>
      </div>
    </div>
  );
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateWorkspaceDialogProps) {
  const router = useRouter();
  const { setCurrentWorkspaceId } = useAppStore();
  const createWorkspace = useMutation(api.workspaces.createWorkspace);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setName("");
      setIsSubmitting(false);
    }
    onOpenChange(nextOpen);
  };

  const handleCreateWorkspace = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Enter a workspace name");
      return;
    }

    setIsSubmitting(true);
    try {
      const workspaceId = await createWorkspace({ name: trimmedName });
      setCurrentWorkspaceId(workspaceId);
      toast.success("Workspace created");
      handleOpenChange(false);
      onCreated?.(workspaceId);
      router.push(DEFAULT_WORKSPACE_ROUTE);
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to create workspace");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title="Create workspace"
        className="max-w-md border-white/10 bg-[#161513] text-zinc-100"
      >
        <DialogHeader>
          <DialogTitle>Create a new workspace</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add another workspace without affecting your existing spaces, pages,
            or settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreateWorkspace();
              }
            }}
            placeholder="Workspace name"
            className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-white/15"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl text-zinc-300 hover:bg-white/[0.06] hover:text-white"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-white text-black hover:bg-zinc-200"
            onClick={() => void handleCreateWorkspace()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
