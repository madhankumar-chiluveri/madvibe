"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Play,
  Flame,
  Award,
  Calendar,
  Utensils,
  BookOpen,
  Info,
  TrendingUp,
} from "lucide-react";

/* ============================ DATA ============================ */
const WARMUP = {
  duration: "6–7 min",
  items: [
    "Jumping Jacks — 60s",
    "High Knees — 45s",
    "Knee-to-Hand Folds — 30s",
    "Arm Circles — 30s each way",
    "Bodyweight Squats — 15 reps",
    "Standing Torso Twists — 30s (wakes up obliques)",
    "Inchworm Walkouts — 5 reps",
  ],
};

const ex = (name: string, detail: string, rest: string, desc: string) => ({
  name,
  detail,
  rest,
  desc,
});

const PROGRAM: Record<
  string,
  {
    type: string;
    icon: string;
    focus: string;
    tag: string;
    duration: string;
    blurb: string;
    blocks: Array<{
      name: string;
      meta: string;
      exercises: Array<{ name: string; detail: string; rest: string; desc: string }>;
    }>;
    cooldown?: string[];
  }
> = {
  Monday: {
    type: "strength",
    icon: "🔥",
    focus: "Full-Body Strength · Push",
    tag: "Strength A",
    duration: "≈ 60 min",
    blurb:
      "Builds muscle that keeps your metabolism high. Supersets keep your heart rate up so you burn while you lift.",
    blocks: [
      {
        name: "Block A · Lower + Push",
        meta: "3 rounds · rest 45–60s",
        exercises: [
          ex(
            "Goblet Squat",
            "3 × 15",
            "60s",
            "Hold 1 dumbbell at chest, sit back to parallel, drive up through heels."
          ),
          ex(
            "Push-ups",
            "3 × 12–15",
            "60s",
            "Body in a straight line, lower chest near floor, full lockout up."
          ),
        ],
      },
      {
        name: "Block B · Push + Pull",
        meta: "3 rounds · rest 45–60s",
        exercises: [
          ex(
            "DB Floor Press",
            "3 × 15",
            "60s",
            "Lie on mat, press both dumbbells up, control down till elbows touch floor."
          ),
          ex(
            "DB Bent-over Row",
            "3 × 15",
            "60s",
            "Hinge at hips, flat back, pull dumbbells to waist, squeeze shoulder blades."
          ),
        ],
      },
      {
        name: "Block C · Shoulders + Arms",
        meta: "3 rounds · rest 45s",
        exercises: [
          ex(
            "DB Shoulder Press",
            "3 × 12",
            "45s",
            "Press dumbbells overhead from shoulders, no leaning back."
          ),
          ex(
            "DB Bicep Curl",
            "3 × 15",
            "45s",
            "Palms up, curl without swinging, slow 2-count down."
          ),
        ],
      },
      {
        name: "Core Finisher · Oblique Focus",
        meta: "3 rounds · rest 30s",
        exercises: [
          ex(
            "Russian Twist (1 DB)",
            "3 × 20 total",
            "30s",
            "Lean back, feet up, rotate dumbbell side to side — carves obliques."
          ),
          ex(
            "Bicycle Crunch",
            "3 × 20 total",
            "30s",
            "Opposite elbow to knee, slow and controlled, not rushed."
          ),
          ex("Side Plank", "3 × 30s / side", "30s", "Hips high, straight line, brace the side abs hard."),
          ex("Plank", "3 × 45s", "30s", "Squeeze glutes + abs, no sagging hips."),
        ],
      },
    ],
    cooldown: [
      "Chest doorway stretch — 30s",
      "Shoulder cross-body stretch — 30s each",
      "Child's Pose — 45s",
      "Cobra stretch — 30s",
      "5 slow deep breaths",
    ],
  },
  Tuesday: {
    type: "hiit",
    icon: "⚡",
    focus: "HIIT Fat-Burn + Obliques",
    tag: "HIIT",
    duration: "≈ 55 min",
    blurb:
      "The day that torches calories. Short, brutal bursts spike your burn for hours afterward (the afterburn effect).",
    blocks: [
      {
        name: "HIIT Circuit",
        meta: "40s work / 20s rest · 4 rounds",
        exercises: [
          ex(
            "Burpees",
            "40s",
            "20s",
            "Full-body fat melter. Modify by stepping back instead of jumping if needed."
          ),
          ex("Mountain Climbers", "40s", "20s", "Plank position, drive knees fast, hips low."),
          ex(
            "Squat Jumps",
            "40s",
            "20s",
            "Explode up, land soft. Swap for fast air-squats for low impact."
          ),
          ex("High Knees", "40s", "20s", "Run in place, knees to hip height, pump arms."),
          ex(
            "Skater Hops",
            "40s",
            "20s",
            "Lateral bounds side to side — hits obliques + glutes hard."
          ),
          ex("Plank Jacks", "40s", "20s", "Plank hold, jump feet wide and back together."),
        ],
      },
      {
        name: "Oblique & Core Circuit",
        meta: "3 rounds · rest 30s",
        exercises: [
          ex("Russian Twist (1 DB)", "3 × 24", "30s", "Controlled rotation, touch dumbbell beside each hip."),
          ex(
            "DB Woodchopper",
            "3 × 12 / side",
            "30s",
            "Swing dumbbell from high to opposite low knee — pure love-handle work."
          ),
          ex("Bicycle Crunch", "3 × 24", "30s", "Slow, full rotation through the trunk."),
          ex("Side Plank w/ Hip Dip", "3 × 12 / side", "30s", "Lower hip toward floor and back up under control."),
          ex("Leg Raises", "3 × 15", "30s", "Lower abs — keep lower back pressed into the mat."),
        ],
      },
    ],
    cooldown: [
      "Standing hamstring stretch — 30s each",
      "Hip-flexor lunge stretch — 30s each",
      "Lying spinal twist — 30s each",
      "Deep breathing — 1 min",
    ],
  },
  Wednesday: {
    type: "strength",
    icon: "🔥",
    focus: "Full-Body Strength · Legs/Pull",
    tag: "Strength B",
    duration: "≈ 60 min",
    blurb:
      "Legs and back are your biggest muscles — training them burns the most calories and shapes your whole frame.",
    blocks: [
      {
        name: "Block A · Legs",
        meta: "3 rounds · rest 60s",
        exercises: [
          ex(
            "DB Reverse Lunge",
            "3 × 12 / leg",
            "60s",
            "Step back, drop knee toward floor, drive through front heel."
          ),
          ex(
            "DB Romanian Deadlift",
            "3 × 15",
            "60s",
            "Soft knees, push hips back, feel hamstrings, flat back throughout."
          ),
        ],
      },
      {
        name: "Block B · Pull + Glutes",
        meta: "3 rounds · rest 45–60s",
        exercises: [
          ex("DB Bent-over Row", "3 × 15", "60s", "Pull to waist, squeeze back, no jerking."),
          ex("DB Glute Bridge", "3 × 20", "45s", "Dumbbell on hips, drive up, squeeze glutes hard at top."),
        ],
      },
      {
        name: "Block C · Arms + Shoulders",
        meta: "3 rounds · rest 45s",
        exercises: [
          ex("DB Hammer Curl", "3 × 15", "45s", "Palms facing in, curl up, control down."),
          ex(
            "DB Lateral Raise",
            "3 × 15",
            "45s",
            "Raise dumbbells to shoulder height, slight bend, lead with elbows."
          ),
        ],
      },
      {
        name: "Core Finisher",
        meta: "3 rounds · rest 30s",
        exercises: [
          ex("Plank", "3 × 45–60s", "30s", "Rock solid line head to heels."),
          ex("Dead Bug", "3 × 12 / side", "30s", "Opposite arm + leg extend, lower back glued to mat."),
          ex("Reverse Crunch", "3 × 15", "30s", "Curl hips off floor, knees toward chest, slow lower."),
          ex("Side Plank", "3 × 30s / side", "30s", "Brace obliques, hips lifted."),
        ],
      },
    ],
    cooldown: [
      "Standing quad stretch — 30s each",
      "Figure-4 glute stretch — 30s each",
      "Calf stretch on wall — 30s each",
      "Child's Pose — 45s",
    ],
  },
  Thursday: {
    type: "hiit",
    icon: "⚡",
    focus: "HIIT + Lower-Body Burn",
    tag: "HIIT",
    duration: "≈ 55 min",
    blurb:
      "Conditioning + glutes and legs. Big-muscle HIIT means a massive calorie cost in under an hour.",
    blocks: [
      {
        name: "HIIT Circuit",
        meta: "40s work / 20s rest · 4 rounds",
        exercises: [
          ex("Squat Jumps", "40s", "20s", "Explosive up, soft landing. Air-squats if low impact."),
          ex("Alt Reverse Lunges", "40s", "20s", "Step back left/right alternating, steady pace."),
          ex("Glute Bridge (or DB)", "40s", "20s", "Fast but controlled hip drives, squeeze each rep."),
          ex("Mountain Climbers", "40s", "20s", "Knees driving, core tight."),
          ex("Lateral Skater Hops", "40s", "20s", "Bound side to side, stick each landing."),
          ex("Plank-to-Push-up", "40s", "20s", "Up to hands, down to forearms, alternate lead arm."),
        ],
      },
      {
        name: "Lower-Ab & Oblique Circuit",
        meta: "3 rounds · rest 30s",
        exercises: [
          ex("Leg Raises", "3 × 15", "30s", "Slow, no momentum, lower back down flat."),
          ex("Flutter Kicks", "3 × 30s", "30s", "Small fast kicks, legs low, abs engaged."),
          ex("Russian Twist (1 DB)", "3 × 24", "30s", "Full rotation each side."),
          ex("Side Plank", "3 × 30s / side", "30s", "Hold strong, hips up."),
          ex("Bicycle Crunch", "3 × 24", "30s", "Controlled twist, elbow meets opposite knee."),
        ],
      },
    ],
    cooldown: [
      "Hamstring stretch — 30s each",
      "Quad stretch — 30s each",
      "Pigeon / hip stretch — 30s each",
      "Deep breathing — 1 min",
    ],
  },
  Friday: {
    type: "strength",
    icon: "💥",
    focus: "Total-Body Metabolic Circuit",
    tag: "Burn Finisher",
    duration: "≈ 60 min",
    blurb:
      "The week's grand finale — a fast full-body circuit that crushes calories and ends the week on a high.",
    blocks: [
      {
        name: "Metabolic Circuit",
        meta: "5 rounds · rest 60s between rounds",
        exercises: [
          ex("Goblet Squat", "5 × 15", "—", "Move smoothly into the next exercise, minimal rest inside the round."),
          ex("Push-ups", "5 × 12", "—", "Steady tempo, full range."),
          ex("DB Bent-over Row", "5 × 15", "—", "Pull hard, control down."),
          ex(
            "DB Thruster",
            "5 × 12",
            "—",
            "Squat then press overhead in one fluid move — total-body burner."
          ),
          ex("Russian Twist (1 DB)", "5 × 20", "60s", "Finish the round with obliques, then rest 60s."),
        ],
      },
      {
        name: "Core Finisher",
        meta: "2 rounds · rest 30s",
        exercises: [
          ex("Plank", "2 × 60s", "30s", "Hold tight, breathe steady."),
          ex("Side Plank", "2 × 30s / side", "30s", "Both sides, hips high."),
          ex("Mountain Climbers", "2 × 40s", "30s", "Empty the tank."),
        ],
      },
    ],
    cooldown: [
      "Full-body forward fold — 45s",
      "Chest + shoulder stretch — 30s each",
      "Spinal twist — 30s each",
      "Child's Pose + 5 deep breaths",
    ],
  },
  Saturday: {
    type: "recovery",
    icon: "🌿",
    focus: "Active Recovery",
    tag: "Recover",
    duration: "30–45 min",
    blurb: "Recovery is where the body burns fat and rebuilds. Stay lightly active — don't just sit.",
    blocks: [
      {
        name: "Move & Mobilise",
        meta: "Easy pace, no intensity",
        exercises: [
          ex(
            "Brisk Walk",
            "30–45 min",
            "—",
            "Steady walk outdoors or on the spot — gentle fat-burn, zero strain."
          ),
          ex(
            "Full-Body Mobility Flow",
            "8–10 min",
            "—",
            "Cat-cow, world's-greatest-stretch, hip openers, shoulder rolls on the mat."
          ),
          ex(
            "Gentle Yoga / Stretch",
            "8–10 min",
            "—",
            "Hold easy stretches, breathe deep, release tight spots."
          ),
          ex("Optional Light Core", "2 × 30s plank", "—", "Only if you feel fresh — keep it easy."),
        ],
      },
    ],
    cooldown: ["Long deep-breathing — 2 min", "Hydrate well", "Prioritise an early night"],
  },
  Sunday: {
    type: "rest",
    icon: "😴",
    focus: "Full Rest",
    tag: "Rest",
    duration: "All day",
    blurb:
      "Complete rest. Muscles grow, hormones reset, and fat-loss accelerates when you actually recover.",
    blocks: [
      {
        name: "Today's Job: Recover",
        meta: "No structured training",
        exercises: [
          ex(
            "Rest & Sleep",
            "7–8 hrs",
            "—",
            "Sleep is the #1 fat-loss and recovery tool — protect it tonight."
          ),
          ex("Light Stretching (optional)", "5–10 min", "—", "Only if it feels good, nothing intense."),
          ex(
            "Meal Prep for the Week",
            "—",
            "—",
            "Boil eggs, soak soya chunks/dal, prep veggies — sets you up to win."
          ),
        ],
      },
    ],
    cooldown: ["Relax", "Hydrate", "Plan the week ahead"],
  },
};

