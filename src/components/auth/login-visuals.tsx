"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BrainCircuit,
  CalendarCheck2,
  Check,
  CircleDollarSign,
  FileText,
  Inbox,
  Layers3,
  MessageSquareText,
  Newspaper,
  Sparkles,
  TimerReset,
  type LucideIcon,
} from "lucide-react";

import { AppIcon } from "@/components/ui/app-icon";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

export function LoginBackdrop() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgb(var(--sidebar-rgb)/0.92),rgb(var(--background-rgb)/1)_42%,rgb(var(--muted-rgb)/0.86))]" />
      <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgb(var(--foreground-rgb)/0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--foreground-rgb)/0.045)_1px,transparent_1px)] [background-size:56px_56px]" />
      <motion.div
        className="absolute -inset-x-40 -top-28 h-[58%] opacity-[0.55] blur-3xl [background:conic-gradient(from_180deg_at_50%_50%,rgb(var(--notion-green-bg-rgb,221_237_234)/0),rgb(var(--accent-rgb)/0.8),rgb(var(--notion-yellow-bg-rgb,251_243_219)/0.75),rgb(var(--notion-blue-bg-rgb,221_235_241)/0.45),rgb(var(--accent-rgb)/0))]"
        animate={
          prefersReducedMotion
            ? undefined
            : {
                x: [0, 28, -18, 0],
                y: [0, 12, -8, 0],
                rotate: [0, 2, -1, 0],
              }
        }
        transition={{ duration: 18, ease: "linear", repeat: Infinity }}
      />
      <motion.div
        className="absolute inset-0 opacity-[0.17] [background-image:linear-gradient(118deg,transparent_0%,transparent_43%,rgb(var(--foreground-rgb)/0.12)_44%,transparent_45%,transparent_100%)] [background-size:220px_220px]"
        animate={prefersReducedMotion ? undefined : { x: [0, -110], y: [0, 72] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(var(--background-rgb)/0)_0%,rgb(var(--background-rgb)/0.38)_72%,rgb(var(--background-rgb)/0.86)_100%)]" />
    </div>
  );
}

export function AuthPanel({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease }}
      className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/86 p-6 sm:p-8 [@media(max-height:850px)]:p-6 [@media(max-height:700px)]:p-4 shadow-[0_28px_90px_rgb(var(--foreground-rgb)/0.13),0_1px_0_rgb(var(--card-rgb)/0.9)_inset] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[var(--notion-yellow-bg)] opacity-50 blur-3xl" />
      <div className="relative z-10">{children}</div>
    </motion.section>
  );
}

