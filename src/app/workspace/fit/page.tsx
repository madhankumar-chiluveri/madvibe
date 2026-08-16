"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import {
  Confetti,
  Ring,
  SectionHeading,
  StatTile,
  TimerOverlay,
} from "@/components/fit/fit-ui";
import { WorkoutDayCard, type SetLog } from "@/components/fit/workout-day";
import {
  WeightPanel,
  WeightSummaryCard,
  WeighInDialog,
  type WeightEntry,
} from "@/components/fit/weight-tracker";
import { SessionHistory, TrainingHeatmap } from "@/components/fit/training-history";
import {
  DAYS,
  PLAN_VERSION,
  PROGRAM,
  TRAINING_DAYS_PER_WEEK,
  dayExercises,
  daySetCount,
  getDay,
  type FitExercise,
} from "@/lib/madfit-program";
import { beep, calcStreak, formatDuration, vibrate, weekCount, ymd } from "@/lib/madfit-utils";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Flame,
  Gauge,
  LineChart,
  Scale,
  Target,
  Utensils,
} from "lucide-react";

/* ============================ CONTENT ============================ */

const NUTRITION = {
  intro:
    "At 62 kg and 5'9\" you are already lean, so this is a recomposition, not a cut. Eat around maintenance with high protein, train the five sessions hard, and the waist tightens while you add muscle. No expensive supplements required.",
  targets: [
    {
      k: "Protein",
      v: "100–125 g/day",
      n: "1.6–2.0 g per kg at 62 kg. Builds and protects muscle, and keeps you full.",
    },
    {
      k: "Calories",
      v: "Maintenance to slight deficit",
      n: "About 300 kcal under maintenance reveals definition without draining session quality.",
    },
    { k: "Water", v: "3–4 litres/day", n: "Blunts hunger and supports recovery between sessions." },
    { k: "Sleep", v: "7–8 hrs", n: "Short sleep raises hunger hormones and stalls recomposition." },
  ],
  proteins: [
    {
      f: "Soya chunks (nuggets)",
      p: "~52 g / 100 g dry",
      note: "The cheapest protein in India by a wide margin. Soak, boil, add to curry.",
      top: true,
    },
    {
      f: "Eggs",
      p: "~6 g each",
      note: "Eight a day is about 48 g. Spread them across meals rather than one sitting.",
      top: true,
    },
    {
      f: "Dal / lentils (toor, moong, masoor)",
      p: "~9 g / cooked cup",
      note: "Daily staple. Pair with rice or roti for a complete amino profile.",
    },
    {
      f: "Chana & rajma",
      p: "~15 g / cup",
      note: "Protein plus fibre that holds you for hours.",
    },
    {
      f: "Curd & milk",
      p: "~3–3.5 g / 100 ml",
      note: "Cheap, gut-friendly, and easy right after a session.",
    },
    {
      f: "Peanuts / roasted chana",
      p: "~25 g / 100 g",
      note: "Protein and healthy fats in a snack that travels.",
    },
    {
      f: "Sattu (roasted gram flour)",
      p: "~20 g / 100 g",
      note: "Water, lemon and salt turns it into a protein shake for a few rupees.",
    },
    {
      f: "Paneer / tofu",
      p: "~18 g / 100 g",
      note: "Excellent and filling. Tofu is the cheaper of the two.",
    },
    {
      f: "Chicken breast",
      p: "~31 g / 100 g",
      note: "Best price-to-protein animal source. Grill or curry with minimal oil.",
    },
  ],
  plate: [
    "Half the plate vegetables — spinach, cabbage, carrot, beans, tomato.",
    "A palm of protein at every meal — eggs, soya, dal, curd, chicken.",
    "A fist of smart carbs — oats, one or two roti, brown rice, sweet potato.",
    "A thumb of fat — peanuts, seeds, or a little ghee.",
  ],
  limit: [
    "Sugary drinks and packaged juice.",
    "Fried snacks — samosa, chips, pakora.",
    "Maida, biscuits and sweets.",
    "Sugar in chai. It adds up faster than anything else on this list.",
  ],
  sample: [
    { m: "Breakfast", d: "Oats with milk and peanuts, or 3–4 boiled eggs with one roti." },
    { m: "Lunch", d: "Rice or roti, dal or soya curry, a large bowl of vegetables, curd." },
    { m: "Snack", d: "Sattu drink or roasted chana with a fruit. Black coffee pre-workout." },
    { m: "Post-workout", d: "Curd or milk with two boiled eggs." },
    { m: "Dinner", d: "Soya, paneer or chicken with sautéed vegetables and a small portion of rice." },
  ],
};

