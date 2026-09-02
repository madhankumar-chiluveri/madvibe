"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CALENDAR_VIEWS,
  MONTH_SHORT,
  rangeLabel,
  type CalendarView,
} from "@/components/tasks/task-event";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";

export interface TaskFilters {
  space: string;
  database: string;
  status: string;
  dateType: string;
}

export const DEFAULT_FILTERS: TaskFilters = {
  space: "all",
  database: "all",
  status: "all",
  dateType: "Completed Date",
};

export const EMPTY_FILTERS: TaskFilters = {
  space: "all",
  database: "all",
  status: "all",
  dateType: "all",
};

export const hasActiveFilters = (f: TaskFilters) =>
  f.space !== DEFAULT_FILTERS.space ||
  f.database !== DEFAULT_FILTERS.database ||
  f.status !== DEFAULT_FILTERS.status ||
  f.dateType !== DEFAULT_FILTERS.dateType;

export const activeFilterCount = (f: TaskFilters) =>
  (f.space !== DEFAULT_FILTERS.space ? 1 : 0) +
  (f.database !== DEFAULT_FILTERS.database ? 1 : 0) +
  (f.status !== DEFAULT_FILTERS.status ? 1 : 0) +
  (f.dateType !== DEFAULT_FILTERS.dateType ? 1 : 0);

/* ── Jump to month ───────────────────────────────────────────────────────── */

function DateJump({ anchor, onPick }: { anchor: Date; onPick: (date: Date) => void }) {
  const [year, setYear] = useState(anchor.getFullYear());

  return (
    <div className="w-[248px] p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setYear((y) => y - 1)}
          aria-label="Previous year"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold tabular-nums text-foreground">{year}</span>
        <button
          onClick={() => setYear((y) => y + 1)}
          aria-label="Next year"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTH_SHORT.map((label, index) => {
          const selected = year === anchor.getFullYear() && index === anchor.getMonth();
          return (
            <button
              key={label}
              onClick={() => onPick(new Date(year, index, 1))}
              aria-pressed={selected}
              className={cn(
                "h-9 rounded-lg text-xs font-bold transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Filters ─────────────────────────────────────────────────────────────── */

function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full min-w-[130px] rounded-lg border-border/70 bg-muted/40 px-2.5 text-[12px] font-semibold focus:ring-0 focus:ring-offset-0 sm:w-auto sm:max-w-[170px]">
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent className="text-[12px]">
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TaskFilterBar({
  filters,
  onChange,
  spaceOptions,
  databaseOptions,
  statusOptions,
  dateTypeOptions,
}: {
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
  spaceOptions: string[];
  databaseOptions: string[];
  statusOptions: string[];
  dateTypeOptions: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        value={filters.space}
        allLabel="All spaces"
        options={spaceOptions}
        // Changing space invalidates the database list, so reset it together.
        onChange={(space) => onChange({ ...filters, space, database: "all" })}
      />
      <FilterSelect
        value={filters.database}
        allLabel="All databases"
        options={databaseOptions}
        onChange={(database) => onChange({ ...filters, database })}
      />
      <FilterSelect
        value={filters.status}
        allLabel="All statuses"
        options={statusOptions}
        onChange={(status) => onChange({ ...filters, status })}
      />
      <FilterSelect
        value={filters.dateType}
        allLabel="All date types"
        options={dateTypeOptions}
        onChange={(dateType) => onChange({ ...filters, dateType })}
      />
      {hasActiveFilters(filters) && (
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-notion-red-text transition-colors hover:bg-muted"
        >
          <X className="h-3 w-3" />
          Reset
        </button>
      )}
    </div>
  );
}

/* ── Toolbar ─────────────────────────────────────────────────────────────── */

export function TaskToolbar({
  view,
  onViewChange,
  anchor,
  onAnchorChange,
  onToday,
  onPrev,
  onNext,
  visibleCount,
  filtersOpen,
  onFiltersOpenChange,
  filterCount,
}: {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  anchor: Date;
  onAnchorChange: (date: Date) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  visibleCount: number;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  filterCount: number;
}) {
  const [jumpOpen, setJumpOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-baseline gap-2">
        <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
          Task Calendar
        </h1>
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">
          ({visibleCount})
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Range navigation */}
        <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card p-0.5">
          <button
            onClick={onToday}
            className="h-9 rounded-lg px-3 text-xs font-bold text-foreground transition-colors hover:bg-muted"
          >
            Today
          </button>
          <button
            onClick={onPrev}
            aria-label="Previous range"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <Popover open={jumpOpen} onOpenChange={setJumpOpen}>
            <PopoverTrigger asChild>
              <button className="h-9 whitespace-nowrap rounded-lg px-2 text-[13px] font-bold text-foreground transition-colors hover:bg-muted">
                {rangeLabel(view, anchor)}
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-auto p-0">
              <DateJump
                anchor={anchor}
                onPick={(date) => {
                  onAnchorChange(date);
                  setJumpOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          <button
            onClick={onNext}
            aria-label="Next range"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* View switch */}
        <div
          role="tablist"
          aria-label="Calendar view"
          className="flex items-center gap-0.5 rounded-xl border border-border bg-muted/50 p-0.5"
        >
          {CALENDAR_VIEWS.map((option) => {
            const selected = view === option.value;
            return (
              <button
                key={option.value}
                role="tab"
                aria-selected={selected}
                onClick={() => onViewChange(option.value)}
                className={cn(
                  "h-9 rounded-lg px-2.5 text-xs font-bold transition-colors sm:px-3",
                  selected
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => onFiltersOpenChange(!filtersOpen)}
          aria-expanded={filtersOpen}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors",
            filtersOpen || filterCount > 0
              ? "border-ring/30 bg-muted text-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {filterCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold tabular-nums text-primary-foreground">
              {filterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
