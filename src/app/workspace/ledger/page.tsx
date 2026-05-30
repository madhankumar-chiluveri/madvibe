"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState, useMemo } from "react";
import { useAppStore, type LedgerTab } from "@/store/app.store";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import {
  LayoutDashboard, CreditCard, TrendingUp, TrendingDown,
  Target, BarChart2, Globe, Plus, Wallet, ArrowUpRight, ArrowDownRight,
  PiggyBank, X, Trash2, AlertTriangle, Handshake, CheckCircle,
  RefreshCw, Repeat, DollarSign,
  Calendar, Clock, Landmark, Building2, ChevronRight, Edit2,
  RotateCcw, AlertCircle, Info, ArrowLeft,
} from "lucide-react";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LedgerSecurityGate } from "@/components/ledger/ledger-security-gate";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}k`;
  return fmt(n);
};

const todayDate = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);

const CHART_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#06b6d4"];

const ASSET_LABELS: Record<string, string> = {
  stock: "Stocks", mutual_fund: "Mutual Funds", etf: "ETFs",
  fd: "Fixed Deposit", ppf: "PPF", gold: "Gold",
  crypto: "Crypto", real_estate: "Real Estate", bond: "Bonds", other: "Other",
};

const ASSET_ICONS: Record<string, string> = {
  stock: "📈", mutual_fund: "🏦", etf: "📊", fd: "🏛", ppf: "🏛",
  gold: "🥇", crypto: "₿", real_estate: "🏠", bond: "📜", other: "💰",
};

const NETWORK_COLORS: Record<string, string> = {
  visa: "from-blue-600 to-blue-800",
  mastercard: "from-red-600 to-orange-600",
  rupay: "from-orange-500 to-amber-600",
  amex: "from-emerald-600 to-teal-700",
  discover: "from-amber-500 to-yellow-600",
  other: "from-slate-600 to-slate-800",
};

const ACCOUNT_TYPE_OPTIONS = [
  {
    value: "savings",
    label: "Savings account",
    shortLabel: "Savings",
    helper: "Emergency funds and reserves",
    icon: PiggyBank,
    iconWrapClassName: "bg-notion-green-bg text-notion-green-text",
    badgeClassName: "bg-notion-green-bg text-notion-green-text",
  },
  {
    value: "checking",
    label: "Current account",
    shortLabel: "Current",
    helper: "Daily operating cash flow",
    icon: Building2,
    iconWrapClassName: "bg-notion-blue-bg text-notion-blue-text",
    badgeClassName: "bg-notion-blue-bg text-notion-blue-text",
  },
  {
    value: "cash",
    label: "Cash",
    shortLabel: "Cash",
    helper: "Physical cash on hand",
    icon: DollarSign,
    iconWrapClassName: "bg-notion-yellow-bg text-notion-yellow-text",
    badgeClassName: "bg-notion-yellow-bg text-notion-yellow-text",
  },
  {
    value: "wallet",
    label: "Wallet",
    shortLabel: "Wallet",
    helper: "UPI and stored-value balances",
    icon: Wallet,
    iconWrapClassName: "bg-notion-orange-bg text-notion-orange-text",
    badgeClassName: "bg-notion-orange-bg text-notion-orange-text",
  },
  {
    value: "credit_card",
    label: "Credit card",
    shortLabel: "Credit card",
    helper: "Card-linked liabilities",
    icon: CreditCard,
    iconWrapClassName: "bg-notion-purple-bg text-notion-purple-text",
    badgeClassName: "bg-notion-purple-bg text-notion-purple-text",
  },
  {
    value: "investment",
    label: "Investment account",
    shortLabel: "Investment",
    helper: "Brokerage and wealth accounts",
    icon: TrendingUp,
    iconWrapClassName: "bg-notion-blue-bg text-notion-blue-text",
    badgeClassName: "bg-notion-blue-bg text-notion-blue-text",
  },
  {
    value: "loan",
    label: "Loan account",
    shortLabel: "Loan",
    helper: "Borrowed or lent balances",
    icon: Handshake,
    iconWrapClassName: "bg-notion-red-bg text-notion-red-text",
    badgeClassName: "bg-notion-red-bg text-notion-red-text",
  },
] as const;

type LedgerAccountTypeValue = (typeof ACCOUNT_TYPE_OPTIONS)[number]["value"];

const ACCOUNT_TYPE_SORT_ORDER = ACCOUNT_TYPE_OPTIONS.reduce<Record<string, number>>(
  (accumulator, option, index) => {
    accumulator[option.value] = index;
    return accumulator;
  },
  {}
);

const BANK_ACCOUNT_TYPE_SET = new Set<LedgerAccountTypeValue>(["savings", "checking"]);
const LIQUID_ACCOUNT_TYPE_SET = new Set<LedgerAccountTypeValue>([
  "savings",
  "checking",
  "cash",
  "wallet",
]);

function getAccountTypeMeta(type: string) {
  return (
    ACCOUNT_TYPE_OPTIONS.find((option) => option.value === type) ??
    ACCOUNT_TYPE_OPTIONS[0]
  );
}

function formatAccountTypeLabel(type: string) {
  return getAccountTypeMeta(type).shortLabel;
}

function isBankAccountType(type: string) {
  return BANK_ACCOUNT_TYPE_SET.has(type as LedgerAccountTypeValue);
}

function isLiquidAccountType(type: string) {
  return LIQUID_ACCOUNT_TYPE_SET.has(type as LedgerAccountTypeValue);
}

function sortLedgerAccounts(accounts: any[]) {
  return [...accounts].sort((left, right) => {
    const typeOrder =
      (ACCOUNT_TYPE_SORT_ORDER[left.type] ?? 999) -
      (ACCOUNT_TYPE_SORT_ORDER[right.type] ?? 999);
    if (typeOrder !== 0) return typeOrder;
    return String(left.name ?? "").localeCompare(String(right.name ?? ""));
  });
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard" as const,    label: "Dashboard",    icon: LayoutDashboard },
  { id: "credit_cards" as const, label: "Cards",        icon: CreditCard },
  { id: "loans" as const,        label: "Loans",        icon: Handshake },
  { id: "investments" as const,  label: "Invest",       icon: TrendingUp },
  { id: "budget" as const,       label: "Budget",       icon: BarChart2 },
  { id: "goals" as const,        label: "Goals",        icon: Target },
  { id: "recurring" as const,    label: "Recurring",    icon: Repeat },
  { id: "market" as const,       label: "Market",       icon: Globe },
];

// ── Shared Components ─────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, positive = true, icon: Icon, gradient }: {
  label: string; value: string; sub?: string; positive?: boolean; icon: any; gradient: string;
}) {
  return (
    <div className={cn("rounded-2xl p-4 text-foreground", gradient)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-foreground/70 uppercase tracking-wide">{label}</span>
        <Icon className="w-4 h-4 text-foreground/60" />
      </div>
      <p className="text-2xl font-bold leading-tight">{value}</p>
      {sub && (
        <div className="flex items-center gap-1 mt-1">
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span className="text-xs text-foreground/70">{sub}</span>
        </div>
      )}
    </div>
  );
}

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/60 p-4 pb-[calc(env(safe-area-inset-bottom)+6.25rem)] pt-6 backdrop-blur-sm sm:items-center sm:pb-4">
      <div className="bg-card border rounded-2xl w-full max-w-lg max-h-[min(88vh,calc(100dvh-8rem-env(safe-area-inset-bottom)))] overflow-y-auto shadow-2xl sm:max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-card z-10">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 pb-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}{required && <span className="text-notion-red-text ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full text-sm bg-muted/50 border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60 transition-all";
const LEDGER_EMPTY_SELECT_VALUE = "__ledger_empty_value__";
const ledgerSelectTriggerBaseCls =
  "w-full border-foreground/10 bg-foreground/[0.03] text-foreground shadow-none transition-colors hover:bg-foreground/[0.06] focus:ring-1 focus:ring-foreground/15 focus:ring-offset-0 data-[placeholder]:text-muted-foreground [&>svg]:text-muted-foreground";
const ledgerSelectContentCls =
  "rounded-[18px] border-foreground/10 bg-popover p-1 text-foreground shadow-[0_24px_60px_rgba(0,0,0,0.45)]";
const ledgerSelectItemCls =
  "min-h-[38px] rounded-xl px-3 py-2 text-sm text-foreground focus:bg-foreground/[0.06] focus:text-foreground data-[state=checked]:bg-foreground/[0.08] data-[state=checked]:text-foreground";

function LedgerSelect({
  value,
  onValueChange,
  placeholder,
  emptyLabel,
  required,
  compact = false,
  triggerClassName,
  contentClassName,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  required?: boolean;
  compact?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  const normalizedValue =
    value === "" && emptyLabel ? LEDGER_EMPTY_SELECT_VALUE : value || undefined;

  return (
    <Select
      value={normalizedValue}
      onValueChange={(nextValue) =>
        onValueChange(nextValue === LEDGER_EMPTY_SELECT_VALUE ? "" : nextValue)
      }
      required={required}
    >
      <SelectTrigger
        className={cn(
          ledgerSelectTriggerBaseCls,
          compact ? "h-9 rounded-lg px-3 text-xs" : "h-11 rounded-xl px-3.5 text-sm",
          triggerClassName
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn(ledgerSelectContentCls, contentClassName)}>
        {emptyLabel ? (
          <LedgerSelectOption value={LEDGER_EMPTY_SELECT_VALUE}>
            {emptyLabel}
          </LedgerSelectOption>
        ) : null}
        {children}
      </SelectContent>
    </Select>
  );
}

function LedgerSelectOption({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SelectItem value={value} className={cn(ledgerSelectItemCls, className)}>
      {children}
    </SelectItem>
  );
}

function SaveBtn({ loading, label = "Save" }: { loading?: boolean; label?: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full bg-primary text-primary-foreground text-sm font-medium py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[44px]">
      {loading ? "Saving..." : label}
    </button>
  );
}

// ── DASHBOARD TAB ─────────────────────────────────────────────────────────────

function confirmDeleteRecord(recordLabel: string, detail?: string) {
  const suffix = detail ? `\n\n${detail}` : "";
  return window.confirm(`Delete this ${recordLabel}? This action cannot be undone.${suffix}`);
}

function DashboardTab() {
  const month = currentMonth();
  const data = useQuery(api.ledger.getDashboardData, { month });
  const cashflow = useQuery(api.ledger.getCashflowHistory, { months: 6 });
  const accounts = useQuery(api.ledger.listAccounts);
  const indices = useQuery(api.marketData.getMarketIndices);
  const loans = useQuery(api.ledgerLoans.listLoans, {});
  const recurring = useQuery(api.ledgerRecurring.listRecurring, { activeOnly: true });
  const categories = useQuery(api.ledger.listCategories, { type: "expense" });

  const catMap = useMemo(() => {
    const m: Record<string, { name: string; icon: string; color: string }> = {};
    for (const c of categories ?? []) m[c._id] = c;
    return m;
  }, [categories]);

  const pieData = useMemo(() => {
    if (!data?.byCategory) return [];
    return Object.entries(data.byCategory)
      .map(([id, val]) => ({ name: catMap[id]?.name ?? "Other", value: val as number, icon: catMap[id]?.icon ?? "💰" }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [data, catMap]);

  const savings = data ? data.income - data.expenses : 0;
  const upcomingLoans = (loans ?? []).filter((l: any) => l.daysUntilDue !== null && l.daysUntilDue <= 7 && l.daysUntilDue >= 0);
  const upcomingRecurring = (recurring ?? []).filter((r: any) => r.daysUntilNext <= 3);

  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Net Worth" value={data ? fmtShort(data.netWorth) : "—"}
          sub="all accounts" positive icon={Wallet} gradient="bg-gradient-to-br from-violet-600 to-indigo-700" />
        <MetricCard label="Income" value={data ? fmtShort(data.income) : "—"}
          sub="this month" positive icon={ArrowUpRight} gradient="bg-gradient-to-br from-emerald-500 to-teal-700" />
        <MetricCard label="Expenses" value={data ? fmtShort(data.expenses) : "—"}
          sub="this month" positive={false} icon={ArrowDownRight} gradient="bg-gradient-to-br from-rose-500 to-red-700" />
        <MetricCard label="Savings" value={data ? fmtShort(Math.max(0, savings)) : "—"}
          sub={data && savings < 0 ? "overspent" : "net saved"} positive={savings >= 0} icon={PiggyBank}
          gradient="bg-gradient-to-br from-amber-500 to-orange-700" />
      </div>

      {/* Market Indices */}
      {indices && indices.length > 0 && (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {indices.map((idx: any) => (
            <div key={idx.symbol} className="shrink-0 bg-card border rounded-xl px-4 py-2.5 flex items-center gap-3 min-w-[160px]">
              <div>
                <p className="text-xs text-muted-foreground">{idx.displayName ?? idx.symbol}</p>
                <p className="text-sm font-bold">{idx.price >= 1000 ? idx.price.toFixed(2) : idx.price.toFixed(4)}</p>
              </div>
              <div className={cn("ml-auto text-xs font-semibold px-2 py-1 rounded-lg",
                (idx.changePercent ?? 0) >= 0 ? "bg-notion-green-bg text-notion-green-text" : "bg-notion-red-bg text-notion-red-text")}>
                {(idx.changePercent ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(idx.changePercent ?? 0).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-muted-foreground" /> Cash Flow (6 months)
          </h3>
          {cashflow && cashflow.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={cashflow} barGap={4}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
              No transaction data yet
            </div>
          )}
        </div>

        <div className="bg-card border rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-4">Expense Breakdown</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {pieData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
              Add expense transactions to see breakdown
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Alerts */}
      {(upcomingLoans.length > 0 || upcomingRecurring.length > 0) && (
        <div className="bg-card border rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" /> Upcoming
          </h3>
          {upcomingLoans.map((l: any) => (
            <div key={l._id} className="flex items-center gap-3 py-1.5">
              <div className="w-8 h-8 bg-notion-yellow-bg rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-notion-yellow-text" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {l.direction === "lent" ? "Repayment from" : "Pay back"} {l.counterpartyName}
                </p>
                <p className="text-xs text-muted-foreground">{fmt(l.currentBalance)} · Due in {l.daysUntilDue}d</p>
              </div>
            </div>
          ))}
          {upcomingRecurring.map((r: any) => (
            <div key={r._id} className="flex items-center gap-3 py-1.5">
              <div className="w-8 h-8 bg-notion-blue-bg rounded-lg flex items-center justify-center shrink-0">
                <Repeat className="w-4 h-4 text-notion-blue-text" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(r.amount)} · {r.daysUntilNext === 0 ? "Due today" : `In ${r.daysUntilNext}d`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Account Balances */}
      {accounts && accounts.length > 0 && (
        <div className="bg-card border rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Landmark className="w-4 h-4 text-muted-foreground" /> Accounts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {accounts.map((acc: any) => (
              <div key={acc._id} className="flex items-center gap-3 border rounded-xl px-3 py-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    getAccountTypeMeta(acc.type).iconWrapClassName
                  )}
                >
                  {(() => {
                    const Icon = getAccountTypeMeta(acc.type).icon;
                    return <Icon className="w-4 h-4" />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{acc.name}</p>
                  <p className="text-xs text-muted-foreground">{formatAccountTypeLabel(acc.type)}</p>
                </div>
                <p className={cn("text-sm font-bold shrink-0", acc.balance < 0 ? "text-notion-red-text" : "text-foreground")}>
                  {fmtShort(acc.balance)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insight */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold text-notion-purple-text uppercase tracking-wide mb-1">
          💡 Ledger Insight
        </p>
        <p className="text-sm text-foreground/80">
          {data && data.expenses > data.income
            ? `You've spent ${fmt(data.expenses - data.income)} more than you earned this month. Review your expense categories to find savings.`
            : data && data.income > 0
              ? `Great job! You've saved ${fmt(savings)} this month (${((savings / data.income) * 100).toFixed(0)}% savings rate). Consider investing the surplus.`
              : "Add your income and expenses to get personalized insights."}
        </p>
      </div>
    </div>
  );
}

