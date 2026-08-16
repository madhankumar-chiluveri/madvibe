"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import {
  BoardView,
  DayView,
  MonthView,
  ToneLegend,
  WeekView,
} from "@/components/tasks/task-calendar-views";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import {
  EMPTY_FILTERS,
  TaskFilterBar,
  TaskToolbar,
  activeFilterCount,
  type TaskFilters,
} from "@/components/tasks/task-toolbar";
import {
  addDays,
  eventDateKey,
  groupByDate,
  startOfWeek,
  toDateKey,
  weekDays,
  type CalendarView,
  type TaskEvent,
} from "@/components/tasks/task-event";
import { CalendarOff } from "lucide-react";

export default function TasksPage() {
  const { resolvedWorkspaceId: workspaceId } = useResolvedWorkspace();

  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<TaskEvent | null>(null);

  const events = useQuery(
    api.overview.getWorkspaceCalendarTasks,
    workspaceId ? { workspaceId } : "skip"
  ) as TaskEvent[] | undefined;

  const loading = events === undefined;
  const allEvents = useMemo(() => events ?? [], [events]);

  /* ── Filter option lists ── */
  const spaceOptions = useMemo(
    () => [...new Set(allEvents.map((e) => e.spaceName).filter(Boolean))].sort(),
    [allEvents]
  );
  const databaseOptions = useMemo(
    () =>
      [
        ...new Set(
          allEvents
            .filter((e) => filters.space === "all" || e.spaceName === filters.space)
            .map((e) => e.databaseName)
            .filter(Boolean)
        ),
      ].sort(),
    [allEvents, filters.space]
  );
  const statusOptions = useMemo(
    () => [...new Set(allEvents.map((e) => e.status).filter((s): s is string => !!s))].sort(),
    [allEvents]
  );
  const dateTypeOptions = useMemo(
    () => [...new Set(allEvents.map((e) => e.datePropertyName).filter(Boolean))].sort(),
    [allEvents]
  );

  const filtered = useMemo(
    () =>
      allEvents.filter((e) => {
        if (filters.space !== "all" && e.spaceName !== filters.space) return false;
        if (filters.database !== "all" && e.databaseName !== filters.database) return false;
        if (filters.status !== "all" && (e.status ?? "No Status") !== filters.status) return false;
        if (filters.dateType !== "all" && e.datePropertyName !== filters.dateType) return false;
        return true;
      }),
    [allEvents, filters]
  );

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  /** How many events fall inside the range currently on screen. */
  const visibleCount = useMemo(() => {
    if (view === "day") return (grouped.get(toDateKey(anchor)) ?? []).length;
    if (view === "week" || view === "board") {
      return weekDays(anchor).reduce(
        (sum, d) => sum + (grouped.get(toDateKey(d)) ?? []).length,
        0
      );
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    const startKey = toDateKey(gridStart);
    const endKey = toDateKey(addDays(gridStart, 41));
    return filtered.filter((e) => {
      const key = eventDateKey(e);
      return key >= startKey && key <= endKey;
    }).length;
  }, [view, anchor, grouped, filtered]);

  /* ── Range navigation ── */
  const step = (direction: 1 | -1) => {
    setAnchor((prev) => {
      if (view === "month") {
        return new Date(prev.getFullYear(), prev.getMonth() + direction, 1);
      }
      return addDays(prev, direction * (view === "day" ? 1 : 7));
    });
  };

  const drillDown = (date: Date) => {
    setAnchor(date);
    setView("day");
  };

  const viewProps = {
    anchor,
    grouped,
    onSelect: setSelected,
    onDrillDown: drillDown,
  };

  return (
    <div className="flex h-full min-h-[560px] flex-col overflow-hidden bg-background">
      <WorkspaceTopBar moduleTitle="Task Calendar" />

      <div className="flex-none space-y-3 border-b border-border/60 px-4 pb-3 pt-3 md:px-6">
        <TaskToolbar
          view={view}
          onViewChange={setView}
          anchor={anchor}
          onAnchorChange={setAnchor}
          onToday={() => setAnchor(new Date())}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          visibleCount={visibleCount}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          filterCount={activeFilterCount(filters)}
        />

        {filtersOpen && (
          <div className="animate-fade-in">
            <TaskFilterBar
              filters={filters}
              onChange={setFilters}
              spaceOptions={spaceOptions}
              databaseOptions={databaseOptions}
              statusOptions={statusOptions}
              dateTypeOptions={dateTypeOptions}
            />
          </div>
        )}

        <ToneLegend />
      </div>

      <div className="min-h-0 flex-1 p-3 md:p-4">
        <div className="h-full overflow-hidden rounded-2xl border border-border bg-card">
          {loading ? (
            <div className="skeleton-shimmer h-full w-full" />
          ) : allEvents.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <CalendarOff className="h-7 w-7 text-muted-foreground/50" />
              <div>
                <h2 className="text-sm font-bold text-foreground">No dated tasks yet</h2>
                <p className="mx-auto mt-1 max-w-[42ch] text-xs font-medium text-muted-foreground">
                  This calendar reads every database in the workspace that has a date property.
                  Add a date column to a database and its rows appear here.
                </p>
              </div>
            </div>
          ) : view === "month" ? (
            <MonthView {...viewProps} />
          ) : view === "week" ? (
            <WeekView {...viewProps} />
          ) : view === "day" ? (
            <DayView {...viewProps} />
          ) : (
            <BoardView {...viewProps} />
          )}
        </div>
      </div>

      <TaskDetailSheet task={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
