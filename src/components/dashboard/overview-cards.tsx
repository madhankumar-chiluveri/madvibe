"use client";

import { memo } from "react";
import {
  Briefcase,
  Wallet,
  Flame,
  Car,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OverviewCardsProps {
  data: {
    tasks: {
      total: number;
      completed: number;
      inProgress: number;
      pending: number;
      projects: number;
    };
    finances: {
      netWorth: number;
      income: number;
      expenses: number;
    };
    habits: {
      total: number;
      completed: number;
      percentage: number;
      longestStreak: number;
    };
    vehicles: Array<{
      status: "Healthy" | "Service Due" | "Overdue";
    }>;
  } | null;
  loading?: boolean;
}

export const OverviewCards = memo(function OverviewCards({ data, loading }: OverviewCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer h-[120px] rounded-xl border border-border/60"
          />
        ))}
      </div>
    );
  }

  const { tasks, finances, habits, vehicles } = data;

  const overdueVehicles = vehicles.filter((v) => v.status === "Overdue").length;
  const serviceDueVehicles = vehicles.filter((v) => v.status === "Service Due").length;
  const totalVehicles = vehicles.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* 1. Projects & Tasks Card */}
      <div className="rounded-[10px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[120px] transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-notion-gray-text uppercase tracking-wider">
            Projects & Tasks
          </span>
          <div className="p-1.5 rounded-lg bg-notion-gray-bg/50">
            <Briefcase className="w-4 h-4 text-notion-gray-text" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight leading-none text-foreground">
              {tasks.projects}
            </span>
            <span className="text-[11px] text-muted-foreground mt-1 font-medium">
              Active Project databases
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="px-2 py-0.5 rounded-full bg-notion-blue-bg text-notion-blue-text">
              {tasks.inProgress} In Progress
            </span>
            <span className="px-2 py-0.5 rounded-full bg-notion-green-bg text-notion-green-text">
              {tasks.completed} Done
            </span>
          </div>
        </div>
      </div>

      {/* 2. Ledger Finances Card */}
      <div className="rounded-[10px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[120px] transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-notion-blue-text uppercase tracking-wider">
            Ledger Cash Flow
          </span>
          <div className="p-1.5 rounded-lg bg-notion-blue-bg/50">
            <Wallet className="w-4 h-4 text-notion-blue-text" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight leading-none text-foreground">
              {formatCurrency(finances.netWorth)}
            </span>
            <span className="text-[11px] text-muted-foreground mt-1 font-medium">
              Net Worth across accounts
            </span>
          </div>
          <div className="flex flex-col items-end text-xs font-medium gap-0.5">
            <span className="text-notion-green-text flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {formatCurrency(finances.income)}
            </span>
            <span className="text-notion-red-text flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              {formatCurrency(finances.expenses)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Habits & Streak Card */}
      <div className="rounded-[10px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[120px] transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-notion-orange-text uppercase tracking-wider">
            Today's Habits
          </span>
          <div className="p-1.5 rounded-lg bg-notion-orange-bg/50">
            <Flame className="w-4 h-4 text-notion-orange-text animate-pulse" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight leading-none text-foreground">
              {habits.percentage}%
            </span>
            <span className="text-[11px] text-muted-foreground mt-1 font-medium">
              {habits.completed}/{habits.total} habits completed
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-notion-orange-text bg-notion-orange-bg px-2 py-1 rounded-lg">
            <Activity className="w-3.5 h-3.5" />
            <span>{habits.longestStreak}d Streak</span>
          </div>
        </div>
      </div>

      {/* 4. Garage Vehicles Status Card */}
      <div className="rounded-[10px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[120px] transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-notion-purple-text uppercase tracking-wider">
            Garage Services
          </span>
          <div className="p-1.5 rounded-lg bg-notion-purple-bg/50">
            <Car className="w-4 h-4 text-notion-purple-text" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight leading-none text-foreground">
              {totalVehicles}
            </span>
            <span className="text-[11px] text-muted-foreground mt-1 font-medium">
              Vehicles registered
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {overdueVehicles > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-notion-red-bg text-notion-red-text flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {overdueVehicles} Alerts
              </span>
            ) : serviceDueVehicles > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-notion-yellow-bg text-notion-yellow-text">
                {serviceDueVehicles} Due
              </span>
            ) : totalVehicles > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-notion-green-bg text-notion-green-text flex items-center gap-0.5">
                <CheckCircle className="w-3 h-3" /> Healthy
              </span>
            ) : (
              <span className="text-xs text-muted-foreground font-normal">Empty</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
