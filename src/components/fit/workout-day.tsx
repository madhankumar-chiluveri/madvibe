"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Ring } from "@/components/fit/fit-ui";
import {
  COOLDOWN,
  DAY_ACCENT,
  WARMUP,
  formVideoUrl,
  isSearchFallback,
  type FitBlock,
  type FitDay,
  type FitExercise,
} from "@/lib/madfit-program";
import { shortDate } from "@/lib/madfit-utils";
import {
  ChevronDown,
  History,
  PlayCircle,
  PlaySquare,
  RotateCcw,
  Search,
  Timer,
  Trash2,
} from "lucide-react";

export type SetLog = {
  _id: string;
  exerciseId: string;
  setIndex: number;
  reps?: number;
  weightKg?: number;
  durationSec?: number;
};

export type LastPerformance = Record<
  string,
  { date: string; sets: Array<{ reps?: number; weightKg?: number; durationSec?: number }> }
>;

export type SetHandlers = {
  onToggleSet: (exercise: FitExercise, setIndex: number) => void;
  onUpdateSet: (
    setLogId: string,
    patch: { reps?: number; weightKg?: number; durationSec?: number }
  ) => void;
  onClearExercise: (exerciseId: string) => void;
};

/* ── Set rail ────────────────────────────────────────────────────────────── */

/**
 * The session control. One chip per planned set: tap to log it, tap a logged
 * chip to correct the reps or load. Timed movements open a work timer instead
 * of logging straight away.
 */
