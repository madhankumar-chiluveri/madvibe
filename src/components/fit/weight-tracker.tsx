"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/fit/fit-ui";
import { shortDate, ymd } from "@/lib/madfit-utils";
import { ArrowDown, ArrowUp, Minus, Scale, Target, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type WeightEntry = {
  _id: string;
  date: string;
  weightKg: number;
  note?: string;
};

/** recharts is ~150 kB — keep it off the Today tab's critical path. */
const WeightChart = dynamic(() => import("@/components/fit/weight-chart"), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-[200px] w-full rounded-xl" />,
});

/* ── Shared input ────────────────────────────────────────────────────────── */

function WeighInForm({
  defaultValue,
  onLog,
  autoFocus = false,
  compact = false,
}: {
  defaultValue?: number | null;
  onLog: (weightKg: number, date: string) => Promise<void> | void;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");
  const [date, setDate] = useState(ymd());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const n = parseFloat(value);
    if (!Number.isFinite(n)) {
      setError("Enter a number, for example 62.4");
      return;
    }
    if (n <= 20 || n > 400) {
      setError("Enter a weight between 20 and 400 kg");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onLog(n, date);
      setValue("");
    } catch (e: any) {
      setError(e?.data ?? e?.message ?? "Could not save that weigh-in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Weight kg
          </span>
          <input
            autoFocus={autoFocus}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            inputMode="decimal"
            placeholder={defaultValue ? String(defaultValue) : "62.0"}
            aria-invalid={!!error}
            className="h-11 w-24 rounded-xl border border-border bg-background px-3 text-center text-base font-bold tabular-nums outline-none transition-shadow focus:ring-2 focus:ring-[#C96442]/40"
          />
        </label>

        {!compact && (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Date
            </span>
            <input
              type="date"
              value={date}
              max={ymd()}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-bold tabular-nums outline-none transition-shadow focus:ring-2 focus:ring-[#C96442]/40"
            />
          </label>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="h-11 rounded-xl bg-gradient-to-r from-[#CE6A47] to-[#DC9447] px-5 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Log weight"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-xs font-bold text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-[11px] font-semibold text-muted-foreground">
          Logging twice on one day replaces that day&apos;s reading.
        </p>
      )}
    </div>
  );
}

/* ── Deltas ──────────────────────────────────────────────────────────────── */

function DeltaChip({ delta, label }: { delta: number | null; label: string }) {
  if (delta === null) return null;
  const rounded = Math.round(delta * 10) / 10;
  const flat = Math.abs(rounded) < 0.05;
  const Icon = flat ? Minus : rounded < 0 ? ArrowDown : ArrowUp;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-extrabold tabular-nums",
        flat
          ? "border-border bg-muted/40 text-muted-foreground"
          : rounded < 0
            ? "border-[#7F9270]/35 bg-[#7F9270]/10 text-[#5F7154] dark:text-[#9BAD86]"
            : "border-[#C96442]/30 bg-[#C96442]/10 text-[#AE4F2E] dark:text-[#E79A7B]"
      )}
    >
      <Icon className="h-3 w-3" />
      {flat ? "0.0" : `${rounded > 0 ? "+" : ""}${rounded}`} kg
      <span className="font-bold text-muted-foreground">{label}</span>
    </span>
  );
}

/* ── Compact card (Today tab) ────────────────────────────────────────────── */

export function WeightSummaryCard({
  entries,
  currentWeightKg,
  onLog,
}: {
  entries: WeightEntry[];
  currentWeightKg: number | null;
  onLog: (weightKg: number, date: string) => Promise<void> | void;
}) {
  const latest = entries.length ? entries[entries.length - 1] : null;
  const previous = entries.length > 1 ? entries[entries.length - 2] : null;
  const shown = latest?.weightKg ?? currentWeightKg;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
            <Scale className="h-4 w-4 text-[#C96442]" />
            Body weight
          </h3>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-3xl font-black tabular-nums leading-none text-foreground">
              {shown != null ? shown.toFixed(1) : "—"}
            </span>
            <span className="text-sm font-bold text-muted-foreground">kg</span>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
            {latest ? `Last weighed ${shortDate(latest.date)}` : "No weigh-in logged yet"}
          </p>
          {previous && latest && (
            <div className="mt-2">
              <DeltaChip delta={latest.weightKg - previous.weightKg} label="since last" />
            </div>
          )}
        </div>
        <WeighInForm defaultValue={shown} onLog={onLog} compact />
      </div>
    </div>
  );
}