const TIPS = [
  {
    t: "Unilateral work is how 5 kg gets heavy",
    d: "Two 5 kg dumbbells are trivial on two legs and brutal on one. Bulgarian split squats and single-leg RDLs put your whole bodyweight plus the load through one limb — that is why Tuesday is built around them rather than goblet squats.",
  },
  {
    t: "Tempo is your second dial",
    d: "A 3-second lowering phase roughly doubles time under tension without adding a gram. When a set stops being hard, slow the eccentric before you reach for more reps.",
  },
  {
    t: "Supersets buy you the clock",
    d: "A1 and A2 are antagonists, so one recovers while the other works. That is what keeps these sessions at 42–45 minutes instead of an hour without dropping any volume.",
  },
  {
    t: "You cannot spot-reduce",
    d: "Crunches do not burn belly fat. Fat leaves the whole body in a deficit; the core work builds the muscle underneath so the waist looks tight once it goes.",
  },
  {
    t: "Log the reps, not just the tick",
    d: "The set chips record what you actually did. Next session shows last week's numbers beside the movement — beat one of them and you have progressed, even with the same dumbbells.",
  },
  {
    t: "Consistency beats intensity",
    d: "Five sessions a week for 8–12 weeks changes your body. One perfect week followed by nothing changes nothing.",
  },
  {
    t: "The scale lies week to week",
    d: "Use the trend line, not any single reading. Weigh at the same time of day, and pair it with how clothes fit. In a recomposition the mirror moves before the number does.",
  },
];

const QUOTES = [
  "Discipline is choosing what you want most over what you want now.",
  "You don't have to be extreme, just consistent.",
  "Small steps every day add up to big results.",
  "Fall in love with the process and the results will come.",
  "One session at a time. One meal at a time. One day at a time.",
];

/* ============================ HELPERS ============================ */

/**
 * The rest that follows a set. On the last set of an exercise there is no
 * "next set" to name, so the overlay points at the next movement instead.
 */
function restTimerFor(exercise: FitExercise, setIndex: number) {
  const hasNextSet = setIndex < exercise.sets - 1;
  return {
    id: Date.now(),
    mode: "rest" as const,
    total: exercise.restSec,
    title: hasNextSet ? `Next: ${exercise.name}` : "Move to the next exercise",
    subtitle: hasNextSet ? `Set ${setIndex + 2} of ${exercise.sets}` : undefined,
  };
}

/* ============================ VIEWS ============================ */

