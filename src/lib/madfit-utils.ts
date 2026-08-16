/** Date, streak and feedback helpers shared across the MadFit module. */

/** Local-timezone "YYYY-MM-DD". Never use toISOString() — that shifts to UTC. */
export function ymd(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses "YYYY-MM-DD" as local midnight rather than UTC. */
export function parseYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function dayName(value: string): string {
  return parseYmd(value).toLocaleDateString("en-US", { weekday: "long" });
}

export function shortDate(value: string): string {
  return parseYmd(value).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/**
 * Consecutive completed days ending today. Today not being logged yet does not
 * break the streak — yesterday is the anchor until you train.
 */
export function calcStreak(dates: string[]): number {
  const set = new Set(dates);
  let streak = 0;
  const cursor = new Date();
  if (!set.has(ymd(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(ymd(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Completed days since Monday of the current week. */
export function weekCount(dates: string[]): number {
  const now = new Date();
  const offset = (now.getDay() + 6) % 7; // Monday = 0
  const start = new Date(now);
  start.setDate(now.getDate() - offset);
  start.setHours(0, 0, 0, 0);
  return dates.filter((d) => parseYmd(d) >= start).length;
}

/** Monday-first grid of the last `weeks` weeks, oldest column first. */
export function heatmapWeeks(weeks: number): string[][] {
  const now = new Date();
  const offset = (now.getDay() + 6) % 7;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - offset);
  thisMonday.setHours(0, 0, 0, 0);

  const columns: string[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const monday = new Date(thisMonday);
    monday.setDate(thisMonday.getDate() - w * 7);
    const column: string[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + d);
      column.push(ymd(day));
    }
    columns.push(column);
  }
  return columns;
}

export function formatDuration(totalSec?: number): string {
  if (!totalSec || totalSec <= 0) return "—";
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return s && m < 10 ? `${m}m ${s}s` : `${m}m`;
}

/** Short confirmation tone. Silently no-ops where WebAudio is unavailable. */
export function beep(frequency = 820, duration = 0.5) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  } catch {
    /* audio is a nicety, never a requirement */
  }
}

export function vibrate(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}
