"use client";

import { memo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { CalendarWidget } from "@/components/dashboard/calendar-widget";
import { RemindersSummary } from "@/components/dashboard/reminders-summary";
import { FinanceSummary } from "@/components/dashboard/finance-summary";
import { VehiclesSummary } from "@/components/dashboard/vehicles-summary";
import { FolderOpen } from "lucide-react";

export default memo(function OverviewPage() {
  const { resolvedWorkspaceId: workspaceId } = useResolvedWorkspace();

  // 1. Fetch dashboard aggregated metrics
  const metrics = useQuery(
    api.overview.getOverviewMetrics,
    workspaceId ? { workspaceId } : "skip"
  );

  // 2. Fetch all calendar task events cross-project
  const calendarTasks = useQuery(
    api.overview.getWorkspaceCalendarTasks,
    workspaceId ? { workspaceId } : "skip"
  );

  const loading = metrics === undefined || calendarTasks === undefined;

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

        {/* Row 2: Main Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Task Calendar/Kanban Widget */}
          <div className="lg:col-span-2 h-full">
            {loading ? (
              <div className="skeleton-shimmer h-[580px] rounded-[10px] border border-border" />
            ) : (
              <CalendarWidget events={calendarTasks} />
            )}
          </div>

          {/* Right Column: Detailed Summaries */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Reminders & Alerts */}
            <div>
              {loading || !metrics || !workspaceId ? (
                <div className="skeleton-shimmer h-[280px] rounded-[10px] border border-border" />
              ) : (
                <RemindersSummary
                  reminders={metrics.reminders}
                  workspaceId={workspaceId}
                />
              )}
            </div>

            {/* Finances: Accounts & Budgets */}
            <div>
              {loading || !metrics ? (
                <div className="skeleton-shimmer h-[260px] rounded-[10px] border border-border" />
              ) : (
                <FinanceSummary finances={metrics.finances} />
              )}
            </div>

            {/* Vehicles: Services & PUC / Insurance warnings */}
            <div>
              {loading || !metrics ? (
                <div className="skeleton-shimmer h-[240px] rounded-[10px] border border-border" />
              ) : (
                <VehiclesSummary vehicles={metrics.vehicles} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
