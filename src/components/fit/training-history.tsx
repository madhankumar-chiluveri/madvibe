"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/fit/fit-ui";
import { PROGRAM, isTrainingDay } from "@/lib/madfit-program";
import { dayName, formatDuration, heatmapWeeks, parseYmd, ymd } from "@/lib/madfit-utils";
import { CalendarDays, ChevronDown, Dumbbell, Gauge } from "lucide-react";

const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

/* ── Heatmap ─────────────────────────────────────────────────────────────── */

export function TrainingHeatmap({
  completedDates,
  weeks = 12,
}: {
  completedDates: string[];
  weeks?: number;
}) {
  const done = new Set(completedDates);
  const columns = heatmapWeeks(weeks);
  const today = ymd();

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-extrabold text-foreground">
        <CalendarDays className="h-4 w-4 text-[#C96442]" />
        Last {weeks} weeks
      </h3>
      <p className="mb-3 text-[11px] font-semibold text-muted-foreground">
        Each column is a week, Monday at the top.
      </p>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-1.5">
          <div className="flex flex-col gap-1 pr-1">
            {WEEKDAY_INITIALS.map((initial, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="flex h-4 w-3 items-center justify-center text-[9px] font-black text-muted-foreground/60"
              >
                {initial}
              </span>
            ))}
          </div>

          {columns.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((date) => {
                const isFuture = date > today;
                const isDone = done.has(date);
                const scheduled = isTrainingDay(dayName(date));
                const label = `${parseYmd(date).toLocaleDateString("en-US", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}: ${
                  isFuture
                    ? "upcoming"
                    : isDone
                      ? "completed"
                      : scheduled
                        ? "missed"
                        : "rest day"
                }`;

                return (
                  <span
                    key={date}
                    title={label}
                    aria-label={label}
                    className={cn(
                      "h-4 w-4 rounded-[4px] border",
                      isFuture
                        ? "border-border/40 bg-transparent"
                        : isDone
                          ? "border-transparent bg-gradient-to-br from-[#CE6A47] to-[#DC9447]"
                          : scheduled
                            ? "border-dashed border-border bg-transparent"
                            : "border-transparent bg-muted"
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-bold text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-gradient-to-br from-[#CE6A47] to-[#DC9447]" />
          Trained
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] border border-dashed border-border" />
          Missed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-muted" />
          Rest day
        </span>
      </div>
    </div>
  );
}

/* ── Session list ────────────────────────────────────────────────────────── */

type SessionRow = {
  _id: string;
  date: string;
  dayKey: string;
  status: "in_progress" | "completed";
  completedSets: number;
  totalSets: number;
  durationSec?: number;
  rpe?: number;
  notes?: string;
};

function SessionDetail({ sessionId }: { sessionId: string }) {
  const detail = useQuery(api.madfit.getSessionDetail, { sessionId: sessionId as any });

  if (detail === undefined) {
    return <div className="skeleton-shimmer mt-3 h-16 rounded-lg" />;
  }
  if (!detail || detail.sets.length === 0) {
    return (
      <p className="mt-3 text-xs font-semibold text-muted-foreground">
        {detail?.session.notes ?? "No set detail recorded for this session."}
      </p>
    );
  }

  const grouped = new Map<string, { name: string; faces: string[]; load?: number }>();
  for (const set of detail.sets) {
    const bucket = grouped.get(set.exerciseId) ?? { name: set.exerciseName, faces: [] };
    bucket.faces.push(
      set.durationSec ? `${set.durationSec}s` : set.reps != null ? String(set.reps) : "✓"
    );
    if (set.weightKg != null) bucket.load = set.weightKg;
    grouped.set(set.exerciseId, bucket);
  }

  return (
    <div className="mt-3 space-y-1.5 border-t border-border pt-3">
      {[...grouped.values()].map((row) => (
        <div key={row.name} className="flex items-baseline justify-between gap-3 text-xs">
          <span className="min-w-0 truncate font-bold text-foreground">{row.name}</span>
          <span className="shrink-0 font-bold tabular-nums text-muted-foreground">
            {row.faces.join(" · ")}
            {row.load != null && ` @ ${row.load} kg`}
          </span>
        </div>
      ))}
      {detail.session.notes && (
        <p className="pt-2 text-[11px] font-semibold italic text-muted-foreground">
          {detail.session.notes}
        </p>
      )}
    </div>
  );
}

export function SessionHistory({ sessions }: { sessions: SessionRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="No sessions logged yet"
        body="Tap through the set chips on the Today tab and each session lands here with its reps, load, and effort."
      />
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => {
        const isOpen = openId === session._id;
        const day = PROGRAM[session.dayKey];
        const pct = session.totalSets ? session.completedSets / session.totalSets : 0;

        return (
          <article key={session._id} className="rounded-2xl border border-border bg-card">
            <button
              onClick={() => setOpenId(isOpen ? null : session._id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-[10px] font-black leading-none",
                  session.status === "completed"
                    ? "bg-gradient-to-br from-[#CE6A47] to-[#DC9447] text-white"
                    : "border border-dashed border-border text-muted-foreground"
                )}
              >
                <span className="text-sm">{parseYmd(session.date).getDate()}</span>
                <span className="mt-0.5 uppercase opacity-80">
                  {parseYmd(session.date).toLocaleDateString("en-US", { month: "short" })}
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-foreground">
                  {day?.title ?? session.dayKey}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-bold text-muted-foreground">
                  <span>{session.dayKey}</span>
                  {session.totalSets > 0 && (
                    <span className="tabular-nums">
                      {session.completedSets}/{session.totalSets} sets
                    </span>
                  )}
                  {session.durationSec ? (
                    <span className="tabular-nums">{formatDuration(session.durationSec)}</span>
                  ) : null}
                  {session.rpe != null && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Gauge className="h-3 w-3" />
                      RPE {session.rpe}
                    </span>
                  )}
                  {session.status === "in_progress" && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                      Unfinished
                    </span>
                  )}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block"
                >
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-[#CE6A47] to-[#DC9447]"
                    style={{ width: `${Math.round(pct * 100)}%` }}
                  />
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </span>
            </button>

            {isOpen && (
              <div className="animate-fade-in px-4 pb-4">
                <SessionDetail sessionId={session._id} />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
