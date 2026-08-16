/**
 * MadFit training program — single source of truth.
 *
 * Exercise `id` values are STABLE SLUGS and must never be reused for a
 * different movement. Every set logged in `madfitSetLogs` references one, so
 * renaming an id silently orphans history. Adding/removing exercises is safe;
 * repurposing an id is not.
 *
 * Bump PLAN_VERSION whenever the program itself changes so past sessions stay
 * attributable to the plan that produced them.
 */

export const PLAN_VERSION = "2026.08-5day-unilateral";

export type FitExercise = {
  id: string;
  name: string;
  /** Number of working sets — drives the set-chip rail. */
  sets: number;
  /** Human-readable target, e.g. "12–15" or "10–12 / leg". */
  reps: string;
  /** Numeric default pre-filled when a set is completed. */
  targetReps?: number;
  /** Present for holds and timed work; enables the work timer. */
  seconds?: number;
  restSec: number;
  restLabel: string;
  cue: string;
  /** Form-reference short, opened in a new tab. */
  video?: string;
};

export type FitBlock = {
  id: string;
  label: string;
  meta: string;
  /** Renders A1/A2 bound together — perform back-to-back, rest after the pair. */
  superset?: boolean;
  exercises: FitExercise[];
};

export type FitDayType =
  | "push"
  | "legs"
  | "conditioning"
  | "arms"
  | "metcon"
  | "recovery"
  | "rest";

export type FitDay = {
  key: string;
  type: FitDayType;
  title: string;
  tag: string;
  duration: string;
  blurb: string;
  blocks: FitBlock[];
  /** Universal warm-up / cool-down are appended by the renderer. */
  warmup: boolean;
  cooldown: boolean;
};

/* ── Universal bookends ──────────────────────────────────────────────────── */

export const WARMUP = {
  title: "Universal warm-up",
  duration: "5 min",
  items: [
    "Arm circles + torso twists — 60s total",
    "Inchworm walkouts — 5 reps",
    "Bodyweight squat to stand — 8 reps",
    "Cat-cow to bird-dog — 6 reps / side",
  ],
};

export const COOLDOWN = {
  title: "Universal cool-down",
  duration: "4 min",
  items: [
    "Child's pose — 45s",
    "Cobra to downward dog — 45s",
    "Kneeling hip-flexor stretch — 30s / side",
    "Cross-body shoulder stretch — 30s / side",
  ],
};

/* ── Day accents ─────────────────────────────────────────────────────────── */
/**
 * Drawn from the existing Notion-Warm accent set — no new hues introduced.
 *
 * These are literal Tailwind classes, so this file has to be covered by the
 * `content` globs in tailwind.config.js or the utilities are never generated
 * and the day header renders with no background at all. The config scans all
 * of `src/**` for that reason — do not narrow it back.
 */
export const DAY_ACCENT: Record<FitDayType, string> = {
  push: "from-[#CE6A47] via-[#E08A5B] to-[#DC9447]",
  legs: "from-[#B0532F] via-[#CE6A47] to-[#E08A5B]",
  conditioning: "from-[#7E96A8] to-[#9FB3C2]",
  arms: "from-[#D98E45] to-[#E6B574]",
  metcon: "from-[#C0563A] via-[#D98E45] to-[#E2AC6A]",
  recovery: "from-[#7F9270] to-[#9BAD86]",
  rest: "from-[#3A332A] to-[#54493B]",
};

/* ── The program ─────────────────────────────────────────────────────────── */

