"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAppStore } from "@/store/app.store";

export function useResolvedWorkspace() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const setCurrentWorkspaceId = useAppStore((state) => state.setCurrentWorkspaceId);
  const workspaces = useQuery(api.workspaces.listWorkspaces);
  const workspaceList = workspaces ?? [];

  const resolvedWorkspaceId = useMemo<Id<"workspaces"> | null>(() => {
    if (workspaces === undefined || workspaceList.length === 0) {
      return null;
    }

    if (
      currentWorkspaceId &&
      workspaceList.some((workspace: any) => workspace._id === currentWorkspaceId)
    ) {
      return currentWorkspaceId;
    }

    return workspaceList[0]._id;
  }, [currentWorkspaceId, workspaceList, workspaces]);

  useEffect(() => {
    if (workspaces === undefined) {
      return;
    }

    if (workspaceList.length === 0) {
      if (currentWorkspaceId !== null) {
        setCurrentWorkspaceId(null);
      }
      return;
    }

    if (resolvedWorkspaceId && resolvedWorkspaceId !== currentWorkspaceId) {
      setCurrentWorkspaceId(resolvedWorkspaceId);
    }
  }, [
    currentWorkspaceId,
    resolvedWorkspaceId,
    setCurrentWorkspaceId,
    workspaceList.length,
    workspaces,
  ]);

  const currentWorkspace = useMemo(
    () =>
      workspaceList.find((workspace: any) => workspace._id === resolvedWorkspaceId) ?? null,
    [resolvedWorkspaceId, workspaceList]
  );

  return {
    currentWorkspace,
    resolvedWorkspaceId,
    workspaceList,
    workspaces,
    workspacesLoading: workspaces === undefined,
  };
}
