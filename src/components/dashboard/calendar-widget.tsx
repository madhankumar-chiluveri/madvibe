"use client";

import { useState, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  ExternalLink,
  CheckCircle2,
  Clock,
  Briefcase,
  FolderOpen,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskEvent {
  rowId: string;
  databaseId: string;
  pageId: string;
  databaseName: string;
  spaceName: string;
  taskName: string;
  datePropertyName: string;
  datePropertyId: string;
  datePropertyType: string;
  timestamp: number;
  status: string | null;
  statusColor: string | null;
}

interface CalendarWidgetProps {
  events: TaskEvent[] | undefined;
}

export const CalendarWidget = memo(function CalendarWidget({ events = [] }: CalendarWidgetProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "kanban">("calendar");
  const [isBoardExpanded, setIsBoardExpanded] = useState(false);
  const [selectedDayTasks, setSelectedDayTasks] = useState<{
    date: Date;
    tasks: TaskEvent[];
  } | null>(null);

  // Kanban filter state
  const [filterSpace, setFilterSpace] = useState("all");
  const [filterDatabase, setFilterDatabase] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Distinct option lists derived from all events
  const spaceOptions = useMemo(() => {
    const seen = new Set<string>();
    events.forEach((e) => { if (e.spaceName) seen.add(e.spaceName); });
    return Array.from(seen).sort();
  }, [events]);

  const databaseOptions = useMemo(() => {
    const seen = new Set<string>();
    events.forEach((e) => {
      if (filterSpace !== "all" && e.spaceName !== filterSpace) return;
      if (e.databaseName) seen.add(e.databaseName);
    });
    return Array.from(seen).sort();
  }, [events, filterSpace]);

  const statusOptions = useMemo(() => {
    const seen = new Set<string>();
    events.forEach((e) => { if (e.status) seen.add(e.status); });
    return Array.from(seen).sort();
  }, [events]);

  // Filtered events used in all views
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filterSpace !== "all" && e.spaceName !== filterSpace) return false;
      if (filterDatabase !== "all" && e.databaseName !== filterDatabase) return false;
      if (filterStatus !== "all" && (e.status ?? "No Status") !== filterStatus) return false;
      return true;
    });
  }, [events, filterSpace, filterDatabase, filterStatus]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Helper: Get Sunday-Saturday dates for the week of the given date
  const getWeekDays = (date: Date) => {
    const currentDay = date.getDay(); // 0 = Sun, 6 = Sat
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - currentDay); // set to Sunday of this week

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Format date key: YYYY-MM-DD
  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
  };

  // Navigations: shift week if in weekly kanban, otherwise shift month
  const handlePrev = () => {
    if (viewMode === "kanban") {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() - 7);
      setCurrentDate(nextDate);
    } else {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "kanban") {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 7);
      setCurrentDate(nextDate);
    } else {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Header Title Resolver
  const getHeaderTitle = () => {
    if (viewMode === "calendar") {
      return `${monthNames[currentMonth]} ${currentYear}`;
    }
    const weekDays = getWeekDays(currentDate);
    const start = weekDays[0];
    const end = weekDays[6];
    const startStr = start.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const endStr = end.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `Week: ${startStr} — ${endStr}`;
  };

  // Generate grid days for standard 7x6 month view (Sun-Sat)
  const gridDays = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 6 = Sat

    const days = [];

    // Prev month overflow days
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(currentYear, currentMonth - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(currentYear, currentMonth, i),
        isCurrentMonth: true,
      });
    }

    // Next month overflow days
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(currentYear, currentMonth + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Index events by "YYYY-MM-DD" local date string
  const eventsByDate = useMemo(() => {
    const map = new Map<string, TaskEvent[]>();
    filteredEvents.forEach((event) => {
      const date = new Date(event.timestamp);
      const key = formatDateKey(date);
      const existing = map.get(key) || [];
      existing.push(event);
      map.set(key, existing);
    });
    return map;
  }, [filteredEvents]);

  // Kanban view date columns (renders exactly 7 columns for the selected week)
  const kanbanColumns = useMemo(() => {
    const activeDates: { date: Date; dateStr: string; label: string; tasks: TaskEvent[] }[] = [];

    const getRelativeLabel = (date: Date) => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      let label = date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });

      if (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      ) {
        label = "Today";
      } else if (
        date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate()
      ) {
        label = "Yesterday";
      } else if (
        date.getFullYear() === tomorrow.getFullYear() &&
        date.getMonth() === tomorrow.getMonth() &&
        date.getDate() === tomorrow.getDate()
      ) {
        label = "Tomorrow";
      }

      return `${label} (${dayNames[date.getDay()]})`;
    };

    const weekDays = getWeekDays(currentDate);
    weekDays.forEach((day) => {
      const dateStr = formatDateKey(day);
      const dayTasks = eventsByDate.get(dateStr) || [];
      activeDates.push({
        date: day,
        dateStr,
        label: getRelativeLabel(day),
        tasks: dayTasks,
      });
    });

    return activeDates;
  }, [currentDate, eventsByDate]);

  // CSS mappings for Notion selection colors
  const statusColorMap: Record<string, string> = {
    gray: "bg-notion-gray-bg text-notion-gray-text hover:bg-notion-gray-bg/80",
    brown: "bg-notion-brown-bg text-notion-brown-text hover:bg-notion-brown-bg/80",
    orange: "bg-notion-orange-bg text-notion-orange-text hover:bg-notion-orange-bg/80",
    yellow: "bg-notion-yellow-bg text-notion-yellow-text hover:bg-notion-yellow-bg/80",
    green: "bg-notion-green-bg text-notion-green-text hover:bg-notion-green-bg/80",
    blue: "bg-notion-blue-bg text-notion-blue-text hover:bg-notion-blue-bg/80",
    purple: "bg-notion-purple-bg text-notion-purple-text hover:bg-notion-purple-bg/80",
    pink: "bg-notion-pink-bg text-notion-pink-text hover:bg-notion-pink-bg/80",
    red: "bg-notion-red-bg text-notion-red-text hover:bg-notion-red-bg/80",
  };

  const getStatusClass = (colorName: string | null) => {
    if (!colorName) return "bg-notion-gray-bg text-notion-gray-text";
    return statusColorMap[colorName.toLowerCase()] || "bg-notion-gray-bg text-notion-gray-text";
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="rounded-[10px] border border-border bg-card p-4 md:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col h-full min-h-[580px] w-full">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80 mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-notion-gray-text" />
          <h2 className="text-sm md:text-base font-bold text-foreground tracking-tight">
            {getHeaderTitle()}
          </h2>
          <span className="text-[10px] md:text-xs text-muted-foreground font-semibold px-2 py-0.5 bg-muted rounded">
            {events.length} Events
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-end shrink-0">
          {/* Calendar/Kanban Toggles */}
          <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border text-[11px]">
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "px-2.5 py-1 font-semibold rounded-md flex items-center gap-1.5 transition-all",
                viewMode === "calendar"
                  ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              Calendar
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "px-2.5 py-1 font-semibold rounded-md flex items-center gap-1.5 transition-all",
                viewMode === "kanban"
                  ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Board
            </button>
          </div>

          {viewMode === "kanban" && (
            <button
              onClick={() => setIsBoardExpanded(true)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 text-xs font-bold border"
              title="Fullscreen view"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Full Screen</span>
            </button>
          )}

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* Month/Week Switchers */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2 py-1 text-xs font-bold hover:bg-muted text-foreground transition-all rounded"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Filters Row */}
      {viewMode === "kanban" && (
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-border/60 mb-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide shrink-0">Filter:</span>
          {/* Space / Project filter */}
          <Select value={filterSpace} onValueChange={(v) => { setFilterSpace(v); setFilterDatabase("all"); }}>
            <SelectTrigger className="h-7 w-auto min-w-[110px] max-w-[160px] text-[11px] font-semibold rounded-lg border-border/70 bg-muted/40 px-2 focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="All Spaces" />
            </SelectTrigger>
            <SelectContent className="text-[11px]">
              <SelectItem value="all">All Spaces</SelectItem>
              {spaceOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Page / Database filter */}
          <Select value={filterDatabase} onValueChange={setFilterDatabase}>
            <SelectTrigger className="h-7 w-auto min-w-[110px] max-w-[160px] text-[11px] font-semibold rounded-lg border-border/70 bg-muted/40 px-2 focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="All Pages" />
            </SelectTrigger>
            <SelectContent className="text-[11px]">
              <SelectItem value="all">All Pages</SelectItem>
              {databaseOptions.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-7 w-auto min-w-[110px] max-w-[160px] text-[11px] font-semibold rounded-lg border-border/70 bg-muted/40 px-2 focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="text-[11px]">
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Active filter indicator / reset */}
          {(filterSpace !== "all" || filterDatabase !== "all" || filterStatus !== "all") && (
            <button
              onClick={() => { setFilterSpace("all"); setFilterDatabase("all"); setFilterStatus("all"); }}
              className="text-[10px] font-bold text-notion-red-text hover:underline ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* 2. Main Content Body */}
      <div className="flex-1 min-h-0">
        {viewMode === "calendar" ? (
          // ── Calendar Month View ──
          <div className="grid grid-cols-7 h-full text-sm border-t border-l border-border/70 rounded-md overflow-hidden">
            {/* Day name headers */}
            {dayNames.map((name, i) => (
              <div
                key={name}
                className={cn(
                  "py-2 text-center text-xs font-bold text-muted-foreground border-r border-b border-border/70 bg-muted/40",
                  (i === 0 || i === 6) && "text-muted-foreground/75"
                )}
              >
                {name}
              </div>
            ))}

            {/* Grid days */}
            {gridDays.map(({ date, isCurrentMonth }) => {
              const dateKey = formatDateKey(date);
              const dayTasks = eventsByDate.get(dateKey) || [];
              const today = isToday(date);

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => {
                    if (dayTasks.length > 0) {
                      setSelectedDayTasks({ date, tasks: dayTasks });
                    }
                  }}
                  className={cn(
                    "min-h-[75px] md:min-h-[90px] border-r border-b border-border/70 p-1 flex flex-col justify-between transition-colors relative cursor-pointer group",
                    !isCurrentMonth && "bg-muted/10 opacity-40",
                    today && "bg-notion-yellow-bg/20",
                    isCurrentMonth && !today && "hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs font-bold text-muted-foreground px-1 py-0.5 rounded",
                        today && "bg-notion-yellow-text text-white rounded-full font-bold w-5 h-5 flex items-center justify-center text-[10px]"
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] text-muted-foreground font-semibold md:hidden">
                        • {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Tasks list */}
                  <div className="hidden md:flex flex-col gap-1 mt-1.5 overflow-hidden flex-1 select-none">
                    {dayTasks.slice(0, 3).map((task) => {
                      const isDone =
                        task.status?.toLowerCase() === "done" ||
                        task.status?.toLowerCase() === "completed";
                      const isCreatedType =
                        task.datePropertyName?.toLowerCase() === "created date" ||
                        task.datePropertyName?.toLowerCase() === "creation date";

                      return (
                        <div
                          key={task.rowId + task.datePropertyId}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/workspace/${task.pageId}`);
                          }}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border border-border/60 truncate font-semibold leading-relaxed flex items-center gap-1 group/chip transition-all hover:border-ring/30",
                            isDone
                              ? "bg-notion-green-bg/30 text-notion-green-text border-notion-green-text/25"
                              : isCreatedType
                              ? "bg-notion-blue-bg/40 text-notion-blue-text border-notion-blue-text/20"
                              : "bg-notion-gray-bg/60 text-foreground"
                          )}
                          title={`${task.spaceName} / ${task.databaseName} \n${task.taskName} (${task.datePropertyName})`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                          ) : isCreatedType ? (
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          )}
                          <span className={cn("truncate flex-1", isDone && "opacity-80")}>
                            {task.taskName}
                          </span>
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <div className="text-[9px] font-bold text-muted-foreground text-center">
                        + {dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ── Kanban Board View ──
          <div className="flex gap-3 overflow-x-auto pb-4 h-full scrollbar-gutter-stable min-h-[420px] select-none">
            {kanbanColumns.map((col) => {
              const today = isToday(col.date);
              return (
                <div
                  key={col.dateStr}
                  className={cn(
                    "flex flex-col w-[240px] shrink-0 border border-border/80 rounded-xl p-3 h-full transition-colors",
                    today ? "bg-notion-yellow-bg/10 border-notion-yellow-text/20" : "bg-muted/20"
                  )}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
                    <span
                      className={cn(
                        "text-[11px] font-bold flex items-center gap-1.5",
                        today ? "text-notion-yellow-text" : "text-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          today ? "bg-notion-yellow-text" : "bg-notion-blue-text"
                        )}
                        style={{ marginTop: "1px" }}
                      />
                      {col.label}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground px-2 py-0.5 bg-muted rounded-full font-mono">
                      {col.tasks.length}
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-hide pr-0.5 max-h-[360px]">
                    {col.tasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                        <CheckCircle2 className="w-5 h-5 text-muted-foreground mb-1" />
                        <span className="text-[9px] font-semibold text-muted-foreground">Empty</span>
                      </div>
                    ) : (
                      col.tasks.map((task) => {
                        const isDone =
                          task.status?.toLowerCase() === "done" ||
                          task.status?.toLowerCase() === "completed";
                        const isCreatedType =
                          task.datePropertyName?.toLowerCase() === "created date" ||
                          task.datePropertyName?.toLowerCase() === "creation date";

                        return (
                          <div
                            key={task.rowId + task.datePropertyId}
                            onClick={() => router.push(`/workspace/${task.pageId}`)}
                            className="group border border-border bg-card p-2.5 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:shadow-md cursor-pointer transition-all hover:border-ring/30"
                          >
                            {/* Space / DB */}
                            <div className="flex items-center gap-0.5 text-[8.5px] font-bold text-notion-gray-text uppercase tracking-wider mb-1">
                              <span className="truncate max-w-[80px]">{task.spaceName}</span>
                              <span>/</span>
                              <span className="truncate max-w-[80px] text-notion-blue-text">
                                {task.databaseName}
                              </span>
                            </div>

                            {/* Title */}
                            <h4
                              className={cn(
                                "text-[11px] font-bold text-foreground leading-snug tracking-tight mb-2 group-hover:text-primary transition-colors",
                                isDone && "text-muted-foreground opacity-80"
                              )}
                            >
                              {task.taskName}
                            </h4>

                            {/* Footer info */}
                            <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/40 mt-1.5 text-[8.5px]">
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded-full font-bold select-none leading-none scale-95 origin-left",
                                  getStatusClass(task.statusColor)
                                )}
                              >
                                {task.status || "No Status"}
                              </span>
                              <span className="font-semibold text-muted-foreground truncate max-w-[80px]">
                                {task.datePropertyName}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Fullscreen Weekly Kanban Board Overlay */}
      <Dialog open={isBoardExpanded} onOpenChange={setIsBoardExpanded}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-6 rounded-2xl">
          <DialogHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="w-5 h-5 text-notion-blue-text" />
                Fullscreen Weekly Task Planner
              </DialogTitle>
              <DialogDescription className="text-xs">
                Manage your tasks day-by-day across all workspace projects.
              </DialogDescription>
            </div>

            {/* Navigation Controls inside Dialog */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-auto select-none pr-10">
              {/* Filters — Space, Page, Status */}
              <Select value={filterSpace} onValueChange={(v) => { setFilterSpace(v); setFilterDatabase("all"); }}>
                <SelectTrigger className="h-7 w-auto min-w-[110px] max-w-[150px] text-[11px] font-semibold rounded-lg border-border/70 bg-muted/40 px-2 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="All Spaces" />
                </SelectTrigger>
                <SelectContent className="text-[11px]">
                  <SelectItem value="all">All Spaces</SelectItem>
                  {spaceOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterDatabase} onValueChange={setFilterDatabase}>
                <SelectTrigger className="h-7 w-auto min-w-[110px] max-w-[150px] text-[11px] font-semibold rounded-lg border-border/70 bg-muted/40 px-2 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="All Pages" />
                </SelectTrigger>
                <SelectContent className="text-[11px]">
                  <SelectItem value="all">All Pages</SelectItem>
                  {databaseOptions.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-7 w-auto min-w-[110px] max-w-[150px] text-[11px] font-semibold rounded-lg border-border/70 bg-muted/40 px-2 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="text-[11px]">
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(filterSpace !== "all" || filterDatabase !== "all" || filterStatus !== "all") && (
                <button
                  onClick={() => { setFilterSpace("all"); setFilterDatabase("all"); setFilterStatus("all"); }}
                  className="text-[10px] font-bold text-notion-red-text hover:underline"
                >
                  Clear
                </button>
              )}

              <div className="w-px h-5 bg-border mx-1" />

              {/* Week pill */}
              <span className="text-xs font-bold text-foreground bg-muted px-3 py-1.5 rounded-lg border border-border font-mono">
                {getHeaderTitle()}
              </span>
              <div className="flex items-center gap-1 border rounded-lg bg-card p-0.5">
                <button
                  onClick={handlePrev}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToday}
                  className="px-2.5 py-1 text-xs font-bold hover:bg-muted text-foreground transition-all rounded"
                >
                  Today
                </button>
                <button
                  onClick={handleNext}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Kanban Grid Container (fills dialog) */}
          <div className="flex-1 min-h-0 overflow-x-auto pb-4 pt-4 select-none flex gap-4 scrollbar-gutter-stable">
            {kanbanColumns.map((col) => {
              const today = isToday(col.date);
              return (
                <div
                  key={col.dateStr}
                  className={cn(
                    "flex flex-col w-[260px] md:w-[280px] shrink-0 border border-border/80 rounded-2xl p-4 h-full transition-colors",
                    today ? "bg-notion-yellow-bg/10 border-notion-yellow-text/20" : "bg-muted/20"
                  )}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-border/65 mb-4">
                    <span
                      className={cn(
                        "text-xs font-bold flex items-center gap-1.5",
                        today ? "text-notion-yellow-text" : "text-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          today ? "bg-notion-yellow-text" : "bg-notion-blue-text"
                        )}
                        style={{ marginTop: "1px" }}
                      />
                      {col.label}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground px-2 py-0.5 bg-muted rounded-full font-mono">
                      {col.tasks.length}
                    </span>
                  </div>

                  {/* Scrollable Card Container */}
                  <div className="flex-1 flex flex-col gap-3 overflow-y-auto scrollbar-hide pr-0.5">
                    {col.tasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-35">
                        <CheckCircle2 className="w-6 h-6 text-muted-foreground mb-1" />
                        <span className="text-[10px] font-medium text-muted-foreground">Empty</span>
                      </div>
                    ) : (
                      col.tasks.map((task) => {
                        const isDone =
                          task.status?.toLowerCase() === "done" ||
                          task.status?.toLowerCase() === "completed";
                        const isCreatedType =
                          task.datePropertyName?.toLowerCase() === "created date" ||
                          task.datePropertyName?.toLowerCase() === "creation date";

                        return (
                          <div
                            key={task.rowId + task.datePropertyId}
                            onClick={() => {
                              setIsBoardExpanded(false);
                              router.push(`/workspace/${task.pageId}`);
                            }}
                            className="group border border-border bg-card p-3.5 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.015)] hover:shadow-lg cursor-pointer transition-all hover:border-ring/30"
                          >
                            {/* Space / Database */}
                            <div className="flex items-center gap-1 text-[9px] font-bold text-notion-gray-text uppercase tracking-wider mb-1.5">
                              <span className="truncate max-w-[100px]">{task.spaceName}</span>
                              <span>/</span>
                              <span className="truncate max-w-[100px] text-notion-blue-text">
                                {task.databaseName}
                              </span>
                            </div>

                            {/* Task name */}
                            <h4
                              className={cn(
                                "text-xs font-bold text-foreground leading-snug tracking-tight mb-3 group-hover:text-primary transition-colors",
                                isDone && "text-muted-foreground opacity-80"
                              )}
                            >
                              {task.taskName}
                            </h4>

                            {/* Status and date labels */}
                            <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-border/40 mt-2">
                              <span
                                className={cn(
                                  "text-[9px] px-2 py-0.5 rounded-full font-bold select-none leading-none",
                                  getStatusClass(task.statusColor)
                                )}
                              >
                                {task.status || "No Status"}
                              </span>
                              <span className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1">
                                {isCreatedType ? (
                                  <Clock className="w-2.5 h-2.5 text-notion-blue-text" />
                                ) : (
                                  <CheckCircle2 className="w-2.5 h-2.5 text-notion-green-text" />
                                )}
                                {task.datePropertyName}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Day Details Dialog (Month Grid cell click) */}
      <Dialog
        open={selectedDayTasks !== null}
        onOpenChange={(open) => !open && setSelectedDayTasks(null)}
      >
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-5 rounded-2xl">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-notion-blue-text" />
              Tasks for{" "}
              {selectedDayTasks?.date.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review all activities scheduled on this day across databases.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 space-y-2 mt-2 pr-1">
            {selectedDayTasks?.tasks.map((task) => {
              const isDone =
                task.status?.toLowerCase() === "done" ||
                task.status?.toLowerCase() === "completed";
              const isCreatedType =
                task.datePropertyName?.toLowerCase() === "created date" ||
                task.datePropertyName?.toLowerCase() === "creation date";

              return (
                <div
                  key={task.rowId + task.datePropertyId}
                  onClick={() => {
                    setSelectedDayTasks(null);
                    router.push(`/workspace/${task.pageId}`);
                  }}
                  className="flex items-start justify-between p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/30 cursor-pointer transition-all hover:border-ring/30 group"
                >
                  <div className="flex flex-col gap-1 pr-4 min-w-0">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">
                      <Briefcase className="w-2.5 h-2.5 text-muted-foreground" />
                      <span>{task.spaceName}</span>
                      <span>/</span>
                      <span className="text-notion-blue-text">{task.databaseName}</span>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-bold leading-normal text-foreground group-hover:text-primary",
                        isDone && "text-muted-foreground opacity-80"
                      )}
                    >
                      {task.taskName}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                      {isCreatedType ? (
                        <Clock className="w-2.5 h-2.5 text-notion-blue-text" />
                      ) : (
                        <CheckCircle2 className="w-2.5 h-2.5 text-notion-green-text" />
                      )}
                      {task.datePropertyName}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "text-[9px] px-2 py-0.5 rounded-full font-bold select-none leading-none",
                        getStatusClass(task.statusColor)
                      )}
                    >
                      {task.status || "No Status"}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
