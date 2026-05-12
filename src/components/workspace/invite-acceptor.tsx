"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAppStore } from "@/store/app.store";

export function InviteAcceptor() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setCurrentWorkspaceId = useAppStore((s) => s.setCurrentWorkspaceId);
  const acceptWorkspaceInvite = useMutation(api.workspaces.acceptWorkspaceInvite);
  const currentUser = useQuery(api.workspaces.getCurrentUser);
  const processedRef = useRef<string | null>(null);

  const inviteParam = searchParams?.get("invite") ?? null;

  useEffect(() => {
    if (!inviteParam) return;
    if (processedRef.current === inviteParam) return;
    if (currentUser === undefined) return;

    if (currentUser === null) {
      const target = `${pathname}?invite=${encodeURIComponent(inviteParam)}`;
      router.replace(`/login?redirectTo=${encodeURIComponent(target)}`);
      return;
    }

    processedRef.current = inviteParam;

    const inviteId = inviteParam as Id<"workspaceInvites">;
    void (async () => {
      try {
        const workspaceId = await acceptWorkspaceInvite({ inviteId });
        setCurrentWorkspaceId(workspaceId);
        toast.success("Joined workspace");
      } catch (error: any) {
        const message = String(error?.message ?? "");
        if (message.includes("Invite not found")) {
          toast.message("This invite is no longer active");
        } else if (message.includes("different email")) {
          toast.error("Sign in with the email this invite was sent to");
        } else {
          toast.error(message || "Could not accept the invite");
        }
      } finally {
        const params = new URLSearchParams(searchParams?.toString() ?? "");
        params.delete("invite");
        const query = params.toString();
        router.replace(query.length > 0 ? `${pathname}?${query}` : pathname);
      }
    })();
  }, [
    inviteParam,
    currentUser,
    pathname,
    searchParams,
    router,
    acceptWorkspaceInvite,
    setCurrentWorkspaceId,
  ]);

  return null;
}
