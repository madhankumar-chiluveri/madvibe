"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock3,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

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

function dateHasTime(date: Date) {
  return (
    date.getHours() !== 0 ||
    date.getMinutes() !== 0 ||
    date.getSeconds() !== 0 ||
    date.getMilliseconds() !== 0
  );
}

function formatDisplayDate(date: Date, includeTime = false) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "numeric",
          minute: "2-digit",
        }
      : {}),
  }).format(date);
}

function formatTriggerValue(date: Date, mode: PickerMode) {
  return formatDisplayDate(date, mode === "datetime" && dateHasTime(date));
}

function formatInputValue(date: Date, includeTime: boolean) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime
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

function withTime(
  date: Date,
  hourText: string,
  minuteText: string,
  period: "AM" | "PM",
) {
  const hourValue = Number(hourText);
  const minuteValue = Number(minuteText);
  const safeHour = Number.isFinite(hourValue)
    ? Math.min(12, Math.max(1, hourValue))
    : 12;
  const safeMinute = Number.isFinite(minuteValue)
    ? Math.min(59, Math.max(0, minuteValue))
    : 0;
  const normalizedHour = (safeHour % 12) + (period === "PM" ? 12 : 0);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    normalizedHour,
    safeMinute,
  );
}

function normalizeTimeDraft(draft: TimeDraft, fallbackDate?: Date) {
  return getTimeParts(
    withTime(
      withLocalDate(fallbackDate ?? new Date()),
      draft.hour,
      draft.minute,
      draft.period,
    ),
  );
}

function sanitizeTimeDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 2);
}

function stepTimeDraft(
  draft: TimeDraft,
  part: "hour" | "minute",
  delta: number,
) {
  const base = withTime(
    new Date(2026, 0, 1),
    draft.hour,
    draft.minute,
    draft.period,
  );

  if (part === "hour") {
    base.setHours(base.getHours() + delta);
  } else {
    base.setMinutes(base.getMinutes() + delta);
  }

  return getTimeParts(base);
}