/* ── Full panel (Progress tab) ───────────────────────────────────────────── */

export function WeightPanel({
  entries,
  currentWeightKg,
  startWeightKg,
  goalWeightKg,
  onLog,
  onDelete,
  onSetGoal,
}: {
  entries: WeightEntry[];
  currentWeightKg: number | null;
  startWeightKg: number | null;
  goalWeightKg: number | null;
  onLog: (weightKg: number, date: string) => Promise<void> | void;
  onDelete: (id: string) => void;
  onSetGoal: (goalKg: number | undefined) => void;
}) {
  const [goalDraft, setGoalDraft] = useState(goalWeightKg ? String(goalWeightKg) : "");
  const [editingGoal, setEditingGoal] = useState(false);

  const latest = entries.length ? entries[entries.length - 1] : null;
  const previous = entries.length > 1 ? entries[entries.length - 2] : null;
  const first = entries.length ? entries[0] : null;
  const shown = latest?.weightKg ?? currentWeightKg;
  const start = startWeightKg ?? first?.weightKg ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <Scale className="h-4 w-4 text-[#C96442]" />
              Body weight
            </h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black tabular-nums leading-none text-foreground">
                {shown != null ? shown.toFixed(1) : "—"}
              </span>
              <span className="text-base font-bold text-muted-foreground">kg</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {latest && previous && (
                <DeltaChip delta={latest.weightKg - previous.weightKg} label="since last" />
              )}
              {latest && start != null && (
                <DeltaChip delta={latest.weightKg - start} label="since start" />
              )}
            </div>
          </div>
          <WeighInForm defaultValue={shown} onLog={onLog} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Target className="h-4 w-4 text-[#7F9270]" />
          {editingGoal ? (
            <>
              <input
                autoFocus
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                inputMode="decimal"
                placeholder="Goal kg"
                className="h-10 w-24 rounded-lg border border-border bg-background px-3 text-center text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-[#7F9270]/40"
              />
              <button
                onClick={() => {
                  const n = parseFloat(goalDraft);
                  onSetGoal(Number.isFinite(n) ? n : undefined);
                  setEditingGoal(false);
                }}
                className="h-10 rounded-lg border border-[#7F9270]/40 bg-[#7F9270]/10 px-4 text-sm font-bold text-[#5F7154] dark:text-[#9BAD86]"
              >
                Save goal
              </button>
              <button
                onClick={() => setEditingGoal(false)}
                className="h-10 px-2 text-sm font-bold text-muted-foreground"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className="text-sm font-bold text-foreground">
                {goalWeightKg ? `Goal ${goalWeightKg} kg` : "No goal set"}
              </span>
              <button
                onClick={() => setEditingGoal(true)}
                className="text-xs font-bold text-[#C96442] underline-offset-2 hover:underline"
              >
                {goalWeightKg ? "Change" : "Set a goal"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-extrabold text-foreground">Weight trend</h3>
        {entries.length > 1 ? (
          <WeightChart entries={entries} goal={goalWeightKg} />
        ) : (
          <EmptyState
            icon={Scale}
            title="Not enough readings yet"
            body="Log a second weigh-in and the trend line appears here. Weekly, same time of day, gives the cleanest signal."
          />
        )}
      </div>

      {entries.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-extrabold text-foreground">Weigh-in history</h3>
          <ul className="divide-y divide-border">
            {[...entries].reverse().slice(0, 20).map((entry) => (
              <li key={entry._id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {entry.weightKg.toFixed(1)} kg
                  </span>
                  <span className="ml-2 text-xs font-semibold text-muted-foreground">
                    {shortDate(entry.date)}
                  </span>
                  {entry.note && (
                    <p className="truncate text-[11px] font-semibold text-muted-foreground/80">
                      {entry.note}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onDelete(entry._id)}
                  aria-label={`Delete weigh-in from ${shortDate(entry.date)}`}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Quick dialog (top bar) ──────────────────────────────────────────────── */

export function WeighInDialog({
  open,
  onOpenChange,
  currentWeightKg,
  onLog,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeightKg: number | null;
  onLog: (weightKg: number, date: string) => Promise<void> | void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Log your weight</DialogTitle>
          <DialogDescription>
            {currentWeightKg != null
              ? `Last recorded ${currentWeightKg.toFixed(1)} kg.`
              : "Your first weigh-in starts the trend."}
          </DialogDescription>
        </DialogHeader>
        <WeighInForm
          autoFocus
          defaultValue={currentWeightKg}
          onLog={async (kg, date) => {
            await onLog(kg, date);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
