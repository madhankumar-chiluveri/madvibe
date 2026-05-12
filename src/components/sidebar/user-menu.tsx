"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import {
  CreateWorkspaceDialog,
  WorkspaceSwitcherContent,
} from "@/components/workspace/workspace-switcher";
import { saveAccount } from "@/lib/account-manager";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";

export function UserMenu() {
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const { currentWorkspace } = useResolvedWorkspace();

  const user = useQuery(api.workspaces.getCurrentUser);
  const authStatus = useQuery((api as any).accountConversion.getCurrentAuthStatus);

  const currentUser = user as
    | {
        _id: string;
        name?: string;
        email?: string;
        image?: string;
      }
    | null
    | undefined;

  const displayName = currentUser?.name ?? currentUser?.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    if (!currentUser?._id || !currentUser.email) return;

    saveAccount({
      userId: String(currentUser._id),
      email: currentUser.email,
      name: currentUser.name ?? currentUser.email,
      image: currentUser.image ?? undefined,
      provider: authStatus?.preferredProvider === "google"
        ? "google"
        : currentUser.image?.includes("googleusercontent.com")
          ? "google"
          : "password",
    });
  }, [
    authStatus?.preferredProvider,
    currentUser?._id,
    currentUser?.email,
    currentUser?.image,
    currentUser?.name,
  ]);

  return (
    <>
      <DropdownMenu open={desktopOpen} onOpenChange={setDesktopOpen}>
        <DropdownMenuTrigger asChild>
          <button className="hidden min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-accent/50 data-[state=open]:bg-accent/70 md:flex">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={currentUser?.image} />
              <AvatarFallback className="bg-foreground text-xs text-background">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium leading-none">
                {currentWorkspace?.name ?? "MadVibe"}
              </p>
            </div>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          side="bottom"
          sideOffset={8}
          collisionPadding={16}
          className="w-[344px] max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-5rem)] overflow-hidden rounded-[24px] border-border/70 bg-popover/95 p-0 shadow-2xl backdrop-blur-xl"
        >
          <WorkspaceSwitcherContent
            onClose={() => setDesktopOpen(false)}
            onRequestCreateWorkspace={() => {
              setDesktopOpen(false);
              setCreateWorkspaceOpen(true);
            }}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-accent/50 md:hidden"
        aria-label="Open profile and workspace menu"
      >
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={currentUser?.image} />
          <AvatarFallback className="bg-foreground text-xs text-background">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium leading-none">
            {currentWorkspace?.name ?? "MadVibe"}
          </p>
        </div>
        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          title="Profile"
          hideTitleVisually={true}
          className="flex max-h-[min(88vh,calc(100dvh-1.5rem))] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden border-white/10 bg-[#161513] p-0 text-zinc-100 sm:w-[360px] sm:max-w-[360px]"
        >
          <WorkspaceSwitcherContent
            className="rounded-[24px] pt-12"
            onClose={() => setMobileOpen(false)}
            onRequestCreateWorkspace={() => {
              setMobileOpen(false);
              setCreateWorkspaceOpen(true);
            }}
          />
        </DialogContent>
      </Dialog>

    <CreateWorkspaceDialog
      open={createWorkspaceOpen}
      onOpenChange={setCreateWorkspaceOpen}
      onCreated={() => {
        setDesktopOpen(false);
        setMobileOpen(false);
      }}
    />
    </>
  );
}
