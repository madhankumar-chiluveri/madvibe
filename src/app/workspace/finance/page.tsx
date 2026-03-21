"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { useAppStore } from "@/store/app.store";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, Plus, ArrowUpRight,
  ArrowDownRight, PiggyBank, Target, ChevronRight, BarChart2,
} from "lucide-react";

// ── Currency formatter ────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const CHART_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard",    label: "Dashboard" },
  { id: "transactions", label: "Transactions" },
  { id: "budget",       label: "Budget" },
  { id: "investments",  label: "Investments" },
] as const;

type Tab = typeof TABS[number]["id"];

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({
  label, value, trend, positive = true, icon: Icon, gradient
}: {
  label: string; value: string; trend?: string;
  positive?: boolean; icon: any; gradient: string;
}) {
  return (
    <div className={cn("rounded-2xl p-4 text-white", gradient)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-white/70 uppercase tracking-wide">{label}</span>
        <Icon className="w-4 h-4 text-white/60" />
      </div>
      <p className="text-2xl font-bold leading-tight">{value}</p>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span className="text-xs text-white/70">{trend}</span>
        </div>
      )}
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab() {
  const month = new Date().toISOString().slice(0, 7);
  const data = useQuery(api.finance.getDashboardData, { month });

  // Demo cashflow chart data
  const cashflowData = [
    { name: "Oct", income: 85000, expenses: 52000 },
    { name: "Nov", income: 92000, expenses: 61000 },
    { name: "Dec", income: 78000, expenses: 74000 },
    { name: "Jan", income: 95000, expenses: 58000 },
    { name: "Feb", income: 88000, expenses: 63000 },
    { name: "Mar", income: data?.income ?? 0, expenses: data?.expenses ?? 0 },
  ];

  const pieData = [
    { name: "Food", value: 18000 },
    { name: "Transport", value: 8500 },
    { name: "Shopping", value: 12000 },
    { name: "Utilities", value: 5000 },
    { name: "Other", value: 7500 },
  ];

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Net Worth" value={data ? fmt(data.netWorth) : "—"}
          trend="vs last month" positive icon={Wallet}
          gradient="bg-gradient-to-br from-violet-600 to-indigo-700"
        />
        <MetricCard
          label="Income" value={data ? fmt(data.income) : "—"}
          trend="this month" positive icon={ArrowUpRight}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-700"
        />
        <MetricCard
          label="Expenses" value={data ? fmt(data.expenses) : "—"}
          trend="this month" positive={false} icon={ArrowDownRight}
          gradient="bg-gradient-to-br from-rose-500 to-red-700"
        />
        <MetricCard
          label="Savings" value={data ? fmt(Math.max(0, (data.income - data.expenses))) : "—"}
          trend="net saved" positive icon={PiggyBank}
          gradient="bg-gradient-to-br from-amber-500 to-orange-700"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
            Cash Flow (6 months)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cashflowData} barGap={4}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-4">Expense Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                paddingAngle={3} dataKey="value">
                {pieData.map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Insight */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/5 border border-violet-500/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">
            💡 Maddy's Finance Insight
          </span>
        </div>
        <p className="text-sm text-foreground/80">
          Your dining expenses are ₹12,000 this month — 28% higher than last month. Consider meal prepping 2-3 days a week to hit your ₹8,000 food budget.
        </p>
      </div>
    </div>
  );
}