function parseDateInput(
  rawValue: string,
  fallbackDate: Date | undefined,
  includeTime: boolean,
  timeDraft: TimeDraft,
) {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const parsed = isoMatch
    ? new Date(
        Number(isoMatch[1]),
        Number(isoMatch[2]) - 1,
        Number(isoMatch[3]),
      )
    : new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) return undefined;

  if (includeTime) {
    if (dateHasTime(parsed)) return parsed;
    const draft = normalizeTimeDraft(timeDraft, fallbackDate ?? parsed);
    return withTime(withLocalDate(parsed), draft.hour, draft.minute, draft.period);
  }

  return withLocalDate(parsed);
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
    [value],
  );
  const [month, setMonth] = useState<Date>(selectedDate ?? new Date());
  const [timeDraft, setTimeDraft] = useState<TimeDraft>(() =>
    getTimeParts(selectedDate),
  );
  const [includeTime, setIncludeTime] = useState(
    mode === "datetime" && (selectedDate ? dateHasTime(selectedDate) : true),
  );
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (!open) return;

    const nextIncludeTime =
      mode === "datetime" && (selectedDate ? dateHasTime(selectedDate) : true);
    const nextDate = selectedDate ?? new Date();

    setMonth(nextDate);
    setTimeDraft(getTimeParts(selectedDate));
    setIncludeTime(nextIncludeTime);
    setInputValue(selectedDate ? formatInputValue(selectedDate, nextIncludeTime) : "");
  }, [mode, open, selectedDate]);

  const updateValue = (nextDate: Date | null) => {
    onChange(nextDate ? nextDate.getTime() : null);
    if (nextDate) {
      setMonth(nextDate);
      setInputValue(formatInputValue(nextDate, mode === "datetime" && dateHasTime(nextDate)));
    }
  };

  const setDatePreservingTime = (day: Date) => {
    const localDay = withLocalDate(day);

    if (mode !== "datetime" || !includeTime) {
      updateValue(localDay);
      return;
    }

    const normalizedDraft = normalizeTimeDraft(timeDraft, selectedDate ?? day);
    setTimeDraft(normalizedDraft);
    updateValue(
      withTime(
        localDay,
        normalizedDraft.hour,
        normalizedDraft.minute,
        normalizedDraft.period,
      ),
    );
  };

  const handleDateSelect = (day?: Date) => {
    if (!day) return;
    setDatePreservingTime(day);
  };

  const applyTimeDraft = (draft = timeDraft) => {
    const baseDate = selectedDate ?? month ?? new Date();
    const normalizedDraft = normalizeTimeDraft(draft, selectedDate ?? baseDate);
    const nextValue = withTime(
      withLocalDate(baseDate),
      normalizedDraft.hour,
      normalizedDraft.minute,
      normalizedDraft.period,
    );

    setIncludeTime(true);
    setTimeDraft(normalizedDraft);
    updateValue(nextValue);
  };

  const handleTimeInputChange = (part: "hour" | "minute", rawValue: string) => {
    setTimeDraft((current) => ({
      ...current,
      [part]: sanitizeTimeDigits(rawValue),
    }));
  };

  const handleTimeInputKeyDown =
    (part: "hour" | "minute") =>
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyTimeDraft();
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const nextDraft = stepTimeDraft(
          timeDraft,
          part,
          event.key === "ArrowUp" ? 1 : -1,
        );
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

  const handleInputCommit = () => {
    const parsed = parseDateInput(
      inputValue,
      selectedDate,
      mode === "datetime" && includeTime,
      timeDraft,
    );

    if (parsed === undefined) {
      setInputValue(
        selectedDate ? formatInputValue(selectedDate, mode === "datetime" && includeTime) : "",
      );
      return;
    }

    updateValue(parsed);
  };

  const handleTodayClick = () => {
    const today = new Date();
    setDatePreservingTime(today);
    setMonth(today);
  };

  const handleIncludeTimeChange = (checked: boolean) => {
    if (mode !== "datetime") return;

    setIncludeTime(checked);

    if (!selectedDate) {
      if (checked) {
        applyTimeDraft(getTimeParts(new Date()));
      }
      return;
    }

    if (checked) {
      applyTimeDraft(timeDraft);
      return;
    }

    updateValue(withLocalDate(selectedDate));
  };

  const triggerClasses =
    variant === "input"
      ? "flex h-10 w-full items-center gap-3 rounded-xl border border-foreground/10 bg-input px-3 text-left text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/15"
      : "flex min-h-[38px] items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-foreground/[0.05] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/10";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            triggerClasses,
            !selectedDate && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-60",
            className,
          )}
        >
          <CalendarDays
            className={cn(
              "shrink-0 text-muted-foreground",
              variant === "input" ? "h-4 w-4" : "h-3.5 w-3.5",
            )}
          />
          <span className="min-w-0 truncate">
            {selectedDate ? formatTriggerValue(selectedDate, mode) : placeholder}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={6}
        className={cn(
          "w-[min(100vw-1rem,312px)] overflow-hidden rounded-lg border-foreground/10 bg-popover p-0 text-foreground shadow-[0_18px_48px_rgba(0,0,0,0.42)]",
          "max-h-[min(680px,var(--radix-popover-content-available-height))] overflow-y-auto",
          popoverClassName,
        )}
      >
        <div className="space-y-3 p-3">
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onBlur={handleInputCommit}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleInputCommit();
              }

              if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
              }
            }}
            placeholder="Pick a date"
            className="h-9 w-full rounded-md border border-foreground/10 bg-foreground/[0.04] px-2.5 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/15"
          />

          <div className="rounded-md bg-popover">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <div className="text-sm font-semibold text-foreground">
                {formatMonthLabel(month)}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleTodayClick}
                  className="h-7 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMonth(
                      new Date(month.getFullYear(), month.getMonth() - 1, 1),
                    )
                  }
                  aria-label="Previous month"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMonth(
                      new Date(month.getFullYear(), month.getMonth() + 1, 1),
                    )
                  }
                  aria-label="Next month"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
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
                weekday:
                  "pb-1 text-center text-[12px] font-medium text-muted-foreground",
                week: "grid grid-cols-7",
                day: "flex items-center justify-center py-0.5",
                day_button:
                  "flex h-8 w-8 outline-none items-center justify-center rounded-md text-[14px] text-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/25",
                selected: "text-primary-foreground",
                today: "font-semibold text-foreground",
                outside: "text-muted-foreground/55",
                disabled: "opacity-40",
              }}
              modifiersClassNames={{
                selected:
                  "[&>button]:bg-primary [&>button]:font-semibold [&>button]:text-primary-foreground [&>button]:shadow-sm",
                today: "[&>button]:border [&>button]:border-foreground/12",
                outside: "[&>button]:text-muted-foreground/55",
              }}
            />
          </div>

          {mode === "datetime" && (
            <div className="space-y-2 border-t border-foreground/10 pt-2">
              <div className="flex h-8 items-center justify-between gap-3">
                <div className="text-sm font-medium text-foreground">
                  Include time
                </div>
                <Switch
                  checked={includeTime}
                  onCheckedChange={handleIncludeTimeChange}
                  className="h-5 w-9 data-[state=checked]:bg-primary"
                />
              </div>

              {includeTime && (
                <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <label className="space-y-1">
                    <span className="px-0.5 text-[11px] font-medium text-muted-foreground">
                      Hour
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={timeDraft.hour}
                      onChange={(event) =>
                        handleTimeInputChange("hour", event.target.value)
                      }
                      onBlur={() => applyTimeDraft()}
                      onFocus={(event) => event.currentTarget.select()}
                      onKeyDown={handleTimeInputKeyDown("hour")}
                      aria-label="Hour"
                      className="h-9 w-full rounded-md border border-foreground/10 bg-foreground/[0.04] px-2 text-center text-sm font-semibold tabular-nums text-foreground outline-none transition-colors focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/15"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="px-0.5 text-[11px] font-medium text-muted-foreground">
                      Minute
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={timeDraft.minute}
                      onChange={(event) =>
                        handleTimeInputChange("minute", event.target.value)
                      }
                      onBlur={() => applyTimeDraft()}
                      onFocus={(event) => event.currentTarget.select()}
                      onKeyDown={handleTimeInputKeyDown("minute")}
                      aria-label="Minute"
                      className="h-9 w-full rounded-md border border-foreground/10 bg-foreground/[0.04] px-2 text-center text-sm font-semibold tabular-nums text-foreground outline-none transition-colors focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/15"
                    />
                  </label>

                  <div className="grid h-9 grid-cols-2 overflow-hidden rounded-md border border-foreground/10 bg-foreground/[0.04]">
                    {(["AM", "PM"] as const).map((periodOption) => (
                      <button
                        key={periodOption}
                        type="button"
                        onClick={() => handlePeriodSelect(periodOption)}
                        className={cn(
                          "w-10 text-xs font-semibold transition-colors",
                          timeDraft.period === periodOption
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
                        )}
                      >
                        {periodOption}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 rounded-md bg-foreground/[0.04] px-2.5 py-2 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                <span className="min-w-0 truncate">
                  {selectedDate
                    ? includeTime
                      ? formatTimeValue(selectedDate)
                      : "No time"
                    : "Select a date"}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-foreground/10 pt-2">
            <button
              type="button"
              onClick={() => {
                updateValue(null);
                setTimeDraft(getTimeParts());
                setInputValue("");
                setOpen(false);
              }}
              className="rounded-md px-1 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Done
              <ChevronsUpDown className="h-3.5 w-3.5 rotate-45 opacity-70" />
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