const NUTRITION = {
  intro:
    "You're lean already (60 kg at 5'9\"), so this isn't a crash diet — it's a recomposition. Eat around maintenance with high protein, train hard, and the belly fat drops while you build muscle. No expensive protein boxes needed.",
  targets: [
    { k: "Protein", v: "~95–120 g/day", n: "≈ 1.6–2.0 g per kg. Builds & protects muscle, keeps you full." },
    { k: "Calories", v: "Maintenance to slight deficit", n: "A small deficit (~300 kcal) reveals abs without killing energy." },
    { k: "Water", v: "3–4 litres/day", n: "Curbs hunger, boosts metabolism & recovery." },
    { k: "Sleep", v: "7–8 hrs", n: "Poor sleep stalls fat loss. Non-negotiable." },
  ],
  proteins: [
    {
      f: "Soya Chunks (Nuggets)",
      p: "~52 g / 100g dry",
      note: "The cheapest protein in India by far. Soak, boil, add to curry. Your #1 hero.",
      icon: "🫘",
      top: true,
    },
    {
      f: "Eggs",
      p: "~6 g each",
      note: "Your 8/day ≈ 48 g — a great anchor. Spread them across meals, not all at once.",
      icon: "🥚",
      top: true,
    },
    {
      f: "Dal / Lentils (toor, moong, masoor)",
      p: "~9 g / cooked cup",
      note: "Cheap daily staple. Pair with rice/roti for a complete protein.",
      icon: "🍲",
    },
    {
      f: "Chana & Rajma",
      p: "~15 g / cup",
      note: "Protein + fibre that keeps you full for hours. Very budget-friendly.",
      icon: "🫛",
    },
    {
      f: "Curd / Dahi & Milk",
      p: "~3–3.5 g / 100 ml",
      note: "Cheap, gut-friendly protein. Great post-workout or as a snack.",
      icon: "🥛",
    },
    {
      f: "Peanuts / Roasted Chana",
      p: "~25 g / 100g",
      note: "Protein + healthy fats. Perfect cheap snack to beat hunger.",
      icon: "🥜",
    },
    {
      f: "Sattu (roasted gram flour)",
      p: "~20 g / 100g",
      note: "Mix with water + lemon + salt = a desi protein shake for pennies.",
      icon: "🥤",
    },
    {
      f: "Paneer / Tofu",
      p: "~18 g / 100g",
      note: "If budget allows — excellent, filling protein. Tofu is the cheaper option.",
      icon: "🧀",
    },
    {
      f: "Chicken Breast (if non-veg)",
      p: "~31 g / 100g",
      note: "Best price-to-protein animal source. Grill or curry, minimal oil.",
      icon: "🍗",
    },
  ],
  plate: [
    "½ plate veggies — fibre, fullness, micronutrients (cheap: spinach, cabbage, carrot, beans, tomato).",
    "Palm of protein every meal — eggs, soya, dal, curd, chicken.",
    "Fist of smart carbs — oats, 1–2 roti, brown rice, or sweet potato (not heaps).",
    "Thumb of healthy fat — peanuts, a few nuts, seeds, or a little ghee.",
  ],
  limit: [
    "Sugary drinks, packaged juice & cola — liquid belly fat.",
    "Fried snacks (samosa, chips, pakora) — easy calorie bombs.",
    "Maida / refined carbs, biscuits & sweets — keep these rare.",
    "Don't drink your calories — chai with lots of sugar adds up fast.",
  ],
  sample: [
    { m: "Breakfast", d: "Oats + milk + peanuts, or 3–4 boiled eggs + 1 roti." },
    { m: "Lunch", d: "Rice/roti + dal or soya curry + big bowl of veggies + curd." },
    { m: "Snack", d: "Sattu drink or roasted chana + a fruit. Black coffee pre-workout." },
    { m: "Post-Workout", d: "Curd or milk + 2 boiled eggs (fast protein for recovery)." },
    { m: "Dinner", d: "Soya/paneer/chicken + sautéed veggies + small portion of rice/roti." },
  ],
};

