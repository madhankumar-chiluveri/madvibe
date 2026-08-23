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
 *
 * ── v2 rationale ────────────────────────────────────────────────────────────
 * The v1 plan left six muscle groups below the minimum effective volume —
 * calves and knee-flexion hamstrings at literally zero, lats at ~1 set/week —
 * while quads and glutes sat in the optimal range. That is why every day felt
 * like leg day despite the plan being upper-dominant on paper: bodyweight puts
 * 43-56 kg through one leg in a split squat, while 5 kg is ~16% of bodyweight
 * on the upper body, below the ~20-30% 1RM floor where growth happens at all.
 *
 * v2 moves the big patterns onto bodyweight leverage. The sofa is a platform
 * for feet and a target to squat to — never a bench for dumbbell work. The
 * dumbbells are kept for lateral raises, rear-delt flyes, prone Y raises and
 * curls, the four movements where 5 kg is the correct load rather than a
 * compromise.
 *
 * Two movements cannot reach failure in a normal rep range at 5 kg: the
 * bent-over row and the standing curl. Those carry a longer tempo, a pause in
 * the stretched position, and an explicit instruction to train to failure,
 * because low-load sets stopped short of failure produce no measurable growth.
 */

export const PLAN_VERSION = "2026.08-v2-fullbody";

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
  /** The single most important execution cue. Always shown on the card. */
  cue: string;
  /**
   * Inhale/exhale pattern. Shown on every card — breathing is the cue people
   * drop first when a set gets hard, and it is what keeps bracing intact.
   */
  breath?: string;
  /** How to rig the movement with only two 5 kg dumbbells, a mat and a sofa. */
  setup?: string;
  /** The one mistake that turns this exercise into wasted effort or an injury. */
  avoid?: string;
  /** What it trains and why it earns a slot in a 45-minute session. */
  why?: string;
  /**
   * A specific form-reference video, opened in a new tab. Only set when the
   * URL has actually been confirmed to resolve to a demo of THIS movement —
   * an unchecked link is worse than none, because bad form under load is how
   * people get hurt.
   */
  video?: string;
  /**
   * Fallback when no specific video could be confirmed: a YouTube search term.
   * Resolves live, so it cannot rot the way a pinned video id can.
   */
  videoSearch?: string;
};

export type FitBlock = {
  id: string;
  label: string;
  meta: string;
  /** Renders A1/A2 bound together — perform back-to-back, rest after the pair. */
  superset?: boolean;
  exercises: FitExercise[];
};

export type FitDayType = "push" | "legs" | "pull" | "recovery" | "rest";

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
  duration: "4–5 min",
  items: [
    "Arm circles + torso twists — 60s total",
    "Inchworm walkouts — 5 reps",
    "Bodyweight squat to stand — 15 reps",
    "Cat-cow to bird-dog — 6 reps / side",
    "ONE ramp set of today's first movement at about half effort",
  ],
};

export const COOLDOWN = {
  title: "Universal cool-down",
  duration: "3 min",
  items: [
    "Child's pose — 45s, long slow exhales",
    "Cobra to downward dog — 45s",
    "Kneeling hip-flexor stretch — 30s / side",
    "Cross-body shoulder stretch — 30s / side",
  ],
};

/* ── Day accents ─────────────────────────────────────────────────────────── */
/**
 * Drawn from the existing Notion-Warm accent set — no new hues introduced.
 * `pull` inherits the blue previously used by the retired conditioning day.
 *
 * These are literal Tailwind classes, so this file has to be covered by the
 * `content` globs in tailwind.config.js or the utilities are never generated
 * and the day header renders with no background at all. The config scans all
 * of `src/**` for that reason — do not narrow it back.
 */
export const DAY_ACCENT: Record<FitDayType, string> = {
  push: "from-[#CE6A47] via-[#E08A5B] to-[#DC9447]",
  legs: "from-[#B0532F] via-[#CE6A47] to-[#E08A5B]",
  pull: "from-[#7E96A8] to-[#9FB3C2]",
  recovery: "from-[#7F9270] to-[#9BAD86]",
  rest: "from-[#3A332A] to-[#54493B]",
};

/* ── The program ─────────────────────────────────────────────────────────── */

