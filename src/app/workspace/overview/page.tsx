"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { useAppStore } from "@/store/app.store";
import { cn } from "@/lib/utils";
import { ReminderOverviewCard } from "@/components/reminders/reminder-overview-card";
import { toast } from "sonner";
import {
  Sun, Moon, Sunset, ChevronRight,
  Zap, Timer, TrendingUp, TrendingDown, Newspaper,
  Sparkles, BarChart2, Target, Check, Loader2,
} from "lucide-react";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";

// ── Greeting Widget ────────────────────────────────────────────────────────────
const GreetingWidget = memo(function GreetingWidget() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const Icon = hour < 12 ? Sun : hour < 17 ? Sunset : Moon;
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="col-span-full flex items-center justify-between px-1 pb-1">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Icon className="w-6 h-6 text-amber-500" />
          {greeting}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
      </div>
    </div>
  );
});

// ── Quick Capture ──────────────────────────────────────────────────────────────
const QuickCaptureBar = memo(function QuickCaptureBar() {
  const [value, setValue] = useState("");
  const [hint, setHint] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  const { resolvedWorkspaceId: workspaceId } = useResolvedWorkspace();
  const createPage = useMutation(api.pages.create);
  const createReminder = useMutation(api.reminders.create);

  const detectIntent = (v: string) => {
    if (v.startsWith("$")) return "💰 Navigate to Ledger";
    if (v.startsWith("!")) return "⏰ Create reminder";
    if (v.startsWith("#")) return "📝 Create note";
    if (v.startsWith("http")) return "🔖 Open link";
    return "📝 Create note";
  };

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || !workspaceId || submitting) return;
    setSubmitting(true);

    try {
      // Open URL
      if (trimmed.startsWith("http")) {
        window.open(trimmed, "_blank", "noopener,noreferrer");
        setValue("");
        setHint("");
        return;
      }

      // Navigate to Ledger for expenses
      if (trimmed.startsWith("$")) {
        toast.info("Opening Ledger — add your expense there");
        router.push("/workspace/ledger");
        setValue("");
        setHint("");
        return;
      }

      // Create reminder (! prefix)
      if (trimmed.startsWith("!")) {
        const title = trimmed.slice(1).trim() || "Reminder";
        await createReminder({
          workspaceId,
          title,
          remindAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
        });
        toast.success(`Reminder set: "${title}" — in 1 hour`);
        setValue("");
        setHint("");
        return;
      }

      // Create Brain page (# prefix or default)
      const title = trimmed.startsWith("#") ? trimmed.slice(1).trim() : trimmed;
      const pageId = await createPage({
        workspaceId,
        parentId: null,
        type: "document",
        title: title || "Untitled",
      });
      router.push(`/workspace/${pageId}`);
      setValue("");
      setHint("");
    } catch {
      toast.error("Failed to capture — try again");
    } finally {
      setSubmitting(false);
    }
  }, [value, workspaceId, submitting, createPage, createReminder, router]);

  return (
    <div className="col-span-full">
      <div className="relative flex items-center gap-2 bg-muted/50 border rounded-xl px-4 min-h-[48px] focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all">
        {submitting
          ? <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          : <Zap className="w-4 h-4 text-muted-foreground shrink-0" />
        }
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-3"
          placeholder="Quick capture… ! reminder · # note · $ expense"
          value={value}
          disabled={submitting}
          onChange={(e) => {
            setValue(e.target.value);
            setHint(e.target.value ? detectIntent(e.target.value) : "");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
        {hint && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
});

// ── Pomodoro Timer ─────────────────────────────────────────────────────────────
const PomodoroWidget = memo(function PomodoroWidget() {
  const { focusActive, focusMinutes, focusStartedAt, startFocus, stopFocus } = useAppStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!focusActive || !focusStartedAt) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - focusStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [focusActive, focusStartedAt]);

  const totalSeconds = focusMinutes * 60;
  const remaining = Math.max(0, totalSeconds - elapsed);
  const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");
  const progress = ((totalSeconds - remaining) / totalSeconds) * 100;
  const circumference = 2 * Math.PI * 36;

  return (
    <div className="bg-card border rounded-2xl p-4 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 w-full">
        <Timer className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Focus Timer</span>
      </div>
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="36"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress / 100)}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-mono font-bold">{mins}:{secs}</span>
        </div>
      </div>
      <button
        onClick={focusActive ? stopFocus : startFocus}
        className={cn(
          "w-full py-2 rounded-xl text-sm font-medium transition-all min-h-[44px]",
          focusActive
            ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {focusActive ? "Stop Session" : "Start Focus"}
      </button>
      {!focusActive && (
        <div className="flex gap-2 w-full">
          {[25, 45, 90].map((m) => (
            <button
              key={m}
              onClick={() => useAppStore.getState().setFocusMinutes(m)}
              className={cn(
                "flex-1 text-xs py-1 rounded-lg border transition-colors min-h-[40px]",
                focusMinutes === m
                  ? "bg-primary/10 border-primary text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {m}m
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// ── Habit Strip ────────────────────────────────────────────────────────────────
const HabitStrip = memo(function HabitStrip() {
  const today = new Date().toISOString().slice(0, 10);
  const habits = useQuery(api.habits.listHabits);
  const logs = useQuery(api.habits.getTodaysLogs, { date: today });
  const logHabit = useMutation(api.habits.logHabit);

  const isCompleted = (habitId: string) =>
    logs?.some((l: any) => l.habitId === habitId && l.completed) ?? false;

  if (!habits || habits.length === 0) return null;

  return (
    <div className="col-span-full bg-card border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's Habits</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {logs?.filter((l: any) => l.completed).length ?? 0}/{habits.length}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {habits.map((habit: any) => {
          const done = isCompleted(habit._id);
          return (
            <button
              key={habit._id}
              className={cn(
                "flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border shrink-0 transition-all min-h-[44px] min-w-[64px]",
                done
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
              )}
              onClick={() =>
                logHabit({ habitId: habit._id, date: today, completed: !done })
              }
            >
              <span className="text-lg leading-none">{habit.icon}</span>
              <span className="text-[10px] font-medium truncate max-w-[56px] text-center leading-tight">
                {habit.name}
              </span>
              {done && <Check className="w-3 h-3" />}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ── Ledger Snapshot ────────────────────────────────────────────────────────────
const LedgerSnapshot = memo(function LedgerSnapshot() {
  const router = useRouter();
  const month = new Date().toISOString().slice(0, 7);
  const data = useQuery(api.ledger.getDashboardData, { month });

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", maximumFractionDigits: 0,
    }).format(n);

  return (
    <div
      className="bg-card border rounded-2xl p-4 cursor-pointer hover:border-primary/30 transition-colors"
      onClick={() => router.push("/workspace/ledger")}
    >
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">LEDGER</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Income</p>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400 leading-tight">
            {data ? fmt(data.income) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Expenses</p>
          <p className="text-lg font-semibold text-red-600 dark:text-red-400 leading-tight">
            {data ? fmt(data.expenses) : "—"}
          </p>
        </div>
        <div className="col-span-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Net Worth</p>
            <div className="flex items-center gap-1">
              {(data?.netWorth ?? 0) >= 0
                ? <TrendingUp className="w-3 h-3 text-green-500" />
                : <TrendingDown className="w-3 h-3 text-red-500" />
              }
              <p className="text-sm font-bold">{data ? fmt(data.netWorth) : "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ── Feed Digest ────────────────────────────────────────────────────────────────
const FeedDigest = memo(function FeedDigest() {
  const router = useRouter();
  const articles = useQuery(api.feed.getTopArticles, { limit: 3 });

  return (
    <div
      className="bg-card border rounded-2xl p-4 cursor-pointer hover:border-primary/30 transition-colors"
      onClick={() => router.push("/workspace/feed")}
    >
      <div className="flex items-center gap-2 mb-3">
        <Newspaper className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">FEED</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
      </div>
      <div className="space-y-2.5">
        {articles === undefined ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded animate-pulse" />
          ))
        ) : articles.length === 0 ? (
          <p className="text-xs text-muted-foreground">No articles yet — syncing soon</p>
        ) : (
          articles.map((a: any) => (
            <div key={a._id} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">{a.title}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

// ── Today's Progress (replaces hardcoded AI Insight) ──────────────────────────
const TodayProgressWidget = memo(function TodayProgressWidget() {
  const today = new Date().toISOString().slice(0, 10);
  const habits = useQuery(api.habits.listHabits);
  const logs = useQuery(api.habits.getTodaysLogs, { date: today });

  if (!habits || habits.length === 0) return null;

  const completedCount = logs?.filter((l: any) => l.completed).length ?? 0;
  const total = habits.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const message =
    pct === 100
      ? "All habits done today — perfect day! 🎯"
      : pct >= 60
      ? `${completedCount}/${total} habits done. Keep the momentum! 💪`
      : completedCount === 0
      ? "Start your habits for today to build momentum ☀️"
      : `${completedCount}/${total} habits done — you're making progress 🌱`;

  return (
    <div className="bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-pink-500/10 border border-violet-500/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-violet-500" />
        <span className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wide">
          Today's Progress
        </span>
        <span className="ml-auto text-xs font-semibold text-violet-600 dark:text-violet-400">
          {pct}%
        </span>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{message}</p>
      <div className="mt-2.5 bg-muted/50 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-violet-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
});

// ── Main Overview Page ────────────────────────────────────────────────────────
export default memo(function OverviewPage() {
  return (
    <div className="min-h-full bg-background">
      <WorkspaceTopBar moduleTitle="Overview" />
      <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GreetingWidget />
          <QuickCaptureBar />
          <HabitStrip />

          <LedgerSnapshot />
          <FeedDigest />

          <div className="md:col-span-1">
            <TodayProgressWidget />
          </div>
          <div className="md:col-span-1">
            <ReminderOverviewCard />
          </div>
          <div className="md:col-span-1">
            <PomodoroWidget />
          </div>
        </div>
      </div>
    </div>
  );
});