const TIPS = [
  {
    icon: "🎯",
    t: "You can't spot-reduce",
    d: "No amount of crunches burns belly fat directly. Fat leaves your whole body when you're in a deficit — the ab & oblique work builds the muscle underneath so your waist looks tight once the fat's gone.",
  },
  {
    icon: "🍽️",
    t: "Diet is 70% of the result",
    d: "You can't out-train a bad diet. The plan creates the burn; your food creates the deficit. Get both right and the love handles fade fast.",
  },
  {
    icon: "📈",
    t: "Progress your light dumbbells",
    d: "5 kg feels light, so make it count: slower tempo (3s down), shorter rest, more reps, and pause-reps. When 15 feels easy, push to 18–20 or slow it further.",
  },
  {
    icon: "🔁",
    t: "Consistency beats intensity",
    d: "Five solid 1-hour sessions every week for 8–12 weeks will transform you. One perfect week then quitting does nothing. Show up.",
  },
  {
    icon: "😴",
    t: "Sleep & water are fat-loss tools",
    d: "7–8 hrs of sleep and 3–4 L of water aren't optional extras — poor sleep raises hunger hormones and stalls fat loss directly.",
  },
  {
    icon: "🧠",
    t: "Mind-muscle + form first",
    d: "Feel the target muscle work. Clean form on lighter weight beats sloppy reps — it builds better and protects you from injury.",
  },
  {
    icon: "📸",
    t: "Track the right way",
    d: "The scale lies week to week. Use weekly waist measurements, progress photos, and how clothes fit. Recomp means the mirror changes even if weight barely moves.",
  },
];