// ── CREDIT CARDS TAB ──────────────────────────────────────────────────────────

function CreditCardsTab() {
  const cards = useQuery(api.ledgerCards.listCreditCards);
  const accounts = useQuery(api.ledger.listAccounts);
  const categories = useQuery(api.ledger.listCategories, { type: "expense" });
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const selectedCardData = cards?.find((c: any) => c._id === selectedCard);

  const createCard = useMutation(api.ledgerCards.createCreditCard);
  const deleteCard = useMutation(api.ledgerCards.deleteCreditCard);
  const createAccount = useMutation(api.ledger.createAccount);
  const recordSpend = useMutation(api.ledgerCards.recordCardSpend);
  const deleteCardTxn = useMutation(api.ledgerCards.deleteCardTransaction);
  const updateCard = useMutation(api.ledgerCards.updateCreditCard);

  const cardTxns = useQuery(
    api.ledgerCards.listCardTransactions,
    selectedCard ? { creditCardId: selectedCard as any, limit: 20 } : "skip"
  );

  const [showFullNumber, setShowFullNumber] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [cardTab, setCardTab] = useState<"overview" | "spends" | "history">("overview");
  const [editSpecsOpen, setEditSpecsOpen] = useState(false);

  const [form, setForm] = useState({
    issuer: "", network: "", cardName: "", cardNumber: "",
    expiryMonth: "", expiryYear: "", cvv: "",
    creditLimit: "", billingDay: "1", dueDay: "20", rewardProgram: "",
  });
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    cardName: "",
    creditLimit: "",
    billingDay: "1",
    dueDay: "20",
    rewardProgram: "",
  });

  const handleOpenEditSpecs = () => {
    if (!selectedCardData) return;
    setEditForm({
      cardName: selectedCardData.cardName ?? "",
      creditLimit: String(selectedCardData.creditLimit),
      billingDay: String(selectedCardData.billingDay),
      dueDay: String(selectedCardData.dueDay),
      rewardProgram: selectedCardData.rewardProgram ?? "",
    });
    setEditSpecsOpen(true);
  };

  const [spendForm, setSpendForm] = useState({
    amount: "",
    description: "",
    categoryId: "",
    merchant: "",
    date: todayDate(),
    notes: "",
    type: "self",
  });
  const [spendSaving, setSpendSaving] = useState(false);

  const catMap = useMemo(() => {
    const m: Record<string, { name: string; icon: string; color: string }> = {};
    for (const c of categories ?? []) m[c._id] = c;
    return m;
  }, [categories]);

  const handleTypeChange = (newType: string) => {
    let defaultDesc = "";
    let defaultMerchant = "";
    
    if (newType === "lent") {
      defaultDesc = "Lent to ";
    } else if (newType === "charge") {
      defaultDesc = "Card Interest / Fee";
      defaultMerchant = selectedCardData?.issuer || "";
    } else if (newType === "renewal") {
      defaultDesc = "Annual Membership Renewal";
      defaultMerchant = selectedCardData?.issuer || "";
    }
    
    // Find a suitable category for the type
    let matchedCategoryId = spendForm.categoryId;
    if (categories && categories.length > 0) {
      if (newType === "lent") {
        const found = categories.find((c: any) => 
          c.name.toLowerCase().includes("transfer") || 
          c.name.toLowerCase().includes("lent") || 
          c.name.toLowerCase().includes("others") ||
          c.name.toLowerCase().includes("family")
        );
        if (found) matchedCategoryId = found._id;
      } else if (newType === "charge" || newType === "renewal") {
        const found = categories.find((c: any) => 
          c.name.toLowerCase().includes("fee") || 
          c.name.toLowerCase().includes("charge") || 
          c.name.toLowerCase().includes("bills") ||
          c.name.toLowerCase().includes("others")
        );
        if (found) matchedCategoryId = found._id;
      }
    }

    setSpendForm({
      ...spendForm,
      type: newType,
      description: defaultDesc,
      merchant: defaultMerchant,
      categoryId: matchedCategoryId,
    });
  };

  const handleSpendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard || !spendForm.amount || !spendForm.description || !selectedCardData) return;
    setSpendSaving(true);
    try {
      await recordSpend({
        creditCardId: selectedCard as any,
        accountId: selectedCardData.accountId,
        amount: parseFloat(spendForm.amount),
        description: spendForm.description,
        merchant: spendForm.merchant || undefined,
        categoryId: (spendForm.categoryId || categories?.[0]?._id) as any || undefined,
        date: spendForm.date,
        notes: spendForm.notes || undefined,
      });
      setSpendForm({
        amount: "",
        description: "",
        categoryId: categories?.[0]?._id || "",
        merchant: "",
        date: todayDate(),
        notes: "",
        type: "self",
      });
    } catch (err) {
      console.error("Error recording card spend:", err);
      alert("Failed to record card spend. Please try again.");
    } finally {
      setSpendSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.issuer || !form.creditLimit) return;
    if (accounts === undefined) return; // Wait until accounts are loaded

    setSaving(true);
    try {
      let linkedAccountId = accounts?.[0]?._id;
      if (!linkedAccountId) {
        // Automatically bootstrap a default "Main Account" under the hood
        linkedAccountId = await createAccount({
          name: "Main Account",
          type: "savings",
          balance: 0,
          currency: "INR",
        });
      }

      await createCard({
        accountId: linkedAccountId,
        issuer: form.issuer,
        network: form.network as any || undefined,
        cardName: form.cardName || undefined,
        cardNumber: form.cardNumber || undefined,
        expiryMonth: form.expiryMonth ? parseInt(form.expiryMonth) : undefined,
        expiryYear: form.expiryYear ? parseInt(form.expiryYear) : undefined,
        cvv: form.cvv || undefined,
        creditLimit: parseFloat(form.creditLimit),
        billingDay: parseInt(form.billingDay),
        dueDay: parseInt(form.dueDay),
        rewardProgram: form.rewardProgram || undefined,
      });
      setShowAdd(false);
      setForm({ issuer: "", network: "", cardName: "", cardNumber: "", expiryMonth: "", expiryYear: "", cvv: "", creditLimit: "", billingDay: "1", dueDay: "20", rewardProgram: "" });
    } catch (err) {
      console.error("Error creating credit card:", err);
      alert("Failed to save credit card. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {!selectedCardData ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Credit Cards</h3>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors min-h-[36px]">
              <Plus className="w-3.5 h-3.5" /> Add Card
            </button>
          </div>

          {cards === undefined ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(2)].map((_: any, i: number) => (
                <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
              <CreditCard className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No credit cards added yet</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 text-xs text-primary hover:underline">
                Add your first card →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cards.map((card: any) => {
                const utilPct = card.creditLimit > 0 ? (card.currentBalance / card.creditLimit) * 100 : 0;
                const network = card.network ?? "other";
                const gradient = NETWORK_COLORS[network] ?? NETWORK_COLORS.other;
                return (
                  <div key={card._id} className={cn("relative overflow-hidden rounded-2xl cursor-pointer transition-all",
                    `bg-gradient-to-br ${gradient}`)}
                    onClick={() => setSelectedCard(card._id)}>
                    {/* Card body */}
                    <div className="p-5 text-foreground">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-xs font-medium text-foreground/60 uppercase tracking-wide">{card.issuer}</p>
                          <p className="font-semibold">{card.cardName ?? "Credit Card"}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              if (!confirmDeleteRecord("credit card")) return;
                              void deleteCard({ id: card._id });
                            }}
                            className="p-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/20 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs tracking-[0.3em] text-foreground/50 mb-4">
                        •••• •••• •••• {card.lastFour ?? "••••"}
                      </p>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-foreground/60">Balance</p>
                          <p className="text-lg font-bold">{fmt(card.currentBalance)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-foreground/60">Limit</p>
                          <p className="text-sm font-medium">{fmt(card.creditLimit)}</p>
                        </div>
                      </div>
                      {/* Utilization bar */}
                      <div className="mt-3 h-1.5 bg-foreground/20 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all",
                          utilPct >= 90 ? "bg-notion-red-text" : utilPct >= 75 ? "bg-notion-yellow-text" : "bg-notion-blue-text")}
                          style={{ width: `${Math.min(100, utilPct)}%` }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <p className="text-xs text-foreground/50">Used: {utilPct.toFixed(0)}%</p>
                        <p className="text-xs text-foreground/50">Due day: {card.dueDay}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6 mt-6">
          {/* Selected Card Workspace */}
          {/* 1. Detail Header Card */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Identity & Go Back */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedCard(null)}
                  className="h-10 w-10 shrink-0 rounded-xl hover:bg-muted border border-border/40 flex items-center justify-center transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-3xl shrink-0 select-none p-1.5 bg-muted rounded-xl border border-border/40">
                    💳
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <h2 className="text-lg font-bold text-foreground leading-tight truncate">
                      {selectedCardData.issuer} {selectedCardData.cardName ? `— ${selectedCardData.cardName}` : ""}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground font-medium">
                      <span className="font-mono tracking-wider">
                        •••• •••• •••• {selectedCardData.lastFour || "••••"}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-border/80" />
                      <span className="capitalize">{selectedCardData.network || "Other"} Card</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-border/80" />
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        (selectedCardData.currentBalance / selectedCardData.creditLimit) * 100 >= 90
                          ? "bg-notion-red-bg text-notion-red-text border-notion-red-text/20"
                          : (selectedCardData.currentBalance / selectedCardData.creditLimit) * 100 >= 75
                          ? "bg-notion-yellow-bg text-notion-yellow-text border-notion-yellow-text/20"
                          : "bg-notion-green-bg text-notion-green-text border-notion-green-text/20"
                      )}>
                        {((selectedCardData.currentBalance / selectedCardData.creditLimit) * 100).toFixed(0)}% Utilized
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0">
                <button
                  onClick={() => setCardTab("spends")}
                  className="h-9 px-3.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Record Spend
                </button>

                <button
                  onClick={handleOpenEditSpecs}
                  className="h-9 w-9 shrink-0 rounded-xl border border-border/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                  title="Edit Card Specs"
                >
                  <Edit2 className="h-4 w-4" />
                </button>

                <button
                  onClick={() => {
                    if (!confirmDeleteRecord("credit card")) return;
                    void deleteCard({ id: selectedCardData._id });
                    setSelectedCard(null);
                  }}
                  className="h-9 w-9 shrink-0 rounded-xl border border-border/60 text-notion-red-text hover:bg-notion-red-bg flex items-center justify-center transition-colors animate-fade-in"
                  title="Delete Credit Card"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Bottom mini overview rail */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border/40 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground block font-medium">Balance</span>
                <span className="font-bold text-foreground font-mono text-sm">
                  {fmt(selectedCardData.currentBalance)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block font-medium">Available Limit</span>
                <span className="font-bold text-notion-green-text font-mono text-sm">
                  {fmt(selectedCardData.availableCredit)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block font-medium">Credit Limit</span>
                <span className="font-bold text-foreground font-mono text-sm">
                  {fmt(selectedCardData.creditLimit)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block font-medium">Statement Cycle</span>
                <span className="font-semibold text-foreground text-sm">
                  Bill: {selectedCardData.billingDay} / Due: {selectedCardData.dueDay}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Scrollable Pill Tabs Rail */}
          <div className="flex border-b border-border/60 pb-px overflow-x-auto gap-1 scrollbar-none">
            {[
              { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
              { id: "spends" as const, label: "Record Spend", icon: Plus },
              { id: "history" as const, label: "Spends History", icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = cardTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCardTab(tab.id)}
                  className={cn(
                    "relative flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors shrink-0",
                    isActive
                      ? "text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 3. Rendered Tab Content Panels */}
          <div className="mt-4">
            {/* OVERVIEW TAB */}
            {cardTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-fade-in">
                {/* Visual mock card & specs */}
                <div className="md:col-span-6 space-y-4">
                  <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground">Card Mockup</h3>
                    
                    {/* The premium physical styled credit card representation */}
                    <div className={cn(
                      "relative overflow-hidden rounded-2xl text-white shadow-lg p-6 bg-gradient-to-br min-h-[180px] flex flex-col justify-between",
                      NETWORK_COLORS[selectedCardData.network ?? "other"] ?? NETWORK_COLORS.other
                    )}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{selectedCardData.issuer}</p>
                          <p className="text-base font-extrabold tracking-wide">{selectedCardData.cardName || "Credit Card"}</p>
                        </div>
                        <span className="text-xl font-bold italic opacity-90 capitalize">
                          {selectedCardData.network || "Other"}
                        </span>
                      </div>
                      
                      <div className="my-3">
                        <p className="text-lg font-mono tracking-[0.25em] font-medium">
                          {showFullNumber && selectedCardData.cardNumber
                            ? selectedCardData.cardNumber.replace(/(.{4})/g, "$1 ").trim()
                            : `•••• •••• •••• ${selectedCardData.lastFour || "••••"}`}
                        </p>
                      </div>

                      <div className="flex justify-between items-end text-xs">
                        <div>
                          <p className="text-[8px] uppercase tracking-wider opacity-60">Card Holder</p>
                          <p className="font-semibold tracking-wide uppercase">Workspace Member</p>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <p className="text-[8px] uppercase tracking-wider opacity-60">Expiry</p>
                            <p className="font-semibold font-mono">
                              {selectedCardData.expiryMonth && selectedCardData.expiryYear
                                ? `${String(selectedCardData.expiryMonth).padStart(2, "0")}/${String(selectedCardData.expiryYear).slice(-2)}`
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] uppercase tracking-wider opacity-60">CVV</p>
                            <p className="font-semibold font-mono">{showCvv && selectedCardData.cvv ? selectedCardData.cvv : "•••"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Masked reveal controls */}
                    <div className="flex items-center gap-3 bg-muted/40 p-3.5 border rounded-xl justify-between text-xs">
                      <span className="font-medium text-muted-foreground">Sensitive Credentials Control</span>
                      <div className="flex items-center gap-2">
                        {selectedCardData.cardNumber && (
                          <button
                            onClick={() => setShowFullNumber(!showFullNumber)}
                            className="px-2.5 py-1.5 border rounded-lg bg-card hover:bg-muted font-semibold transition-all"
                          >
                            {showFullNumber ? "Hide Number" : "Reveal Number"}
                          </button>
                        )}
                        {selectedCardData.cvv && (
                          <button
                            onClick={() => setShowCvv(!showCvv)}
                            className="px-2.5 py-1.5 border rounded-lg bg-card hover:bg-muted font-semibold transition-all"
                          >
                            {showCvv ? "Hide CVV" : "Reveal CVV"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical specs detail cards */}
                <div className="md:col-span-6 space-y-4">
                  <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground">Specifications Overview</h3>
                    <div className="divide-y divide-border/60 text-xs">
                      <div className="flex justify-between py-2.5">
                        <span className="text-muted-foreground font-medium">Billing Date</span>
                        <span className="font-semibold text-foreground">Day {selectedCardData.billingDay} of every month</span>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <span className="text-muted-foreground font-medium">Payment Due Date</span>
                        <span className="font-semibold text-foreground">Day {selectedCardData.dueDay} of every month</span>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <span className="text-muted-foreground font-medium">Reward Program</span>
                        <span className="font-semibold text-foreground">{selectedCardData.rewardProgram || "Not configured"}</span>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <span className="text-muted-foreground font-medium">Limit Utilization</span>
                        <span className="font-semibold font-mono text-foreground">
                          {((selectedCardData.currentBalance / selectedCardData.creditLimit) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedCardData.rewardProgram && (
                    <div className="bg-notion-yellow-bg/25 border border-notion-yellow-text/15 rounded-2xl p-4 text-xs">
                      <p className="font-bold text-notion-yellow-text flex items-center gap-1">🎁 Benefits & Perks</p>
                      <p className="text-foreground/80 mt-1.5 leading-relaxed">{selectedCardData.rewardProgram}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RECORD SPENDS TAB */}
            {cardTab === "spends" && (
              <div className="max-w-xl mx-auto bg-card border border-border/60 rounded-2xl p-6 shadow-sm animate-fade-in">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-foreground">Record Card Spend</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Record purchases, card renewals, annual fees, or amounts lent to others.</p>
                </div>

                <form onSubmit={handleSpendSubmit} className="space-y-4">
                  {/* Amount */}
                  <Field label="Amount (₹)" required>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={spendForm.amount}
                      onChange={(e) => setSpendForm({ ...spendForm, amount: e.target.value })}
                      placeholder="0.00"
                      className={inputCls}
                      required
                    />
                  </Field>

                  {/* Usage Type selector chips */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Usage Type</span>
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                      {[
                        { id: "self", label: "👤 Self", color: "bg-notion-blue-bg text-notion-blue-text" },
                        { id: "lent", label: "🤝 Lent Person", color: "bg-notion-green-bg text-notion-green-text" },
                        { id: "charge", label: "💳 Charges", color: "bg-notion-red-bg text-notion-red-text" },
                        { id: "renewal", label: "🔄 Renewal", color: "bg-notion-purple-bg text-notion-purple-text" },
                      ].map((item) => {
                        const isActive = spendForm.type === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleTypeChange(item.id)}
                            className={cn(
                              "text-xs px-2.5 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-all",
                              isActive
                                ? `${item.color} border-current shadow-sm`
                                : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Description */}
                  <Field label="Description" required>
                    <input
                      value={spendForm.description}
                      onChange={(e) => setSpendForm({ ...spendForm, description: e.target.value })}
                      placeholder={
                        spendForm.type === "lent"
                          ? "Lent to Madhan, Hemanth…"
                          : spendForm.type === "charge"
                          ? "Card annual fee, interest…"
                          : "Amazon, Uber, Groceries…"
                      }
                      className={inputCls}
                      required
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Category Selection */}
                    <Field label="Category">
                      <LedgerSelect
                        value={spendForm.categoryId || (categories?.[0]?._id ?? "")}
                        onValueChange={(value) => setSpendForm({ ...spendForm, categoryId: value })}
                      >
                        {(categories ?? []).map((cat: any) => (
                          <LedgerSelectOption key={cat._id} value={cat._id}>
                            <span className="mr-1.5">{cat.icon}</span> {cat.name}
                          </LedgerSelectOption>
                        ))}
                      </LedgerSelect>
                    </Field>

                    {/* Merchant / Payee */}
                    <Field label="Merchant / Payee">
                      <input
                        value={spendForm.merchant}
                        onChange={(e) => setSpendForm({ ...spendForm, merchant: e.target.value })}
                        placeholder="Optional"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Date */}
                    <Field label="Date">
                      <input
                        type="date"
                        value={spendForm.date}
                        onChange={(e) => setSpendForm({ ...spendForm, date: e.target.value })}
                        className={inputCls}
                      />
                    </Field>

                    {/* Notes */}
                    <Field label="Notes">
                      <input
                        value={spendForm.notes}
                        onChange={(e) => setSpendForm({ ...spendForm, notes: e.target.value })}
                        placeholder="Optional"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <button
                    type="submit"
                    disabled={spendSaving}
                    className="w-full bg-primary text-primary-foreground text-xs font-semibold py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[40px] flex items-center justify-center gap-1.5"
                  >
                    {spendSaving ? "Recording..." : "Record Transaction"}
                  </button>
                </form>
              </div>
            )}

            {/* TRANSACTION HISTORY TAB */}
            {cardTab === "history" && (
              <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm flex flex-col animate-fade-in">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transaction Registry</span>
                  <span className="text-xs text-muted-foreground font-mono font-semibold">({cardTxns?.length ?? 0} Item(s))</span>
                </div>

                {cardTxns === undefined ? (
                  <div className="p-4 space-y-2 flex-1">
                    {[...Array(4)].map((_: any, i: number) => (
                      <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : cardTxns.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                    <CreditCard className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs font-semibold text-muted-foreground">No card transactions logged</p>
                    <p className="text-[10px] text-muted-foreground/60 max-w-[200px] mt-1 mx-auto">Use the &quot;Record Spend&quot; tab to log purchases or fees.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border overflow-y-auto max-h-[720px] flex-1">
                    {cardTxns.map((t: any) => {
                      const cat = catMap[t.categoryId];
                      return (
                        <div key={t._id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/10 transition-colors">
                          <div className="w-8 h-8 rounded-full border bg-muted/20 flex items-center justify-center text-sm shrink-0">
                            {cat?.icon ?? "💳"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground truncate">{t.description}</p>
                              <p className="text-sm font-black text-notion-red-text shrink-0">−{fmt(t.amount)}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              <span className="font-mono">{t.date}</span>
                              {t.merchant && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{t.merchant}</span>
                                </>
                              )}
                              {cat && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-muted/40 font-medium text-foreground/80">
                                    {cat.name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (!confirmDeleteRecord("transaction")) return;
                              void deleteCardTxn({ id: t._id });
                            }}
                            className="p-1.5 rounded-lg hover:bg-notion-red-bg hover:text-notion-red-text text-muted-foreground transition-all shrink-0"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Edit Specifications dialog Modal inside Selected Card Workspace */}
          <Modal open={editSpecsOpen} onClose={() => setEditSpecsOpen(false)} title="Edit Card Specifications">
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!editForm.creditLimit) return;
              setSaving(true);
              try {
                await updateCard({
                  id: selectedCardData._id,
                  cardName: editForm.cardName || undefined,
                  creditLimit: parseFloat(editForm.creditLimit),
                  billingDay: parseInt(editForm.billingDay),
                  dueDay: parseInt(editForm.dueDay),
                  rewardProgram: editForm.rewardProgram || undefined,
                });
                setEditSpecsOpen(false);
                alert("Specifications saved!");
              } catch (err) {
                console.error(err);
                alert("Failed to save card specs. Please try again.");
              } finally {
                setSaving(false);
              }
            }} className="space-y-4">
              <Field label="Card Name">
                <input value={editForm.cardName} onChange={(e) => setEditForm({ ...editForm, cardName: e.target.value })}
                  placeholder="Regalia, Coral, Millennia…" className={inputCls} />
              </Field>

              <Field label="Credit Limit (₹)" required>
                <input type="number" min="1" value={editForm.creditLimit}
                  onChange={(e) => setEditForm({ ...editForm, creditLimit: e.target.value })}
                  placeholder="100000" className={inputCls} required />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Billing Day">
                  <input type="number" min="1" max="31" value={editForm.billingDay}
                    onChange={(e) => setEditForm({ ...editForm, billingDay: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Due Day">
                  <input type="number" min="1" max="31" value={editForm.dueDay}
                    onChange={(e) => setEditForm({ ...editForm, dueDay: e.target.value })} className={inputCls} />
                </Field>
              </div>

              <Field label="Reward Program">
                <input value={editForm.rewardProgram} onChange={(e) => setEditForm({ ...editForm, rewardProgram: e.target.value })}
                  placeholder="Points, Cashback, Miles…" className={inputCls} />
              </Field>

              <SaveBtn loading={saving} label="Save Specs" />
            </form>
          </Modal>
        </div>
      )}

      {/* Add Card Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Credit Card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Issuer / Bank" required>
              <input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                placeholder="HDFC, SBI, ICICI…" className={inputCls} required />
            </Field>
            <Field label="Network">
              <LedgerSelect
                value={form.network}
                onValueChange={(value) => setForm({ ...form, network: value })}
                emptyLabel="Unknown"
              >
                <LedgerSelectOption value="visa">Visa</LedgerSelectOption>
                <LedgerSelectOption value="mastercard">Mastercard</LedgerSelectOption>
                <LedgerSelectOption value="rupay">RuPay</LedgerSelectOption>
                <LedgerSelectOption value="amex">Amex</LedgerSelectOption>
                <LedgerSelectOption value="discover">Discover</LedgerSelectOption>
              </LedgerSelect>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Card Name">
              <input value={form.cardName} onChange={(e) => setForm({ ...form, cardName: e.target.value })}
                placeholder="Regalia, Millennia…" className={inputCls} />
            </Field>
            <Field label="Card Number">
              <input value={form.cardNumber} onChange={(e) => {
                const cleanVal = e.target.value.replace(/\D/g, "").slice(0, 16);
                setForm({ ...form, cardNumber: cleanVal });
              }} placeholder="16-digit card number" maxLength={16} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Expiry Month">
              <input type="number" min="1" max="12" value={form.expiryMonth} onChange={(e) => {
                let val = e.target.value;
                if (val.length > 2) val = val.slice(0, 2);
                setForm({ ...form, expiryMonth: val });
              }} placeholder="MM" className={inputCls} />
            </Field>
            <Field label="Expiry Year">
              <input type="number" min="2026" max="2099" value={form.expiryYear} onChange={(e) => {
                let val = e.target.value;
                if (val.length > 4) val = val.slice(0, 4);
                setForm({ ...form, expiryYear: val });
              }} placeholder="YYYY" className={inputCls} />
            </Field>
            <Field label="CVV">
              <input type="password" value={form.cvv} onChange={(e) => {
                const cleanVal = e.target.value.replace(/\D/g, "").slice(0, 4);
                setForm({ ...form, cvv: cleanVal });
              }} placeholder="123" maxLength={4} className={inputCls} />
            </Field>
          </div>
          <Field label="Credit Limit (₹)" required>
            <input type="number" min="1" value={form.creditLimit}
              onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
              placeholder="100000" className={inputCls} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Billing Day">
              <input type="number" min="1" max="31" value={form.billingDay}
                onChange={(e) => setForm({ ...form, billingDay: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Due Day">
              <input type="number" min="1" max="31" value={form.dueDay}
                onChange={(e) => setForm({ ...form, dueDay: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="Reward Program">
            <input value={form.rewardProgram} onChange={(e) => setForm({ ...form, rewardProgram: e.target.value })}
              placeholder="Points, Cashback, Miles…" className={inputCls} />
          </Field>
          <SaveBtn loading={saving} />
        </form>
      </Modal>
    </div>
  );
}

// ── LOANS TAB ─────────────────────────────────────────────────────────────────

function LoansTab() {
  const loans = useQuery(api.ledgerLoans.listLoans, {});
  const summary = useQuery(api.ledgerLoans.getLoanSummary);
  const accounts = useQuery(api.ledger.listAccounts);
  const [showAdd, setShowAdd] = useState(false);
  const [repayLoan, setRepayLoan] = useState<any>(null);

  const createLoan = useMutation(api.ledgerLoans.createLoan);
  const deleteLoan = useMutation(api.ledgerLoans.deleteLoan);
  const recordRepayment = useMutation(api.ledgerLoans.recordLoanRepayment);

  const [form, setForm] = useState({
    direction: "lent", counterpartyName: "", principalAmount: "",
    issuedDate: todayDate(), dueDate: "", linkedAccountId: "",
    interestRate: "", notes: "",
  });
  const [repayForm, setRepayForm] = useState({ amount: "", date: todayDate(), accountId: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const lent = (loans ?? []).filter((l: any) => l.direction === "lent");
  const borrowed = (loans ?? []).filter((l: any) => l.direction === "borrowed");
  const accountsById = useMemo(
    () =>
      Object.fromEntries(
        (accounts ?? []).map((account: any) => [String(account._id), account])
      ) as Record<string, any>,
    [accounts]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.counterpartyName || !form.principalAmount) return;
    setSaving(true);
    try {
      await createLoan({
        direction: form.direction as any,
        counterpartyName: form.counterpartyName,
        principalAmount: parseFloat(form.principalAmount),
        issuedDate: form.issuedDate,
        dueDate: form.dueDate || undefined,
        linkedAccountId: form.linkedAccountId as any || undefined,
        interestRate: form.interestRate ? parseFloat(form.interestRate) : undefined,
        notes: form.notes || undefined,
      });
      setShowAdd(false);
      setForm({ direction: "lent", counterpartyName: "", principalAmount: "", issuedDate: todayDate(), dueDate: "", linkedAccountId: "", interestRate: "", notes: "" });
    } finally {
      setSaving(false);
    }
  };

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayLoan || !repayForm.amount) return;
    setSaving(true);
    try {
      await recordRepayment({
        loanId: repayLoan._id,
        amount: parseFloat(repayForm.amount),
        date: repayForm.date,
        accountId: repayForm.accountId as any || undefined,
        notes: repayForm.notes || undefined,
      });
      setRepayLoan(null);
      setRepayForm({ amount: "", date: todayDate(), accountId: "", notes: "" });
    } finally {
      setSaving(false);
    }
  };

  const openRepaymentModal = (loan: any) => {
    setRepayLoan(loan);
    setRepayForm({
      amount: "",
      date: todayDate(),
      accountId: loan.linkedAccountId ? String(loan.linkedAccountId) : "",
      notes: "",
    });
  };

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-notion-blue-bg text-notion-blue-text",
    partially_paid: "bg-notion-yellow-bg text-notion-yellow-text",
    settled: "bg-notion-green-bg text-notion-green-text",
    overdue: "bg-notion-red-bg text-notion-red-text",
    written_off: "bg-muted text-muted-foreground",
  };

  const LoanCard = ({ loan }: { loan: any }) => {
    const repaymentDirectionLabel =
      loan.direction === "lent" ? "Received in" : "Paid from";
    const repaymentAmountClassName =
      loan.direction === "lent" ? "text-notion-green-text" : "text-notion-red-text";
    const linkedAccount = loan.linkedAccountId
      ? accountsById[String(loan.linkedAccountId)]
      : null;

    return (
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold">{loan.counterpartyName}</p>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", STATUS_COLORS[loan.status] ?? STATUS_COLORS.active)}>
                {loan.status.replace("_", " ")}
              </span>
              {loan.daysOverdue > 0 && (
                <span className="text-xs text-notion-red-text">Overdue {loan.daysOverdue}d</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Issued: {loan.issuedDate}{loan.dueDate ? ` | Due: ${loan.dueDate}` : ""}
              {loan.daysUntilDue !== null && loan.daysUntilDue >= 0 && loan.status !== "settled" &&
                ` (${loan.daysUntilDue}d left)`}
            </p>
            {linkedAccount ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {loan.direction === "lent" ? "Sent from" : "Taken into"} {linkedAccount.name}
              </p>
            ) : null}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold">{fmt(loan.currentBalance)}</p>
            {loan.currentBalance < loan.principalAmount && (
              <p className="text-xs text-muted-foreground">of {fmt(loan.principalAmount)}</p>
            )}
          </div>
        </div>
        {loan.notes ? (
          <div className="mt-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Notes
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground break-words whitespace-pre-wrap">
              {loan.notes}
            </p>
          </div>
        ) : null}

        {/* Progress */}
        {loan.currentBalance < loan.principalAmount && (
          <div className="mt-3">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-notion-green-text rounded-full transition-all"
                style={{ width: `${((loan.principalAmount - loan.currentBalance) / loan.principalAmount) * 100}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {fmt(loan.totalRepaid ?? loan.principalAmount - loan.currentBalance)} repaid
            </p>
          </div>
        )}
        {loan.repayments?.length ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Repayment History
              </p>
              <p className="text-xs text-muted-foreground">
                {loan.repaymentCount} {loan.repaymentCount === 1 ? "entry" : "entries"}
              </p>
            </div>

            <div className="space-y-2">
              {loan.repayments.map((repayment: any) => {
                const repaymentAccount = repayment.accountId
                  ? accountsById[String(repayment.accountId)]
                  : null;

                return (
                  <div
                    key={repayment._id}
                    className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{repayment.date}</p>
                        <p className="mt-1 text-[11px] leading-4 text-muted-foreground break-words">
                          {repaymentDirectionLabel}: {repaymentAccount?.name ?? "No balance account"}
                        </p>
                      </div>
                      <p className={cn("text-sm font-semibold", repaymentAmountClassName)}>
                        {fmt(repayment.amount)}
                      </p>
                    </div>
                    {repayment.notes ? (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground break-words whitespace-pre-wrap">
                        {repayment.notes}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {loan.status !== "settled" && (
          <div className="flex gap-2 mt-3">
            <button onClick={() => openRepaymentModal(loan)}
              className="flex-1 text-xs text-primary border border-primary/30 rounded-lg py-1.5 hover:bg-primary/5 transition-colors">
              Record Repayment
            </button>
            <button
              onClick={() => {
                if (
                  !confirmDeleteRecord(
                    "loan record",
                    "Any repayment history linked to this loan will also be removed."
                  )
                ) {
                  return;
                }
                void deleteLoan({ id: loan._id });
              }}
              className="p-1.5 border rounded-lg hover:bg-notion-red-bg text-notion-red-text transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {loan.status === "settled" ? (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                if (
                  !confirmDeleteRecord(
                    "loan record",
                    "Any repayment history linked to this loan will also be removed."
                  )
                ) {
                  return;
                }
                void deleteLoan({ id: loan._id });
              }}
              className="p-1.5 border rounded-lg hover:bg-notion-red-bg text-notion-red-text transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Lent</p>
            <p className="text-lg font-bold text-notion-green-text">{fmtShort(summary.totalLent)}</p>
          </div>
          <div className="bg-card border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Borrowed</p>
            <p className="text-lg font-bold text-notion-red-text">{fmtShort(summary.totalBorrowed)}</p>
          </div>
          <div className="bg-card border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Net Position</p>
            <p className={cn("text-lg font-bold", summary.totalLent >= summary.totalBorrowed ? "text-notion-green-text" : "text-notion-red-text")}>
              {fmtShort(summary.totalLent - summary.totalBorrowed)}
            </p>
          </div>
          <div className="bg-card border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className={cn("text-lg font-bold", summary.overdue > 0 ? "text-notion-red-text" : "text-muted-foreground")}>
              {summary.overdue}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Loans & Lending</h3>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors min-h-[36px]">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Lent section */}
      {lent.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">I Lent</p>
          <div className="space-y-3">
            {lent.map((loan: any) => <LoanCard key={loan._id} loan={loan} />)}
          </div>
        </div>
      )}

      {/* Borrowed section */}
      {borrowed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">I Borrowed</p>
          <div className="space-y-3">
            {borrowed.map((loan: any) => <LoanCard key={loan._id} loan={loan} />)}
          </div>
        </div>
      )}

      {loans?.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <Handshake className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No loans tracked yet</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-xs text-primary hover:underline">
            Track a loan {"->"}
          </button>
        </div>
      )}

      {/* Add Loan Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Loan">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Direction" required>
            <LedgerSelect value={form.direction} onValueChange={(value) => setForm({ ...form, direction: value })}>
              <LedgerSelectOption value="lent">I Lent Money</LedgerSelectOption>
              <LedgerSelectOption value="borrowed">I Borrowed Money</LedgerSelectOption>
            </LedgerSelect>
          </Field>
          <Field label={form.direction === "lent" ? "Lent To" : "Borrowed From"} required>
            <input value={form.counterpartyName} onChange={(e) => setForm({ ...form, counterpartyName: e.target.value })}
              placeholder="Person or organization name" className={inputCls} required />
          </Field>
          <Field label="Amount (INR)" required>
            <input type="number" min="1" value={form.principalAmount}
              onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
              placeholder="0" className={inputCls} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input type="date" value={form.issuedDate}
                onChange={(e) => setForm({ ...form, issuedDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Due Date">
              <input type="date" value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="Account (to debit/credit)">
            <LedgerSelect
              value={form.linkedAccountId}
              onValueChange={(value) => setForm({ ...form, linkedAccountId: value })}
              emptyLabel="Don't update balance"
            >
              {accounts?.map((a: any) => (
                <LedgerSelectOption key={a._id} value={a._id}>
                  {a.name}
                </LedgerSelectOption>
              ))}
            </LedgerSelect>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Interest Rate (% p.a.)">
              <input type="number" min="0" step="0.01" value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                placeholder="0" className={inputCls} />
            </Field>
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional"
                rows={3}
                className={cn(inputCls, "resize-none py-3")}
              />
            </Field>
          </div>
          <SaveBtn loading={saving} />
        </form>
      </Modal>

      {/* Repayment Modal */}
      <Modal open={!!repayLoan} onClose={() => setRepayLoan(null)} title="Record Repayment">
        {repayLoan && (
          <form onSubmit={handleRepay} className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-3 text-sm">
              <p className="font-medium">{repayLoan.counterpartyName}</p>
              <p className="text-muted-foreground">Outstanding: {fmt(repayLoan.currentBalance)}</p>
            </div>
            <Field label="Amount (INR)" required>
              <input type="number" min="0.01" step="0.01" max={repayLoan.currentBalance} value={repayForm.amount}
                onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })}
                placeholder={repayLoan.currentBalance.toString()} className={inputCls} required />
            </Field>
            <Field label="Date">
              <input type="date" value={repayForm.date}
                onChange={(e) => setRepayForm({ ...repayForm, date: e.target.value })} className={inputCls} />
            </Field>
            <Field label={repayLoan.direction === "lent" ? "Repayment received in" : "Repayment paid from"}>
              <LedgerSelect
                value={repayForm.accountId}
                onValueChange={(value) => setRepayForm({ ...repayForm, accountId: value })}
                emptyLabel="Don't update balance"
              >
                {accounts?.map((a: any) => (
                  <LedgerSelectOption key={a._id} value={a._id}>
                    {a.name}
                  </LedgerSelectOption>
                ))}
              </LedgerSelect>
            </Field>
            <Field label="Notes">
              <textarea
                value={repayForm.notes}
                onChange={(e) => setRepayForm({ ...repayForm, notes: e.target.value })}
                placeholder="Optional"
                rows={3}
                className={cn(inputCls, "resize-none py-3")}
              />
            </Field>
            <SaveBtn loading={saving} label="Record Repayment" />
          </form>
        )}
      </Modal>
    </div>
  );
}

// ── INVESTMENTS TAB ───────────────────────────────────────────────────────────

function InvestmentsTab() {
  const portfolio = useQuery(api.ledgerInvestments.getPortfolioSummary);
  const allocation = useQuery(api.ledgerInvestments.getPortfolioByAssetClass);
  const goals = useQuery(api.ledger.listGoals);
  const indices = useQuery(api.marketData.getMarketIndices);
  const [showAdd, setShowAdd] = useState(false);
  const syncPrices = useAction(api.marketData.syncUserInvestmentPrices);
  const createInv = useMutation(api.ledger.createInvestment);
  const deleteInv = useMutation(api.ledger.deleteInvestment);
  const [syncing, setSyncing] = useState(false);

  const [form, setForm] = useState({
    assetType: "stock", symbol: "", name: "", quantity: "",
    buyPrice: "", buyDate: todayDate(), platform: "", isSip: false,
    sipAmount: "", sipDay: "1", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.quantity || !form.buyPrice) return;
    setSaving(true);
    try {
      await createInv({
        assetType: form.assetType as any,
        symbol: form.symbol || undefined,
        name: form.name,
        quantity: parseFloat(form.quantity),
        buyPrice: parseFloat(form.buyPrice),
        buyDate: form.buyDate,
        platform: form.platform || undefined,
        isSip: form.isSip || undefined,
        sipAmount: form.isSip && form.sipAmount ? parseFloat(form.sipAmount) : undefined,
        notes: form.notes || undefined,
      });
      setShowAdd(false);
      setForm({ assetType: "stock", symbol: "", name: "", quantity: "", buyPrice: "", buyDate: todayDate(), platform: "", isSip: false, sipAmount: "", sipDay: "1", notes: "" });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try { await syncPrices({}); } finally { setSyncing(false); }
  };

  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      {portfolio && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total Invested" value={fmtShort(portfolio.totalInvested)}
            sub={`${portfolio.holdingCount} holdings`} positive icon={DollarSign}
            gradient="bg-gradient-to-br from-blue-600 to-indigo-700" />
          <MetricCard label="Current Value" value={fmtShort(portfolio.totalCurrentValue)}
            sub="market value" positive icon={TrendingUp}
            gradient="bg-gradient-to-br from-violet-600 to-purple-700" />
          <MetricCard label="Total P&L"
            value={`${portfolio.totalPnl >= 0 ? "+" : ""}${fmtShort(portfolio.totalPnl)}`}
            sub={`${portfolio.totalPnlPct >= 0 ? "+" : ""}${portfolio.totalPnlPct.toFixed(2)}%`}
            positive={portfolio.totalPnl >= 0} icon={portfolio.totalPnl >= 0 ? TrendingUp : TrendingDown}
            gradient={portfolio.totalPnl >= 0 ? "bg-gradient-to-br from-emerald-500 to-teal-700" : "bg-gradient-to-br from-rose-500 to-red-700"} />
          <MetricCard label="XIRR"
            value={portfolio.xirr != null ? `${(portfolio.xirr * 100).toFixed(1)}%` : "—"}
            sub="annualized return" positive={(portfolio.xirr ?? 0) >= 0} icon={BarChart2}
            gradient="bg-gradient-to-br from-amber-500 to-orange-700" />
        </div>
      )}

      {/* Market Indices */}
      {indices && indices.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-notion-blue-text uppercase tracking-wide">📊 Today's Market</p>
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1 text-xs text-notion-blue-text hover:text-notion-blue-text disabled:opacity-50">
              <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
              {syncing ? "Syncing…" : "Sync prices"}
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {indices.map((idx: any) => (
              <div key={idx.symbol} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{idx.displayName ?? idx.symbol}</span>
                <span className="text-sm font-bold">{idx.price >= 1000 ? idx.price.toFixed(0) : idx.price.toFixed(2)}</span>
                <span className={cn("text-xs font-medium", (idx.changePercent ?? 0) >= 0 ? "text-notion-green-text" : "text-notion-red-text")}>
                  {(idx.changePercent ?? 0) >= 0 ? "▲" : "▼"}{Math.abs(idx.changePercent ?? 0).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Portfolio Holdings</h3>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors min-h-[36px]">
          <Plus className="w-3.5 h-3.5" /> Add Holding
        </button>
      </div>

      {/* Asset Allocation */}
      {allocation && allocation.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border rounded-2xl p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Asset Allocation</h4>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={allocation} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                  paddingAngle={2} dataKey="current" nameKey="assetType">
                  {allocation.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtShort(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card border rounded-2xl p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">By Asset Class</h4>
            <div className="space-y-2">
              {allocation.map((cls: any, i: number) => (
                <div key={cls.assetType} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-xs flex-1">{ASSET_ICONS[cls.assetType] ?? "💰"} {ASSET_LABELS[cls.assetType] ?? cls.assetType}</span>
                  <span className="text-xs text-muted-foreground">{cls.allocationPct.toFixed(0)}%</span>
                  <span className={cn("text-xs font-medium", cls.pnl >= 0 ? "text-notion-green-text" : "text-notion-red-text")}>
                    {cls.pnl >= 0 ? "+" : ""}{fmtShort(cls.pnl)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      {portfolio && portfolio.holdings.length > 0 && (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>{["Name", "Platform", "Qty", "Buy", "Current", "P&L", ""].map((h: string) => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {portfolio.holdings.map((inv: any) => (
                  <tr key={inv._id} className="hover:bg-muted/20 group">
                    <td className="px-4 py-3">
                      <p className="font-medium">{inv.name}</p>
                      <p className="text-xs text-muted-foreground">{ASSET_ICONS[inv.assetType]} {inv.symbol ?? ASSET_LABELS[inv.assetType]}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{inv.platform ?? "—"}</td>
                    <td className="px-4 py-3">{inv.quantity}</td>
                    <td className="px-4 py-3 text-xs">{fmt(inv.buyPrice)}</td>
                    <td className="px-4 py-3 text-xs">
                      {inv.currentPrice ? fmt(inv.currentPrice) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className={cn("px-4 py-3 font-semibold", inv.pnl >= 0 ? "text-notion-green-text" : "text-notion-red-text")}>
                      {inv.pnl >= 0 ? "+" : ""}{fmtShort(inv.pnl)}
                      <span className="text-xs font-normal ml-1">({inv.pnlPct >= 0 ? "+" : ""}{inv.pnlPct.toFixed(1)}%)</span>
                    </td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => {
                          if (!confirmDeleteRecord("investment")) return;
                          void deleteInv({ id: inv._id });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-notion-red-bg text-notion-red-text transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden p-3 space-y-2">
            {portfolio.holdings.map((inv: any) => (
              <div key={inv._id} className="border rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{inv.name}</p>
                    <p className="text-xs text-muted-foreground">{inv.symbol} · {inv.platform ?? "—"}</p>
                  </div>
                  <span className={cn("text-sm font-bold shrink-0", inv.pnl >= 0 ? "text-notion-green-text" : "text-notion-red-text")}>
                    {inv.pnl >= 0 ? "+" : ""}{fmtShort(inv.pnl)}
                  </span>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Qty: {inv.quantity}</span>
                  <span>Buy: {fmt(inv.buyPrice)}</span>
                  {inv.currentPrice && <span>Now: {fmt(inv.currentPrice)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {portfolio?.holdings.length === 0 && !showAdd && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <TrendingUp className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No investments tracked yet</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-xs text-primary hover:underline">
            Add your first holding →
          </button>
        </div>
      )}

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
                <p className="text-xs text-muted-foreground mt-1">Target: {g.targetDate} · {pct.toFixed(0)}%</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Investment Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Investment">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Asset Type" required>
              <LedgerSelect value={form.assetType} onValueChange={(value) => setForm({ ...form, assetType: value })}>
                <LedgerSelectOption value="stock">Stock</LedgerSelectOption>
                <LedgerSelectOption value="mutual_fund">Mutual Fund</LedgerSelectOption>
                <LedgerSelectOption value="etf">ETF</LedgerSelectOption>
                <LedgerSelectOption value="fd">Fixed Deposit</LedgerSelectOption>
                <LedgerSelectOption value="ppf">PPF</LedgerSelectOption>
                <LedgerSelectOption value="gold">Gold</LedgerSelectOption>
                <LedgerSelectOption value="crypto">Crypto</LedgerSelectOption>
                <LedgerSelectOption value="real_estate">Real Estate</LedgerSelectOption>
                <LedgerSelectOption value="bond">Bond</LedgerSelectOption>
                <LedgerSelectOption value="other">Other</LedgerSelectOption>
              </LedgerSelect>
            </Field>
            <Field label="Symbol / Scheme Code">
              <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                placeholder={form.assetType === "mutual_fund" ? "118989" : form.assetType === "crypto" ? "BTC" : "RELIANCE"}
                className={inputCls} />
            </Field>
          </div>
          <Field label="Name" required>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Reliance Industries, Axis Bluechip Fund…" className={inputCls} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity" required>
              <input type="number" min="0.000001" step="any" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="10" className={inputCls} required />
            </Field>
            <Field label="Buy Price (₹)" required>
              <input type="number" min="0.01" step="any" value={form.buyPrice}
                onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}
                placeholder="500" className={inputCls} required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Buy Date">
              <input type="date" value={form.buyDate}
                onChange={(e) => setForm({ ...form, buyDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Platform">
              <input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                placeholder="Zerodha, Groww, Coin…" className={inputCls} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isSip" checked={form.isSip}
              onChange={(e) => setForm({ ...form, isSip: e.target.checked })}
              className="w-4 h-4 rounded" />
            <label htmlFor="isSip" className="text-sm">This is a SIP (Systematic Investment Plan)</label>
          </div>
          {form.isSip && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Monthly SIP Amount (₹)">
                <input type="number" min="1" value={form.sipAmount}
                  onChange={(e) => setForm({ ...form, sipAmount: e.target.value })}
                  placeholder="1000" className={inputCls} />
              </Field>
              <Field label="SIP Day">
                <input type="number" min="1" max="28" value={form.sipDay}
                  onChange={(e) => setForm({ ...form, sipDay: e.target.value })} className={inputCls} />
              </Field>
            </div>
          )}
          <Field label="Notes">
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional" className={inputCls} />
          </Field>
          <SaveBtn loading={saving} />
        </form>
      </Modal>
    </div>
  );
}

// ── BUDGET TAB ────────────────────────────────────────────────────────────────

function BudgetTab() {
  const month = currentMonth();
  const progress = useQuery(api.ledger.getBudgetProgress, { month });
  const categories = useQuery(api.ledger.listCategories, { type: "expense" });
  const [showSet, setShowSet] = useState(false);
  const setBudget = useMutation(api.ledger.setBudget);
  const deleteBudget = useMutation(api.ledger.deleteBudget);
  const [form, setForm] = useState({ categoryId: "", amount: "", period: "monthly" });
  const [saving, setSaving] = useState(false);

  const catMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const c of categories ?? []) m[c._id] = c;
    return m;
  }, [categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId || !form.amount) return;
    setSaving(true);
    try {
      await setBudget({ categoryId: form.categoryId as any, amount: parseFloat(form.amount), period: form.period as any });
      setShowSet(false);
      setForm({ categoryId: "", amount: "", period: "monthly" });
    } finally {
      setSaving(false);
    }
  };

  const monthLabel = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Monthly Budget</h3>
          <p className="text-xs text-muted-foreground">{monthLabel}</p>
        </div>
        <button onClick={() => setShowSet(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors min-h-[36px]">
          <Plus className="w-3.5 h-3.5" /> Set Budget
        </button>
      </div>

      {progress === undefined ? (
        <div className="space-y-3">{[...Array(4)].map((_: any, i: number) => (
          <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
        ))}</div>
      ) : progress.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <BarChart2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No budgets set yet</p>
          <button onClick={() => setShowSet(true)} className="mt-3 text-xs text-primary hover:underline">
            Set your first budget →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {progress.map((b: any) => {
            const cat = catMap[b.categoryId];
            const pct = Math.min(100, (b.spent / b.amount) * 100);
            const over = b.spent > b.amount;
            return (
              <div key={b._id} className="bg-card border rounded-2xl p-4 group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat?.icon ?? "💰"}</span>
                    <span className="text-sm font-medium">{cat?.name ?? "Budget"}</span>
                    {over && <span className="text-xs text-notion-red-text font-medium flex items-center gap-0.5"><AlertCircle className="w-3 h-3" /> Over</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className={cn("text-sm font-bold", over ? "text-notion-red-text" : "")}>{fmt(b.spent)}</span>
                      <span className="text-xs text-muted-foreground"> / {fmt(b.amount)}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (!confirmDeleteRecord("budget")) return;
                        void deleteBudget({ id: b._id });
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-notion-red-bg text-notion-red-text transition-all ml-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all",
                    pct >= 100 ? "bg-notion-red-text" : pct >= 75 ? "bg-notion-yellow-text" : "bg-notion-green-text")}
                    style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className={cn("text-xs", over ? "text-notion-red-text font-medium" : "text-muted-foreground")}>
                    {over ? `Over by ${fmt(b.spent - b.amount)}` : `${fmt(b.amount - b.spent)} left`}
                  </span>
                  <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showSet} onClose={() => setShowSet(false)} title="Set Budget">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Category" required>
            <LedgerSelect
              value={form.categoryId}
              onValueChange={(value) => setForm({ ...form, categoryId: value })}
              placeholder="Select category"
              required
            >
              {categories?.map((c: any) => (
                <LedgerSelectOption key={c._id} value={c._id}>
                  {c.icon} {c.name}
                </LedgerSelectOption>
              ))}
            </LedgerSelect>
          </Field>
          <Field label="Monthly Limit (₹)" required>
            <input type="number" min="1" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="5000" className={inputCls} required />
          </Field>
          <Field label="Period">
            <LedgerSelect value={form.period} onValueChange={(value) => setForm({ ...form, period: value })}>
              <LedgerSelectOption value="monthly">Monthly</LedgerSelectOption>
              <LedgerSelectOption value="quarterly">Quarterly</LedgerSelectOption>
              <LedgerSelectOption value="yearly">Yearly</LedgerSelectOption>
            </LedgerSelect>
          </Field>
          <SaveBtn loading={saving} />
        </form>
      </Modal>
    </div>
  );
}

// ── GOALS TAB ─────────────────────────────────────────────────────────────────

function GoalsTab() {
  const goals = useQuery(api.ledger.listGoals);
  const [showAdd, setShowAdd] = useState(false);
  const [editProgress, setEditProgress] = useState<any>(null);
  const createGoal = useMutation(api.ledger.createGoal);
  const updateProgress = useMutation(api.ledger.updateGoalProgress);
  const deleteGoal = useMutation(api.ledger.deleteGoal);

  const [form, setForm] = useState({ name: "", targetAmount: "", targetDate: "", priority: "medium", strategy: "", notes: "" });
  const [progressVal, setProgressVal] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.targetAmount || !form.targetDate) return;
    setSaving(true);
    try {
      await createGoal({ name: form.name, targetAmount: parseFloat(form.targetAmount), targetDate: form.targetDate, priority: form.priority as any });
      setShowAdd(false);
      setForm({ name: "", targetAmount: "", targetDate: "", priority: "medium", strategy: "", notes: "" });
    } finally {
      setSaving(false);
    }
  };

  const handleProgressSave = async () => {
    if (!editProgress || !progressVal) return;
    await updateProgress({ id: editProgress._id, currentAmount: parseFloat(progressVal) });
    setEditProgress(null);
    setProgressVal("");
  };

  const PRIORITY_COLORS: Record<string, string> = {
    high: "bg-notion-red-bg text-notion-red-text",
    medium: "bg-notion-yellow-bg text-notion-yellow-text",
    low: "bg-notion-blue-bg text-notion-blue-text",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Financial Goals</h3>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors min-h-[36px]">
          <Plus className="w-3.5 h-3.5" /> Add Goal
        </button>
      </div>

      {goals?.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <Target className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No financial goals yet</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-xs text-primary hover:underline">
            Set your first goal →
          </button>
        </div>
      )}

      <div className="space-y-3">
        {goals?.map((g: any) => {
          const pct = Math.min(100, g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0);
          const remaining = g.targetAmount - g.currentAmount;
          return (
            <div key={g._id} className="bg-card border rounded-2xl p-4 group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{g.name}</p>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", PRIORITY_COLORS[g.priority])}>
                      {g.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Target: {g.targetDate}</p>
                </div>
                <div className="text-right shrink-0 flex items-center gap-1">
                  <div>
                    <p className="text-sm font-bold">{fmt(g.currentAmount)}</p>
                    <p className="text-xs text-muted-foreground">of {fmt(g.targetAmount)}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!confirmDeleteRecord("goal")) return;
                      void deleteGoal({ id: g._id });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-notion-red-bg text-notion-red-text ml-1 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-notion-green-text" : "bg-primary")}
                  style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {pct >= 100 ? "🎉 Goal achieved!" : `${fmt(remaining)} remaining · ${pct.toFixed(0)}%`}
                </span>
                {pct < 100 && (
                  <button onClick={() => { setEditProgress(g); setProgressVal(g.currentAmount.toString()); }}
                    className="text-xs text-primary hover:underline">
                    Update
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Financial Goal">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Goal Name" required>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Buy a car, Emergency fund, Vacation…" className={inputCls} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target Amount (₹)" required>
              <input type="number" min="1" value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                placeholder="100000" className={inputCls} required />
            </Field>
            <Field label="Target Date" required>
              <input type="date" value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })} className={inputCls} required />
            </Field>
          </div>
          <Field label="Priority">
            <LedgerSelect value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
              <LedgerSelectOption value="high">High</LedgerSelectOption>
              <LedgerSelectOption value="medium">Medium</LedgerSelectOption>
              <LedgerSelectOption value="low">Low</LedgerSelectOption>
            </LedgerSelect>
          </Field>
          <Field label="Strategy / Notes">
            <input value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })}
              placeholder="How will you achieve this?" className={inputCls} />
          </Field>
          <SaveBtn loading={saving} />
        </form>
      </Modal>

      <Modal open={!!editProgress} onClose={() => setEditProgress(null)} title="Update Goal Progress">
        {editProgress && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-3 text-sm">
              <p className="font-medium">{editProgress.name}</p>
              <p className="text-muted-foreground">Target: {fmt(editProgress.targetAmount)}</p>
            </div>
            <Field label="Current Amount Saved (₹)" required>
              <input type="number" min="0" step="0.01" value={progressVal}
                onChange={(e) => setProgressVal(e.target.value)}
                placeholder={editProgress.currentAmount.toString()} className={inputCls} />
            </Field>
            <button onClick={handleProgressSave}
              className="w-full bg-primary text-primary-foreground text-sm font-medium py-2.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]">
              Save Progress
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── RECURRING TAB ─────────────────────────────────────────────────────────────

function RecurringTab() {
  const recurring = useQuery(api.ledgerRecurring.listRecurring, { activeOnly: false });
  const accounts = useQuery(api.ledger.listAccounts);
  const categories = useQuery(api.ledger.listCategories, {});
  const [showAdd, setShowAdd] = useState(false);
  const createRecurring = useMutation(api.ledgerRecurring.createRecurring);
  const deleteRecurring = useMutation(api.ledgerRecurring.deleteRecurring);
  const toggleActive = useMutation(api.ledgerRecurring.updateRecurring);

  const [form, setForm] = useState({
    title: "", type: "expense", amount: "", accountId: "", categoryId: "",
    description: "", merchant: "", frequency: "monthly", interval: "1",
    startDate: todayDate(), endDate: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.amount || !form.accountId) return;
    setSaving(true);
    try {
      await createRecurring({
        title: form.title,
        type: form.type as any,
        amount: parseFloat(form.amount),
        accountId: form.accountId as any,
        categoryId: form.categoryId as any || undefined,
        description: form.description || form.title,
        merchant: form.merchant || undefined,
        notes: form.notes || undefined,
        frequency: form.frequency as any,
        interval: parseInt(form.interval) || 1,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
      });
      setShowAdd(false);
      setForm({ title: "", type: "expense", amount: "", accountId: "", categoryId: "", description: "", merchant: "", frequency: "monthly", interval: "1", startDate: todayDate(), endDate: "", notes: "" });
    } finally {
      setSaving(false);
    }
  };

  const FREQ_LABELS: Record<string, string> = {
    daily: "Daily", weekly: "Weekly", monthly: "Monthly",
    quarterly: "Quarterly", yearly: "Yearly",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Recurring Transactions</h3>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors min-h-[36px]">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {recurring?.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <Repeat className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No recurring transactions set up</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-xs text-primary hover:underline">
            Add salary, rent, subscriptions →
          </button>
        </div>
      )}

      <div className="space-y-3">
        {recurring?.map((r: any) => (
          <div key={r._id} className={cn("bg-card border rounded-2xl p-4 group", !r.isActive && "opacity-60")}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0",
                  r.type === "income" ? "bg-notion-green-bg text-notion-green-text" : "bg-notion-red-bg text-notion-red-text")}>
                  {r.type === "income" ? "↑" : "↓"}
                </div>
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {FREQ_LABELS[r.frequency]} · {fmt(r.amount)} · Next: {r.nextDueDate}
                    {r.daysUntilNext === 0 && " (today)"}
                    {r.daysUntilNext > 0 && ` (${r.daysUntilNext}d)`}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => toggleActive({ id: r._id, isActive: !r.isActive })}
                  className={cn("p-1.5 rounded-lg transition-colors text-xs",
                    r.isActive ? "bg-notion-green-bg text-notion-green-text" : "bg-muted text-muted-foreground")}>
                  {r.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    if (!confirmDeleteRecord("recurring transaction")) return;
                    void deleteRecurring({ id: r._id });
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-notion-red-bg text-notion-red-text transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Recurring Transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Title" required>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Salary, Netflix, Rent, SIP…" className={inputCls} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" required>
              <LedgerSelect value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                <LedgerSelectOption value="income">Income</LedgerSelectOption>
                <LedgerSelectOption value="expense">Expense</LedgerSelectOption>
                <LedgerSelectOption value="transfer">Transfer</LedgerSelectOption>
                <LedgerSelectOption value="investment">Investment</LedgerSelectOption>
              </LedgerSelect>
            </Field>
            <Field label="Amount (₹)" required>
              <input type="number" min="0.01" step="any" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0" className={inputCls} required />
            </Field>
          </div>
          <Field label="Account" required>
            <LedgerSelect
              value={form.accountId}
              onValueChange={(value) => setForm({ ...form, accountId: value })}
              placeholder="Select account"
              required
            >
              {accounts?.map((a: any) => (
                <LedgerSelectOption key={a._id} value={a._id}>
                  {a.name}
                </LedgerSelectOption>
              ))}
            </LedgerSelect>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequency">
              <LedgerSelect value={form.frequency} onValueChange={(value) => setForm({ ...form, frequency: value })}>
                <LedgerSelectOption value="daily">Daily</LedgerSelectOption>
                <LedgerSelectOption value="weekly">Weekly</LedgerSelectOption>
                <LedgerSelectOption value="monthly">Monthly</LedgerSelectOption>
                <LedgerSelectOption value="quarterly">Quarterly</LedgerSelectOption>
                <LedgerSelectOption value="yearly">Yearly</LedgerSelectOption>
              </LedgerSelect>
            </Field>
            <Field label="Start Date">
              <input type="date" value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <LedgerSelect
                value={form.categoryId}
                onValueChange={(value) => setForm({ ...form, categoryId: value })}
                emptyLabel="No category"
              >
                {categories?.map((c: any) => (
                  <LedgerSelectOption key={c._id} value={c._id}>
                    {c.icon} {c.name}
                  </LedgerSelectOption>
                ))}
              </LedgerSelect>
            </Field>
            <Field label="Merchant">
              <input value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })}
                placeholder="Optional" className={inputCls} />
            </Field>
          </div>
          <Field label="End Date (optional)">
            <input type="date" value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inputCls} />
          </Field>
          <SaveBtn loading={saving} />
        </form>
      </Modal>
    </div>
  );
}



// ── MARKET TAB ────────────────────────────────────────────────────────────────

function MarketTab() {
  const indices = useQuery(api.marketData.getMarketIndices);
  const ipos = useQuery(api.ledgerInvestments.listIPOs, {});
  const [showAddIpo, setShowAddIpo] = useState(false);
  const createIPO = useMutation(api.ledgerInvestments.createIPO);
  const deleteIPO = useMutation(api.ledgerInvestments.deleteIPO);
  const syncIndices = useAction(api.marketData.fetchMarketIndices);
  const [syncing, setSyncing] = useState(false);

  const [form, setForm] = useState({
    companyName: "", symbol: "", exchange: "NSE", status: "upcoming",
    openDate: "", closeDate: "", lotSize: "", priceBandMin: "", priceBandMax: "",
    gmp: "", expectedListingDate: "", notes: "", sourceUrl: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName) return;
    setSaving(true);
    try {
      await createIPO({
        companyName: form.companyName,
        symbol: form.symbol || undefined,
        exchange: form.exchange || undefined,
        status: form.status as any,
        openDate: form.openDate || undefined,
        closeDate: form.closeDate || undefined,
        lotSize: form.lotSize ? parseInt(form.lotSize) : undefined,
        priceBandMin: form.priceBandMin ? parseFloat(form.priceBandMin) : undefined,
        priceBandMax: form.priceBandMax ? parseFloat(form.priceBandMax) : undefined,
        gmp: form.gmp ? parseFloat(form.gmp) : undefined,
        expectedListingDate: form.expectedListingDate || undefined,
        notes: form.notes || undefined,
        sourceUrl: form.sourceUrl || undefined,
      });
      setShowAddIpo(false);
      setForm({ companyName: "", symbol: "", exchange: "NSE", status: "upcoming", openDate: "", closeDate: "", lotSize: "", priceBandMin: "", priceBandMax: "", gmp: "", expectedListingDate: "", notes: "", sourceUrl: "" });
    } finally {
      setSaving(false);
    }
  };

  const upcomingIPOs = (ipos ?? []).filter((i: any) => ["upcoming", "open", "watching"].includes(i.status));
  const recentIPOs = (ipos ?? []).filter((i: any) => ["closed", "listed"].includes(i.status));

  const IPO_STATUS_COLORS: Record<string, string> = {
    upcoming: "bg-notion-blue-bg text-notion-blue-text",
    open: "bg-notion-green-bg text-notion-green-text",
    closed: "bg-muted text-muted-foreground",
    listed: "bg-notion-purple-bg text-notion-purple-text",
    watching: "bg-notion-yellow-bg text-notion-yellow-text",
  };

  return (
    <div className="space-y-4">
      {/* Market indices */}
      <div className="bg-card border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" /> Market Indices
          </h3>
          <button onClick={async () => { setSyncing(true); try { await syncIndices({}); } finally { setSyncing(false); } }}
            disabled={syncing}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors">
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            Refresh
          </button>
        </div>
        {indices && indices.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {indices.map((idx: any) => (
              <div key={idx.symbol} className="border rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">{idx.displayName ?? idx.symbol}</p>
                <p className="text-base font-bold">{idx.price >= 1000 ? idx.price.toFixed(2) : idx.price.toFixed(4)}</p>
                <p className={cn("text-xs font-medium mt-0.5", (idx.changePercent ?? 0) >= 0 ? "text-notion-green-text" : "text-notion-red-text")}>
                  {(idx.changePercent ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(idx.changePercent ?? 0).toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {new Date(idx.fetchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <p>No market data yet.</p>
            <button onClick={async () => { setSyncing(true); try { await syncIndices({}); } finally { setSyncing(false); } }}
              className="mt-2 text-xs text-primary hover:underline">
              Fetch indices →
            </button>
          </div>
        )}
      </div>

      {/* IPO Tracker */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">IPO Tracker</h3>
        <button onClick={() => setShowAddIpo(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors min-h-[36px]">
          <Plus className="w-3.5 h-3.5" /> Add IPO
        </button>
      </div>

      {upcomingIPOs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Upcoming / Open</p>
          <div className="space-y-3">
            {upcomingIPOs.map((ipo: any) => (
              <div key={ipo._id} className="bg-card border rounded-xl p-4 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{ipo.companyName}</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", IPO_STATUS_COLORS[ipo.status])}>
                        {ipo.status}
                      </span>
                      {ipo.exchange && <span className="text-xs text-muted-foreground">{ipo.exchange}</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                      {ipo.priceBandMin && ipo.priceBandMax && (
                        <span>₹{ipo.priceBandMin}–{ipo.priceBandMax}</span>
                      )}
                      {ipo.lotSize && <span>Lot: {ipo.lotSize}</span>}
                      {ipo.gmp && <span className="text-notion-green-text font-medium">GMP: ₹{ipo.gmp}</span>}
                      {ipo.openDate && <span>Opens: {ipo.openDate}</span>}
                      {ipo.closeDate && <span>Closes: {ipo.closeDate}</span>}
                    </div>
                    {ipo.notes && <p className="text-xs text-muted-foreground mt-1">{ipo.notes}</p>}
                  </div>
                  <button
                    onClick={() => {
                      if (!confirmDeleteRecord("IPO watchlist entry")) return;
                      void deleteIPO({ id: ipo._id });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-notion-red-bg text-notion-red-text transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentIPOs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recently Listed</p>
          <div className="space-y-2">
            {recentIPOs.map((ipo: any) => (
              <div key={ipo._id} className="bg-card border rounded-xl px-4 py-3 flex items-center justify-between group">
                <div>
                  <p className="text-sm font-medium">{ipo.companyName}</p>
                  {ipo.expectedListingDate && <p className="text-xs text-muted-foreground">Listed: {ipo.expectedListingDate}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {ipo.priceBandMax && <span className="text-xs text-muted-foreground">Issue: ₹{ipo.priceBandMax}</span>}
                  <button
                    onClick={() => {
                      if (!confirmDeleteRecord("IPO watchlist entry")) return;
                      void deleteIPO({ id: ipo._id });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-notion-red-bg text-notion-red-text transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ipos?.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
          <Globe className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Track upcoming IPOs here</p>
          <button onClick={() => setShowAddIpo(true)} className="mt-3 text-xs text-primary hover:underline">
            Add an IPO to watch →
          </button>
        </div>
      )}

      {/* Add IPO Modal */}
      <Modal open={showAddIpo} onClose={() => setShowAddIpo(false)} title="Add IPO to Watchlist">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Name" required>
              <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="Company Ltd." className={inputCls} required />
            </Field>
            <Field label="Symbol">
              <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                placeholder="TICKER" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Exchange">
              <LedgerSelect value={form.exchange} onValueChange={(value) => setForm({ ...form, exchange: value })}>
                <LedgerSelectOption value="NSE">NSE</LedgerSelectOption>
                <LedgerSelectOption value="BSE">BSE</LedgerSelectOption>
                <LedgerSelectOption value="NSE/BSE">NSE/BSE</LedgerSelectOption>
              </LedgerSelect>
            </Field>
            <Field label="Status">
              <LedgerSelect value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <LedgerSelectOption value="upcoming">Upcoming</LedgerSelectOption>
                <LedgerSelectOption value="open">Open</LedgerSelectOption>
                <LedgerSelectOption value="watching">Watching</LedgerSelectOption>
                <LedgerSelectOption value="closed">Closed</LedgerSelectOption>
                <LedgerSelectOption value="listed">Listed</LedgerSelectOption>
              </LedgerSelect>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Open Date">
              <input type="date" value={form.openDate} onChange={(e) => setForm({ ...form, openDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Close Date">
              <input type="date" value={form.closeDate} onChange={(e) => setForm({ ...form, closeDate: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Price Min (₹)">
              <input type="number" value={form.priceBandMin} onChange={(e) => setForm({ ...form, priceBandMin: e.target.value })}
                placeholder="0" className={inputCls} />
            </Field>
            <Field label="Price Max (₹)">
              <input type="number" value={form.priceBandMax} onChange={(e) => setForm({ ...form, priceBandMax: e.target.value })}
                placeholder="0" className={inputCls} />
            </Field>
            <Field label="GMP (₹)">
              <input type="number" value={form.gmp} onChange={(e) => setForm({ ...form, gmp: e.target.value })}
                placeholder="0" className={inputCls} />
            </Field>
          </div>
          <Field label="Lot Size">
            <input type="number" value={form.lotSize} onChange={(e) => setForm({ ...form, lotSize: e.target.value })}
              placeholder="0" className={inputCls} />
          </Field>
          <Field label="Notes">
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional" className={inputCls} />
          </Field>
          <SaveBtn loading={saving} />
        </form>
      </Modal>
    </div>
  );
}

// ── MAIN LEDGER PAGE ──────────────────────────────────────────────────────────

export default function LedgerPage() {
  const { ledgerTab, setLedgerTab } = useAppStore();
  const [mounted, setMounted] = useState<Record<string, boolean>>({ [ledgerTab]: true });

  const handleTabChange = (id: LedgerTab) => {
    setLedgerTab(id);
    setMounted((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <LedgerSecurityGate>
      <div className="min-h-full bg-background">
        <div className="sticky top-0 z-30 isolate bg-background/95 backdrop-blur-md">
          <WorkspaceTopBar
            moduleTitle="Ledger"
            sticky={false}
            className="bg-transparent backdrop-blur-0"
          />

          <div className="border-b border-border/70">
            <div className="max-w-5xl mx-auto px-4 py-2">
              <div className="flex gap-1 overflow-x-auto overscroll-x-contain scrollbar-hide">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        "shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all min-h-[36px]",
                        ledgerTab === tab.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      )}>
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-4 pb-24 md:py-6 md:pb-6">
          {mounted["dashboard"] && <div className={ledgerTab !== "dashboard" ? "hidden" : ""}><DashboardTab /></div>}
          {mounted["credit_cards"] && <div className={ledgerTab !== "credit_cards" ? "hidden" : ""}><CreditCardsTab /></div>}
          {mounted["loans"] && <div className={ledgerTab !== "loans" ? "hidden" : ""}><LoansTab /></div>}
          {mounted["investments"] && <div className={ledgerTab !== "investments" ? "hidden" : ""}><InvestmentsTab /></div>}
          {mounted["budget"] && <div className={ledgerTab !== "budget" ? "hidden" : ""}><BudgetTab /></div>}
          {mounted["goals"] && <div className={ledgerTab !== "goals" ? "hidden" : ""}><GoalsTab /></div>}
          {mounted["recurring"] && <div className={ledgerTab !== "recurring" ? "hidden" : ""}><RecurringTab /></div>}
          {mounted["market"] && <div className={ledgerTab !== "market" ? "hidden" : ""}><MarketTab /></div>}
        </div>
      </div>
    </LedgerSecurityGate>
  );
}


