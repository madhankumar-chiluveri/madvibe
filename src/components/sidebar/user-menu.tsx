"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAppStore } from "@/store/app.store";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2, LogOut, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function UserMenu() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { currentWorkspaceId } = useAppStore();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const user = useQuery(api.workspaces.getCurrentUser);
  const workspace = useQuery(
    api.workspaces.getWorkspace,
    currentWorkspaceId ? { id: currentWorkspaceId } : "skip"
  );

  const displayName = (user as any)?.name ?? (user as any)?.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    const signOutPromise = signOut();
    router.replace("/login");
    void signOutPromise;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-accent/50 data-[state=open]:bg-accent/70 transition-colors flex-1 min-w-0">
          <Avatar className="w-6 h-6 shrink-0">
            <AvatarImage src={(user as any)?.image} />
            <AvatarFallback className="text-xs bg-foreground text-background">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate leading-none">
              {workspace?.name ?? "MadVibe"}
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
        className="w-[320px] max-w-[calc(100vw-1.5rem)] rounded-xl border-border/70 bg-popover/95 p-2 shadow-2xl backdrop-blur-xl"
      >
        <DropdownMenuLabel className="font-normal px-2 py-2">
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarImage src={(user as any)?.image} />
              <AvatarFallback className="text-sm bg-muted text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-none truncate">
                {workspace?.name ?? "MadVibe"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {(user as any)?.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="h-9 rounded-md"
          onClick={() => router.push("/workspace/settings")}
        >
          <Settings className="w-4 h-4 mr-2" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          className="h-9 rounded-md"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 mr-2" />
          ) : (
            <Moon className="w-4 h-4 mr-2" />
          )}
          Toggle theme
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isSigningOut}
          onClick={handleSignOut}
          className="h-9 rounded-md text-destructive focus:text-destructive disabled:opacity-60"
        >
          {isSigningOut ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4 mr-2" />
          )}{" "}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
