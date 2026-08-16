/**
 * Shared vocabulary for the Task Calendar.
 *
 * The event stream comes from `overview.getWorkspaceCalendarTasks`, which walks
 * every database page in the workspace and emits one entry per (row × date
 * property). A single task row therefore appears more than once when it carries
 * both a "Created Date" and a "Completed Date" — that is intentional, and it is
 * why `datePropertyId` is part of every React key.
 */

export interface TaskEvent {
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

export type CalendarView = "month" | "week" | "day" | "board";

export const CALENDAR_VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
  { value: "board", label: "Board" },
];

/** Stable identity for one rendered event. */
export const eventKey = (task: TaskEvent) => `${task.rowId}:${task.datePropertyId}`;

/* ── Dates ───────────────────────────────────────────────────────────────── */

/** Local-timezone "YYYY-MM-DD". Never toISOString() — that shifts to UTC. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Sunday-start, matching the week the dashboard widget has always shown. */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export const isToday = (date: Date) => isSameDay(date, new Date());

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const MONTH_LONG = [
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
export const MONTH_SHORT = MONTH_LONG.map((m) => m.slice(0, 3));

/** "Today", "Tomorrow", "Yesterday", else "16 Aug". */
export function relativeDayLabel(date: Date): string {
  const today = new Date();
  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, addDays(today, -1))) return "Yesterday";
  if (isSameDay(date, addDays(today, 1))) return "Tomorrow";
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

/** The heading for the current range, e.g. "August 2026" or "10 – 16 Aug 2026". */
export function rangeLabel(view: CalendarView, anchor: Date): string {
  if (view === "month") return `${MONTH_LONG[anchor.getMonth()]} ${anchor.getFullYear()}`;
  if (view === "day") {
    return `${DAY_LONG[anchor.getDay()]}, ${anchor.getDate()} ${MONTH_SHORT[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }
  const start = startOfWeek(anchor);
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`;
}

/** The 42-cell month grid, Sunday-first, including leading/trailing spill. */
export function monthGridDays(anchor: Date): { date: Date; inMonth: boolean }[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(gridStart, i);
    return { date, inMonth: date.getMonth() === anchor.getMonth() };
  });
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/* ── Tone ────────────────────────────────────────────────────────────────── */

/**
 * What the event actually represents. Derived in one place so a task reads the
 * same in the month cell, the week column, the board card, and the detail
 * sheet — previously this conditional was re-implemented at each call site and
 * had already drifted between them.
 */
export type TaskTone = "done" | "created" | "scheduled";

export function taskTone(task: TaskEvent): TaskTone {
  const status = task.status?.toLowerCase();
  if (status === "done" || status === "completed") return "done";

  const prop = task.datePropertyName?.toLowerCase() ?? "";
  if (task.datePropertyType === "created_time" || prop === "created date" || prop === "creation date") {
    return "created";
  }
  return "scheduled";
}

export const TONE_LABEL: Record<TaskTone, string> = {
  done: "Completed",
  created: "Created",
  scheduled: "Scheduled",
};

/** Compact chip used inside month cells and week columns. */
export const TONE_CHIP: Record<TaskTone, string> = {
  done: "border-notion-green-text/25 bg-notion-green-bg/40 text-notion-green-text",
  created: "border-notion-blue-text/20 bg-notion-blue-bg/40 text-notion-blue-text",
  scheduled: "border-border/60 bg-notion-gray-bg/50 text-foreground",
};

/** Left accent rule on board cards and agenda rows. */
export const TONE_RULE: Record<TaskTone, string> = {
  done: "bg-notion-green-text",
  created: "bg-notion-blue-text",
  scheduled: "bg-notion-orange-text",
};

export const TONE_DOT: Record<TaskTone, string> = {
  done: "bg-notion-green-text",
  created: "bg-notion-blue-text",
  scheduled: "bg-notion-orange-text",
};

/* ── Status pills ────────────────────────────────────────────────────────── */

const STATUS_COLOR_CLASS: Record<string, string> = {
  gray: "bg-notion-gray-bg text-notion-gray-text",
  brown: "bg-notion-brown-bg text-notion-brown-text",
  orange: "bg-notion-orange-bg text-notion-orange-text",
  yellow: "bg-notion-yellow-bg text-notion-yellow-text",
  green: "bg-notion-green-bg text-notion-green-text",
  blue: "bg-notion-blue-bg text-notion-blue-text",
  purple: "bg-notion-purple-bg text-notion-purple-text",
  pink: "bg-notion-pink-bg text-notion-pink-text",
  red: "bg-notion-red-bg text-notion-red-text",
};

export function statusClass(colorName: string | null): string {
  if (!colorName) return STATUS_COLOR_CLASS.gray;
  return STATUS_COLOR_CLASS[colorName.toLowerCase()] ?? STATUS_COLOR_CLASS.gray;
}

/* ── Grouping ────────────────────────────────────────────────────────────── */

/**
 * True when the stored value was a bare calendar date rather than a datetime.
 *
 * `Date.parse("2026-08-16")` is specified to yield UTC midnight, so a bare date
 * is detectable by having no UTC time component. A real datetime that lands
 * exactly on UTC midnight is misread here, which is both rare and harmless.
 */
export function isDateOnly(timestamp: number): boolean {
  const d = new Date(timestamp);
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

/**
 * The calendar day an event belongs to.
 *
 * Bare dates are read back in UTC, because that is the frame they were parsed
 * in — reading them locally shifts them a day for any negative UTC offset.
 * Real datetimes are read locally, which is what the user means by "the day
 * this happened".
 */
export function eventDateKey(task: TaskEvent): string {
  const d = new Date(task.timestamp);
  if (isDateOnly(task.timestamp)) {
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${d.getUTCFullYear()}-${m}-${day}`;
  }
  return toDateKey(d);
}

/** Buckets events by calendar day, each bucket sorted chronologically. */
export function groupByDate(events: TaskEvent[]): Map<string, TaskEvent[]> {
  const map = new Map<string, TaskEvent[]>();
  for (const event of events) {
    const key = eventDateKey(event);
    const bucket = map.get(key);
    if (bucket) bucket.push(event);
    else map.set(key, [event]);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => a.timestamp - b.timestamp);
  }
  return map;
}

/** Only show a clock time when the property actually carries one. */
export function hasMeaningfulTime(task: TaskEvent): boolean {
  return !isDateOnly(task.timestamp);
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}
