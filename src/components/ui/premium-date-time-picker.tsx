"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

type PickerMode = "date" | "datetime";
type PickerVariant = "cell" | "input";
type TimeDraft = {
  hour: string;
  minute: string;
  period: "AM" | "PM";
};

interface PremiumDateTimePickerProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  mode?: PickerMode;
  variant?: PickerVariant;
  placeholder?: string;
  align?: "start" | "center" | "end";
  className?: string;
  popoverClassName?: string;
  disabled?: boolean;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTriggerValue(date: Date, mode: PickerMode) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...(mode === "datetime"
      ? {
        hour: "numeric",
        minute: "2-digit",
      }
      : {}),
  }).format(date);
}

function formatTimeValue(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getTimeParts(date?: Date) {
  const base = date ?? new Date();
  const hours = base.getHours();

  return {
    hour: String((hours % 12) || 12),
    minute: pad2(base.getMinutes()),
    period: hours >= 12 ? "PM" : "AM",
  } as const;
}

function withLocalDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function withTime(date: Date, hourText: string, minuteText: string, period: "AM" | "PM") {
  const hourValue = Number(hourText);
  const minuteValue = Number(minuteText);
  const safeHour = Number.isFinite(hourValue) ? Math.min(12, Math.max(1, hourValue)) : 12;
  const safeMinute = Number.isFinite(minuteValue) ? Math.min(59, Math.max(0, minuteValue)) : 0;
  const normalizedHour = (safeHour % 12) + (period === "PM" ? 12 : 0);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    normalizedHour,
    safeMinute
  );
}

function normalizeTimeDraft(draft: TimeDraft, fallbackDate?: Date) {
  return getTimeParts(
    withTime(withLocalDate(fallbackDate ?? new Date()), draft.hour, draft.minute, draft.period)
  );
}

function sanitizeTimeDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 2);
}

function stepTimeDraft(draft: TimeDraft, part: "hour" | "minute", delta: number) {
  const base = withTime(new Date(2026, 0, 1), draft.hour, draft.minute, draft.period);

  if (part === "hour") {
    base.setHours(base.getHours() + delta);
  } else {
    base.setMinutes(base.getMinutes() + delta);
  }

  return getTimeParts(base);
}