// ── Transactions Tab ──────────────────────────────────────────────────────────
function TransactionsTab() {
  const txns = useQuery(api.finance.listTransactions, { limit: 20 });
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Recent Transactions</h3>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors min-h-[36px]"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Description</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Category</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {txns === undefined ? (
              [...Array(5)].map((_: any, i: number) => (
                <tr key={i}>
                  {[...Array(4)].map((_: any, j: number) => (
                    <td key={j} className="px-4 py-3"><div className="h-3 bg-muted rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : txns.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">No transactions yet — add your first one!</td></tr>
            ) : (
              txns.map((t: any) => (
                <tr key={t._id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{t.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.date}</td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                  <td className={cn("px-4 py-3 text-right font-semibold",
                    t.type === "income" ? "text-emerald-600" : "text-red-500")}>
                    {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {txns?.map((t: any) => (
          <div key={t._id} className="flex items-center gap-3 bg-card border rounded-xl px-3 py-3">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0",
              t.type === "income" ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-500"
            )}>
              {t.type === "income" ? "↑" : "↓"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{t.description}</p>
              <p className="text-xs text-muted-foreground">{t.date}</p>
            </div>
            <p className={cn("text-sm font-bold shrink-0",
              t.type === "income" ? "text-emerald-600" : "text-red-500")}>
              {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
            </p>
          </div>
        ))}
        {!txns?.length && (
          <p className="text-center text-sm text-muted-foreground py-12">No transactions yet</p>
        )}
      </div>
    </div>
  );
}

// ── Investments Tab ───────────────────────────────────────────────────────────
function InvestmentsTab() {
  const investments = useQuery(api.finance.listInvestments);
  const goals = useQuery(api.finance.listGoals);

  const DEMO = [
    { name: "Nifty 50 Index Fund", type: "mutual_fund", symbol: "NIFTYBEES", qty: 50, buy: 220, current: 248, platform: "Zerodha" },
    { name: "HDFC Bank", type: "stock", symbol: "HDFCBANK", qty: 10, buy: 1450, current: 1621, platform: "Zerodha" },
    { name: "Bitcoin", type: "crypto", symbol: "BTC", qty: 0.02, buy: 3200000, current: 6800000, platform: "WazirX" },
  ];

  const displayData = (investments && investments.length > 0) ? investments : DEMO;

  return (
    <div className="space-y-4">
      {/* AI market overview */}
      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-2xl p-4">
        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">📊 Today's Market</p>
        <p className="text-sm text-foreground/80">
          Nifty 50 is up +0.8% today. IT and pharma sectors leading the rally. FII inflows at ₹2,340 Cr. Your portfolio is ~2.1% above your 30-day average.
        </p>
      </div>

      {/* Portfolio */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold">Portfolio Holdings</span>
          <button className="flex items-center gap-1 text-xs text-primary min-h-[36px]">
            <Plus className="w-3.5 h-3.5" /> Add holding
          </button>
        </div>
        {/* Desktop table */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                {["Name", "Platform", "Qty", "Buy Price", "Current", "P&L"].map((h: string) => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayData.map((inv: any, i: number) => {
                const pnl = (inv.current - inv.buy) * inv.qty;
                const pct = ((inv.current - inv.buy) / inv.buy * 100).toFixed(1);
                return (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium">{inv.name}</p>
                      <p className="text-xs text-muted-foreground">{inv.symbol}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{inv.platform}</td>
                    <td className="px-4 py-3">{inv.qty}</td>
                    <td className="px-4 py-3">{fmt(inv.buy)}</td>
                    <td className="px-4 py-3">{fmt(inv.current)}</td>
                    <td className={cn("px-4 py-3 font-semibold", pnl >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {pnl >= 0 ? "+" : ""}{fmt(pnl)} ({pct}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden p-3 space-y-2">
          {displayData.map((inv: any, i: number) => {
            const pnl = (inv.current - inv.buy) * inv.qty;
            const pct = ((inv.current - inv.buy) / inv.buy * 100).toFixed(1);
            return (
              <div key={i} className="border rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{inv.name}</p>
                    <p className="text-xs text-muted-foreground">{inv.symbol} · {inv.platform}</p>
                  </div>
                  <span className={cn("text-sm font-bold shrink-0", pnl >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {pnl >= 0 ? "+" : ""}{fmt(pnl)}
                  </span>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Qty: {inv.qty}</span>
                  <span>Buy: {fmt(inv.buy)}</span>
                  <span>Now: {fmt(inv.current)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Goals */}
      {goals && goals.length > 0 && (
        <div className="bg-card border rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" /> Financial Goals
          </h3>
          {goals.map((g: any) => {
            const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
            return (
              <div key={g._id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{g.name}</span>
                  <span className="text-xs text-muted-foreground">{fmt(g.currentAmount)} / {fmt(g.targetAmount)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Target: {g.targetDate}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Budget Tab ────────────────────────────────────────────────────────────────
function BudgetTab() {
  const budgets = useQuery(api.finance.listBudgets);
  const categories = useQuery(api.finance.listCategories, { type: "expense" });

  const demoBudgets = [
    { name: "Food & Dining", icon: "🍔", budgeted: 10000, spent: 13200 },
    { name: "Transport", icon: "🚗", budgeted: 5000, spent: 3800 },
    { name: "Shopping", icon: "🛍", budgeted: 8000, spent: 12000 },
    { name: "Entertainment", icon: "🎬", budgeted: 3000, spent: 1500 },
    { name: "Subscriptions", icon: "📱", budgeted: 2000, spent: 1950 },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Monthly Budget</h3>
        <span className="text-xs text-muted-foreground">March 2026</span>
      </div>
      {demoBudgets.map((b) => {
        const pct = Math.min(100, (b.spent / b.budgeted) * 100);
        const over = b.spent > b.budgeted;
        return (
          <div key={b.name} className="bg-card border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{b.icon}</span>
                <span className="text-sm font-medium">{b.name}</span>
              </div>
              <div className="text-right">
                <span className={cn("text-sm font-bold", over ? "text-red-500" : "text-foreground")}>
                  {fmt(b.spent)}
                </span>
                <span className="text-xs text-muted-foreground"> / {fmt(b.budgeted)}</span>
              </div>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all",
                  pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className={cn("text-xs", over ? "text-red-500 font-medium" : "text-muted-foreground")}>
                {over ? `Over by ${fmt(b.spent - b.budgeted)}` : `${fmt(b.budgeted - b.spent)} left`}
              </span>
              <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Finance Page ─────────────────────────────────────────────────────────
export default function FinancePage() {
  const { financeTab, setFinanceTab } = useAppStore();

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-muted-foreground" /> Finance
          </h1>
        </div>
        {/* Tab bar — scrollable on mobile */}
        <div className="max-w-5xl mx-auto px-4 pb-2">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFinanceTab(tab.id)}
                className={cn(
                  "shrink-0 text-xs font-medium px-4 py-2 rounded-lg transition-all min-h-[36px]",
                  financeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
        {financeTab === "dashboard" && <DashboardTab />}
        {financeTab === "transactions" && <TransactionsTab />}
        {financeTab === "budget" && <BudgetTab />}
        {financeTab === "investments" && <InvestmentsTab />}
      </div>
    </div>
  );
}