const QUOTES = [
  "Discipline is choosing what you want most over what you want now.",
  "You don't have to be extreme, just consistent.",
  "Sweat now, shine later.",
  "Small steps every day add up to big results.",
  "The body achieves what the mind believes.",
  "Fall in love with the process and the results will come.",
  "One workout at a time. One meal at a time. One day at a time.",
  "Strong is the new goal.",
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/* ============================ HELPER FUNCTIONS ============================ */
function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function calcStreak(dates: string[]) {
  const set = new Set(dates);
  let s = 0;
  const cur = new Date();
  if (!set.has(ymd(cur))) cur.setDate(cur.getDate() - 1);
  while (set.has(ymd(cur))) {
    s++;
    cur.setDate(cur.getDate() - 1);
  }
  return s;
}

function weekDatesCount(dates: string[]) {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return dates.filter((d) => {
    const dt = new Date(d + "T00:00:00");
    return dt >= start;
  }).length;
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const c = new Ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.type = "sine";
    o.frequency.value = 820;
    g.gain.setValueAtTime(0.001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    o.start();
    o.stop(c.currentTime + 0.52);
  } catch (e) {}
}

/* ============================ SMALL COMPONENTS ============================ */
function Ring({
  value,
  size = 70,
  stroke = 8,
  color = "#C96442",
  label,
  sub,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label: string;
  sub?: string;
}) {
  const r = (size - stroke) / 2,
    c = 2 * Math.PI * r,
    off = c * (1 - Math.min(value, 1));
  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size}>
        <circle className="stroke-[#ECE3D5] dark:stroke-border" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.7,.2,1)" }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute text-center leading-none">
        <div className="font-extrabold text-foreground" style={{ fontSize: size * 0.26 }}>
          {label}
        </div>
        {sub && (
          <div className="font-bold text-muted-foreground" style={{ fontSize: size * 0.13 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function HeroArt() {
  return (
    <svg viewBox="0 0 220 160" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B0532F" />
          <stop offset="1" stopColor="#8E3F22" />
        </linearGradient>
      </defs>
      <circle cx="110" cy="84" r="60" fill="#fff" opacity=".10" />
      <circle cx="110" cy="84" r="46" fill="#fff" opacity=".12" />
      <path
        d="M38 84a72 72 0 0 1 144 0"
        fill="none"
        stroke="#FFE3D0"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".75"
      />
      <path
        d="M52 90a58 58 0 0 1 116 0"
        fill="none"
        stroke="#FFD2B4"
        strokeWidth="4"
        strokeLinecap="round"
        opacity=".55"
      />
      <g fill="url(#g2)">
        <circle cx="110" cy="48" r="11" />
        <rect x="103" y="60" width="14" height="34" rx="7" />
        <rect x="74" y="50" width="30" height="9" rx="4.5" transform="rotate(-18 74 50)" />
        <rect x="116" y="50" width="30" height="9" rx="4.5" transform="rotate(18 146 50)" />
        <rect x="100" y="92" width="10" height="30" rx="5" transform="rotate(16 100 92)" />
        <rect x="110" y="92" width="10" height="30" rx="5" transform="rotate(-20 120 92)" />
      </g>
      <rect x="60" y="34" width="100" height="6" rx="3" fill="#5C2C16" />
      <rect x="52" y="26" width="12" height="22" rx="4" fill="#3A1B0D" />
      <rect x="156" y="26" width="12" height="22" rx="4" fill="#3A1B0D" />
      <rect x="44" y="30" width="9" height="14" rx="3" fill="#5C2C16" />
      <rect x="167" y="30" width="9" height="14" rx="3" fill="#5C2C16" />
      <path d="M168 118l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FFE3D0" />
    </svg>
  );
}

function Confetti() {
  const colors = ["#C96442", "#E79A7B", "#D98E45", "#E2AC6A", "#7F9270", "#7E96A8"];
  const pieces = Array.from({ length: 80 }).map((_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 1.8;
    const duration = 2 + Math.random() * 2;
    const size = 6 + Math.random() * 8;
    const color = colors[Math.floor(Math.random() * colors.length)];
    return { id: i, left, delay, duration, size, color };
  });

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
      `}} />
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.5}px`,
            backgroundColor: p.color,
            top: "-20px",
            opacity: 0.9,
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

/* ============================ REST TIMER ============================ */
function RestTimer({
  total,
  onClose,
  nextLabel,
}: {
  total: number;
  onClose: () => void;
  nextLabel?: string;
}) {
  const [t, setT] = useState(total);
  const ref = useRef<any>(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      setT((p) => {
        if (p <= 1) {
          clearInterval(ref.current);
          beep();
          setTimeout(onClose, 400);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [onClose]);

  const pct = t / total;
  const mm = Math.floor(t / 60),
    ss = String(t % 60).padStart(2, "0");

  return (
    <div
      className="fixed inset-0 bg-background/50 backdrop-blur-sm z-[95] flex items-center justify-center p-4 transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[320px] rounded-2xl border border-border bg-card p-6 text-center shadow-2xl transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs font-extrabold tracking-widest uppercase text-[#C96442]">Rest</div>
        <div className="my-6 flex justify-center">
          <Ring value={pct} size={150} stroke={12} color="#C96442" label={`${mm}:${ss}`} />
        </div>
        {nextLabel && (
          <div className="text-sm font-semibold mb-6 text-muted-foreground">
            Next: <span className="font-bold text-foreground">{nextLabel}</span>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setT((p) => p + 15)}
            className="px-5 py-2.5 rounded-xl border border-border bg-muted/40 font-bold text-sm hover:bg-muted/80 active:scale-95 transition-transform"
          >
            +15s
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#CE6A47] to-[#DC9447] text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:opacity-90 active:scale-95 transition-transform"
          >
            Skip ›
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================ EXERCISE ITEM ============================ */
function ExItem({
  e,
  done,
  onToggle,
  onRest,
}: {
  e: { name: string; detail: string; rest: string; desc: string };
  done: boolean;
  onToggle: () => void;
  onRest: (secs: number, label: string) => void;
}) {
  const restSecs = (() => {
    const m = (e.rest || "").match(/(\d+)/);
    return m ? parseInt(m[1]) : 60;
  })();
  const hasRest = e.rest && e.rest !== "—";

  return (
    <div
      className={`p-3.5 rounded-xl border flex gap-3 items-start transition-all ${
        done
          ? "border-green-200 bg-green-50/45 dark:border-green-900/40 dark:bg-green-950/10"
          : "border-border bg-card/65"
      }`}
    >
      <button
        onClick={onToggle}
        aria-label="toggle complete"
        className={`shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm transition-all border ${
          done
            ? "bg-gradient-to-br from-[#7F9270] to-[#9BAD86] text-white border-transparent scale-100"
            : "bg-background border-border text-transparent hover:border-muted-foreground/45"
        }`}
      >
        {done ? "✓" : ""}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className={`font-bold text-sm leading-snug break-words ${
              done ? "text-muted-foreground line-through" : "text-foreground"
            }`}
          >
            {e.name}
          </span>
          <span className="shrink-0 whitespace-nowrap font-extrabold text-[12.5px] text-[#C96442]">
            {e.detail}
          </span>
        </div>
        <p className="text-[12px] mt-1 leading-snug text-muted-foreground">{e.desc}</p>
        {hasRest && (
          <button
            onClick={() => onRest(restSecs, e.name)}
            className="mt-3.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-orange-100 bg-orange-50/50 text-[#AE4F2E] dark:border-orange-950/20 dark:bg-orange-950/10 dark:text-[#E79A7B]"
          >
            ⏱ Rest {e.rest}
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================ WORKOUT DAY ============================ */
function WorkoutDay({
  dayKey,
  data,
  progress,
  toggle,
  resetDay,
  onRest,
  openDefault,
  isToday,
}: {
  dayKey: string;
  data: any;
  progress: Record<string, boolean>;
  toggle: (id: string) => void;
  resetDay: (ids: string[]) => void;
  onRest: (secs: number, label: string) => void;
  openDefault: boolean;
  isToday: boolean;
}) {
  const [open, setOpen] = useState(openDefault);
  const allIds: string[] = [];
  data.blocks.forEach((b: any, bi: number) =>
    b.exercises.forEach((_: any, ei: number) => allIds.push(`${dayKey}-${bi}-${ei}`))
  );
  const doneCount = allIds.filter((id) => progress[id]).length;
  const total = allIds.length;
  const pct = total ? doneCount / total : 0;
  const complete = total > 0 && doneCount === total;

  const accentClass =
    data.type === "strength"
      ? "from-[#CE6A47] via-[#E08A5B] to-[#DC9447]"
      : data.type === "hiit"
        ? "from-[#D98E45] to-[#E6B574]"
        : data.type === "recovery"
          ? "from-[#7F9270] to-[#9BAD86]"
          : "from-[#3A332A] to-[#54493B]";

  return (
    <div className={`rounded-2xl border border-border bg-card overflow-hidden transition-all ${isToday ? "ring-1 ring-[#C96442]/30 shadow-md" : ""}`}>
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left block">
        <div className={`relative bg-gradient-to-r ${accentClass} p-4 sm:p-5 text-white`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black">{dayKey}</h3>
                {isToday && (
                  <span className="text-[10px] font-black bg-white/25 px-2 py-0.5 rounded-full tracking-wide">
                    TODAY
                  </span>
                )}
              </div>
              <p className="text-[13px] font-bold text-white/90 leading-snug mt-1">{data.focus}</p>
              <p className="text-[11px] font-bold text-white/75 mt-0.5">
                {data.tag} · {data.duration}
              </p>
            </div>
            <div className="shrink-0">
              {total > 0 ? (
                <Ring
                  value={pct}
                  size={52}
                  stroke={6}
                  color="#fff"
                  label={complete ? "✓" : `${doneCount}`}
                  sub={complete ? "" : `/ ${total}`}
                />
              ) : (
                <ChevronRight className="w-5 h-5 text-white/60" />
              )}
            </div>
          </div>
        </div>
      </button>

      {open && (
        <div className="p-4 sm:p-5 space-y-5 animate-fade-in">
          <div className="p-3.5 rounded-xl border border-orange-100/70 bg-orange-50/20 dark:border-orange-950/10 dark:bg-orange-950/5">
            <p className="text-sm font-semibold leading-relaxed text-foreground/80">{data.blurb}</p>
          </div>

          {data.type !== "rest" && data.type !== "recovery" && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-base">🔥</span>
                <h4 className="font-extrabold text-sm text-foreground">
                  Warm-up <span className="font-bold text-xs text-muted-foreground">· {WARMUP.duration}</span>
                </h4>
              </div>
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {WARMUP.items.map((w, i) => (
                  <div key={i} className="text-xs font-semibold flex gap-2 text-muted-foreground">
                    <span className="text-[#C96442]">•</span>
                    {w}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.blocks.map((b: any, bi: number) => (
            <div key={bi} className="space-y-2">
              <div className="flex items-start justify-between gap-2 px-1">
                <h4 className="font-extrabold text-sm text-foreground">{b.name}</h4>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                  {b.meta}
                </span>
              </div>
              <div className="space-y-2">
                {b.exercises.map((e: any, ei: number) => {
                  const id = `${dayKey}-${bi}-${ei}`;
                  return (
                    <ExItem
                      key={id}
                      e={e}
                      done={!!progress[id]}
                      onToggle={() => toggle(id)}
                      onRest={onRest}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {data.cooldown && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-base">🧘</span>
                <h4 className="font-extrabold text-sm text-foreground">
                  {data.type === "rest" ? "Reminders" : "Cool-down & Stretch"}
                </h4>
              </div>
              <div className="p-3.5 rounded-xl border border-border bg-emerald-50/15 dark:bg-emerald-950/5 grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {data.cooldown.map((c: string, i: number) => (
                  <div key={i} className="text-xs font-semibold flex gap-2 text-emerald-800 dark:text-emerald-400">
                    <span>•</span>
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {total > 0 && doneCount > 0 && (
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
              <span className="text-xs font-bold text-muted-foreground">
                {complete ? "🏆 Completed — great job!" : `${doneCount} of ${total} done`}
              </span>
              <button
                onClick={() => resetDay(allIds)}
                className="px-3 py-1.5 rounded-lg border border-orange-100 hover:border-orange-200 bg-orange-50/40 text-xs font-bold text-[#AE4F2E] transition-colors"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================ STAT CARD ============================ */
function StatCard({ icon, big, label }: { icon: string; big: string | number; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-black leading-tight text-foreground">{big}</div>
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}

/* ============================ VIEWS ============================ */
function TodayView({
  today,
  data,
  progress,
  toggle,
  resetDay,
  onRest,
  streak,
  weekCount,
  quote,
  weightLog,
  addWeight,
}: {
  today: string;
  data: any;
  progress: Record<string, boolean>;
  toggle: (id: string) => void;
  resetDay: (ids: string[]) => void;
  onRest: (secs: number, label: string) => void;
  streak: number;
  weekCount: number;
  quote: string;
  weightLog: Array<{ v: number; d: string }>;
  addWeight: (v: number) => void;
}) {
  const allIds: string[] = [];
  data.blocks.forEach((b: any, bi: number) =>
    b.exercises.forEach((_: any, ei: number) => allIds.push(`${today}-${bi}-${ei}`))
  );
  const doneCount = allIds.filter((id) => progress[id]).length;
  const pct = allIds.length ? doneCount / allIds.length : 0;
  const [w, setW] = useState("");
  const last = weightLog.length ? weightLog[weightLog.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* hero banner */}
      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <div className="relative bg-gradient-to-br from-[#CE6A47] via-[#E08A5B] to-[#DC9447] p-5 sm:p-6 text-white overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-extrabold text-white/80 tracking-widest uppercase">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-1 leading-tight">Let's go, Mad 💪</h1>
              <p className="text-xs sm:text-sm font-bold text-white/90 mt-2 italic leading-relaxed">
                "{quote}"
              </p>
            </div>
            <div className="w-20 h-16 sm:w-32 sm:h-24 shrink-0">
              <HeroArt />
            </div>
          </div>
        </div>
      </div>

      {/* key metrics */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="🔥" big={streak} label="Streak" />
        <StatCard icon="📅" big={`${weekCount}/5`} label="This Week" />
        <div className="rounded-2xl border border-border bg-card p-3 flex flex-col items-center justify-center">
          <Ring value={pct} size={52} stroke={6} color="#C96442" label={`${Math.round(pct * 100)}%`} />
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mt-1.5">
            Today
          </div>
        </div>
      </div>

      {/* weight tracker */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
              <span>⚖️</span> Weigh-in tracker
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-bold">
              {last ? `Last logged: ${last.v} kg on ${last.d}` : "Log weekly to follow weight trends."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={w}
              onChange={(e) => setW(e.target.value)}
              type="text"
              inputMode="decimal"
              placeholder="kg"
              className="w-20 px-3 py-2 rounded-xl text-center text-sm font-bold border border-border bg-muted/40 outline-none focus:ring-1 focus:ring-[#C96442]/30 focus:bg-background transition-all"
            />
            <button
              onClick={() => {
                const n = parseFloat(w);
                if (!isNaN(n)) {
                  addWeight(n);
                  setW("");
                }
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#CE6A47] to-[#DC9447] text-white font-bold text-sm shadow-md hover:opacity-90 active:scale-95 transition-transform"
            >
              Log
            </button>
          </div>
        </div>
        {weightLog.length > 1 && (
          <div>
            <div className="flex items-end gap-2 h-14 border-b border-border/60 pb-1">
              {weightLog.slice(-12).map((p, i, arr) => {
                const vals = arr.map((x) => x.v);
                const mn = Math.min(...vals),
                  mx = Math.max(...vals);
                const h = mx === mn ? 60 : 20 + ((p.v - mn) / (mx - mn)) * 80;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-[9px] font-black text-foreground mb-0.5">{p.v}</span>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-[#CE6A47] to-[#E08A5B]"
                      style={{ height: `${h}%` }}
                      title={`${p.v} kg on ${p.d}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] font-bold text-muted-foreground mt-1.5 px-1">
              <span>{weightLog.slice(-12)[0]?.d}</span>
              <span>Weigh-in history</span>
              <span>{weightLog[weightLog.length - 1]?.d}</span>
            </div>
          </div>
        )}
      </div>

      {/* today's session */}
      <div className="space-y-2">
        <h2 className="font-extrabold text-[15px] text-foreground tracking-wide uppercase px-1">
          Today's Workout
        </h2>
        <WorkoutDay
          dayKey={today}
          data={data}
          progress={progress}
          toggle={toggle}
          resetDay={resetDay}
          onRest={onRest}
          openDefault={true}
          isToday={true}
        />
      </div>
    </div>
  );
}

function PlanView({
  progress,
  toggle,
  resetDay,
  onRest,
  today,
}: {
  progress: Record<string, boolean>;
  toggle: (id: string) => void;
  resetDay: (ids: string[]) => void;
  onRest: (secs: number, label: string) => void;
  today: string;
}) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-[#D98E45] to-[#E6B574] p-5 text-white">
        <h1 className="text-xl font-black">7-Day Fit Schedule</h1>
        <p className="text-xs font-semibold text-white/95 mt-1 leading-relaxed">
          5 structured days for full body recomposition. Tap a day below to reveal the routine.
        </p>
      </div>
      <div className="space-y-3">
        {DAYS.map((d) => (
          <WorkoutDay
            key={d}
            dayKey={d}
            data={PROGRAM[d]}
            progress={progress}
            toggle={toggle}
            resetDay={resetDay}
            onRest={onRest}
            openDefault={false}
            isToday={d === today}
          />
        ))}
      </div>
    </div>
  );
}

function NutritionView() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-[#7F9270] to-[#9BAD86] p-5 text-white">
        <h1 className="text-xl font-black">Body Recomposition Diet 🥗</h1>
        <p className="text-xs font-semibold text-white/95 mt-1.5 leading-relaxed">{NUTRITION.intro}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {NUTRITION.targets.map((t, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-[#C96442]">{t.k}</div>
            <div className="font-extrabold text-sm text-foreground">{t.v}</div>
            <div className="text-xs text-muted-foreground font-semibold leading-snug">{t.n}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-black text-base text-foreground">Desi Protein Heroes 🇮🇳</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Budget-friendly protein staples. High quality, zero waste.
          </p>
        </div>
        <div className="space-y-3">
          {NUTRITION.proteins.map((p, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border flex gap-3 items-start ${
                p.top
                  ? "border-orange-100 bg-orange-50/15 dark:border-orange-950/20 dark:bg-orange-950/5"
                  : "border-border bg-muted/20"
              }`}
            >
              <div className="text-2xl shrink-0">{p.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold text-sm text-foreground">
                    {p.f}
                    {p.top && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#CE6A47] to-[#DC9447] text-white ml-2">
                        TOP PICK
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-extrabold text-xs text-[#C96442]">{p.p}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{p.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
          <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
            <span className="text-emerald-600">✓</span> Build Every Plate
          </h3>
          <div className="space-y-2.5">
            {NUTRITION.plate.map((p, i) => (
              <div key={i} className="text-xs font-semibold flex gap-2 text-muted-foreground">
                <span className="text-emerald-600">•</span>
                {p}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
          <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
            <span className="text-red-500">✕</span> Keep These Rare
          </h3>
          <div className="space-y-2.5">
            {NUTRITION.limit.map((p, i) => (
              <div key={i} className="text-xs font-semibold flex gap-2 text-muted-foreground">
                <span className="text-red-500">•</span>
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-black text-base text-foreground">Desi Meal Framework 📋</h2>
        <div className="space-y-4">
          {NUTRITION.sample.map((s, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="shrink-0 text-[10px] font-black uppercase tracking-wider py-1 rounded bg-muted text-muted-foreground w-20 text-center border border-border">
                {s.m}
              </span>
              <span className="text-xs font-semibold text-foreground/80 pt-0.5">{s.d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TipsView() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-[#3A332A] to-[#54493B] p-5 text-white">
        <h1 className="text-xl font-black">Trainer's Playbook 🧠</h1>
        <p className="text-xs font-semibold text-white/90 mt-1 leading-relaxed">
          Fundamental fitness principles to get shredded and build functional power.
        </p>
      </div>
      <div className="space-y-3">
        {TIPS.map((t, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 flex gap-4">
            <div className="text-3xl shrink-0 mt-0.5">{t.icon}</div>
            <div>
              <h3 className="font-extrabold text-sm text-foreground">{t.t}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t.d}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-orange-100 bg-orange-50/15 dark:border-orange-950/20 dark:bg-orange-950/5 p-5">
        <p className="text-xs font-bold leading-relaxed text-foreground/85 flex gap-2">
          <Info className="w-5 h-5 text-[#C96442] shrink-0 mt-0.5" />
          At 60 kg and 5'9", your focus is adding lean muscle while tighteningobliques. Avoid aggressive starvation; fuel your recovery, lift heavy, and trust the process.
        </p>
      </div>
    </div>
  );
}

/* ============================ MAIN COMPONENT ============================ */
export default function FitPage() {
  const [tab, setTab] = useState("today");
  const reduceMotion = useReducedMotion();
  const [rest, setRest] = useState<{ secs: number; label: string } | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayData = PROGRAM[today] || PROGRAM.Monday;

  // Convex data hooks
  const fitState = useQuery(api.madfit.getState);
  const updateProgressMutation = useMutation(api.madfit.updateProgress);
  const markDayCompleteMutation = useMutation(api.madfit.markDayComplete);
  const resetDayMutation = useMutation(api.madfit.resetDay);
  const addWeightMutation = useMutation(api.madfit.addWeight);

  const loading = fitState === undefined;

  // Helper arrays
  const dayIds = useCallback((dk: string) => {
    const ids: string[] = [];
    const d = PROGRAM[dk];
    if (d) {
      d.blocks.forEach((b: any, bi: number) =>
        b.exercises.forEach((_: any, ei: number) => ids.push(`${dk}-${bi}-${ei}`))
      );
    }
    return ids;
  }, []);

  const progress = fitState ? JSON.parse(fitState.progress || "{}") : {};
  const completedDates = fitState ? fitState.completedDates || [] : [];
  const weightLog = fitState ? fitState.weightLog || [] : [];

  const checkComplete = useCallback(
    async (np: Record<string, boolean>) => {
      const ids = dayIds(today);
      if (ids.length === 0) return;
      const all = ids.every((id) => np[id]);
      if (all) {
        const d = ymd(new Date());
        await markDayCompleteMutation({ date: d });
        setConfetti(true);
        beep();
        setTimeout(() => setConfetti(false), 2600);
      }
    },
    [today, dayIds, markDayCompleteMutation]
  );

  const toggle = async (id: string) => {
    const np = { ...progress };
    if (np[id]) {
      delete np[id];
    } else {
      np[id] = true;
    }
    await updateProgressMutation({ progress: JSON.stringify(np) });
    await checkComplete(np);
  };

  const resetDay = async (ids: string[]) => {
    await resetDayMutation({ ids });
  };

  const addWeight = async (v: number) => {
    const d = new Date().toLocaleDateString("en-US", { day: "numeric", month: "short" });
    await addWeightMutation({ v, d });
  };

  const onRest = (secs: number, label: string) => setRest({ secs, label });

  const streak = calcStreak(completedDates);
  const weekCount = weekDatesCount(completedDates);

  const tabs = [
    { k: "today", label: "Today", icon: Flame },
    { k: "plan", label: "Plan", icon: Calendar },
    { k: "eat", label: "Eat", icon: Utensils },
    { k: "learn", label: "Learn", icon: BookOpen },
  ];

  return (
    <div className="min-h-full bg-background flex flex-col pb-24 md:pb-6">
      <WorkspaceTopBar moduleTitle="MadFit" />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-5 space-y-6">
        {loading ? (
          <div className="text-center py-24 space-y-3">
            <div className="skeleton-shimmer h-12 w-3/4 mx-auto rounded-xl" />
            <div className="skeleton-shimmer h-24 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            {/* inner tabs selection — sticky below the top bar with a sliding active pill */}
            <div className="sticky top-[52px] z-30 -mx-4 px-4 pt-1 pb-2.5 bg-background/85 backdrop-blur-md">
              <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-muted/50 border border-border">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const isSelected = tab === t.k;
                  return (
                    <button
                      key={t.k}
                      onClick={() => {
                        setTab(t.k);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      aria-current={isSelected ? "page" : undefined}
                      className="relative flex items-center justify-center py-2.5 rounded-xl font-extrabold text-xs transition-colors duration-200 active:scale-[0.97]"
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="fit-tab-pill"
                          className="absolute inset-0 rounded-xl bg-card shadow-sm"
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : { type: "spring", stiffness: 500, damping: 38 }
                          }
                        />
                      )}
                      <span
                        className={cn(
                          "relative z-10 flex flex-col sm:flex-row items-center justify-center gap-1.5",
                          isSelected ? "text-[#CE6A47]" : "text-muted-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" strokeWidth={isSelected ? 2.5 : 2} />
                        <span>{t.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* content views */}
            {tab === "today" ? (
              <TodayView
                today={today}
                data={todayData}
                progress={progress}
                toggle={toggle}
                resetDay={resetDay}
                onRest={onRest}
                streak={streak}
                weekCount={weekCount}
                quote={quote}
                weightLog={weightLog}
                addWeight={addWeight}
              />
            ) : tab === "plan" ? (
              <PlanView
                progress={progress}
                toggle={toggle}
                resetDay={resetDay}
                onRest={onRest}
                today={today}
              />
            ) : tab === "eat" ? (
              <NutritionView />
            ) : (
              <TipsView />
            )}
          </>
        )}
      </div>


      {/* rest modal overlays */}
      {rest && <RestTimer total={rest.secs} nextLabel={rest.label} onClose={() => setRest(null)} />}
      {confetti && <Confetti />}
    </div>
  );
}
