"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [open, setOpen] = useState(false);
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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-accent/50 data-[state=open]:bg-accent/70 transition-colors flex-1 min-w-0">
          <Avatar className="w-6 h-6 shrink-0">
            <AvatarImage src={currentUser?.image} />
            <AvatarFallback className="text-xs bg-foreground text-background">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate leading-none">
              {currentWorkspace?.name ?? "MadVibe"}
            </p>
          </div>
          <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        className="w-[344px] max-w-[calc(100vw-1.5rem)] rounded-[24px] border-border/70 bg-popover/95 p-0 shadow-2xl backdrop-blur-xl"
      >
        <WorkspaceSwitcherContent
          onClose={() => setOpen(false)}
          onRequestCreateWorkspace={() => {
            setOpen(false);
            setCreateWorkspaceOpen(true);
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
    <CreateWorkspaceDialog
      open={createWorkspaceOpen}
      onOpenChange={setCreateWorkspaceOpen}
      onCreated={() => setOpen(false)}
    />
    </>
  );
}
