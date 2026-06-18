"use client";

import { useMemo, memo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Landmark, AlertCircle, Sparkles, PiggyBank, Landmark as CreditCardIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Account {
  _id: string;
  name: string;
  balance: number;
  color: string;
  type: string;
  currency: string;
}

interface FinanceSummaryProps {
  finances: {
    netWorth: number;
    income: number;
    expenses: number;
    accounts: Account[];
  };
}

export const FinanceSummary = memo(function FinanceSummary({ finances }: FinanceSummaryProps) {
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const budgetProgress = useQuery(api.ledger.getBudgetProgress, {
    month: currentMonthStr,
  });

  const categories = useQuery(api.ledger.listCategories, {}) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryMeta = (categoryId: string) => {
    const cat = categories.find((c: any) => c._id === categoryId);
    return {
      name: cat ? cat.name : "Category",
      icon: cat ? cat.icon : "🍔",
      color: cat ? cat.color : "gray",
    };
  };

  const accountTypeLabels: Record<string, string> = {
    savings: "Savings",
    checking: "Checking",
    credit_card: "Credit Card",
    cash: "Cash",
    investment: "Investment",
    loan: "Loan",
    other: "Other",
  };

  const accountColors: Record<string, string> = {
    gray: "bg-notion-gray-bg/50 border-notion-gray-text/20 text-foreground",
    brown: "bg-notion-brown-bg/40 border-notion-brown-text/20 text-foreground",
    orange: "bg-notion-orange-bg/40 border-notion-orange-text/20 text-foreground",
    yellow: "bg-notion-yellow-bg/40 border-notion-yellow-text/20 text-foreground",
    green: "bg-notion-green-bg/40 border-notion-green-text/20 text-foreground",
    blue: "bg-notion-blue-bg/40 border-notion-blue-text/20 text-foreground",
    purple: "bg-notion-purple-bg/40 border-notion-purple-text/20 text-foreground",
    pink: "bg-notion-pink-bg/40 border-notion-pink-text/20 text-foreground",
    red: "bg-notion-red-bg/40 border-notion-red-text/20 text-foreground",
  };

  return (
    <div className="rounded-[10px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b mb-4">
        <Landmark className="w-4 h-4 text-notion-blue-text" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
          Accounts & Budgets
        </span>
      </div>

      {/* 1. Accounts Scroller */}
      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
        My Accounts
      </h4>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 mb-4 select-none">
        {finances.accounts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No active accounts</p>
        ) : (
          finances.accounts.map((acc) => {
            const colorClass =
              accountColors[acc.color.toLowerCase()] ||
              "bg-notion-gray-bg/50 border-notion-gray-text/20 text-foreground";
            const isCard = acc.type === "credit_card";

            return (
              <div
                key={acc._id}
                className={cn(
                  "flex flex-col justify-between shrink-0 w-[140px] p-3 rounded-xl border transition-all hover:shadow-sm",
                  colorClass
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold truncate max-w-[95px]">
                    {acc.name}
                  </span>
                  {isCard ? (
                    <CreditCardIcon className="w-3.5 h-3.5 opacity-65 shrink-0" />
                  ) : (
                    <PiggyBank className="w-3.5 h-3.5 opacity-65 shrink-0" />
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold truncate">
                    {formatCurrency(acc.balance)}
                  </p>
                  <p className="text-[9px] opacity-70 mt-0.5">
                    {accountTypeLabels[acc.type] || "Savings"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. Budgets progress */}
      <div className="flex-1 flex flex-col min-h-0 select-none">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
          Monthly Budgets
        </h4>
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[160px] scrollbar-hide pr-1">
          {budgetProgress === undefined ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-6 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : budgetProgress.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No active budgets set. Set them in Ledger settings.
            </div>
          ) : (
            budgetProgress.map((b: any) => {
              const meta = getCategoryMeta(b.categoryId);
              const percentage = Math.min(Math.round((b.spent / b.amount) * 100), 100);
              const isOver = b.spent > b.amount;

              return (
                <div key={b._id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span className="text-sm">{meta.icon}</span>
                      <span className="truncate max-w-[100px]">{meta.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className={cn(isOver ? "text-notion-red-text" : "text-muted-foreground")}>
                        {formatCurrency(b.spent)}
                      </span>
                      <span className="text-muted-foreground font-normal">/</span>
                      <span className="text-foreground">{formatCurrency(b.amount)}</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden relative">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isOver ? "bg-notion-red-text" : "bg-notion-blue-text"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  {isOver && (
                    <div className="text-[9px] text-notion-red-text font-bold flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Budget Limit Exceeded
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});