export function LoginMotionBlock({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  icon: LucideIcon;
  label: string;
  className?: string;
};

export function AuthField({
  icon: Icon,
  label,
  id,
  className,
  type = "text",
  ...props
}: AuthFieldProps) {
  return (
    <div className={cn("space-y-2 [@media(max-height:750px)]:space-y-1.5 [@media(max-height:650px)]:space-y-1", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-foreground/78">
        {label}
      </label>
      <div className="group flex h-11 sm:h-12 [@media(max-height:750px)]:h-11 [@media(max-height:650px)]:h-10 items-center gap-3 rounded-xl border border-border/80 bg-background/70 px-3 shadow-[0_1px_0_rgb(var(--card-rgb)/0.9)_inset] transition-all duration-200 focus-within:border-foreground/35 focus-within:bg-card focus-within:shadow-[0_0_0_4px_rgb(var(--foreground-rgb)/0.055),0_1px_0_rgb(var(--card-rgb)/0.9)_inset]">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-200 group-focus-within:text-foreground" />
        <input
          id={id}
          type={type}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
          {...props}
        />
      </div>
    </div>
  );
}

const modules: Array<{
  icon: LucideIcon;
  label: string;
  value: string;
  className: string;
}> = [
  {
    icon: FileText,
    label: "Brain",
    value: "Linked pages",
    className: "bg-[var(--notion-yellow-bg)] text-[var(--notion-yellow-text)]",
  },
  {
    icon: TimerReset,
    label: "Focus",
    value: "Deep work",
    className: "bg-[var(--notion-green-bg)] text-[var(--notion-green-text)]",
  },
  {
    icon: Newspaper,
    label: "Feed",
    value: "Signal only",
    className: "bg-[var(--notion-blue-bg)] text-[var(--notion-blue-text)]",
  },
  {
    icon: CircleDollarSign,
    label: "Ledger",
    value: "Private money",
    className: "bg-[var(--notion-brown-bg)] text-[var(--notion-brown-text)]",
  },
];

export function MadVibeShowcase() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative flex h-full min-h-0 w-full max-w-[760px] flex-col justify-between">
      <LoginMotionBlock className="max-w-[600px]" delay={0.08}>
        <div className="mb-[clamp(1rem,2.6vh,2rem)] inline-flex items-center gap-3 rounded-full border border-border/70 bg-card/58 px-3 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur-xl">
          <AppIcon className="h-8 w-8 rounded-xl" />
          <span>MadVibe</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
          <span className="text-muted-foreground">Personal Knowledge OS</span>
        </div>
        <h1 className="max-w-[620px] text-[clamp(2.7rem,5vw,4.45rem)] font-semibold leading-[0.98] tracking-tight text-foreground">
          Open a calmer command center for everything you think through.
        </h1>
        <p className="mt-[clamp(0.875rem,2vh,1.25rem)] max-w-[520px] text-base leading-7 text-muted-foreground">
          Notes, tasks, money, news, and habits settle into one private workspace that feels composed from the first screen.
        </p>
      </LoginMotionBlock>

      <div className="relative my-[clamp(1rem,3vh,2.5rem)] min-h-0 flex-1">
        <MemoryWeave />

        <motion.div
          className="absolute left-2 top-[clamp(0.75rem,3vh,2.5rem)] w-[min(330px,42vw)] rounded-2xl border border-border/80 bg-card/88 p-5 shadow-[0_24px_70px_rgb(var(--foreground-rgb)/0.13)] backdrop-blur-xl"
          animate={prefersReducedMotion ? undefined : { y: [0, -8, 0], rotate: [-1.5, -0.5, -1.5] }}
          transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--notion-yellow-bg)] text-[var(--notion-yellow-text)]">
                <FileText className="h-4 w-4" />
              </span>
              Daily capture
            </div>
            <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
              Synced
            </span>
          </div>
          <div className="space-y-3">
            <div className="h-3 w-4/5 rounded-full bg-foreground/16" />
            <div className="h-3 w-full rounded-full bg-foreground/10" />
            <div className="h-3 w-3/5 rounded-full bg-foreground/10" />
          </div>
          <div className="mt-5 rounded-xl bg-muted/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-[var(--notion-orange-text)]" />
              3 suggested next actions
            </div>
            <div className="space-y-2">
              {["Review feed shortlist", "Close ledger budget", "Plan focus block"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-foreground/78">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-background text-[var(--notion-green-text)]">
                    <Check className="h-3 w-3" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="absolute right-0 top-0 w-[min(300px,38vw)] rounded-2xl border border-border/80 bg-card/92 p-5 shadow-[0_22px_70px_rgb(var(--foreground-rgb)/0.12)] backdrop-blur-xl"
          animate={prefersReducedMotion ? undefined : { y: [0, 10, 0], rotate: [1.2, 0.35, 1.2] }}
          transition={{ duration: 10, ease: "easeInOut", repeat: Infinity }}
        >
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--notion-green-bg)] text-[var(--notion-green-text)]">
              <BrainCircuit className="h-4 w-4" />
            </span>
            AI context map
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Pages", "128"],
              ["Tasks", "24"],
              ["Signals", "12"],
              ["Habits", "5"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border/60 bg-background/70 p-3">
                <p className="text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-2 left-[24%] w-[min(330px,42vw)] rounded-2xl border border-border/80 bg-card/90 p-4 shadow-[0_24px_80px_rgb(var(--foreground-rgb)/0.14)] backdrop-blur-xl"
          animate={prefersReducedMotion ? undefined : { y: [0, -7, 0] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--notion-blue-bg)] text-[var(--notion-blue-text)]">
                <Layers3 className="h-4 w-4" />
              </span>
              Workspace today
            </div>
            <span className="text-xs text-muted-foreground">08:30</span>
          </div>
          <div className="space-y-2.5">
            <PreviewRow icon={CalendarCheck2} label="Reminders" value="2 due" />
            <PreviewRow icon={MessageSquareText} label="Shared notes" value="Live" />
            <PreviewRow icon={Inbox} label="Inbox capture" value="Clean" />
          </div>
        </motion.div>
      </div>

      <LoginMotionBlock
        className="grid grid-cols-2 gap-3 [@media(max-height:850px)]:hidden xl:grid-cols-4"
        delay={0.22}
      >
        {modules.map((module) => (
          <div
            key={module.label}
            className="rounded-2xl border border-border/70 bg-card/62 p-4 shadow-sm backdrop-blur-xl"
          >
            <span className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-xl", module.className)}>
              <module.icon className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold text-foreground">{module.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{module.value}</p>
          </div>
        ))}
      </LoginMotionBlock>
    </div>
  );
}

function PreviewRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/58 px-3 py-2.5 text-xs">
      <span className="flex items-center gap-2 font-medium text-foreground/78">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}

function MemoryWeave() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full opacity-80"
      viewBox="0 0 720 430"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="memory-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(var(--foreground-rgb))" stopOpacity="0.02" />
          <stop offset="0.48" stopColor="rgb(var(--foreground-rgb))" stopOpacity="0.22" />
          <stop offset="1" stopColor="rgb(var(--foreground-rgb))" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      {[
        "M80 260 C190 110 300 300 420 150 S600 170 670 70",
        "M70 120 C210 220 260 65 388 210 S575 335 675 240",
        "M120 360 C210 280 290 365 390 295 S535 190 650 340",
      ].map((path, index) => (
        <motion.path
          key={path}
          d={path}
          fill="none"
          stroke="url(#memory-line)"
          strokeWidth="1.4"
          strokeDasharray="6 10"
          initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0.2 }}
          animate={
            prefersReducedMotion
              ? { opacity: 0.38 }
              : {
                  pathLength: [0.35, 1, 0.35],
                  opacity: [0.2, 0.7, 0.2],
                }
          }
          transition={{
            duration: 7 + index,
            delay: index * 0.6,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />
      ))}
      {[
        [96, 252],
        [214, 153],
        [356, 255],
        [430, 151],
        [548, 224],
        [636, 82],
        [644, 337],
      ].map(([cx, cy], index) => (
        <motion.circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="4"
          fill="rgb(var(--foreground-rgb))"
          fillOpacity="0.24"
          animate={prefersReducedMotion ? undefined : { r: [3.5, 5.5, 3.5], fillOpacity: [0.14, 0.32, 0.14] }}
          transition={{ duration: 4.5, delay: index * 0.35, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}
