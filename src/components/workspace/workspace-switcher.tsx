"use client";

"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Bell,
  BellRing,
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
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { DEFAULT_WORKSPACE_ROUTE } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { getWorkspaceSwitchTarget } from "@/lib/workspace-routing";
import { useAppStore } from "@/store/app.store";
import { usePush } from "@/hooks/use-push";

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

function buildGoogleLoginUrl({
  redirectTo,
  loginHint,
  forceAccountSelection,
}: {
  redirectTo: string;
  loginHint?: string;
  forceAccountSelection?: boolean;
}) {
  const params = new URLSearchParams({ redirectTo });

  if (loginHint) {
    params.set("login_hint", loginHint);
  } else if (forceAccountSelection) {
    params.set("prompt", "select_account");
  }

  return `/api/auth/signin/google?${params.toString()}`;
}

function WorkspaceRoleBadge({ role }: { role?: "owner" | "editor" | "viewer" | null }) {
  const normalizedRole = role ?? "owner";

  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
        normalizedRole === "owner" && "border-emerald-400/16 bg-emerald-400/[0.08] text-emerald-200",
        normalizedRole === "editor" && "border-sky-400/16 bg-sky-400/[0.08] text-sky-200",
        normalizedRole === "viewer" && "border-white/10 bg-white/[0.04] text-zinc-400"
      )}
    >
      {normalizedRole}
    </span>
  );
}

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
  userLoaded,
  onClose,
}: {
  currentUserId: string;
  userLoaded: boolean;
  onClose?: () => void;
}) {
  const { signOut } = useAuthActions();
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [pendingAction, setPendingAction] = useState<string | "add" | null>(null);

  useEffect(() => {
    setAccounts(getAccounts());
  }, []);

  const navigateTo = (url: string) => {
    onClose?.();
    window.location.assign(url);
  };

  const handleSwitchTo = async (account: SavedAccount) => {
    if (pendingAction) return;
    // Wait for user data to load before allowing account switch
    if (!userLoaded) return;

    if (account.userId === currentUserId) {
      // Already on this account — just close the panel
      onClose?.();
      return;
    }

    setPendingAction(account.userId);

    try {
      await signOut();
    } finally {
      if (account.provider === "google") {
        navigateTo(
          buildGoogleLoginUrl({
            redirectTo: DEFAULT_WORKSPACE_ROUTE,
            loginHint: account.email,
          })
        );
        return;
      }

      const params = new URLSearchParams({
        hint: account.email,
        provider: account.provider,
      });
      navigateTo(`/login?${params.toString()}`);
    }
  };

  const handleAddAccount = async () => {
    if (pendingAction) return;

    setPendingAction("add");

    try {
      await signOut();
    } finally {
      navigateTo(
        buildGoogleLoginUrl({
          redirectTo: DEFAULT_WORKSPACE_ROUTE,
          forceAccountSelection: true,
        })
      );
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
      <div className="px-2 pb-2 text-[11px] leading-5 text-muted-foreground">
        Saved Google accounts try a direct switch first. Add another account opens Google's chooser.
      </div>

      <div className="space-y-1">
        {accounts.map((account) => {
          // Only treat as active once user data has loaded — avoids false
          // "not active" while currentUserId is still the empty string.
          const isActive = userLoaded && account.userId === currentUserId;
          const isPending = pendingAction === account.userId;
          const isLoading = !userLoaded;
          const initials = getAccountInitials(account.name, account.email);

          return (
            <div key={account.userId} className="group flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSwitchTo(account)}
                disabled={pendingAction !== null || isLoading}
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
                  <div className="text-sm font-medium leading-5 break-words">{account.name}</div>
                  <div className="text-xs leading-4 text-muted-foreground break-all">
                    {account.email}
                    {isLoading
                      ? " · Loading…"
                      : account.provider === "google"
                        ? isActive
                          ? " · Current Google account"
                          : " · Switch via Google"
                        : isActive
                          ? " · Current account"
                          : " · Password sign-in"}
                  </div>
                </div>

                <div className="shrink-0 text-muted-foreground">
                  {isPending || (isLoading && accounts.length === 1) ? (
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
                  disabled={pendingAction !== null || isLoading}
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
        Choose another Google account
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
  const setCurrentWorkspaceId = useAppStore((state) => state.setCurrentWorkspaceId);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { isSupported: pushSupported, permission: pushPermission, subscribe } = usePush();
  const {
    currentWorkspace,
    resolvedWorkspaceId,
    workspaceList,
    workspaces,
  } = useResolvedWorkspace();

  const user = useQuery(api.workspaces.getCurrentUser);
  const pendingInvites = useQuery(api.workspaces.listMyWorkspaceInvites) ?? [];
  const acceptWorkspaceInvite = useMutation(api.workspaces.acceptWorkspaceInvite);
  const declineWorkspaceInvite = useMutation(api.workspaces.declineWorkspaceInvite);

  const currentUser = user as
    | {
      _id: string;
      name?: string;
      email?: string;
    }
    | null
    | undefined;

  const currentUserId = String(currentUser?._id ?? "");
  // user === undefined means still loading; null means loaded but not signed in
  const userLoaded = currentUser !== undefined;
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

  const handleAcceptInvite = async (inviteId: Id<"workspaceInvites">) => {
    if (inviteActionId) return;

    setInviteActionId(String(inviteId));
    try {
      const workspaceId = await acceptWorkspaceInvite({ inviteId });
      setCurrentWorkspaceId(workspaceId);
      toast.success("Workspace added");
      onClose?.();
      router.push(getWorkspaceSwitchTarget(pathname));
    } catch (error: any) {
      toast.error(error?.message ?? "Could not accept the invite");
      setInviteActionId(null);
    }
  };

  const handleDeclineInvite = async (inviteId: Id<"workspaceInvites">) => {
    if (inviteActionId) return;

    setInviteActionId(String(inviteId));
    try {
      await declineWorkspaceInvite({ inviteId });
      toast.success("Invite declined");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not decline the invite");
    } finally {
      setInviteActionId(null);
    }
  };

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleEnableNotifications = async () => {
    // If already denied, guide user to unblock manually
    if (pushPermission === "denied") {
      toast.error(
        "Notifications are blocked for this site. To enable:",
        {
          description: "Click the 🔒 lock icon in your browser's address bar → Site settings → Notifications → Allow",
          duration: 10000,
        }
      );
      return;
    }

    setIsSubscribing(true);
    try {
      const result = await subscribe();
      if (result.status === "granted") {
        toast.success("Push notifications enabled! 🔔 You'll get alerts even when MadVibe is closed.", { duration: 5000 });
      } else if (result.status === "denied") {
        toast.error("Notifications blocked.", {
          description: "Click the 🔒 lock icon in your browser's address bar → Site settings → Notifications → Allow, then refresh.",
          duration: 10000,
        });
      } else if (result.status === "dismissed") {
        toast.info("No problem — you can enable notifications anytime from here.", { duration: 4000 });
      } else {
        toast.error("Could not enable notifications: " + result.message);
      }
    } catch {
      toast.error("Could not enable notifications");
    } finally {
      setIsSubscribing(false);
    }
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
    <div
      className={cn(
        "flex h-full max-h-[calc(100dvh-5rem)] min-h-0 flex-col overflow-hidden",
        className
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <AccountsSection currentUserId={currentUserId} userLoaded={userLoaded} onClose={onClose} />

        <div className="border-b border-border/70 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-foreground">
              {getWorkspaceInitial(currentWorkspace?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-5 text-foreground break-words">
                {currentWorkspace?.name ?? "Workspace"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {workspaceCount === 1 ? "1 workspace" : `${workspaceCount} workspaces`}
              </p>
            </div>
            <WorkspaceRoleBadge role={(currentWorkspace as any)?.role ?? "owner"} />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground break-all">
            {currentUser?.email ?? displayName}
          </p>
        </div>

        {pendingInvites.length > 0 ? (
          <div className="border-b border-border/70 px-2 py-2">
            <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Invites
            </div>

            <div className="space-y-2 px-2 pb-1">
              {pendingInvites.map((invite: any) => {
                const isPending = inviteActionId === String(invite._id);

                return (
                  <div
                    key={invite._id}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-5 text-foreground break-words">
                          {invite.workspaceName}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Invited by {invite.ownerName}
                        </div>
                      </div>
                      <WorkspaceRoleBadge role={invite.role} />
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 flex-1 rounded-xl"
                        disabled={inviteActionId !== null}
                        onClick={() => void handleAcceptInvite(invite._id)}
                      >
                        {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                        Join
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 flex-1 rounded-xl"
                        disabled={inviteActionId !== null}
                        onClick={() => void handleDeclineInvite(invite._id)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

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
                      <div className="text-sm font-medium leading-5 break-words">{workspace.name}</div>
                      <div className="mt-0.5 text-[11px] leading-4 text-muted-foreground break-words">
                        {(workspace as any).role === "owner"
                          ? `${(workspace as any).memberCount ?? 1} member${(workspace as any).memberCount === 1 ? "" : "s"}`
                          : `Shared by ${(workspace as any).ownerName ?? "workspace owner"}`}
                      </div>
                    </div>
                    <WorkspaceRoleBadge role={(workspace as any).role ?? "owner"} />
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
      </div>

      <div className="shrink-0 border-t border-border/70 px-2 py-2">
        <button
          type="button"
          onClick={handleOpenSettings}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent/60"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
          Settings
        </button>

        {pushSupported && (
          <button
            type="button"
            disabled={isSubscribing || pushPermission === "granted"}
            onClick={() => void handleEnableNotifications()}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
              pushPermission === "granted"
                ? "cursor-default text-emerald-400"
                : pushPermission === "denied"
                  ? "text-amber-400 hover:bg-amber-500/10"
                  : "text-foreground hover:bg-accent/60 disabled:opacity-60"
            )}
          >
            {isSubscribing ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : pushPermission === "granted" ? (
              <BellRing className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4 text-muted-foreground" />
            )}
            {isSubscribing
              ? "Enabling notifications..."
              : pushPermission === "granted"
                ? "Push alerts enabled"
                : pushPermission === "denied"
                  ? "Unblock in browser settings →"
                  : "Enable push notifications"}
          </button>
        )}

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
        className="flex max-h-[min(88vh,calc(100dvh-1.5rem))] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden border-white/10 bg-[#161513] text-zinc-100 sm:w-[28rem] sm:max-w-[28rem]"
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
