"use client";

import { cn } from "@/lib/utils";
import {
  DAY_SHORT,
  MONTH_SHORT,
  TONE_CHIP,
  TONE_DOT,
  TONE_LABEL,
  TONE_RULE,
  eventKey,
  formatTime,
  hasMeaningfulTime,
  isToday,
  monthGridDays,
  relativeDayLabel,
  statusClass,
  taskTone,
  toDateKey,
  weekDays,
  type TaskEvent,
} from "@/components/tasks/task-event";
import { CalendarOff, Inbox } from "lucide-react";

type Grouped = Map<string, TaskEvent[]>;

interface ViewProps {
  anchor: Date;
  grouped: Grouped;
  onSelect: (task: TaskEvent) => void;
  onDrillDown: (date: Date) => void;
}

/* ── Shared pieces ───────────────────────────────────────────────────────── */

/** Compact chip — month cells, where vertical space is the constraint. */
function TaskChip({ task, onSelect }: { task: TaskEvent; onSelect: () => void }) {
  const tone = taskTone(task);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      title={`${task.spaceName} / ${task.databaseName}\n${task.taskName} · ${task.datePropertyName}`}
      className={cn(
        "flex w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 text-left text-[10px] font-semibold leading-relaxed transition-colors hover:brightness-[0.97]",
        TONE_CHIP[tone]
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[tone])} />
      <span className="truncate">{task.taskName}</span>
    </button>
  );
}

/** Medium row — week columns and the day agenda. */
function TaskRow({
  task,
  onSelect,
  showMeta = true,
}: {
  task: TaskEvent;
  onSelect: () => void;
  showMeta?: boolean;
}) {
  const tone = taskTone(task);
  return (
    <button
      onClick={onSelect}
      className="group flex w-full gap-2 rounded-lg border border-border/70 bg-card p-2 text-left transition-colors hover:border-ring/30 hover:bg-muted/30"
    >
      <span className={cn("w-0.5 shrink-0 self-stretch rounded-full", TONE_RULE[tone])} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[11.5px] font-bold leading-snug text-foreground">
            {task.taskName}
          </span>
          {hasMeaningfulTime(task) && (
            <span className="shrink-0 text-[10px] font-bold tabular-nums text-muted-foreground">
              {formatTime(task.timestamp)}
            </span>
          )}
        </span>
        {showMeta && (
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none",
                statusClass(task.statusColor)
              )}
            >
              {task.status || "No status"}
            </span>
            <span className="truncate text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              {task.datePropertyName}
            </span>
          </span>
        )}
      </span>
    </button>
  );
}

/** Full card — board columns, where horizontal space is generous. */
function TaskCard({ task, onSelect }: { task: TaskEvent; onSelect: () => void }) {
  const tone = taskTone(task);
  return (
    <button
      onClick={onSelect}
      className="group flex w-full gap-2.5 rounded-xl border border-border bg-card p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:border-ring/30 hover:shadow-md"
    >
      <span className={cn("w-0.5 shrink-0 self-stretch rounded-full", TONE_RULE[tone])} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 truncate text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          <span className="truncate">{task.spaceName}</span>
          <span aria-hidden="true">/</span>
          <span className="truncate text-notion-blue-text">{task.databaseName}</span>
        </span>
        <span className="mt-1 block text-[11.5px] font-bold leading-snug text-foreground group-hover:text-primary">
          {task.taskName}
        </span>
        <span className="mt-2 flex items-center justify-between gap-1.5 border-t border-border/40 pt-2">
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none",
              statusClass(task.statusColor)
            )}
          >
            {task.status || "No status"}
          </span>
          <span className="truncate text-[9px] font-semibold text-muted-foreground">
            {task.datePropertyName}
          </span>
        </span>
      </span>
    </button>
  );
}

