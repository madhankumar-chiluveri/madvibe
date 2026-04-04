import { v } from "convex/values";

export const financeAccountTypeValidator = v.union(
  v.literal("savings"),
  v.literal("checking"),
  v.literal("credit_card"),
  v.literal("cash"),
  v.literal("investment"),
  v.literal("loan"),
  v.literal("wallet"),
);

export const financeTransactionTypeValidator = v.union(
  v.literal("income"),
  v.literal("expense"),
  v.literal("transfer"),
  v.literal("investment"),
);

export const financeAssetTypeValidator = v.union(
  v.literal("stock"),
  v.literal("mutual_fund"),
  v.literal("etf"),
  v.literal("fd"),
  v.literal("ppf"),
  v.literal("gold"),
  v.literal("crypto"),
  v.literal("real_estate"),
  v.literal("bond"),
  v.literal("other"),
);

export const financeBudgetPeriodValidator = v.union(
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("yearly"),
);

export const financeGoalPriorityValidator = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
);

export const financeLoanDirectionValidator = v.union(
  v.literal("lent"),
  v.literal("borrowed"),
);

export const financeLoanStatusValidator = v.union(
  v.literal("active"),
  v.literal("partially_paid"),
  v.literal("settled"),
  v.literal("overdue"),
  v.literal("written_off"),
);

export const financeRecurringFrequencyValidator = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("yearly"),
);

export const financeTransferDirectionValidator = v.union(
  v.literal("in"),
  v.literal("out"),
);

export const financeCreditCardNetworkValidator = v.union(
  v.literal("visa"),
  v.literal("mastercard"),
  v.literal("rupay"),
  v.literal("amex"),
  v.literal("discover"),
  v.literal("other"),
);

export const financeMarketAssetTypeValidator = v.union(
  v.literal("stock"),
  v.literal("mutual_fund"),
  v.literal("etf"),
  v.literal("fd"),
  v.literal("ppf"),
  v.literal("gold"),
  v.literal("crypto"),
  v.literal("real_estate"),
  v.literal("bond"),
  v.literal("other"),
  v.literal("index"),
  v.literal("forex"),
  v.literal("commodity"),
  v.literal("ipo"),
);

export const financeMarketStatusValidator = v.union(
  v.literal("open"),
  v.literal("closed"),
  v.literal("pre"),
  v.literal("post"),
  v.literal("unknown"),
);

export const financeDividendTypeValidator = v.union(
  v.literal("dividend"),
  v.literal("interest"),
  v.literal("bonus"),
);

export const financeIpoStatusValidator = v.union(
  v.literal("upcoming"),
  v.literal("open"),
  v.literal("closed"),
  v.literal("listed"),
  v.literal("watching"),
);

export const financeMarketHistoryPointValidator = v.object({
  price: v.number(),
  fetchedAt: v.number(),
});

export type FinanceRecurringFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type FinanceTransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "investment";

export type FinanceTransferDirection = "in" | "out";

export type XirrCashflow = {
  amount: number;
  date: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getTodayDate() {
  return toIsoDate(new Date());
}

export function getMonthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 0));

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
}

export function shiftRecurringDate(
  date: string,
  frequency: FinanceRecurringFrequency,
  interval = 1,
) {
  const next = parseIsoDate(date);

  if (frequency === "daily") {
    next.setUTCDate(next.getUTCDate() + interval);
  } else if (frequency === "weekly") {
    next.setUTCDate(next.getUTCDate() + interval * 7);
  } else if (frequency === "monthly") {
    next.setUTCMonth(next.getUTCMonth() + interval);
  } else if (frequency === "quarterly") {
    next.setUTCMonth(next.getUTCMonth() + interval * 3);
  } else {
    next.setUTCFullYear(next.getUTCFullYear() + interval);
  }

  return toIsoDate(next);
}

export function differenceInDays(targetDate: string, fromDate = getTodayDate()) {
  const diffMs = parseIsoDate(targetDate).getTime() - parseIsoDate(fromDate).getTime();
  return Math.ceil(diffMs / DAY_MS);
}

export function signedTransactionAmount(tx: {
  type: FinanceTransactionType;
  amount: number;
  affectsBalance?: boolean;
  transferDirection?: FinanceTransferDirection;
}) {
  if (tx.affectsBalance === false) return 0;

  if (tx.type === "income") return tx.amount;
  if (tx.type === "transfer") {
    return tx.transferDirection === "in" ? tx.amount : -tx.amount;
  }

  return -tx.amount;
}

export function roundCurrency(value: number, precision = 2) {
  const multiplier = 10 ** precision;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

export function calculateXirr(cashflows: XirrCashflow[]) {
  if (cashflows.length < 2) return null;

  const hasPositive = cashflows.some((cashflow) => cashflow.amount > 0);
  const hasNegative = cashflows.some((cashflow) => cashflow.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const ordered = [...cashflows].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = parseIsoDate(ordered[0].date).getTime();
  let rate = 0.12;

  for (let index = 0; index < 100; index += 1) {
    let value = 0;
    let derivative = 0;

    for (const cashflow of ordered) {
      const years =
        (parseIsoDate(cashflow.date).getTime() - firstDate) / DAY_MS / 365;
      const base = (1 + rate) ** years;
      value += cashflow.amount / base;
      derivative += (-years * cashflow.amount) / ((1 + rate) ** (years + 1));
    }

    if (!Number.isFinite(value) || !Number.isFinite(derivative) || derivative === 0) {
      return null;
    }

    const nextRate = rate - value / derivative;
    if (!Number.isFinite(nextRate) || nextRate <= -0.999999) {
      return null;
    }

    if (Math.abs(nextRate - rate) < 0.0000001) {
      return nextRate;
    }

    rate = nextRate;
  }

  return Number.isFinite(rate) ? rate : null;
}