export const PROGRAM: Record<string, FitDay> = {
  Monday: {
    key: "Monday",
    type: "push",
    title: "Upper Body Push & Pull",
    tag: "Upper A",
    duration: "42 min",
    blurb:
      "Antagonist supersets keep intensity high without stretching the session. Push and pull alternate, so one muscle recovers while the other works.",
    warmup: true,
    cooldown: true,
    blocks: [
      {
        id: "A",
        label: "Block A · Press / Row superset",
        meta: "4 rounds · 30s between, 60s after the pair",
        superset: true,
        exercises: [
          {
            id: "db-floor-press",
            name: "DB Floor Press",
            sets: 4,
            reps: "12–15",
            targetReps: 13,
            restSec: 30,
            restLabel: "30s",
            cue: "3-second lowering tempo; keep elbows at 45° to the torso.",
            video: "https://www.youtube.com/shorts/uqA6mNN46ow",
          },
          {
            id: "db-bent-over-row",
            name: "DB Bent-Over Row",
            sets: 4,
            reps: "15",
            targetReps: 15,
            restSec: 60,
            restLabel: "60s",
            cue: "Hinge 45°, pull dumbbells toward the waist, pause 1s at the top.",
            video: "https://www.youtube.com/shorts/mqw8Zqj687Q",
          },
        ],
      },
      {
        id: "B",
        label: "Block B · Overhead / Deficit superset",
        meta: "3 rounds · 30s between, 60s after the pair",
        superset: true,
        exercises: [
          {
            id: "db-overhead-press",
            name: "DB Overhead Press",
            sets: 3,
            reps: "12",
            targetReps: 12,
            restSec: 30,
            restLabel: "30s",
            cue: "Neutral grip (palms facing in), ribs tucked down.",
          },
          {
            id: "deficit-pushup",
            name: "Push-ups (deficit on DBs)",
            sets: 3,
            reps: "Max · 10–15",
            targetReps: 12,
            restSec: 60,
            restLabel: "60s",
            cue: "Hands on the dumbbells for a deeper chest stretch.",
          },
        ],
      },
      {
        id: "core",
        label: "Core",
        meta: "3 rounds · 30s rest",
        exercises: [
          {
            id: "plank-db-drag",
            name: "Plank Hold + DB Drag",
            sets: 3,
            reps: "40s",
            seconds: 40,
            restSec: 30,
            restLabel: "30s",
            cue: "High plank; pull one dumbbell across the body without shifting the hips.",
          },
        ],
      },
    ],
  },

  Tuesday: {
    key: "Tuesday",
    type: "legs",
    title: "Lower Body Unilateral Hypertrophy",
    tag: "Lower",
    duration: "45 min",
    blurb:
      "Two 5 kg dumbbells get heavy fast once the load lands on a single leg. Unilateral work is how this plan escapes the goblet-squat cardio plateau.",
    warmup: true,
    cooldown: true,
    blocks: [
      {
        id: "A",
        label: "Block A · Front-leg loading",
        meta: "4 sets per leg · 60s rest",
        exercises: [
          {
            id: "bulgarian-split-squat",
            name: "Bulgarian Split Squat",
            sets: 4,
            reps: "10–12 / leg",
            targetReps: 11,
            restSec: 60,
            restLabel: "60s",
            cue: "Back foot on a chair or bed, slight torso lean to load the front glute.",
            video: "https://www.youtube.com/shorts/A3ctWjao8cc",
          },
        ],
      },
      {
        id: "B",
        label: "Block B · Posterior chain",
        meta: "4 sets per leg · 60s rest",
        exercises: [
          {
            id: "single-leg-db-rdl",
            name: "Single-Leg DB RDL",
            sets: 4,
            reps: "10–12 / leg",
            targetReps: 11,
            restSec: 60,
            restLabel: "60s",
            cue: "Hinge at the hips like a seesaw; keep the hips square to the floor.",
            video: "https://www.youtube.com/shorts/iFe5p-m-oeU",
          },
        ],
      },
      {
        id: "C",
        label: "Block C · Squat / Glute superset",
        meta: "3 rounds · 30s between, 45s after the pair",
        superset: true,
        exercises: [
          {
            id: "goblet-squat-1-5",
            name: "1.5-Rep Goblet Squat",
            sets: 3,
            reps: "12",
            targetReps: 12,
            restSec: 30,
            restLabel: "30s",
            cue: "All the way down, halfway up, back down, then stand. That is one rep.",
          },
          {
            id: "single-leg-glute-bridge",
            name: "Single-Leg Glute Bridge",
            sets: 3,
            reps: "12 / leg",
            targetReps: 12,
            restSec: 45,
            restLabel: "45s",
            cue: "Drive through the heel, hold 2s at the top contraction.",
          },
        ],
      },
      {
        id: "core",
        label: "Core",
        meta: "3 rounds · 30s rest",
        exercises: [
          {
            id: "dead-bug",
            name: "Dead Bug",
            sets: 3,
            reps: "10 / side",
            targetReps: 10,
            restSec: 30,
            restLabel: "30s",
            cue: "Lower the opposite arm and leg while pressing the lower back into the mat.",
          },
        ],
      },
    ],
  },

  Wednesday: {
    key: "Wednesday",
    type: "conditioning",
    title: "Aerobic Engine & Oblique Stability",
    tag: "Intervals",
    duration: "40 min",
    blurb:
      "An interval day that burns through active movement instead of joint load. Keep the pace repeatable — round four should look like round one.",
    warmup: true,
    cooldown: true,
    blocks: [
      {
        id: "A",
        label: "Interval block",
        meta: "45s work · 15s rest · 4 rounds · 60s between rounds",
        exercises: [
          {
            id: "db-thruster",
            name: "Dumbbell Thrusters",
            sets: 4,
            reps: "45s",
            seconds: 45,
            restSec: 15,
            restLabel: "15s",
            cue: "Squat and press overhead in one smooth motion.",
            video: "https://www.youtube.com/shorts/2bCwHq4bKCE",
          },
          {
            id: "mountain-climber",
            name: "Mountain Climbers",
            sets: 4,
            reps: "45s",
            seconds: 45,
            restSec: 15,
            restLabel: "15s",
            cue: "Steady, controlled knee drive — not a sprint.",
          },
          {
            id: "db-skater-lunge",
            name: "DB Skater Lunges",
            sets: 4,
            reps: "45s",
            seconds: 45,
            restSec: 15,
            restLabel: "15s",
            cue: "Lateral step back, loading the front outside hip.",
          },
          {
            id: "plank-shoulder-tap",
            name: "Plank Shoulder Taps",
            sets: 4,
            reps: "45s",
            seconds: 45,
            restSec: 60,
            restLabel: "60s",
            cue: "Keep the hips completely stationary. 60s rest closes the round.",
          },
        ],
      },
      {
        id: "core",
        label: "Core finisher",
        meta: "3 rounds · 30s rest",
        exercises: [
          {
            id: "russian-twist",
            name: "Russian Twists (1 DB)",
            sets: 3,
            reps: "20 total",
            targetReps: 20,
            restSec: 30,
            restLabel: "30s",
            cue: "Controlled rotation — touch the dumbbell beside each hip.",
          },
          {
            id: "side-plank-hip-pulse",
            name: "Side Plank with Hip Pulse",
            sets: 3,
            reps: "25s / side",
            seconds: 25,
            restSec: 30,
            restLabel: "30s",
            cue: "Hips high, pulse from the obliques, not the lower back.",
          },
        ],
      },
    ],
  },

  Thursday: {
    key: "Thursday",
    type: "arms",
    title: "Upper Body — Delts & Arms",
    tag: "Upper B",
    duration: "42 min",
    blurb:
      "Delts and arms are exactly where 5 kg is the right load for strict mechanics. No cheating the tempo here — the weight is not the limiter, control is.",
    warmup: true,
    cooldown: true,
    blocks: [
      {
        id: "A",
        label: "Block A · Delts / Biceps superset",
        meta: "4 rounds · 30s between, 45s after the pair",
        superset: true,
        exercises: [
          {
            id: "db-lateral-raise",
            name: "DB Lateral Raises",
            sets: 4,
            reps: "15",
            targetReps: 15,
            restSec: 30,
            restLabel: "30s",
            cue: "Slight forward torso lean, raise in the scapular plane (30° forward).",
            video: "https://www.youtube.com/shorts/lMYs7FY8os4",
          },
          {
            id: "db-hammer-curl",
            name: "DB Hammer Curls",
            sets: 4,
            reps: "12–15",
            targetReps: 13,
            restSec: 45,
            restLabel: "45s",
            cue: "Palms face each other throughout; 3-second lowering tempo.",
          },
        ],
      },
      {
        id: "B",
        label: "Block B · Triceps / Rear-delt superset",
        meta: "3 rounds · 30s between, 45s after the pair",
        superset: true,
        exercises: [
          {
            id: "db-floor-overhead-tricep-ext",
            name: "DB Floor Overhead Tricep Ext.",
            sets: 3,
            reps: "12–15",
            targetReps: 13,
            restSec: 30,
            restLabel: "30s",
            cue: "Lie on the mat, keep elbows pinned high, lower the DBs beside the ears.",
          },
          {
            id: "prone-cobra-rear-delt-fly",
            name: "Prone Cobras / Rear Delt Flyes",
            sets: 3,
            reps: "15",
            targetReps: 15,
            restSec: 45,
            restLabel: "45s",
            cue: "Lie chest down on the mat, squeeze the shoulder blades together.",
          },
        ],
      },
      {
        id: "core",
        label: "Core",
        meta: "3 rounds · 30s rest",
        exercises: [
          {
            id: "bicycle-crunch",
            name: "Bicycle Crunches",
            sets: 3,
            reps: "20 total",
            targetReps: 20,
            restSec: 30,
            restLabel: "30s",
            cue: "Slow 2-second rotation per side; opposite elbow to knee.",
          },
        ],
      },
    ],
  },

  Friday: {
    key: "Friday",
    type: "metcon",
    title: "Metabolic Density Finisher",
    tag: "500-Rep",
    duration: "40 min",
    blurb:
      "Total work volume is capped, so the session ends on time instead of drifting. Move through the five stations, rest 30s between each, 60s after the round.",
    warmup: true,
    cooldown: true,
    blocks: [
      {
        id: "A",
        label: "Density circuit",
        meta: "4 rounds · 30s between stations · 60s after each round",
        exercises: [
          {
            id: "db-reverse-lunge",
            name: "DB Reverse Lunges",
            sets: 4,
            reps: "12 / leg",
            targetReps: 12,
            restSec: 30,
            restLabel: "30s",
            cue: "Step back, drive through the front heel.",
          },
          {
            id: "db-floor-press-bridge",
            name: "DB Floor Press to Bridge",
            sets: 4,
            reps: "12",
            targetReps: 12,
            restSec: 30,
            restLabel: "30s",
            cue: "Press the dumbbells while holding the hips up in a glute bridge.",
          },
          {
            id: "db-renegade-row",
            name: "DB Renegade Rows",
            sets: 4,
            reps: "10 / arm",
            targetReps: 10,
            restSec: 30,
            restLabel: "30s",
            cue: "Plank position row; brace the core to prevent twisting.",
          },
          {
            id: "db-push-press",
            name: "DB Push Press",
            sets: 4,
            reps: "12",
            targetReps: 12,
            restSec: 30,
            restLabel: "30s",
            cue: "Dip the knees slightly and use the legs to punch the weights up.",
          },
          {
            id: "hollow-body-hold",
            name: "Hollow Body Hold",
            sets: 4,
            reps: "30s",
            seconds: 30,
            restSec: 60,
            restLabel: "60s",
            cue: "Lower back pinned flat, toes pointed. 60s rest closes the round.",
          },
        ],
      },
    ],
  },

  Saturday: {
    key: "Saturday",
    type: "recovery",
    title: "Active Recovery",
    tag: "Recover",
    duration: "30–45 min",
    blurb:
      "Recovery is where the adaptation actually happens. Stay lightly active — the goal is blood flow, not stimulus.",
    warmup: false,
    cooldown: true,
    blocks: [
      {
        id: "A",
        label: "Move & mobilise",
        meta: "Easy pace · no intensity",
        exercises: [
          {
            id: "recovery-walk",
            name: "Brisk Walk",
            sets: 1,
            reps: "30–45 min",
            restSec: 0,
            restLabel: "—",
            cue: "Steady walk outdoors. Conversational pace throughout.",
          },
          {
            id: "recovery-mobility-flow",
            name: "Full-Body Mobility Flow",
            sets: 1,
            reps: "8–10 min",
            restSec: 0,
            restLabel: "—",
            cue: "Cat-cow, world's-greatest-stretch, hip openers, shoulder rolls.",
          },
          {
            id: "recovery-stretch",
            name: "Gentle Yoga / Stretch",
            sets: 1,
            reps: "8–10 min",
            restSec: 0,
            restLabel: "—",
            cue: "Hold easy stretches, breathe deep, release the tight spots.",
          },
        ],
      },
    ],
  },

  Sunday: {
    key: "Sunday",
    type: "rest",
    title: "Full Rest",
    tag: "Rest",
    duration: "All day",
    blurb:
      "Complete rest. Muscle rebuilds, hormones reset, and next week's sessions get their quality from today.",
    warmup: false,
    cooldown: false,
    blocks: [
      {
        id: "A",
        label: "Today's job: recover",
        meta: "No structured training",
        exercises: [
          {
            id: "rest-sleep",
            name: "Sleep",
            sets: 1,
            reps: "7–8 hrs",
            restSec: 0,
            restLabel: "—",
            cue: "The single highest-leverage recovery tool you have. Protect it.",
          },
          {
            id: "rest-meal-prep",
            name: "Meal Prep for the Week",
            sets: 1,
            reps: "—",
            restSec: 0,
            restLabel: "—",
            cue: "Boil eggs, soak soya chunks and dal, prep veggies.",
          },
        ],
      },
    ],
  },
};

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** Days that count toward the weekly training target. */
export const TRAINING_DAYS_PER_WEEK = 5;

/* ── Derived helpers ─────────────────────────────────────────────────────── */

export function getDay(dayKey: string): FitDay {
  return PROGRAM[dayKey] ?? PROGRAM.Monday;
}

/** Every exercise in a day, flattened, in performance order. */
export function dayExercises(dayKey: string): FitExercise[] {
  return getDay(dayKey).blocks.flatMap((b) => b.exercises);
}

/** Total working sets in a day — the denominator for session progress. */
export function daySetCount(dayKey: string): number {
  return dayExercises(dayKey).reduce((sum, e) => sum + e.sets, 0);
}

export function isTrainingDay(dayKey: string): boolean {
  const t = getDay(dayKey).type;
  return t !== "rest" && t !== "recovery";
}
