"use client";
// ─────────────────────────────────────────────────────────────
// src/context/workspace.context.tsx
//
// Provides the resolved current workspace + workspace list
// so any deeply nested component can consume them without
// prop-drilling.
// ─────────────────────────────────────────────────────────────
import React, { createContext, useContext } from "react";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import type { Workspace } from "@/types/page";

interface WorkspaceContextValue {
  workspace: Workspace | null | undefined;
  workspaces: Workspace[];
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspace: undefined,
  workspaces: [],
  isLoading: true,
});

export function WorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentWorkspace, workspaceList, workspacesLoading } = useResolvedWorkspace();

  return (
    <WorkspaceContext.Provider
      value={{
        workspace: currentWorkspace as Workspace | null,
        workspaces: workspaceList as Workspace[],
        isLoading: workspacesLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContextValue {
  return useContext(WorkspaceContext);
}
