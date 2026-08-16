"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { beep, vibrate } from "@/lib/madfit-utils";
import { Check, Plus, X, Minus } from "lucide-react";

export const ACCENT = "#C96442";

/* ── Progress ring ───────────────────────────────────────────────────────── */

export function Ring({
  value,
  size = 70,
  stroke = 8,
  color = ACCENT,
  label,
  sub,
  trackClass = "stroke-[#ECE3D5] dark:stroke-border",
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label: string;
  sub?: string;
  trackClass?: string;
}) {
  const reduceMotion = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(value, 0), 1));

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} aria-hidden="true">
        <circle
          className={trackClass}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: reduceMotion
              ? "none"
              : "stroke-dashoffset .6s cubic-bezier(.2,.7,.2,1)",
          }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute text-center leading-none">
        <div
          className="font-extrabold tabular-nums text-foreground"
          style={{ fontSize: size * 0.26 }}
        >
          {label}
        </div>
        {sub && (
          <div
            className="font-bold tabular-nums text-muted-foreground"
            style={{ fontSize: size * 0.14 }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Stat tile ───────────────────────────────────────────────────────────── */

export function StatTile({
  icon: Icon,
  value,
  label,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center sm:p-4">
      <Icon className="mx-auto mb-1.5 h-4 w-4 text-[#C96442]" />
      <div className="text-xl font-black leading-tight tabular-nums text-foreground sm:text-2xl">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {hint && <div className="mt-0.5 text-[10px] font-semibold text-muted-foreground/70">{hint}</div>}
    </div>
  );
}

/* ── Section heading ─────────────────────────────────────────────────────── */

export function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <h2 className="text-[13px] font-extrabold uppercase tracking-widest text-muted-foreground">
        {children}
      </h2>
      {action}
    </div>
  );
}

/* ── Celebration ─────────────────────────────────────────────────────────── */

export function Confetti() {
  const reduceMotion = useReducedMotion();
  const pieces = useMemo(() => {
    const colors = ["#C96442", "#E79A7B", "#D98E45", "#E2AC6A", "#7F9270", "#7E96A8"];
    return Array.from({ length: 70 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.6,
      duration: 2 + Math.random() * 2,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, []);

  if (reduceMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes madfit-confetti{0%{transform:translateY(-10vh) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(360deg);opacity:0}}`,
        }}
      />
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
            animation: `madfit-confetti ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Timer overlay ───────────────────────────────────────────────────────── */

type TimerMode = "rest" | "work";

/**
 * One overlay serves both jobs. `work` counts down a timed set and reports
 * completion so the caller can log it; `rest` just paces the gap between sets.
 */
export function TimerOverlay({
  mode,
  total,
  title,
  subtitle,
  onDone,
  onCancel,
}: {
  mode: TimerMode;
  total: number;
  title: string;
  subtitle?: string;
  /** Fired when the clock reaches zero or the user confirms early. */
  onDone: () => void;
  /** Fired when the user backs out without completing. */
  onCancel: () => void;
}) {
  const [remaining, setRemaining] = useState(total);
  const [added, setAdded] = useState(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          if (!doneRef.current) {
            doneRef.current = true;
            beep(mode === "work" ? 660 : 820);
            vibrate([30, 60, 30]);
            setTimeout(() => onDoneRef.current(), 350);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const ceiling = total + added;
  const pct = ceiling > 0 ? remaining / ceiling : 0;
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  const isWork = mode === "work";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isWork ? "Set timer" : "Rest timer"}
      className="fixed inset-0 z-[95] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[340px] rounded-2xl border border-border bg-card p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "text-[11px] font-extrabold uppercase tracking-[0.2em]",
            isWork ? "text-[#7F9270]" : "text-[#C96442]"
          )}
        >
          {isWork ? "Work" : "Rest"}
        </div>
        <div className="my-6 flex justify-center">
          <Ring
            value={pct}
            size={156}
            stroke={12}
            color={isWork ? "#7F9270" : ACCENT}
            label={`${mm}:${ss}`}
          />
        </div>
        <div className="mb-6 text-sm font-bold leading-snug text-foreground">
          {title}
          {subtitle && (
            <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              setRemaining((p) => Math.max(5, p - 15));
              setAdded((a) => a - 15);
            }}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-border bg-muted/40 px-4 text-sm font-bold transition-colors hover:bg-muted/80"
          >
            <Minus className="h-3.5 w-3.5" /> 15s
          </button>
          <button
            onClick={() => {
              setRemaining((p) => p + 15);
              setAdded((a) => a + 15);
            }}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-border bg-muted/40 px-4 text-sm font-bold transition-colors hover:bg-muted/80"
          >
            <Plus className="h-3.5 w-3.5" /> 15s
          </button>
          <button
            onClick={() => {
              if (doneRef.current) return;
              doneRef.current = true;
              onDone();
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#CE6A47] to-[#DC9447] px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-opacity hover:opacity-90"
          >
            <Check className="h-4 w-4" />
            {isWork ? "Done" : "Skip rest"}
          </button>
        </div>
        <button
          onClick={onCancel}
          className="mx-auto mt-3 inline-flex min-h-[36px] items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3 w-3" /> Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
      <Icon className="mx-auto mb-3 h-6 w-6 text-muted-foreground/60" />
      <h3 className="text-sm font-extrabold text-foreground">{title}</h3>
      <p className="mx-auto mt-1 max-w-[38ch] text-xs font-semibold leading-relaxed text-muted-foreground">
        {body}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