function EmptyColumn({ label = "Nothing here" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-10 opacity-40">
      <Inbox className="h-4 w-4 text-muted-foreground" />
      <span className="text-[9px] font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}

/* ── Month ───────────────────────────────────────────────────────────────── */

export function MonthView({ anchor, grouped, onSelect, onDrillDown }: ViewProps) {
  const cells = monthGridDays(anchor);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-7 border-b border-border/70 bg-muted/40">
        {DAY_SHORT.map((name, i) => (
          <div
            key={name}
            className={cn(
              "border-r border-border/70 py-2 text-center text-[11px] font-bold text-muted-foreground last:border-r-0",
              (i === 0 || i === 6) && "text-muted-foreground/70"
            )}
          >
            <span className="hidden sm:inline">{name}</span>
            <span className="sm:hidden">{name.charAt(0)}</span>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {cells.map(({ date, inMonth }) => {
          const key = toDateKey(date);
          const dayTasks = grouped.get(key) ?? [];
          const today = isToday(date);
          const visible = dayTasks.slice(0, 3);
          const more = dayTasks.length - visible.length;

          return (
            <div
              key={key}
              className={cn(
                "flex min-h-0 flex-col overflow-hidden border-b border-r border-border/70 p-1 transition-colors",
                !inMonth && "bg-muted/20",
                today && "bg-notion-yellow-bg/25",
                inMonth && !today && "hover:bg-muted/25"
              )}
            >
              <div className="flex shrink-0 items-center justify-between">
                <button
                  onClick={() => onDrillDown(date)}
                  aria-label={`Open ${date.toDateString()}`}
                  className={cn(
                    "rounded px-1 text-[11px] font-bold transition-colors hover:bg-muted",
                    today &&
                      "flex h-5 w-5 items-center justify-center rounded-full bg-notion-yellow-text px-0 text-[10px] text-white",
                    !inMonth && !today && "text-muted-foreground/50",
                    inMonth && !today && "text-foreground"
                  )}
                >
                  {date.getDate()}
                </button>
                {dayTasks.length > 0 && (
                  <span className="rounded bg-muted px-1 text-[9px] font-bold tabular-nums text-muted-foreground md:hidden">
                    {dayTasks.length}
                  </span>
                )}
              </div>

              <div className="mt-1 hidden min-h-0 flex-1 flex-col gap-0.5 overflow-hidden md:flex">
                {visible.map((task) => (
                  <TaskChip
                    key={eventKey(task)}
                    task={task}
                    onSelect={() => onSelect(task)}
                  />
                ))}
                {more > 0 && (
                  <button
                    onClick={() => onDrillDown(date)}
                    className="px-1 text-left text-[9.5px] font-bold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    +{more} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Week ────────────────────────────────────────────────────────────────── */

export function WeekView({ anchor, grouped, onSelect, onDrillDown }: ViewProps) {
  const days = weekDays(anchor);

  return (
    <div className="flex h-full gap-2 overflow-x-auto p-2">
      {days.map((date) => {
        const key = toDateKey(date);
        const dayTasks = grouped.get(key) ?? [];
        const today = isToday(date);

        return (
          <div
            key={key}
            className={cn(
              // A min-width floor rather than shrink-0 + flex-1: those set
              // flex-shrink from two tailwind-merge groups, so neither reliably
              // wins. Below sm the floor forces horizontal scroll; at sm+ the
              // floor lifts and the seven columns divide the width evenly.
              "flex h-full min-w-[168px] flex-1 flex-col rounded-xl border sm:min-w-0",
              today
                ? "border-notion-yellow-text/25 bg-notion-yellow-bg/10"
                : "border-border/70 bg-muted/15"
            )}
          >
            <button
              onClick={() => onDrillDown(date)}
              className="flex shrink-0 items-center justify-between gap-1 border-b border-border/60 px-2.5 py-2 text-left transition-colors hover:bg-muted/40"
            >
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[10px] font-bold uppercase tracking-wider",
                    today ? "text-notion-yellow-text" : "text-muted-foreground"
                  )}
                >
                  {DAY_SHORT[date.getDay()]}
                </span>
                <span className="block truncate text-[12px] font-bold text-foreground">
                  {date.getDate()} {MONTH_SHORT[date.getMonth()]}
                </span>
              </span>
              {dayTasks.length > 0 && (
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                  {dayTasks.length}
                </span>
              )}
            </button>

            <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-1.5">
              {dayTasks.length === 0 ? (
                <EmptyColumn />
              ) : (
                dayTasks.map((task) => (
                  <TaskRow
                    key={eventKey(task)}
                    task={task}
                    onSelect={() => onSelect(task)}
                    showMeta={false}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Day ─────────────────────────────────────────────────────────────────── */

export function DayView({ anchor, grouped, onSelect }: ViewProps) {
  const key = toDateKey(anchor);
  const dayTasks = grouped.get(key) ?? [];

  if (dayTasks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <CalendarOff className="h-7 w-7 text-muted-foreground/50" />
        <div>
          <h3 className="text-sm font-bold text-foreground">
            Nothing on {relativeDayLabel(anchor).toLowerCase()}
          </h3>
          <p className="mx-auto mt-1 max-w-[38ch] text-xs font-medium text-muted-foreground">
            No task in this workspace carries a date on{" "}
            {anchor.toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.
          </p>
        </div>
      </div>
    );
  }

  // Grouped by which date property put the task on this day — the only
  // meaningful axis when the events themselves are date-only.
  const byProperty = new Map<string, TaskEvent[]>();
  for (const task of dayTasks) {
    const bucket = byProperty.get(task.datePropertyName);
    if (bucket) bucket.push(task);
    else byProperty.set(task.datePropertyName, [task]);
  }

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4">
      <div className="mx-auto max-w-2xl space-y-5">
        {[...byProperty.entries()].map(([propertyName, tasks]) => (
          <section key={propertyName}>
            <div className="mb-2 flex items-center gap-2 px-0.5">
              <span
                className={cn("h-2 w-2 rounded-full", TONE_DOT[taskTone(tasks[0])])}
              />
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {propertyName}
              </h3>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                {tasks.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {tasks.map((task) => (
                <TaskRow key={eventKey(task)} task={task} onSelect={() => onSelect(task)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ── Board ───────────────────────────────────────────────────────────────── */

export function BoardView({ anchor, grouped, onSelect, onDrillDown }: ViewProps) {
  const days = weekDays(anchor);

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-3">
      {days.map((date) => {
        const key = toDateKey(date);
        const dayTasks = grouped.get(key) ?? [];
        const today = isToday(date);

        return (
          <div
            key={key}
            className={cn(
              "flex h-full w-[248px] shrink-0 flex-col rounded-2xl border p-3",
              today
                ? "border-notion-yellow-text/25 bg-notion-yellow-bg/10"
                : "border-border/80 bg-muted/20"
            )}
          >
            <button
              onClick={() => onDrillDown(date)}
              className="mb-3 flex shrink-0 items-center justify-between gap-2 border-b border-border/60 pb-2.5 text-left"
            >
              <span
                className={cn(
                  "flex items-center gap-1.5 text-[11px] font-bold",
                  today ? "text-notion-yellow-text" : "text-foreground"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    today ? "bg-notion-yellow-text" : "bg-notion-blue-text"
                  )}
                />
                {relativeDayLabel(date)} ({DAY_SHORT[date.getDay()]})
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                {dayTasks.length}
              </span>
            </button>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
              {dayTasks.length === 0 ? (
                <EmptyColumn label="Empty" />
              ) : (
                dayTasks.map((task) => (
                  <TaskCard key={eventKey(task)} task={task} onSelect={() => onSelect(task)} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Legend ──────────────────────────────────────────────────────────────── */

/** Colour alone never carries the meaning — the legend names each tone. */
export function ToneLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {(["scheduled", "created", "done"] as const).map((tone) => (
        <span
          key={tone}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground"
        >
          <span className={cn("h-2 w-2 rounded-full", TONE_DOT[tone])} />
          {TONE_LABEL[tone]}
        </span>
      ))}
    </div>
  );
}