export const PROGRAM: Record<string, FitDay> = {
  Monday: {
    key: "Monday",
    type: "push",
    title: "Push A — Chest, Back, Hinge",
    tag: "Push A",
    duration: "43 min",
    blurb:
      "Hard pressing lives here and on Thursday only, 72 hours apart. Every pair is antagonist — one muscle recovers while the other works, which buys you reps instead of costing them.",
    warmup: true,
    cooldown: true,
    blocks: [
      {
        id: "A",
        label: "Block A · Chest / Back superset",
        meta: "3 rounds · 20s between, 55s after the pair",
        superset: true,
        exercises: [
          {
            id: "decline-pushup-feet-sofa",
            name: "Feet-on-Sofa Decline Push-up",
            sets: 3,
            reps: "8–10",
            targetReps: 9,
            restSec: 20,
            restLabel: "20s",
            cue: "3s lowering, 1s pause at the bottom, then drive up.",
            breath: "Inhale as you lower. Hold the brace through the pause. Exhale hard as you press up.",
            setup: "Both feet on the sofa seat, hands on the mat under your shoulders. Body in one straight line from heel to head.",
            avoid: "Hips sagging or piking up. If your lower back arches, drop your feet to the floor and do standard push-ups until you can hold the line.",
            why: "Puts ~70–74% of bodyweight (43–46 kg) through your hands — four times what a 5 kg press can offer. This is your primary chest movement.",
            videoSearch: "decline push up feet elevated on couch proper form",
          },
          {
            id: "db-bent-over-row",
            name: "Two-Arm Bent-Over Row",
            sets: 3,
            reps: "15–25",
            targetReps: 18,
            restSec: 55,
            restLabel: "55s",
            cue: "6s per rep: 3s down, 1s pause at full stretch, 1s pull, 1s squeeze. TAKE THIS TO FAILURE.",
            breath: "Inhale at the top of the stretch. Exhale as you pull the dumbbells to your waist. Do not hold your breath across a 20-rep set — breathe every rep.",
            setup: "Feet hip-width, knees soft, hinge until your torso is 45° or flatter. The flatter your back angle, the longer the moment arm and the harder 5 kg works.",
            avoid: "Stopping at a comfortable burn. At 5 kg per hand you are at ~20–25% of your 1RM — the load only works if the set genuinely fails. A tidy 12 reps here does nothing.",
            why: "Your back was the worst-trained muscle in v1 at roughly 1 effective set per week. This is now 15 row sets across the week.",
            video: "https://www.youtube.com/shorts/mqw8Zqj687Q",
          },
        ],
      },
      {
        id: "B",
        label: "Block B · Hinge / Vertical push superset",
        meta: "3 rounds · 20s between, 55s after the pair",
        superset: true,
        exercises: [
          {
            id: "single-leg-db-rdl",
            name: "Single-Leg DB RDL",
            sets: 3,
            reps: "6–8 / leg",
            targetReps: 7,
            restSec: 20,
            restLabel: "20s",
            cue: "4s lowering, 1s pause at the deepest hamstring stretch, then stand.",
            breath: "Inhale on the way down as the chest drops. Exhale as you drive the hips forward to stand.",
            setup: "One dumbbell in each hand, stand on one leg, hinge like a seesaw — back leg rises as the chest falls. Fingertips on the sofa arm for balance only if you genuinely wobble.",
            avoid: "Letting the hips open sideways. Keep both hip bones pointing at the floor, otherwise it becomes a rotation drill and the hamstring stops loading.",
            why: "Trains the hip-extension hamstrings in the stretched position. Paired with a push so your legs rest while your shoulders work.",
            video: "https://www.youtube.com/shorts/iFe5p-m-oeU",
          },
          {
            id: "pike-pushup-feet-sofa",
            name: "Feet-on-Sofa Pike Push-up",
            sets: 3,
            reps: "6–10",
            targetReps: 8,
            restSec: 55,
            restLabel: "55s",
            cue: "2s lowering, 1s pause with the crown of your head just off the mat, then press.",
            breath: "Inhale as your head lowers toward the floor. Exhale as you press back up to the pike.",
            setup: "Feet on the sofa seat, hips stacked high over your shoulders, hands on the mat. Walking your hands closer to the sofa raises the load.",
            avoid: "Letting the hips drop so it becomes a decline press. The hips must stay high — that is what makes it a vertical push.",
            why: "The only vertical press that scales toward full bodyweight. A 5 kg overhead press never could, which is why it was cut.",
            videoSearch: "elevated pike push up feet on couch form",
          },
        ],
      },
      {
        id: "C",
        label: "Block C · Triceps / Rear-delt superset",
        meta: "2 rounds · 20s between, 40s after the pair",
        superset: true,
        exercises: [
          {
            id: "diamond-pushup",
            name: "Diamond Push-up",
            sets: 2,
            reps: "8–12",
            targetReps: 10,
            restSec: 20,
            restLabel: "20s",
            cue: "3s lowering, elbows tracking close along the ribs.",
            breath: "Inhale down, exhale up. Sharp exhale through the hardest part of the press.",
            setup: "Index fingers and thumbs touching to form a diamond under your sternum, on the mat.",
            avoid: "Flaring the elbows out wide — that turns it back into a chest exercise and grinds the shoulder. Elbows stay tucked.",
            why: "Bodyweight triceps loading. Replaced the sofa-arm dip so the sofa is only ever used as a foot platform.",
            videoSearch: "diamond push up proper form triceps",
          },
          {
            id: "prone-cobra-rear-delt-fly",
            name: "Prone Rear-Delt Fly",
            sets: 2,
            reps: "12–15",
            targetReps: 13,
            restSec: 40,
            restLabel: "40s",
            cue: "2s lowering, 1s hold at the top with the shoulder blades squeezed.",
            breath: "Exhale as the arms lift and the blades squeeze. Inhale as they lower.",
            setup: "Lie chest down on the mat, one dumbbell in each hand, arms out wide in a T just off the floor.",
            avoid: "Shrugging the traps up toward your ears, or using momentum to bounce the arms. Slow and wide, driven from the rear delt.",
            why: "The prone lever arm makes 5 kg exactly the right load here. Rear delts got 3 sets a week in v1; they get 10 now.",
            video: "https://www.youtube.com/watch?v=CI4YSJjkHiI",
          },
        ],
      },
      {
        id: "D",
        label: "Block D · Delts / Biceps superset",
        meta: "2 rounds · 20s between, 40s after the pair",
        superset: true,
        exercises: [
          {
            id: "db-lateral-raise",
            name: "DB Lateral Raise",
            sets: 2,
            reps: "10–14",
            targetReps: 12,
            restSec: 20,
            restLabel: "20s",
            cue: "3s lowering. Last set only: add 10–15 partial reps in the bottom third after you fail.",
            breath: "Exhale as the arms rise to shoulder height. Inhale on the slow lower.",
            setup: "Slight forward torso lean, raise in the scapular plane — about 30° forward of straight out to the side, not directly lateral.",
            avoid: "Swinging with the legs or raising above shoulder height. Above shoulder level the traps take over from the side delts.",
            why: "5 kg is roughly 40–60% of your 1RM here — a correct load, not a compromise. Side delts are your only remaining shoulder-width lever.",
            video: "https://www.youtube.com/shorts/lMYs7FY8os4",
          },
          {
            id: "db-standing-curl",
            name: "Two-Arm Standing Curl",
            sets: 2,
            reps: "15–25",
            targetReps: 18,
            restSec: 40,
            restLabel: "40s",
            cue: "3s lowering, 1s pause at full stretch, 1s curl. Train to failure.",
            breath: "Exhale as you curl up. Inhale through the slow lower and the stretch pause.",
            setup: "Standing, one dumbbell in each hand, elbows drawn slightly BEHIND your torso at the bottom — that shoulder position is what makes 5 kg hard.",
            avoid: "Swinging the torso back to start the rep. If your lower back moves, the set is over.",
            why: "5 kg is ~33% of your curl 1RM, comfortably above the load floor. Biceps went from 3 sets a week to ~12 including row credit.",
            videoSearch: "standing dumbbell biceps curl strict form",
          },
        ],
      },
    ],
  },

  Tuesday: {
    key: "Tuesday",
    type: "legs",
    title: "Legs A — Squat, Glutes, Delts",
    tag: "Legs A",
    duration: "43 min",
    blurb:
      "One of only two hard squat days in the week. Your bodyweight is the load — 43–56 kg lands on the front leg in a split squat, which is why legs never needed the dumbbells.",
    warmup: true,
    cooldown: true,
    blocks: [
      {
        id: "A",
        label: "Block A · Squat / Upper-back superset",
        meta: "3 rounds · 20s between, 55s after the pair",
        superset: true,
        exercises: [
          {
            id: "bulgarian-split-squat",
            name: "Rear-Foot-Elevated Split Squat",
            sets: 3,
            reps: "8–10 / leg",
            targetReps: 9,
            restSec: 20,
            restLabel: "20s",
            cue: "3s lowering, 1s pause at the bottom, slight torso lean to load the front glute.",
            breath: "Inhale as you descend. Exhale as you drive up through the front heel.",
            setup: "Rear foot laces-down on the FRONT EDGE of the sofa seat, directly over the frame where the cushion compresses least. One dumbbell in each hand.",
            avoid: "Setting the rear foot too high. A sofa seat is 35–45 cm, roughly double the standard 20–30 cm — if it turns into a hip-flexor stretch and a balance test, use the lowest firm point you have.",
            why: "70–90% of the total load lands on the front leg. This is the single most effective leg exercise available to you with no added weight.",
            video: "https://www.youtube.com/shorts/A3ctWjao8cc",
          },
          {
            id: "prone-y-raise",
            name: "Prone Y Raise",
            sets: 3,
            reps: "10–12",
            targetReps: 11,
            restSec: 55,
            restLabel: "55s",
            cue: "2s lowering, 2s hold at the top of every rep.",
            breath: "Exhale as the arms lift into the Y. Inhale as they lower to the mat.",
            setup: "Chest down on the mat, arms overhead in a Y at roughly 45°, thumbs pointing up toward the ceiling.",
            avoid: "Using 5 kg too early. The long lever makes this brutal — start with no weight at all if you cannot hold the 2s top position cleanly.",
            why: "One of the strongest lower-trap movements available. It is here because your scapular and upper-back work was near zero.",
            videoSearch: "prone y raise dumbbell lower trap form",
          },
        ],
      },
      {
        id: "B",
        label: "Block B · Glutes / Side-delt superset",
        meta: "3 rounds · 20s between, 45s after the pair",
        superset: true,
        exercises: [
          {
            id: "single-leg-glute-bridge",
            name: "Single-Leg Floor Glute Bridge",
            sets: 3,
            reps: "12–15 / leg",
            targetReps: 13,
            restSec: 20,
            restLabel: "20s",
            cue: "Drive through the heel, 1s squeeze at full extension, 2s lowering.",
            breath: "Exhale as the hips rise and the glute squeezes. Inhale as you lower.",
            setup: "Lie on the mat, one foot planted close to your glute, the other leg extended or knee hugged to the chest.",
            avoid: "Arching the lower back to fake height. Ribs stay down — the movement is hip extension, not spinal extension.",
            why: "Direct glute work with zero spinal load, on the floor. Replaced the sofa hip thrust so the sofa stays a foot platform only.",
            video: "https://www.youtube.com/watch?v=VUl8R0kn6v4",
          },
          {
            id: "db-lateral-raise",
            name: "DB Lateral Raise",
            sets: 3,
            reps: "10–14",
            targetReps: 12,
            restSec: 45,
            restLabel: "45s",
            cue: "Slight forward torso lean, scapular plane, 3s lowering.",
            breath: "Exhale up, inhale down. Steady — no breath-holding.",
            setup: "One dumbbell in each hand, standing, elbows very slightly bent and fixed.",
            avoid: "Turning it into a front raise. The arms travel out and slightly forward, not straight ahead.",
            why: "Second of three weekly side-delt exposures. Paired with glutes so nothing competes for the same muscle.",
            video: "https://www.youtube.com/shorts/lMYs7FY8os4",
          },
        ],
      },
      {
        id: "C",
        label: "Block C · Step-up / Rear-delt superset",
        meta: "3 rounds · 20s between, 40s after the pair",
        superset: true,
        exercises: [
          {
            id: "sofa-step-up",
            name: "Sofa Step-up",
            sets: 3,
            reps: "8–10 / leg",
            targetReps: 9,
            restSec: 20,
            restLabel: "20s",
            cue: "3s lowering, and NO push-off from the bottom foot — the working leg does all of it.",
            breath: "Exhale as you drive up onto the sofa. Inhale through the slow lower.",
            setup: "Foot on the front edge over the frame, one dumbbell in each hand. Full foot on the surface, not just the toes.",
            avoid: "Bouncing off the trailing foot. That is the entire exercise gone — the bottom foot should feel like dead weight.",
            why: "A second knee-dominant pattern with a long range of motion, and it trains balance under load without needing more weight.",
            videoSearch: "dumbbell step up form no push off",
          },
          {
            id: "prone-cobra-rear-delt-fly",
            name: "Prone Rear-Delt Fly",
            sets: 3,
            reps: "12–15",
            targetReps: 13,
            restSec: 40,
            restLabel: "40s",
            cue: "2s lowering, 1s hold at the top.",
            breath: "Exhale as the arms lift, inhale as they lower.",
            setup: "Chest down on the mat, arms out wide in a T, one dumbbell per hand.",
            avoid: "Lifting the chest off the mat to help. Only the arms move.",
            why: "Rear delts and mid-back, at a load where 5 kg is genuinely appropriate.",
            video: "https://www.youtube.com/watch?v=CI4YSJjkHiI",
          },
        ],
      },
      {
        id: "D",
        label: "Core · Anti-lateral-flexion",
        meta: "2 rounds · 40s rest",
        exercises: [
          {
            id: "side-plank-db-overhead",
            name: "Side Plank, DB Pressed Overhead",
            sets: 2,
            reps: "30s / side",
            seconds: 30,
            restSec: 40,
            restLabel: "40s",
            cue: "Hips high and stacked, one dumbbell pressed straight up in the top hand.",
            breath: "Steady shallow breathing throughout — never hold. If you cannot breathe, the hold is too hard; drop to the knee.",
            setup: "Forearm on the mat under the shoulder, feet stacked, body in a straight line. Top arm presses one dumbbell to the ceiling.",
            avoid: "Letting the hips sag toward the floor. The moment they drop, end the set — time held with bad position counts for nothing.",
            why: "Anti-lateral-flexion, the one core function the old plan never trained across seven core exercises.",
            videoSearch: "side plank with dumbbell raise form",
          },
        ],
      },
    ],
  },

  Wednesday: {
    key: "Wednesday",
    type: "pull",
    title: "Pull, Arms, Hamstrings, Calves",
    tag: "Pull",
    duration: "42 min",
    blurb:
      "No pressing and no squatting today — this is the day that fixes what v1 never trained. Nordics and calf raises are here because both muscles previously got zero sets in seven days.",
    warmup: true,
    cooldown: true,
    blocks: [
      {
        id: "A",
        label: "Block A · Back / Triceps superset",
        meta: "3 rounds · 20s between, 55s after the pair",
        superset: true,
        exercises: [
          {
            id: "db-bent-over-row-flared",
            name: "Two-Arm Bent-Over Row (elbows flared)",
            sets: 3,
            reps: "15–25",
            targetReps: 18,
            restSec: 20,
            restLabel: "20s",
            cue: "6s per rep with a pause at full stretch. Pull high toward the armpits. To failure.",
            breath: "Inhale at the stretch, exhale as you pull high. Breathe every rep across the set.",
            setup: "Same hinge as Monday, but elbows flared to about 75° so the dumbbells travel to your armpits rather than your waist.",
            avoid: "Turning it into the same row as Monday. The flared elbow path is the whole point — it shifts the work from lats to upper back.",
            why: "Upper-back and rear-delt bias. Mid-back went from 3 sets a week to 15.",
            videoSearch: "dumbbell bent over row elbows flared high row form",
          },
          {
            id: "db-floor-overhead-tricep-ext",
            name: "Lying Overhead Triceps Extension",
            sets: 3,
            reps: "10–12",
            targetReps: 11,
            restSec: 55,
            restLabel: "55s",
            cue: "3s lowering to a deep stretch beside the ears, 1s pause, then extend.",
            breath: "Inhale as the dumbbells lower behind your head. Exhale as you extend.",
            setup: "Lie flat on the mat, one dumbbell per hand, upper arms angled back past vertical and held still. Only the elbows move.",
            avoid: "Letting the elbows drift wide or the upper arms swing. Pin them — if the shoulders move, the triceps stop being the limiter.",
            why: "The overhead position grows the triceps long head roughly 1.5–2x better than any neutral-arm extension. Best exercise carried over from v1.",
            video: "https://www.youtube.com/watch?v=rIg-CEDW6Bg",
          },
        ],
      },
      {
        id: "B",
        label: "Block B · Hamstring / Biceps superset",
        meta: "3 rounds · 20s between, 50s after the pair",
        superset: true,
        exercises: [
          {
            id: "nordic-curl-regression",
            name: "Nordic Curl Regression",
            sets: 3,
            reps: "4–6 eccentric",
            targetReps: 5,
            restSec: 20,
            restLabel: "20s",
            cue: "Lower over 6s, catch yourself on your hands, push back up with the arms. WEEKS 1–2 ARE 20s ISOMETRIC LEANS ONLY.",
            breath: "Big inhale and brace at the top. Slow controlled exhale through the 6s descent. Reset your breath before the next rep.",
            setup: "Kneel on the mat with both heels wedged under the sofa base. TEST THIS IN WEEK 0 — plinth-base, floor-flush and recliner sofas have no gap, in which case this exercise does not exist for you.",
            avoid: "Going straight to full-range reps in week 1. A cold first exposure reliably gives 5–7 days of hamstring DOMS that will wreck the next two sessions. Ramp in.",
            why: "The only knee-flexion hamstring exercise you own. That muscle got literally zero sets in v1; Nordics grow the semitendinosus ~24%.",
            videoSearch: "nordic hamstring curl beginner regression eccentric",
          },
          {
            id: "db-standing-curl",
            name: "Two-Arm Standing Curl",
            sets: 3,
            reps: "15–25",
            targetReps: 18,
            restSec: 50,
            restLabel: "50s",
            cue: "3s lowering, 1s pause at full stretch. Last set: keep going with bottom-third partials after you fail.",
            breath: "Exhale up, inhale down. Do not brace and hold — this is a long set.",
            setup: "Standing, elbows slightly behind the torso at the bottom of each rep.",
            avoid: "Cutting the bottom of the range. The stretched position is where the growth is, so let the arm fully straighten every rep.",
            why: "Second weekly biceps exposure, paired with hamstrings so the two never compete.",
            videoSearch: "standing dumbbell biceps curl strict form",
          },
        ],
      },
      {
        id: "C",
        label: "Block C · Scapular / Shoulder-extension pair",
        meta: "1 round · 20s between, 45s after",
        superset: true,
        exercises: [
          {
            id: "prone-y-raise",
            name: "Prone Y Raise",
            sets: 1,
            reps: "10–12",
            targetReps: 11,
            restSec: 20,
            restLabel: "20s",
            cue: "Arms in a Y, thumbs up, 2s hold at the top.",
            breath: "Exhale as the arms lift, inhale as they lower.",
            setup: "Chest down on the mat, arms overhead at roughly 45°.",
            avoid: "Shrugging. The traps should feel like they are pulling DOWN and back, not up.",
            why: "A third weekly lower-trap exposure at a low time cost.",
            videoSearch: "prone y raise dumbbell lower trap form",
          },
          {
            id: "supine-floor-pullover",
            name: "Supine Floor Pullover",
            sets: 1,
            reps: "10–12",
            targetReps: 11,
            restSec: 45,
            restLabel: "45s",
            cue: "3s lowering to the mat overhead, 1s pause at the stretch, then pull back over the chest.",
            breath: "Inhale deeply as the arms travel overhead — let the rib cage expand. Exhale as you pull back over.",
            setup: "Lie on the mat, both dumbbells held together over your chest, arms nearly straight.",
            avoid: "Expecting this to build lat width. It will not.",
            why: "HONEST LIMIT: this is pec-dominant (pec ~50.8% MVIC vs lat ~22.7%). It is here for shoulder extension and rib-cage expansion, NOT as a pulldown substitute.",
            videoSearch: "dumbbell pullover floor form",
          },
        ],
      },
      {
        id: "D",
        label: "Block D · Calves / Core superset",
        meta: "3 rounds · 20s between, 35s after the pair",
        superset: true,
        exercises: [
          {
            id: "single-leg-calf-raise",
            name: "Single-Leg Calf Raise",
            sets: 3,
            reps: "10–12 / leg",
            targetReps: 11,
            restSec: 20,
            restLabel: "20s",
            cue: "1s up, 1s hold at full plantarflexion, 2s lowering. Last set: partials in the bottom third to failure.",
            breath: "Exhale as you rise onto the toe. Inhale as you lower.",
            setup: "Stand on one leg, one dumbbell in each hand. Fingertips against a wall for balance only.",
            avoid: "Bouncing off the bottom. Pause at the lowest point you can reach — the stretch is the stimulus.",
            why: "HONEST LIMIT: with no step you cannot drop the heel below the toes, so the best-evidenced stretch position is unavailable. Still beats v1, where calves got zero sets in seven days.",
            videoSearch: "single leg calf raise dumbbell form",
          },
          {
            id: "dead-bug",
            name: "Dead Bug",
            sets: 3,
            reps: "8–10 / side",
            targetReps: 9,
            restSec: 35,
            restLabel: "35s",
            cue: "Lower the opposite arm and leg over 3s while pressing the lower back into the mat.",
            breath: "Hard full exhale as the limbs reach away — that exhale is what pins the ribs down. Inhale as you return.",
            setup: "On your back, knees over hips at 90°, arms straight up. Lower back pressed flat into the mat before you start.",
            avoid: "Letting the lower back lift off the mat. The moment daylight appears under your spine, shorten the range.",
            why: "Anti-extension core, the function that transfers most directly to holding position in push-ups and rows.",
            video: "https://www.youtube.com/watch?v=bxn9FBrt4-A",
          },
        ],
      },
    ],
  },

  Thursday: {
    key: "Thursday",
    type: "push",
    title: "Push B — Deficit Chest, Pike, Back",
    tag: "Push B",
    duration: "42 min",
    blurb:
      "The second and last pressing day, 72 hours after Monday. The deficit push-up restores the stretched position that the old floor press mechanically deleted — that stretch is the dominant growth driver.",
    warmup: true,
    cooldown: true,
    blocks: [
      {
        id: "A",
        label: "Block A · Chest / Back superset",
        meta: "3 rounds · 20s between, 55s after the pair",
        superset: true,
        exercises: [
          {
            id: "deficit-pushup",
            name: "Deficit Push-up (hands on DBs)",
            sets: 3,
            reps: "8–10",
            targetReps: 9,
            restSec: 20,
            restLabel: "20s",
            cue: "3s lowering until the sternum drops BELOW hand level, 1s pause, then explode up.",
            breath: "Inhale on the way down. Hold the brace at the bottom. Sharp exhale as you drive up.",
            setup: "The two dumbbells lie parallel on the mat as handles, shoulder-width apart. ONLY with HEXAGONAL dumbbells — round, chrome, vinyl or spinlock dumbbells roll under a deep push-up. If yours are round, do standard push-ups on the floor.",
            avoid: "Elbows flaring to 90°. Keep them at roughly 45° to the torso to spare the shoulder.",
            why: "The deficit restores the stretched position that a floor press deletes. Matches bench press for pec growth at a matched load.",
            video: "https://www.youtube.com/watch?v=q3W9s4VqiO0",
          },
          {
            id: "db-bent-over-row-supinated",
            name: "Two-Arm Bent-Over Row (underhand)",
            sets: 3,
            reps: "15–25",
            targetReps: 18,
            restSec: 55,
            restLabel: "55s",
            cue: "6s per rep with a pause at full stretch. Pull low to the hips. To failure.",
            breath: "Inhale at the stretch, exhale as you row to the hips.",
            setup: "Palms facing forward, elbows tucked close to the ribs, hinged at 45° or flatter.",
            avoid: "Grinding on with a rounding lower back. If your erectors quit before your back does, the set failed for the wrong reason — switch this slot to the prone dead-stop row.",
            why: "The underhand grip shifts emphasis toward the lats and adds biceps. Third of three weekly heavy row exposures.",
            videoSearch: "dumbbell bent over row underhand supinated grip form",
          },
        ],
      },
      {
        id: "B",
        label: "Block B · Vertical push / Back superset",
        meta: "3 rounds · 20s between, 50s after the pair",
        superset: true,
        exercises: [
          {
            id: "pike-pushup-feet-sofa",
            name: "Feet-on-Sofa Pike Push-up",
            sets: 3,
            reps: "6–10",
            targetReps: 8,
            restSec: 20,
            restLabel: "20s",
            cue: "Hips high, head lowering toward the mat between your hands.",
            breath: "Inhale down, exhale up.",
            setup: "Feet on the sofa seat, hips stacked over the shoulders, hands on the mat.",
            avoid: "Craning the neck forward. The head travels straight down between the hands, chin tucked.",
            why: "Second weekly vertical press. Front delts went from 4 sets a week to 9.",
            videoSearch: "elevated pike push up feet on couch form",
          },
          {
            id: "prone-dead-stop-row-flared",
            name: "Prone Dead-Stop Row (elbows flared)",
            sets: 3,
            reps: "10–12",
            targetReps: 11,
            restSec: 50,
            restLabel: "50s",
            cue: "2s lowering, 2s squeeze at the top, full dead stop on the floor every rep.",
            breath: "Exhale as you row. Inhale as you lower and reset on the floor.",
            setup: "Face down on the mat, dumbbells on the floor beside your ribs. Elbows flare to 90° as you pull.",
            avoid: "Lifting the chest off the mat to generate the pull. Chest stays down — that is what makes it strict.",
            why: "Zero lower-back load, so your back can be the limiter instead of your erectors. HONEST LIMIT: range is only ~25–30 cm and the stretched position is unavailable, since your arm cannot go below the floor.",
            videoSearch: "prone dumbbell row chest on floor dead stop form",
          },
        ],
      },
      {
        id: "C",
        label: "Block C · Triceps / Rear-delt superset",
        meta: "3 rounds · 20s between, 40s after the pair",
        superset: true,
        exercises: [
          {
            id: "close-grip-pushup",
            name: "Close-Grip Push-up",
            sets: 3,
            reps: "8–12",
            targetReps: 10,
            restSec: 20,
            restLabel: "20s",
            cue: "3s lowering, elbows tracking back along the ribs rather than flaring.",
            breath: "Inhale down, exhale up.",
            setup: "Hands just inside shoulder width on the mat, body in a straight line.",
            avoid: "Placing the hands so close they stress the wrists. Slightly inside shoulder width is enough — you do not need a diamond here.",
            why: "Second bodyweight triceps exposure. Triceps sit at ~14 weekly sets counting press credit.",
            videoSearch: "close grip push up proper form triceps",
          },
          {
            id: "prone-cobra-rear-delt-fly",
            name: "Prone Rear-Delt Fly",
            sets: 3,
            reps: "12–15",
            targetReps: 13,
            restSec: 40,
            restLabel: "40s",
            cue: "2s lowering, 1s hold at the top.",
            breath: "Exhale as the arms lift, inhale as they lower.",
            setup: "Chest down on the mat, arms wide in a T.",
            avoid: "Rushing. This is a small muscle at a light load — the tempo is the intensity.",
            why: "Third of four weekly rear-delt exposures.",
            video: "https://www.youtube.com/watch?v=CI4YSJjkHiI",
          },
        ],
      },
      {
        id: "D",
        label: "Block D · Delts / Core superset",
        meta: "2 rounds · 20s between, 40s after the pair",
        superset: true,
        exercises: [
          {
            id: "db-lateral-raise",
            name: "DB Lateral Raise",
            sets: 2,
            reps: "10–14",
            targetReps: 12,
            restSec: 20,
            restLabel: "20s",
            cue: "3s lowering, then bottom-third partials to failure on the last set.",
            breath: "Exhale up, inhale down.",
            setup: "Standing, slight forward lean, scapular plane.",
            avoid: "Skipping these because they feel small. Side delts are your only remaining width lever now that vertical pulling is off the table.",
            why: "Third weekly side-delt exposure, roughly 10 sets a week total.",
            video: "https://www.youtube.com/shorts/lMYs7FY8os4",
          },
          {
            id: "db-reverse-crunch",
            name: "DB Reverse Crunch",
            sets: 2,
            reps: "10–12",
            targetReps: 11,
            restSec: 40,
            restLabel: "40s",
            cue: "Curl the knees toward the chest by rolling the pelvis, 3s lowering.",
            breath: "Exhale as the pelvis curls up. Inhale on the slow lower.",
            setup: "Lie on the mat holding one dumbbell overhead on the floor as an anchor, knees bent over the hips.",
            avoid: "Swinging the legs for momentum. The pelvis must actually lift off the mat — if it does not, this is just a hip-flexor drill.",
            why: "Trunk flexion, the fourth core function. Replaced the anchored sit-up so the sofa is only ever a foot platform.",
            videoSearch: "reverse crunch proper form abs",
          },
        ],
      },
    ],
  },

  Friday: {
    key: "Friday",
    type: "legs",
    title: "Legs B — Single-Leg, Hinge, Calves",
    tag: "Legs B",
    duration: "43 min",
    blurb:
      "The second squat day. Nordics sit at the very END of this session and stop short of failure — the old plan's mistake was wrecking a hamstring and then loading it in the stretched position minutes later.",
    warmup: true,
    cooldown: true,
    blocks: [
      {
        id: "A",
        label: "Block A · Single-leg squat / Upper-back superset",
        meta: "3 rounds · 20s between, 45s after the pair",
        superset: true,
        exercises: [
          {
            id: "sofa-assisted-single-leg-squat",
            name: "Sofa-Assisted Single-Leg Squat",
            sets: 3,
            reps: "6–8 / leg",
            targetReps: 7,
            restSec: 20,
            restLabel: "20s",
            cue: "Squat down to the sofa seat on one leg, tap, stand. 3s lowering, 1s pause.",
            breath: "Inhale as you lower to the seat. Exhale as you drive up.",
            setup: "Stand in front of the sofa on one leg, other leg extended forward. Holding the dumbbells at your chest makes this EASIER, not harder — front-loading is deliberate assistance on the early rungs.",
            avoid: "Collapsing onto the seat. Tap and go — if you have to sit down, you are not ready for this rung yet.",
            why: "A single-leg squat progression that scales all the way to a pistol without any added weight. The sofa is both the target and the bail-out.",
            videoSearch: "box squat single leg pistol squat progression",
          },
          {
            id: "prone-y-raise",
            name: "Prone Y Raise",
            sets: 3,
            reps: "10–12",
            targetReps: 11,
            restSec: 45,
            restLabel: "45s",
            cue: "Arms in a Y overhead, thumbs up, 2s hold at the top of every rep.",
            breath: "Exhale as the arms lift, inhale as they lower.",
            setup: "Chest down on the mat, arms at roughly 45°.",
            avoid: "Adding weight before the 2s hold is clean and shrug-free.",
            why: "Prone Y raises total 7 sets a week — the closest thing to overhead pulling available without a bar.",
            videoSearch: "prone y raise dumbbell lower trap form",
          },
        ],
      },
      {
        id: "B",
        label: "Block B · Hinge / Back superset",
        meta: "3 rounds · 20s between, 45s after the pair",
        superset: true,
        exercises: [
          {
            id: "single-leg-db-rdl",
            name: "Single-Leg DB RDL",
            sets: 3,
            reps: "6–8 / leg",
            targetReps: 7,
            restSec: 20,
            restLabel: "20s",
            cue: "4s lowering, 1s pause at the deepest hamstring stretch.",
            breath: "Inhale down, exhale as the hips drive forward to stand.",
            setup: "One dumbbell in each hand, hips square to the floor throughout.",
            avoid: "Rounding the back to reach lower. Depth comes from the hip hinge, and it stops where your hamstring flexibility stops.",
            why: "Second weekly hip-extension hamstring exposure, six sets total across the week.",
            video: "https://www.youtube.com/shorts/iFe5p-m-oeU",
          },
          {
            id: "prone-dead-stop-row-tucked",
            name: "Prone Dead-Stop Row (elbows tucked)",
            sets: 3,
            reps: "10–12",
            targetReps: 11,
            restSec: 45,
            restLabel: "45s",
            cue: "2s lowering, 2s squeeze, dead stop on the floor every rep.",
            breath: "Exhale as you row, inhale as you lower and reset.",
            setup: "Chest on the mat, elbows tucked close, pulling to the lower ribs.",
            avoid: "Bouncing the dumbbells off the floor. A true dead stop kills the stretch reflex, which is the whole reason this variation exists.",
            why: "Tucked elbows bias the lats. Fifth row exposure of the week, with zero spinal load at the end of a leg day.",
            videoSearch: "prone dumbbell row elbows tucked chest supported floor",
          },
        ],
      },
      {
        id: "C",
        label: "Block C · Calves / Anti-rotation superset",
        meta: "3 rounds · 20s between, 35s after the pair",
        superset: true,
        exercises: [
          {
            id: "single-leg-calf-raise",
            name: "Single-Leg Calf Raise",
            sets: 3,
            reps: "10 / leg",
            targetReps: 10,
            restSec: 20,
            restLabel: "20s",
            cue: "1s up, 1s hold at full plantarflexion, 2s lowering. Partials in the bottom third after the last set.",
            breath: "Exhale up, inhale down.",
            setup: "One leg, one dumbbell in each hand, fingertips on a wall for balance only.",
            avoid: "Rushing the reps. The 1s hold at the top is what makes a light load count.",
            why: "Second of two weekly calf days — six sets total, up from zero.",
            videoSearch: "single leg calf raise dumbbell form",
          },
          {
            id: "plank-db-drag",
            name: "Plank with DB Drag",
            sets: 3,
            reps: "6–8 / side",
            targetReps: 7,
            restSec: 35,
            restLabel: "35s",
            cue: "High plank; drag one dumbbell slowly across the body under your torso.",
            breath: "Steady breathing throughout — never hold. Exhale slowly during each drag.",
            setup: "High plank with feet wide for stability, one dumbbell placed just outside one hand.",
            avoid: "Any hip rotation. If the hips twist as you drag, widen your feet or use a lighter object — the anti-rotation IS the exercise.",
            why: "Anti-rotation core. Carried over from v1, which got this one right.",
            videoSearch: "plank dumbbell drag through core form",
          },
        ],
      },
      {
        id: "D",
        label: "Block D · Hamstring / Rear-delt superset",
        meta: "2 rounds · 20s between, 40s after the pair",
        superset: true,
        exercises: [
          {
            id: "nordic-curl-short",
            name: "Nordic Curl (short range)",
            sets: 2,
            reps: "3–4 eccentric",
            targetReps: 4,
            restSec: 20,
            restLabel: "20s",
            cue: "6s lowering, hands catch. Stop 1–2 reps SHORT of failure — deliberately.",
            breath: "Inhale and brace at the top, slow controlled exhale through the descent.",
            setup: "Heels under the sofa base, knees on the mat. Weeks 1–2: 20s isometric leans only.",
            avoid: "Taking this to failure. It is placed last and kept submaximal on purpose — Wednesday is the hard hamstring day, this is the second exposure.",
            why: "A second weekly knee-flexion exposure without the recovery cost of two failure sessions.",
            videoSearch: "nordic hamstring curl short range beginner",
          },
          {
            id: "prone-cobra-rear-delt-fly",
            name: "Prone Rear-Delt Fly",
            sets: 2,
            reps: "12–15",
            targetReps: 13,
            restSec: 40,
            restLabel: "40s",
            cue: "2s lowering, 1s hold at the top.",
            breath: "Exhale as the arms lift, inhale as they lower.",
            setup: "Chest down on the mat, arms wide.",
            avoid: "Skipping the last round because the session is nearly over.",
            why: "Fourth weekly rear-delt exposure, bringing the total to 10 sets.",
            video: "https://www.youtube.com/watch?v=CI4YSJjkHiI",
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
    duration: "40 min",
    blurb:
      "Walk, do not run. Running is the one endurance modality shown to blunt hypertrophy in concurrent-training research; walking and cycling do not.",
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
            reps: "30 min",
            restSec: 0,
            restLabel: "—",
            cue: "Steady flat walk outdoors, conversational pace throughout.",
            breath: "Nasal breathing only. If you have to open your mouth, you are walking too fast for a recovery day.",
            why: "Blood flow without stimulus. Walking does not interfere with hypertrophy the way running does.",
          },
          {
            id: "recovery-mobility-flow",
            name: "Full-Body Mobility Flow",
            sets: 1,
            reps: "10 min",
            restSec: 0,
            restLabel: "—",
            cue: "Couch stretch 60s/side, deep squat hold 3x45s, hamstring floor stretch 45s/side, thoracic extension over the sofa arm.",
            breath: "Long slow exhales into each stretch. The exhale is what lets the tissue release — never hold your breath in a stretch.",
            setup: "Mat and sofa only.",
            why: "The couch stretch directly counters the hip-flexor shortening from four days a week of split squats and step-ups.",
            video: "https://www.youtube.com/watch?v=aRVFt79LqCM",
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
      "Complete rest. One night of bad sleep costs ~18% of muscle protein synthesis and ~24% of testosterone — this is the highest-leverage day of the week and it asks nothing of you.",
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
            reps: "7–9 hrs",
            restSec: 0,
            restLabel: "—",
            cue: "The single highest-leverage recovery tool you have. Protect it.",
            why: "At 5.5h vs 8.5h sleep, subjects lost 60% more lean mass at an identical calorie intake.",
          },
          {
            id: "rest-meal-prep",
            name: "Meal Prep for the Week",
            sets: 1,
            reps: "—",
            restSec: 0,
            restLabel: "—",
            cue: "Target 120–135 g protein/day at 2,600–2,750 kcal. Soak soya chunks, boil eggs, portion dal and curd.",
            setup: "Soya chunks are ~52 g protein per 100 g dry at roughly ₹0.2–0.3 per gram of protein — the cheapest protein available to you.",
            why: "7 eggs/day supply only 37–40 g, about a third of your target, at ~1,300 mg cholesterol. Drop to 3 eggs and close the gap with soya. Get ApoB tested.",
          },
          {
            id: "rest-log-review",
            name: "Review the Week's Log",
            sets: 1,
            reps: "5 min",
            restSec: 0,
            restLabel: "—",
            cue: "Advance a rung wherever you hit the TOP of the rep range on every set of an exercise.",
            setup: "Ladder order: reps → 3s squeeze → 4s eccentric → harder leverage (hands lower, feet higher, deeper split) → single-leg.",
            why: "The load is fixed at 5 kg forever, so reps, tempo, range and leverage are the only rungs you have. Deload weeks 5 and 10: cut volume 30–50%, keep the movements.",
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

/**
 * Where the "Form" button points.
 *
 * Prefers the confirmed video; otherwise sends the user to a live YouTube
 * search. Returns null for entries where a form demo is meaningless — sleep,
 * meal prep, going for a walk — so those render no button at all.
 */
export function formVideoUrl(exercise: FitExercise): string | null {
  if (exercise.video) return exercise.video;
  if (exercise.videoSearch) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(
      exercise.videoSearch
    )}`;
  }
  return null;
}

/** True when the link is a live search rather than a specific vetted clip. */
export function isSearchFallback(exercise: FitExercise): boolean {
  return !exercise.video && !!exercise.videoSearch;
}

/**
 * The collapsible guidance panel on an exercise card, in display order.
 *
 * Returned as a list rather than read field-by-field in the component so the
 * card stays agnostic about which fields exist — adding a new one here shows
 * up everywhere without touching the renderer.
 *
 * `breath` is deliberately NOT included: breathing is the one cue you need
 * mid-set, so the card renders it inline rather than behind a disclosure.
 */
export function exerciseDetails(
  exercise: FitExercise
): Array<{ key: "setup" | "avoid" | "why"; label: string; text: string }> {
  const rows: Array<{ key: "setup" | "avoid" | "why"; label: string; text: string }> = [];
  if (exercise.setup) rows.push({ key: "setup", label: "Setup", text: exercise.setup });
  if (exercise.avoid) rows.push({ key: "avoid", label: "Avoid", text: exercise.avoid });
  if (exercise.why) rows.push({ key: "why", label: "Why it's here", text: exercise.why });
  return rows;
}