function SetRail({
  exercise,
  logs,
  interactive,
  handlers,
}: {
  exercise: FitExercise;
  logs: SetLog[];
  interactive: boolean;
  handlers?: SetHandlers;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const byIndex = new Map(logs.map((l) => [l.setIndex, l]));
  const isTimed = !!exercise.seconds;

  const chips = Array.from({ length: exercise.sets }, (_, i) => i);
  const editingLog = editing !== null ? byIndex.get(editing) : undefined;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((i) => {
          const log = byIndex.get(i);
          const done = !!log;
          const face = done
            ? log?.durationSec
              ? `${log.durationSec}s`
              : log?.reps != null
                ? String(log.reps)
                : "✓"
            : isTimed
              ? `${exercise.seconds}s`
              : String(i + 1);

          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              aria-label={
                done
                  ? `Set ${i + 1} logged, ${face}. Edit`
                  : `Log set ${i + 1} of ${exercise.name}`
              }
              aria-pressed={done}
              onClick={() => {
                if (!interactive || !handlers) return;
                if (done) {
                  setEditing((cur) => (cur === i ? null : i));
                } else {
                  handlers.onToggleSet(exercise, i);
                }
              }}
              className={cn(
                "inline-flex h-11 min-w-[44px] items-center justify-center gap-1 rounded-xl px-2 text-[13px] font-extrabold tabular-nums transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C96442]/50",
                done
                  ? "bg-gradient-to-br from-[#CE6A47] to-[#DC9447] text-white shadow-sm"
                  : "border border-dashed border-border bg-muted/30 text-muted-foreground",
                interactive ? "hover:brightness-105 active:opacity-80" : "cursor-default opacity-90",
                editing === i && "ring-2 ring-[#C96442]/60"
              )}
            >
              {!done && isTimed && <PlayCircle className="h-3.5 w-3.5" />}
              {face}
            </button>
          );
        })}

        {exercise.restSec > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-2 py-1 text-[11px] font-bold text-muted-foreground">
            <Timer className="h-3 w-3" />
            {exercise.restLabel}
          </span>
        )}
      </div>

      {interactive && editingLog && editing !== null && (
        <SetEditor
          key={editingLog._id}
          log={editingLog}
          setIndex={editing}
          isTimed={isTimed}
          onSave={(patch) => {
            handlers?.onUpdateSet(editingLog._id, patch);
            setEditing(null);
          }}
          onClear={() => {
            handlers?.onToggleSet(exercise, editing);
            setEditing(null);
          }}
          onDismiss={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function SetEditor({
  log,
  setIndex,
  isTimed,
  onSave,
  onClear,
  onDismiss,
}: {
  log: SetLog;
  setIndex: number;
  isTimed: boolean;
  onSave: (patch: { reps?: number; weightKg?: number; durationSec?: number }) => void;
  onClear: () => void;
  onDismiss: () => void;
}) {
  const [primary, setPrimary] = useState(
    String(isTimed ? (log.durationSec ?? "") : (log.reps ?? ""))
  );
  const [weight, setWeight] = useState(String(log.weightKg ?? ""));

  const commit = () => {
    const n = parseFloat(primary);
    const w = parseFloat(weight);
    onSave({
      reps: !isTimed && Number.isFinite(n) ? n : undefined,
      durationSec: isTimed && Number.isFinite(n) ? n : undefined,
      weightKg: Number.isFinite(w) ? w : undefined,
    });
  };

  return (
    <div className="mt-2.5 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-muted/25 p-3">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        Set {setIndex + 1}
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {isTimed ? "Seconds" : "Reps"}
        </span>
        <input
          autoFocus
          value={primary}
          onChange={(e) => setPrimary(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") onDismiss();
          }}
          inputMode="numeric"
          className="h-11 w-[72px] rounded-lg border border-border bg-background px-2 text-center text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-[#C96442]/40"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Load kg
        </span>
        <input
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") onDismiss();
          }}
          inputMode="decimal"
          placeholder="5"
          className="h-11 w-[72px] rounded-lg border border-border bg-background px-2 text-center text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-[#C96442]/40"
        />
      </label>
      <button
        onClick={commit}
        className="h-11 rounded-lg bg-gradient-to-r from-[#CE6A47] to-[#DC9447] px-4 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        Save
      </button>
      <button
        onClick={onClear}
        aria-label={`Clear set ${setIndex + 1}`}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ── Exercise ────────────────────────────────────────────────────────────── */

function LastPerformanceLine({
  entry,
}: {
  entry: { date: string; sets: Array<{ reps?: number; weightKg?: number; durationSec?: number }> };
}) {
  if (!entry.sets.length) return null;
  const faces = entry.sets.map((s) =>
    s.durationSec ? `${s.durationSec}s` : s.reps != null ? String(s.reps) : "✓"
  );
  const load = entry.sets.find((s) => s.weightKg != null)?.weightKg;

  return (
    <p className="mt-1.5 inline-flex flex-wrap items-center gap-1 text-[11px] font-bold text-muted-foreground">
      <History className="h-3 w-3 shrink-0" />
      <span>{shortDate(entry.date)}</span>
      <span className="text-muted-foreground/50">·</span>
      <span className="tabular-nums text-foreground/70">{faces.join(" · ")}</span>
      {load != null && <span className="tabular-nums">@ {load} kg</span>}
    </p>
  );
}

function ExerciseRow({
  exercise,
  logs,
  last,
  interactive,
  handlers,
}: {
  exercise: FitExercise;
  logs: SetLog[];
  last?: LastPerformance[string];
  interactive: boolean;
  handlers?: SetHandlers;
}) {
  const done = logs.length >= exercise.sets;
  const formUrl = formVideoUrl(exercise);

  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 transition-colors",
        done
          ? "border-[#7F9270]/40 bg-[#7F9270]/[0.07]"
          : "border-border bg-card/65"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h5
            className={cn(
              "text-sm font-bold leading-snug",
              done ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {exercise.name}
          </h5>
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{exercise.cue}</p>
          {last && <LastPerformanceLine entry={last} />}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="whitespace-nowrap text-[12.5px] font-extrabold tabular-nums text-[#C96442]">
            {exercise.sets > 1 ? `${exercise.sets} × ${exercise.reps}` : exercise.reps}
          </span>
          {formUrl && (
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={
                isSearchFallback(exercise)
                  ? "Search YouTube for a form demo"
                  : `Form reference for ${exercise.name}`
              }
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-2 py-1 text-[10px] font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              {isSearchFallback(exercise) ? (
                <Search className="h-3 w-3" />
              ) : (
                <PlaySquare className="h-3 w-3" />
              )}
              Form
            </a>
          )}
        </div>
      </div>

      <SetRail
        exercise={exercise}
        logs={logs}
        interactive={interactive}
        handlers={handlers}
      />

      {interactive && logs.length > 0 && (
        <button
          onClick={() => handlers?.onClearExercise(exercise.id)}
          className="mt-2 text-[11px] font-bold text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline"
        >
          Clear this exercise
        </button>
      )}
    </div>
  );
}

/* ── Block ───────────────────────────────────────────────────────────────── */

function BlockGroup({
  block,
  logsByExercise,
  last,
  interactive,
  handlers,
}: {
  block: FitBlock;
  logsByExercise: Map<string, SetLog[]>;
  last: LastPerformance;
  interactive: boolean;
  handlers?: SetHandlers;
}) {
  const rows = block.exercises.map((exercise) => (
    <ExerciseRow
      key={exercise.id}
      exercise={exercise}
      logs={logsByExercise.get(exercise.id) ?? []}
      last={last[exercise.id]}
      interactive={interactive}
      handlers={handlers}
    />
  ));

  return (
    <section className="space-y-2">
      <div className="flex items-start justify-between gap-2 px-1">
        <h4 className="text-sm font-extrabold text-foreground">{block.label}</h4>
        <span className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-extrabold text-muted-foreground">
          {block.meta}
        </span>
      </div>

      {block.superset ? (
        // The bracket is structural, not decorative: it marks the two movements
        // that are performed back-to-back before any rest is taken.
        <div className="relative pl-4">
          <span
            aria-hidden="true"
            className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b from-[#CE6A47] to-[#DC9447]"
          />
          <span className="absolute -left-[1px] top-[-9px] rounded bg-background px-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#C96442]">
            Superset
          </span>
          <div className="space-y-2">{rows}</div>
        </div>
      ) : (
        <div className="space-y-2">{rows}</div>
      )}
    </section>
  );
}

/* ── Day card ────────────────────────────────────────────────────────────── */

function BookendList({
  title,
  duration,
  items,
  tone,
}: {
  title: string;
  duration: string;
  items: string[];
  tone: "warm" | "cool";
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2 px-1">
        <h4 className="text-sm font-extrabold text-foreground">{title}</h4>
        <span className="text-xs font-bold text-muted-foreground">{duration}</span>
      </div>
      <div
        className={cn(
          "grid gap-x-6 gap-y-2 rounded-xl border p-3.5 sm:grid-cols-2",
          tone === "warm"
            ? "border-orange-100/70 bg-orange-50/20 dark:border-orange-950/20 dark:bg-orange-950/[0.06]"
            : "border-[#7F9270]/25 bg-[#7F9270]/[0.06]"
        )}
      >
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-xs font-semibold text-muted-foreground">
            <span className={tone === "warm" ? "text-[#C96442]" : "text-[#7F9270]"}>•</span>
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

export function WorkoutDayCard({
  day,
  logs = [],
  last = {},
  interactive = false,
  defaultOpen = false,
  isToday = false,
  handlers,
  onResetDay,
}: {
  day: FitDay;
  logs?: SetLog[];
  last?: LastPerformance;
  interactive?: boolean;
  defaultOpen?: boolean;
  isToday?: boolean;
  handlers?: SetHandlers;
  onResetDay?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const logsByExercise = new Map<string, SetLog[]>();
  for (const log of logs) {
    const bucket = logsByExercise.get(log.exerciseId) ?? [];
    bucket.push(log);
    logsByExercise.set(log.exerciseId, bucket);
  }

  const totalSets = day.blocks.reduce(
    (sum, b) => sum + b.exercises.reduce((s, e) => s + e.sets, 0),
    0
  );
  const doneSets = logs.length;
  const pct = totalSets ? doneSets / totalSets : 0;
  const complete = totalSets > 0 && doneSets >= totalSets;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card",
        isToday && "shadow-md ring-1 ring-[#C96442]/30"
      )}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="block w-full text-left"
      >
        <div
          className={cn(
            "relative bg-gradient-to-r p-4 text-white sm:p-5",
            DAY_ACCENT[day.type]
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black">{day.key}</h3>
                {isToday && (
                  <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-black tracking-wide">
                    TODAY
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13px] font-bold leading-snug text-white/90">{day.title}</p>
              <p className="mt-0.5 text-[11px] font-bold text-white/75">
                {day.tag} · {day.duration}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {totalSets > 0 ? (
                <Ring
                  value={pct}
                  size={52}
                  stroke={6}
                  color="#fff"
                  trackClass="stroke-white/25"
                  label={complete ? "✓" : String(doneSets)}
                  sub={complete ? "" : `/ ${totalSets}`}
                />
              ) : null}
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-white/70 transition-transform",
                  open && "rotate-180"
                )}
              />
            </div>
          </div>
        </div>
      </button>

      {open && (
        <div className="animate-fade-in space-y-5 p-4 sm:p-5">
          <p className="rounded-xl border border-border bg-muted/25 p-3.5 text-sm font-semibold leading-relaxed text-foreground/80">
            {day.blurb}
          </p>

          {day.warmup && (
            <BookendList
              title={WARMUP.title}
              duration={WARMUP.duration}
              items={WARMUP.items}
              tone="warm"
            />
          )}

          {day.blocks.map((block) => (
            <BlockGroup
              key={block.id}
              block={block}
              logsByExercise={logsByExercise}
              last={last}
              interactive={interactive}
              handlers={handlers}
            />
          ))}

          {day.cooldown && (
            <BookendList
              title={COOLDOWN.title}
              duration={COOLDOWN.duration}
              items={COOLDOWN.items}
              tone="cool"
            />
          )}

          {interactive && doneSets > 0 && onResetDay && (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-xs font-bold text-muted-foreground">
                {complete ? "Every set logged" : `${doneSets} of ${totalSets} sets logged`}
              </span>
              <button
                onClick={onResetDay}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset day
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