function FinishCard({
  doneSets,
  totalSets,
  completed,
  durationSec,
  rpe,
  notes,
  onFinish,
}: {
  doneSets: number;
  totalSets: number;
  completed: boolean;
  durationSec?: number;
  rpe?: number;
  notes?: string;
  onFinish: (rpe: number | undefined, notes: string | undefined) => Promise<void>;
}) {
  const [effort, setEffort] = useState<number | undefined>(rpe);
  const [note, setNote] = useState(notes ?? "");
  const [busy, setBusy] = useState(false);

  if (doneSets === 0) return null;

  if (completed) {
    return (
      <div className="rounded-2xl border border-[#7F9270]/40 bg-[#7F9270]/[0.08] p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
          <CheckCircle2 className="h-4 w-4 text-[#7F9270]" />
          Session logged
        </h3>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-muted-foreground">
          <span className="tabular-nums">
            {doneSets}/{totalSets} sets
          </span>
          {durationSec ? <span className="tabular-nums">{formatDuration(durationSec)}</span> : null}
          {rpe != null && <span className="tabular-nums">RPE {rpe}</span>}
        </p>
        {notes && (
          <p className="mt-2 text-xs font-semibold italic text-muted-foreground">{notes}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-extrabold text-foreground">Close out the session</h3>
        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
          Rate the effort so you can spot the weeks that were genuinely harder.
        </p>
      </div>

      <fieldset>
        <legend className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          <Gauge className="h-3 w-3" />
          Effort (1 easy — 10 all out)
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={effort === n}
              onClick={() => setEffort(effort === n ? undefined : n)}
              className={cn(
                "h-11 min-w-[38px] rounded-lg text-sm font-extrabold tabular-nums transition-colors",
                effort === n
                  ? "bg-gradient-to-br from-[#CE6A47] to-[#DC9447] text-white"
                  : "border border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Notes (optional)
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Left knee felt tight on split squats."
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[#C96442]/40"
        />
      </label>

      <button
        onClick={async () => {
          setBusy(true);
          try {
            await onFinish(effort, note.trim() || undefined);
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="h-11 w-full rounded-xl bg-gradient-to-r from-[#CE6A47] to-[#DC9447] text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Saving…" : `Finish session — ${doneSets}/${totalSets} sets`}
      </button>
    </div>
  );
}

function NutritionView() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-[#7F9270] to-[#9BAD86] p-5 text-white">
        <h1 className="text-xl font-black">Recomposition, not a cut</h1>
        <p className="mt-1.5 text-xs font-semibold leading-relaxed text-white/95">
          {NUTRITION.intro}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {NUTRITION.targets.map((t) => (
          <div key={t.k} className="space-y-1 rounded-2xl border border-border bg-card p-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-[#C96442]">
              {t.k}
            </div>
            <div className="text-sm font-extrabold text-foreground">{t.v}</div>
            <div className="text-xs font-semibold leading-snug text-muted-foreground">{t.n}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="text-base font-black text-foreground">Protein that fits the budget</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ranked by protein per rupee, not by marketing.
          </p>
        </div>
        <div className="space-y-2.5">
          {NUTRITION.proteins.map((p) => (
            <div
              key={p.f}
              className={cn(
                "rounded-xl border p-3",
                p.top
                  ? "border-[#C96442]/25 bg-[#C96442]/[0.06]"
                  : "border-border bg-muted/20"
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold text-foreground">
                  {p.f}
                  {p.top && (
                    <span className="ml-2 rounded-full bg-gradient-to-r from-[#CE6A47] to-[#DC9447] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white">
                      Top pick
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs font-extrabold tabular-nums text-[#C96442]">
                  {p.p}
                </span>
              </div>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{p.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h3 className="text-sm font-black text-foreground">Build every plate</h3>
          <div className="space-y-2.5">
            {NUTRITION.plate.map((p) => (
              <div key={p} className="flex gap-2 text-xs font-semibold text-muted-foreground">
                <span className="text-[#7F9270]">•</span>
                {p}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h3 className="text-sm font-black text-foreground">Keep these rare</h3>
          <div className="space-y-2.5">
            {NUTRITION.limit.map((p) => (
              <div key={p} className="flex gap-2 text-xs font-semibold text-muted-foreground">
                <span className="text-destructive">•</span>
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-black text-foreground">A day of eating</h2>
        <div className="space-y-3">
          {NUTRITION.sample.map((s) => (
            <div key={s.m} className="flex items-start gap-3">
              <span className="w-24 shrink-0 rounded border border-border bg-muted py-1 text-center text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                {s.m}
              </span>
              <span className="pt-0.5 text-xs font-semibold text-foreground/80">{s.d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LearnView() {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-[#3A332A] to-[#54493B] p-5 text-white">
        <h1 className="text-xl font-black">Why this plan is built this way</h1>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-white/90">
          Seven principles behind the five sessions. Read one when a session feels pointless.
        </p>
      </div>
      <div className="space-y-3">
        {TIPS.map((t, i) => (
          <article key={t.t} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
            <span
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-lg font-black tabular-nums text-[#C96442]/40"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">{t.t}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.d}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ============================ PAGE ============================ */

const TABS = [
  { k: "today", label: "Today", icon: Flame },
  { k: "plan", label: "Plan", icon: CalendarDays },
  { k: "progress", label: "Progress", icon: LineChart },
  { k: "eat", label: "Eat", icon: Utensils },
  { k: "learn", label: "Learn", icon: BookOpen },
] as const;

export default function FitPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["k"]>("today");
  const reduceMotion = useReducedMotion();
  const [confetti, setConfetti] = useState(false);
  const [weighInOpen, setWeighInOpen] = useState(false);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const today = useMemo(() => ymd(), []);
  const todayName = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "long" }),
    []
  );
  /** Which program day is being performed today — lets you make up a missed session. */
  const [activeDayKey, setActiveDayKey] = useState(todayName);
  const activeDay = getDay(activeDayKey);
  const totalSets = daySetCount(activeDayKey);

  const exerciseIds = useMemo(() => dayExercises(activeDayKey).map((e) => e.id), [activeDayKey]);

  /* ── Data ── */
  const profile = useQuery(api.madfit.getProfile);
  const sessionData = useQuery(api.madfit.getSession, { date: today });
  const stats = useQuery(api.madfit.getStats);
  const weights = useQuery(api.madfit.getWeights, { limit: 90 });
  const history = useQuery(api.madfit.getHistory, { limit: 30 });
  const lastPerformance = useQuery(api.madfit.getLastPerformance, {
    exerciseIds,
    excludeDate: today,
  });

  const toggleSetMutation = useMutation(api.madfit.toggleSet);
  const updateSetMutation = useMutation(api.madfit.updateSet);
  const clearExerciseMutation = useMutation(api.madfit.clearExercise);
  const resetDayMutation = useMutation(api.madfit.resetDay);
  const finishSessionMutation = useMutation(api.madfit.finishSession);
  const logWeightMutation = useMutation(api.madfit.logWeight);
  const deleteWeightMutation = useMutation(api.madfit.deleteWeight);
  const updateProfileMutation = useMutation(api.madfit.updateProfile);
  const bootstrapMutation = useMutation(api.madfit.bootstrap);

  /* ── First run: seed the starting weight, drain the legacy blob ── */
  useEffect(() => {
    if (profile && !profile.initialized) {
      bootstrapMutation({}).catch(() => {
        /* best-effort; the new tables work regardless */
      });
    }
  }, [profile, bootstrapMutation]);

  const loading = sessionData === undefined || stats === undefined;

  const sets: SetLog[] = (sessionData?.sets ?? []) as SetLog[];
  const session = sessionData?.session ?? null;
  const doneSets = sets.length;
  const pct = totalSets ? doneSets / totalSets : 0;

  const completedDates = stats?.completedDates ?? [];
  const streak = calcStreak(completedDates);
  const weekDone = weekCount(completedDates);

  /* ── Timers ── */
  /**
   * `id` is the React key for the overlay. Without it, going work → rest reuses
   * the same component instance and inherits the finished countdown.
   */
  const [timer, setTimer] = useState<null | {
    id: number;
    mode: "work" | "rest";
    total: number;
    title: string;
    subtitle?: string;
    pending?: { exercise: FitExercise; setIndex: number };
  }>(null);
  const nextTimerId = () => Date.now();

  const celebrate = useCallback(() => {
    setConfetti(true);
    beep(880);
    vibrate([40, 80, 40]);
    setTimeout(() => setConfetti(false), 2600);
  }, []);

  const commitSet = useCallback(
    async (exercise: FitExercise, setIndex: number) => {
      const result = await toggleSetMutation({
        date: today,
        dayKey: activeDayKey,
        planVersion: PLAN_VERSION,
        totalSets,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        setIndex,
        reps: exercise.seconds ? undefined : exercise.targetReps,
        durationSec: exercise.seconds,
      });
      if (result?.justCompleted) celebrate();
      return result;
    },
    [toggleSetMutation, today, activeDayKey, totalSets, celebrate]
  );

  const handleToggleSet = useCallback(
    async (exercise: FitExercise, setIndex: number) => {
      const alreadyLogged = sets.some(
        (s) => s.exerciseId === exercise.id && s.setIndex === setIndex
      );

      // Clearing a logged set never starts a timer.
      if (alreadyLogged) {
        await toggleSetMutation({
          date: today,
          dayKey: activeDayKey,
          planVersion: PLAN_VERSION,
          totalSets,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          setIndex,
        });
        return;
      }

      // Timed movements run the clock first, then log what was actually held.
      if (exercise.seconds) {
        setTimer({
          id: nextTimerId(),
          mode: "work",
          total: exercise.seconds,
          title: exercise.name,
          subtitle: `Set ${setIndex + 1} of ${exercise.sets}`,
          pending: { exercise, setIndex },
        });
        return;
      }

      vibrate();
      await commitSet(exercise, setIndex);
      if (exercise.restSec > 0) setTimer(restTimerFor(exercise, setIndex));
    },
    [sets, toggleSetMutation, today, activeDayKey, totalSets, commitSet]
  );

  const handleWorkTimerDone = useCallback(async () => {
    const pending = timer?.pending;
    setTimer(null);
    if (!pending) return;
    await commitSet(pending.exercise, pending.setIndex);
    if (pending.exercise.restSec > 0) {
      setTimer(restTimerFor(pending.exercise, pending.setIndex));
    }
  }, [timer, commitSet]);

  const handlers = useMemo(
    () => ({
      onToggleSet: handleToggleSet,
      onUpdateSet: (setLogId: string, patch: any) =>
        updateSetMutation({ setLogId: setLogId as any, ...patch }),
      onClearExercise: (exerciseId: string) =>
        clearExerciseMutation({ date: today, exerciseId }),
    }),
    [handleToggleSet, updateSetMutation, clearExerciseMutation, today]
  );

  const handleLogWeight = useCallback(
    async (weightKg: number, date: string) => {
      await logWeightMutation({ weightKg, date });
    },
    [logWeightMutation]
  );

  const weightEntries = (weights ?? []) as unknown as WeightEntry[];

  return (
    <div className="flex min-h-full flex-col bg-background pb-24 md:pb-6">
      <WorkspaceTopBar
        moduleTitle="MadFit"
        rightContent={
          <button
            onClick={() => setWeighInOpen(true)}
            aria-label="Log your weight"
            title="Log your weight"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            <Scale className="h-4 w-4" />
            <span className="tabular-nums">
              {profile?.currentWeightKg != null ? `${profile.currentWeightKg.toFixed(1)} kg` : "Weigh in"}
            </span>
          </button>
        }
      />

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 pt-5">
        {/* Tab bar */}
        <div className="sticky top-[52px] z-30 -mx-4 bg-background/85 px-4 pb-2.5 pt-1 backdrop-blur-md">
          <div
            role="tablist"
            aria-label="MadFit sections"
            className="grid grid-cols-5 gap-1 rounded-2xl border border-border bg-muted/50 p-1"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const isSelected = tab === t.k;
              return (
                <button
                  key={t.k}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setTab(t.k);
                    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
                  }}
                  className="relative flex min-h-[44px] items-center justify-center rounded-xl text-xs font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C96442]/50"
                >
                  {isSelected && (
                    <motion.span
                      layoutId="fit-tab-pill"
                      className="absolute inset-0 rounded-xl bg-card shadow-sm"
                      transition={
                        reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }
                      }
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex flex-col items-center justify-center gap-1 sm:flex-row sm:gap-1.5",
                      isSelected ? "text-[#CE6A47]" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={isSelected ? 2.5 : 2} />
                    <span className="text-[11px] sm:text-xs">{t.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="skeleton-shimmer h-[132px] rounded-3xl" />
            <div className="grid grid-cols-3 gap-3">
              <div className="skeleton-shimmer h-[100px] rounded-2xl" />
              <div className="skeleton-shimmer h-[100px] rounded-2xl" />
              <div className="skeleton-shimmer h-[100px] rounded-2xl" />
            </div>
            <div className="skeleton-shimmer h-[110px] rounded-2xl" />
            <div className="skeleton-shimmer h-[180px] rounded-2xl" />
          </div>
        ) : tab === "today" ? (
          <div className="space-y-6">
            {/* Hero */}
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="bg-gradient-to-br from-[#CE6A47] via-[#E08A5B] to-[#DC9447] p-5 text-white sm:p-6">
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-white/80">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </div>
                <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">
                  {activeDay.title}
                </h1>
                <p className="mt-1 text-sm font-bold text-white/85">
                  {activeDay.tag} · {activeDay.duration} · {totalSets} working sets
                </p>
                <p className="mt-3 text-xs font-semibold italic leading-relaxed text-white/90 sm:text-sm">
                  &ldquo;{quote}&rdquo;
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatTile icon={Flame} value={streak} label="Day streak" />
              <StatTile
                icon={Target}
                value={`${weekDone}/${TRAINING_DAYS_PER_WEEK}`}
                label="This week"
              />
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-3">
                <Ring
                  value={pct}
                  size={52}
                  stroke={6}
                  label={`${Math.round(pct * 100)}%`}
                />
                <div className="mt-1.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  Session
                </div>
              </div>
            </div>

            {/* Day override */}
            <div
              role="group"
              aria-label="Which day's session are you training"
              className="rounded-2xl border border-border bg-card p-3"
            >
              <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Training which day&apos;s session
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setActiveDayKey(d)}
                    aria-pressed={activeDayKey === d}
                    className={cn(
                      "min-h-[36px] rounded-lg px-2.5 text-[11px] font-extrabold transition-colors",
                      activeDayKey === d
                        ? "bg-gradient-to-br from-[#CE6A47] to-[#DC9447] text-white"
                        : "border border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                    )}
                  >
                    {d.slice(0, 3)}
                    {d === todayName && (
                      <span className="ml-1 opacity-70" aria-label="today">
                        •
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <WeightSummaryCard
              entries={weightEntries}
              currentWeightKg={profile?.currentWeightKg ?? null}
              onLog={handleLogWeight}
            />

            <div className="space-y-2">
              <SectionHeading>Today&apos;s session</SectionHeading>
              <WorkoutDayCard
                day={activeDay}
                logs={sets}
                last={(lastPerformance ?? {}) as any}
                interactive
                defaultOpen
                isToday
                handlers={handlers}
                onResetDay={() => resetDayMutation({ date: today })}
              />
            </div>

            <FinishCard
              doneSets={doneSets}
              totalSets={totalSets}
              completed={session?.status === "completed"}
              durationSec={session?.durationSec}
              rpe={session?.rpe}
              notes={session?.notes}
              onFinish={async (rpe, notes) => {
                await finishSessionMutation({ date: today, rpe, notes });
                celebrate();
              }}
            />
          </div>
        ) : tab === "plan" ? (
          <div className="animate-fade-in space-y-5">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-[#D98E45] to-[#E6B574] p-5 text-white">
              <h1 className="text-xl font-black">The five-day week</h1>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-white/95">
                Every session runs 40–45 minutes flat, bookended by the same warm-up and cool-down.
                Open a day to see the blocks, cues and form references. Logging happens on the Today
                tab.
              </p>
            </div>
            <div className="space-y-3">
              {DAYS.map((d) => (
                <WorkoutDayCard
                  key={d}
                  day={PROGRAM[d]}
                  isToday={d === todayName}
                  defaultOpen={false}
                />
              ))}
            </div>
          </div>
        ) : tab === "progress" ? (
          <div className="animate-fade-in space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <StatTile icon={Flame} value={streak} label="Day streak" />
              <StatTile
                icon={CheckCircle2}
                value={stats?.totalSessions ?? 0}
                label="Sessions"
              />
              <StatTile icon={Gauge} value={stats?.totalSets ?? 0} label="Sets logged" />
            </div>

            <WeightPanel
              entries={weightEntries}
              currentWeightKg={profile?.currentWeightKg ?? null}
              startWeightKg={profile?.startWeightKg ?? null}
              goalWeightKg={profile?.goalWeightKg ?? null}
              onLog={handleLogWeight}
              onDelete={(id) => deleteWeightMutation({ id: id as any })}
              onSetGoal={(goalKg) => updateProfileMutation({ goalWeightKg: goalKg })}
            />

            <TrainingHeatmap completedDates={completedDates} />

            <div className="space-y-2">
              <SectionHeading>Session history</SectionHeading>
              {history === undefined ? (
                <div className="skeleton-shimmer h-24 rounded-2xl" />
              ) : (
                <SessionHistory sessions={history as any} />
              )}
            </div>
          </div>
        ) : tab === "eat" ? (
          <NutritionView />
        ) : (
          <LearnView />
        )}
      </div>

      {timer && (
        <TimerOverlay
          key={timer.id}
          mode={timer.mode}
          total={timer.total}
          title={timer.title}
          subtitle={timer.subtitle}
          onDone={timer.mode === "work" ? handleWorkTimerDone : () => setTimer(null)}
          onCancel={() => setTimer(null)}
        />
      )}
      {confetti && <Confetti />}

      <WeighInDialog
        open={weighInOpen}
        onOpenChange={setWeighInOpen}
        currentWeightKg={profile?.currentWeightKg ?? null}
        onLog={handleLogWeight}
      />
    </div>
  );
}
