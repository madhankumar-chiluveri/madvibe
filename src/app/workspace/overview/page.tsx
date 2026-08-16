"use client";

import { memo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { RemindersSummary } from "@/components/dashboard/reminders-summary";
import { FinanceSummary } from "@/components/dashboard/finance-summary";
import { VehiclesSummary } from "@/components/dashboard/vehicles-summary";
import { FolderOpen } from "lucide-react";

export default memo(function OverviewPage() {
  const { resolvedWorkspaceId: workspaceId } = useResolvedWorkspace();

  // Dashboard aggregated metrics. The cross-project calendar query used to run
  // here too; it now lives on /workspace/tasks so the dashboard no longer pays
  // for a full workspace database walk on every visit.
  const metrics = useQuery(
    api.overview.getOverviewMetrics,
    workspaceId ? { workspaceId } : "skip"
  );

  const loading = metrics === undefined;

  return (
    <div className="min-h-full bg-background flex flex-col">
      <WorkspaceTopBar moduleTitle="Overview" />

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 md:px-6 md:py-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-border/60">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Plan, prioritize, and track your finances, tasks, and vehicles in one place.
            </p>
          </div>
          {metrics && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border px-3 py-1 rounded-lg">
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="font-bold text-foreground">{metrics.tasks.projects}</span>
              <span className="font-medium">Projects tracked</span>
            </div>
          )}
        </div>

        {/* Row 1: Key Metrics Cards */}
        <OverviewCards data={metrics || null} loading={loading} />

        {/* Row 2: Detailed summaries. Three equal columns now that the task
            calendar has its own page — reachable from the Brain pane. */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* Reminders & Alerts */}
          {loading || !metrics || !workspaceId ? (
            <div className="skeleton-shimmer h-[280px] rounded-[10px] border border-border" />
          ) : (
            <RemindersSummary reminders={metrics.reminders} workspaceId={workspaceId} />
          )}

          {/* Finances: Accounts & Budgets */}
          {loading || !metrics ? (
            <div className="skeleton-shimmer h-[260px] rounded-[10px] border border-border" />
          ) : (
            <FinanceSummary finances={metrics.finances} />
          )}

          {/* Vehicles: Services & PUC / Insurance warnings */}
          {loading || !metrics ? (
            <div className="skeleton-shimmer h-[240px] rounded-[10px] border border-border" />
          ) : (
            <VehiclesSummary vehicles={metrics.vehicles} />
          )}
        </div>
      </div>
    </div>
  );
});