export function PremiumDateTimePicker({
  value,
  onChange,
  mode = "date",
  variant = "cell",
  placeholder = "Empty",
  align = "start",
  className,
  popoverClassName,
  disabled = false,
}: PremiumDateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(
    () => (value === null || value === undefined ? undefined : new Date(value)),
    [value]
  );
  const [month, setMonth] = useState<Date>(selectedDate ?? new Date());
  const [timeDraft, setTimeDraft] = useState<TimeDraft>(() => getTimeParts(selectedDate));
  const [activeTab, setActiveTab] = useState<"date" | "time">("date");

  useEffect(() => {
    if (!open) {
      setActiveTab("date");
      return;
    }

    setMonth(selectedDate ?? new Date());
    setTimeDraft(getTimeParts(selectedDate));
  }, [open, selectedDate]);

  const updateValue = (nextDate: Date | null) => {
    onChange(nextDate ? nextDate.getTime() : null);
    if (nextDate) {
      setMonth(nextDate);
    }
  };

  const handleDateSelect = (day?: Date) => {
    if (!day) return;

    if (mode === "date") {
      updateValue(withLocalDate(day));
      return;
    }

    const nextBase = withLocalDate(day);
    const normalizedDraft = normalizeTimeDraft(timeDraft, selectedDate ?? day);
    setTimeDraft(normalizedDraft);
    updateValue(withTime(nextBase, normalizedDraft.hour, normalizedDraft.minute, normalizedDraft.period));
    setActiveTab("time");
  };

  const applyTimeDraft = (draft = timeDraft) => {
    if (!selectedDate) {
      return;
    }

    const normalizedDraft = normalizeTimeDraft(draft, selectedDate);
    setTimeDraft(normalizedDraft);
    updateValue(
      withTime(
        withLocalDate(selectedDate),
        normalizedDraft.hour,
        normalizedDraft.minute,
        normalizedDraft.period
      )
    );
  };

  const handleTimeInputChange = (part: "hour" | "minute", rawValue: string) => {
    setTimeDraft((current) => ({
      ...current,
      [part]: sanitizeTimeDigits(rawValue),
    }));
  };

  const handleTimeInputKeyDown =
    (part: "hour" | "minute") => (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyTimeDraft();
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const nextDraft = stepTimeDraft(timeDraft, part, event.key === "ArrowUp" ? 1 : -1);
        setTimeDraft(nextDraft);
        applyTimeDraft(nextDraft);
      }
    };

  const handlePeriodSelect = (period: "AM" | "PM") => {
    const nextDraft = {
      ...timeDraft,
      period,
    } satisfies TimeDraft;

    setTimeDraft(nextDraft);
    applyTimeDraft(nextDraft);
  };

  const triggerClasses =
    variant === "input"
      ? "flex h-10 w-full items-center gap-3 rounded-xl border border-white/10 bg-[#181715] px-3 text-left text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:bg-[#1d1c1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/15"
      : "flex min-h-[38px] items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/10";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            triggerClasses,
            !selectedDate && "text-zinc-500",
            disabled && "cursor-not-allowed opacity-60",
            className
          )}
        >
          <CalendarDays
            className={cn(
              "shrink-0 text-zinc-500",
              variant === "input" ? "h-4 w-4" : "h-3.5 w-3.5"
            )}
          />
          <span className="min-w-0 truncate">
            {selectedDate ? formatTriggerValue(selectedDate, mode) : placeholder}
          </span>
        </button>
      </DialogTrigger>

      <DialogContent
        title="Date and Time Picker"
        hideTitleVisually
        className={cn(
          "w-[min(100vw-1.5rem,340px)] overflow-hidden border-white/10 bg-[#242321] p-0 shadow-2xl text-zinc-100 sm:rounded-[24px] [&>button.absolute]:hidden",
          popoverClassName
        )}
      >
        <div className="flex flex-col gap-3 bg-[#242321] p-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
                  {mode === "datetime" ? "Selected Date & Time" : "Selected Date"}
                </div>
                <div
                  className={cn(
                    "mt-1 truncate text-sm font-semibold",
                    selectedDate ? "text-zinc-100" : "text-zinc-500"
                  )}
                >
                  {selectedDate
                    ? formatTriggerValue(selectedDate, mode)
                    : mode === "datetime"
                      ? "Choose a date, then set a custom time"
                      : "Choose a date"}
                </div>
              </div>

              {mode === "datetime" && (
                <div className="rounded-xl border border-white/10 bg-[#181715] px-3 py-2 text-sm font-semibold tabular-nums text-zinc-100">
                  {selectedDate ? formatTimeValue(selectedDate) : "--:--"}
                </div>
              )}
            </div>
          </div>

          {mode === "datetime" && (
            <div className="flex rounded-xl bg-white/[0.05] p-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("date")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-[13px] font-medium transition-colors",
                  activeTab === "date"
                    ? "bg-white/[0.1] text-zinc-100 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Date
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("time")}
                disabled={!selectedDate}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-[13px] font-medium transition-colors",
                  activeTab === "time"
                    ? "bg-white/[0.1] text-zinc-100 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300",
                  !selectedDate && "cursor-not-allowed opacity-50"
                )}
              >
                Time
              </button>
            </div>
          )}

          <div className="relative">
            <div className={cn("grid gap-3 transition-opacity", activeTab === "time" && "hidden")}>
              <div className="rounded-2xl border border-white/8 bg-[#1c1b19] p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="text-sm font-semibold text-zinc-100">
                    {formatMonthLabel(month)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  month={month}
                  onMonthChange={setMonth}
                  hideNavigation
                  showOutsideDays
                  className="premium-day-picker"
                  classNames={{
                    root: "w-full outline-none",
                    months: "w-full outline-none",
                    month: "w-full outline-none",
                    month_caption: "hidden",
                    month_grid: "w-full border-collapse",
                    weekdays: "grid grid-cols-7",
                    weekday: "pb-1 text-center text-[11px] font-medium text-zinc-500",
                    week: "grid grid-cols-7",
                    day: "flex items-center justify-center py-0",
                    day_button:
                      "flex h-9 w-9 outline-none items-center justify-center rounded-lg text-[13px] text-zinc-200 transition-colors hover:bg-white/[0.06] hover:text-white",
                    selected: "text-white",
                    today: "font-semibold text-zinc-100",
                    outside: "text-zinc-600",
                    disabled: "opacity-40",
                  }}
                  modifiersClassNames={{
                    selected: "[&>button]:bg-[#2b84df] [&>button]:font-semibold [&>button]:text-white",
                    today: "[&>button]:border [&>button]:border-white/10",
                    outside: "[&>button]:text-zinc-600",
                  }}
                />
              </div>
            </div>

            {mode === "datetime" && activeTab === "time" && (
              <div className="grid gap-3 transition-opacity">
                <div className="flex flex-col flex-1 shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        Time
                      </div>
                      <div className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                        {selectedDate
                          ? "Set exact hour and minute."
                          : "Select a date first to unlock time."}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1.5">
                      <span className="px-1 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                        Hour
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={timeDraft.hour}
                        disabled={!selectedDate}
                        onChange={(event) => handleTimeInputChange("hour", event.target.value)}
                        onBlur={() => applyTimeDraft()}
                        onFocus={(event) => event.currentTarget.select()}
                        onKeyDown={handleTimeInputKeyDown("hour")}
                        placeholder="12"
                        aria-label="Hour"
                        className={cn(
                          "h-12 w-full rounded-xl border border-white/10 bg-[#181715] px-3 text-center text-xl font-semibold tabular-nums text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-white/20 focus:bg-[#1d1c1a]",
                          !selectedDate && "cursor-not-allowed opacity-50"
                        )}
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="px-1 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                        Minute
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={timeDraft.minute}
                        disabled={!selectedDate}
                        onChange={(event) => handleTimeInputChange("minute", event.target.value)}
                        onBlur={() => applyTimeDraft()}
                        onFocus={(event) => event.currentTarget.select()}
                        onKeyDown={handleTimeInputKeyDown("minute")}
                        placeholder="00"
                        aria-label="Minute"
                        className={cn(
                          "h-12 w-full rounded-xl border border-white/10 bg-[#181715] px-3 text-center text-xl font-semibold tabular-nums text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-white/20 focus:bg-[#1d1c1a]",
                          !selectedDate && "cursor-not-allowed opacity-50"
                        )}
                      />
                    </label>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(["AM", "PM"] as const).map((periodOption) => (
                      <button
                        key={periodOption}
                        type="button"
                        disabled={!selectedDate}
                        onClick={() => handlePeriodSelect(periodOption)}
                        className={cn(
                          "h-11 rounded-xl border px-3 text-sm font-semibold transition-colors",
                          timeDraft.period === periodOption
                            ? "border-[#2b84df]/60 bg-[#2b84df]/15 text-[#89bbff]"
                            : "border-white/10 bg-[#181715] text-zinc-400 hover:bg-[#1d1c1a] hover:text-zinc-100",
                          !selectedDate && "cursor-not-allowed opacity-50"
                        )}
                      >
                        {periodOption}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-1">
            <button
              type="button"
              onClick={() => {
                updateValue(null);
                setTimeDraft(getTimeParts());
                setOpen(false);
              }}
              className="text-[13px] text-zinc-500 transition-colors hover:text-white"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-white px-3 py-1.5 text-[13px] font-medium text-black transition-colors hover:bg-zinc-200"
            >
              Done
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
