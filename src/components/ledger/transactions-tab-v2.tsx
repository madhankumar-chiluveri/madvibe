"use client";

import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { type Doc, type Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  CreditCard,
  DollarSign,
  Edit2,
  Filter,
  Landmark,
  PiggyBank,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FinanceAccount = Doc<"financeAccounts">;
type FinanceCategory = Doc<"financeCategories">;
type FinanceCreditCard = Doc<"financeCreditCards">;
type FinanceTransaction = Doc<"financeTransactions">;

type TransactionType = "income" | "expense" | "transfer" | "investment";
type TransactionFilterType = "" | TransactionType;
type AccountTypeValue =
  | "savings"
  | "checking"
  | "cash"
  | "wallet"
  | "credit_card"
  | "investment"
  | "loan";

type TransactionFormState = {
  accountId: string;
  type: TransactionType;
  amount: string;
  categoryId: string;
  merchant: string;
  description: string;
  notes: string;
  date: string;
  tags: string;
  toAccountId: string;
  linkedCreditCardId: string;
};

type AccountFormState = {
  name: string;
  type: AccountTypeValue;
  balance: string;
  institution: string;
  currency: string;
  accountNumberLast4: string;
  notes: string;
};

type AccountTypeOption = {
  value: AccountTypeValue;
  label: string;
  shortLabel: string;
  helper: string;
  icon: LucideIcon;
  iconWrapClassName: string;
  badgeClassName: string;
};

const fmt = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const fmtShort = (amount: number) => {
  const absolute = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (absolute >= 10000000) return `${sign}Rs ${(absolute / 10000000).toFixed(2)}Cr`;
  if (absolute >= 100000) return `${sign}Rs ${(absolute / 100000).toFixed(2)}L`;
  if (absolute >= 1000) return `${sign}Rs ${(absolute / 1000).toFixed(1)}k`;

  return fmt(amount);
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const ACCOUNT_TYPE_OPTIONS: AccountTypeOption[] = [
  {
    value: "savings",
    label: "Savings account",
    shortLabel: "Savings",
    helper: "Emergency funds and long-term reserves.",
    icon: PiggyBank,
    iconWrapClassName: "bg-emerald-500/15 text-emerald-600",
    badgeClassName: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  {
    value: "checking",
    label: "Current account",
    shortLabel: "Current",
    helper: "Everyday operating money and incoming salary flows.",
    icon: Building2,
    iconWrapClassName: "bg-blue-500/15 text-blue-600",
    badgeClassName: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  {
    value: "cash",
    label: "Cash",
    shortLabel: "Cash",
    helper: "Physical cash or petty cash balances.",
    icon: DollarSign,
    iconWrapClassName: "bg-amber-500/15 text-amber-600",
    badgeClassName: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    value: "wallet",
    label: "Wallet",
    shortLabel: "Wallet",
    helper: "UPI, prepaid, and stored-value balances.",
    icon: Wallet,
    iconWrapClassName: "bg-orange-500/15 text-orange-600",
    badgeClassName: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  {
    value: "credit_card",
    label: "Credit card account",
    shortLabel: "Credit card",
    helper: "Card-linked liabilities and dues.",
    icon: CreditCard,
    iconWrapClassName: "bg-violet-500/15 text-violet-600",
    badgeClassName: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  {
    value: "investment",
    label: "Investment account",
    shortLabel: "Investment",
    helper: "Brokerage and wealth-management accounts.",
    icon: TrendingUp,
    iconWrapClassName: "bg-cyan-500/15 text-cyan-600",
    badgeClassName: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  },
  {
    value: "loan",
    label: "Loan account",
    shortLabel: "Loan",
    helper: "Borrowed balances, payables, or lending accounts.",
    icon: Landmark,
    iconWrapClassName: "bg-rose-500/15 text-rose-600",
    badgeClassName: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
];

const ACCOUNT_TYPE_SORT_ORDER = ACCOUNT_TYPE_OPTIONS.reduce<Record<string, number>>(
  (accumulator, option, index) => {
    accumulator[option.value] = index;
    return accumulator;
  },
  {}
);

const BANK_ACCOUNT_TYPES = new Set<AccountTypeValue>(["savings", "checking"]);
const LIQUID_ACCOUNT_TYPES = new Set<AccountTypeValue>([
  "savings",
  "checking",
  "cash",
  "wallet",
]);

const TRANSACTION_TYPE_OPTIONS: Array<{
  value: TransactionType;
  label: string;
}> = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
  { value: "investment", label: "Investment" },
];

const EMPTY_SELECT_VALUE = "__ledger_empty_value__";
const inputCls =
  "w-full rounded-xl border border-border bg-muted/45 px-3 py-2.5 text-sm transition-colors placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/35";
const textareaCls = `${inputCls} min-h-[112px] resize-y`;
const ledgerSelectTriggerBaseCls =
  "w-full border-white/10 bg-white/[0.03] text-zinc-100 shadow-none transition-colors hover:bg-white/[0.06] focus:ring-1 focus:ring-white/15 focus:ring-offset-0 data-[placeholder]:text-zinc-500 [&>svg]:text-zinc-500";
const ledgerSelectContentCls =
  "rounded-[18px] border-white/10 bg-[#191816] p-1 text-zinc-100 shadow-[0_24px_60px_rgba(0,0,0,0.45)]";
const ledgerSelectItemCls =
  "min-h-[38px] rounded-xl px-3 py-2 text-sm text-zinc-200 focus:bg-white/[0.06] focus:text-white data-[state=checked]:bg-white/[0.08] data-[state=checked]:text-white";

function getEmptyTransactionForm(accountId = ""): TransactionFormState {
  return {
    accountId,
    type: "expense",
    amount: "",
    categoryId: "",
    merchant: "",
    description: "",
    notes: "",
    date: todayDate(),
    tags: "",
    toAccountId: "",
    linkedCreditCardId: "",
  };
}

function getEmptyAccountForm(): AccountFormState {
  return {
    name: "",
    type: "savings",
    balance: "",
    institution: "",
    currency: "INR",
    accountNumberLast4: "",
    notes: "",
  };
}

function normalizeAccountType(value?: string): AccountTypeValue {
  const match = ACCOUNT_TYPE_OPTIONS.find((option) => option.value === value);
  return match?.value ?? "savings";
}

function getAccountTypeMeta(type: string): AccountTypeOption {
  return (
    ACCOUNT_TYPE_OPTIONS.find((option) => option.value === type) ??
    ACCOUNT_TYPE_OPTIONS[0]
  );
}

function formatAccountTypeLabel(type: string) {
  return getAccountTypeMeta(type).shortLabel;
}

function isBankAccountType(type: string) {
  return BANK_ACCOUNT_TYPES.has(normalizeAccountType(type));
}

function isLiquidAccountType(type: string) {
  return LIQUID_ACCOUNT_TYPES.has(normalizeAccountType(type));
}

function sortLedgerAccounts(accounts: FinanceAccount[]) {
  return [...accounts].sort((left, right) => {
    const typeOrder =
      (ACCOUNT_TYPE_SORT_ORDER[left.type] ?? 999) -
      (ACCOUNT_TYPE_SORT_ORDER[right.type] ?? 999);

    if (typeOrder !== 0) return typeOrder;
    return left.name.localeCompare(right.name);
  });
}

function getTransactionPresentation(transaction: FinanceTransaction) {
  if (transaction.type === "income") {
    return {
      amountClassName: "text-emerald-600",
      iconWrapClassName: "bg-emerald-500/15 text-emerald-600",
      prefix: "+",
      icon: ArrowDownRight,
      badgeLabel: "Income",
    };
  }

  if (transaction.type === "transfer") {
    const incoming = transaction.transferDirection === "in";
    return {
      amountClassName: "text-blue-600",
      iconWrapClassName: "bg-blue-500/15 text-blue-600",
      prefix: incoming ? "+" : "-",
      icon: incoming ? ArrowDownRight : ArrowUpRight,
      badgeLabel: incoming ? "Transfer in" : "Transfer out",
    };
  }

  if (transaction.type === "investment") {
    return {
      amountClassName: "text-cyan-600",
      iconWrapClassName: "bg-cyan-500/15 text-cyan-600",
      prefix: "-",
      icon: TrendingUp,
      badgeLabel: "Investment",
    };
  }

  return {
    amountClassName: "text-red-500",
    iconWrapClassName: "bg-red-500/15 text-red-500",
    prefix: "-",
    icon: ArrowUpRight,
    badgeLabel: "Expense",
  };
}

function sanitizeLastFourDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length <= 4 ? digits : digits.slice(-4);
}

function formatAccountOptionLabel(account: FinanceAccount) {
  const meta = getAccountTypeMeta(account.type);
  const suffix = account.institution
    ? ` - ${account.institution}`
    : account.accountNumberLast4
      ? ` - xxxx ${account.accountNumberLast4}`
      : "";

  return `${account.name} (${meta.shortLabel})${suffix}`;
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-3xl border bg-card/70 p-4 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-5 py-4">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  helper,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  helper?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      {children}
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

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
  children: ReactNode;
}) {
  const normalizedValue =
    value === "" && emptyLabel ? EMPTY_SELECT_VALUE : value || undefined;

  return (
    <Select
      value={normalizedValue}
      onValueChange={(nextValue) =>
        onValueChange(nextValue === EMPTY_SELECT_VALUE ? "" : nextValue)
      }
      required={required}
    >
      <SelectTrigger
        className={cn(
          ledgerSelectTriggerBaseCls,
          compact ? "h-10 rounded-xl px-3 text-xs" : "h-11 rounded-xl px-3.5 text-sm",
          triggerClassName
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn(ledgerSelectContentCls, contentClassName)}>
        {emptyLabel ? (
          <LedgerSelectOption value={EMPTY_SELECT_VALUE}>
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
  children: ReactNode;
  className?: string;
}) {
  return (
    <SelectItem value={value} className={cn(ledgerSelectItemCls, className)}>
      {children}
    </SelectItem>
  );
}

function SaveBtn({
  loading,
  label = "Save",
}: {
  loading?: boolean;
  label?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Saving..." : label}
    </button>
  );
}

export function TransactionsTabV2() {
  const [filterType, setFilterType] = useState<TransactionFilterType>("");
  const [filterAccount, setFilterAccount] = useState("");
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccountId, setEditingAccountId] =
    useState<Id<"financeAccounts"> | null>(null);
  const [transactionForm, setTransactionForm] = useState<TransactionFormState>(
    getEmptyTransactionForm()
  );
  const [accountForm, setAccountForm] = useState<AccountFormState>(
    getEmptyAccountForm()
  );
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  const transactions = useQuery(api.ledger.listTransactions, {
    limit: 50,
    type: filterType === "" ? undefined : filterType,
    accountId:
      filterAccount === ""
        ? undefined
        : (filterAccount as Id<"financeAccounts">),
  });
  const accounts = useQuery(api.ledger.listAccounts);
  const categories = useQuery(api.ledger.listCategories, {});
  const creditCards = useQuery(api.ledgerCards.listCreditCards);

  const createTransaction = useMutation(api.ledger.createTransaction);
  const transferBetweenAccounts = useMutation(api.ledger.transferBetweenAccounts);
  const deleteTransaction = useMutation(api.ledger.deleteTransaction);
  const createAccount = useMutation(api.ledger.createAccount);
  const updateAccountFull = useMutation(api.ledger.updateAccountFull);
  const deleteAccount = useMutation(api.ledger.deleteAccount);

  const sortedAccounts = useMemo(
    () => sortLedgerAccounts(accounts ?? []),
    [accounts]
  );

  const accountsById = useMemo<Record<string, FinanceAccount>>(
    () =>
      Object.fromEntries(
        sortedAccounts.map((account) => [String(account._id), account])
      ) as Record<string, FinanceAccount>,
    [sortedAccounts]
  );

  const categoriesById = useMemo<Record<string, FinanceCategory>>(
    () =>
      Object.fromEntries(
        (categories ?? []).map((category) => [String(category._id), category])
      ) as Record<string, FinanceCategory>,
    [categories]
  );

  const bankAccounts = useMemo(
    () => sortedAccounts.filter((account) => isBankAccountType(account.type)),
    [sortedAccounts]
  );

  const otherAccounts = useMemo(
    () => sortedAccounts.filter((account) => !isBankAccountType(account.type)),
    [sortedAccounts]
  );

  const liquidBalance = useMemo(
    () =>
      sortedAccounts
        .filter((account) => isLiquidAccountType(account.type))
        .reduce((sum, account) => sum + account.balance, 0),
    [sortedAccounts]
  );

  const totalTrackedBalance = useMemo(
    () => sortedAccounts.reduce((sum, account) => sum + account.balance, 0),
    [sortedAccounts]
  );

  const filteredCategories = useMemo(() => {
    const nextType = transactionForm.type === "income" ? "income" : "expense";
    return (categories ?? []).filter((category) => category.type === nextType);
  }, [categories, transactionForm.type]);

  const transferDestinationAccounts = useMemo(
    () =>
      sortedAccounts.filter(
        (account) => String(account._id) !== transactionForm.accountId
      ),
    [sortedAccounts, transactionForm.accountId]
  );

  const activeFilterAccount =
    filterAccount === "" ? null : accountsById[filterAccount] ?? null;
  const visibleTransactions = transactions ?? [];

  function getDefaultAccountId() {
    if (filterAccount) return filterAccount;
    if (bankAccounts[0]) return String(bankAccounts[0]._id);
    if (sortedAccounts[0]) return String(sortedAccounts[0]._id);
    return "";
  }

  function openNewTransaction(prefill?: Partial<TransactionFormState>) {
    if (sortedAccounts.length === 0) {
      toast.info("Add an account first so transactions have somewhere to land.");
      return;
    }

    setTransactionForm({
      ...getEmptyTransactionForm(getDefaultAccountId()),
      ...prefill,
    });
    setShowTransactionModal(true);
  }

  function openNewAccount(prefill?: Partial<AccountFormState>) {
    setEditingAccountId(null);
    setAccountForm({
      ...getEmptyAccountForm(),
      ...prefill,
    });
    setShowAccountModal(true);
  }

  function openEditAccount(account: FinanceAccount) {
    setEditingAccountId(account._id);
    setAccountForm({
      name: account.name,
      type: normalizeAccountType(account.type),
      balance: String(account.balance ?? 0),
      institution: account.institution ?? "",
      currency: account.currency ?? "INR",
      accountNumberLast4: account.accountNumberLast4 ?? "",
      notes: account.notes ?? "",
    });
    setShowAccountModal(true);
  }

  async function handleTransactionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!transactionForm.accountId) {
      toast.error("Select the account used for this transaction.");
      return;
    }

    const amount = Number(transactionForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount greater than zero.");
      return;
    }

    if (!transactionForm.description.trim()) {
      toast.error("Add a short description for this transaction.");
      return;
    }

    if (
      transactionForm.type === "transfer" &&
      transactionForm.accountId === transactionForm.toAccountId
    ) {
      toast.error("Transfers need two different accounts.");
      return;
    }

    setSavingTransaction(true);

    try {
      if (transactionForm.type === "transfer") {
        if (!transactionForm.toAccountId) {
          toast.error("Pick the destination account for this transfer.");
          return;
        }

        await transferBetweenAccounts({
          fromAccountId: transactionForm.accountId as Id<"financeAccounts">,
          toAccountId: transactionForm.toAccountId as Id<"financeAccounts">,
          amount,
          description: transactionForm.description.trim(),
          date: transactionForm.date,
          notes: transactionForm.notes.trim() || undefined,
          linkedCreditCardId: transactionForm.linkedCreditCardId
            ? (transactionForm.linkedCreditCardId as Id<"financeCreditCards">)
            : undefined,
        });
      } else {
        await createTransaction({
          accountId: transactionForm.accountId as Id<"financeAccounts">,
          type: transactionForm.type,
          amount,
          categoryId: transactionForm.categoryId
            ? (transactionForm.categoryId as Id<"financeCategories">)
            : undefined,
          merchant: transactionForm.merchant.trim() || undefined,
          description: transactionForm.description.trim(),
          notes: transactionForm.notes.trim() || undefined,
          date: transactionForm.date,
          tags: transactionForm.tags
            ? transactionForm.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean)
            : undefined,
        });
      }

      setShowTransactionModal(false);
      setTransactionForm(getEmptyTransactionForm(getDefaultAccountId()));
      toast.success(
        transactionForm.type === "transfer"
          ? "Transfer recorded."
          : "Transaction saved."
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save transaction.";
      toast.error(message);
    } finally {
      setSavingTransaction(false);
    }
  }

  async function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accountForm.name.trim()) {
      toast.error("Give this account a clear name.");
      return;
    }

    const balance = Number(accountForm.balance || "0");
    if (!Number.isFinite(balance)) {
      toast.error("Enter a valid balance.");
      return;
    }

    const payload = {
      name: accountForm.name.trim(),
      type: accountForm.type,
      balance,
      institution: accountForm.institution.trim() || undefined,
      currency: accountForm.currency.trim().toUpperCase() || "INR",
      accountNumberLast4: accountForm.accountNumberLast4 || undefined,
      notes: accountForm.notes.trim() || undefined,
    };

    setSavingAccount(true);

    try {
      if (editingAccountId) {
        await updateAccountFull({
          id: editingAccountId,
          ...payload,
        });
      } else {
        await createAccount(payload);
      }

      setShowAccountModal(false);
      setEditingAccountId(null);
      setAccountForm(getEmptyAccountForm());
      toast.success(editingAccountId ? "Account updated." : "Account added.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save account.";
      toast.error(message);
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleArchiveAccount(account: FinanceAccount) {
    const confirmed = window.confirm(
      `Archive ${account.name}? Existing transactions will stay in history, but the account will stop showing in active lists.`
    );
    if (!confirmed) return;

    try {
      await deleteAccount({ id: account._id });
      if (filterAccount === String(account._id)) {
        setFilterAccount("");
      }
      toast.success(`${account.name} archived.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to archive account.";
      toast.error(message);
    }
  }

  async function handleDeleteTransaction(transaction: FinanceTransaction) {
    const confirmed = window.confirm(
      `Delete "${transaction.description}" from ${transaction.date}?`
    );
    if (!confirmed) return;

    try {
      await deleteTransaction({ id: transaction._id });
      toast.success("Transaction deleted.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete transaction.";
      toast.error(message);
    }
  }

  function handleTransactionTypeChange(nextValue: string) {
    const nextType = nextValue as TransactionType;
    setTransactionForm((current) => ({
      ...current,
      type: nextType,
      categoryId: "",
      linkedCreditCardId: "",
      toAccountId: nextType === "transfer" ? current.toAccountId : "",
      merchant: nextType === "transfer" ? "" : current.merchant,
    }));
  }

  function renderAccountGroup(
    title: string,
    description: string,
    items: FinanceAccount[],
    emptyState: string
  ) {
    if (accounts === undefined) {
      return (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={`${title}-skeleton-${index}`}
              className="rounded-3xl border bg-card/60 p-4"
            >
              <div className="h-4 w-36 animate-pulse rounded bg-muted" />
              <div className="mt-4 h-8 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-4 h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-card/40 px-4 py-6 text-sm text-muted-foreground">
            <p>{emptyState}</p>
          </div>
        ) : (
          items.map((account) => {
            const meta = getAccountTypeMeta(account.type);
            const Icon = meta.icon;
            const isFocused = filterAccount === String(account._id);

            return (
              <div
                key={account._id}
                className={cn(
                  "rounded-3xl border bg-card/70 p-4 shadow-sm transition-colors",
                  isFocused && "border-primary/45 ring-1 ring-primary/20"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                      meta.iconWrapClassName
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-sm font-semibold">
                        {account.name}
                      </h4>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          meta.badgeClassName
                        )}
                      >
                        {meta.shortLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {account.institution || meta.helper}
                      {account.accountNumberLast4
                        ? `  |  xxxx ${account.accountNumberLast4}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Balance
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-xl font-semibold",
                        account.balance < 0 ? "text-red-500" : "text-foreground"
                      )}
                    >
                      {fmt(account.balance)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(account.currency ?? "INR").toUpperCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openNewTransaction({
                          accountId: String(account._id),
                        })
                      }
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Log entry
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFilterAccount((current) =>
                          current === String(account._id)
                            ? ""
                            : String(account._id)
                        )
                      }
                      className={cn(
                        "inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors hover:bg-muted",
                        isFocused &&
                          "border-primary/35 bg-primary/10 text-primary"
                      )}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      {isFocused ? "Clear focus" : "View activity"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditAccount(account)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={`Edit ${account.name}`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleArchiveAccount(account)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border text-red-500 transition-colors hover:bg-red-500/10"
                      aria-label={`Archive ${account.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {account.notes ? (
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {account.notes}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border bg-card/70 p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Accounts and transactions
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Manage every account where money moves.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep savings and current accounts organized, then log activity from the
            same workspace instead of jumping across finance tabs.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openNewAccount()}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Landmark className="h-4 w-4" />
            Add account
          </button>
          <button
            type="button"
            onClick={() => openNewTransaction()}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add transaction
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active accounts"
          value={String(sortedAccounts.length)}
          helper="Every live account that can receive transactions right now."
          icon={Wallet}
        />
        <MetricCard
          label="Bank accounts"
          value={String(bankAccounts.length)}
          helper="Savings and current accounts grouped separately for faster scanning."
          icon={Landmark}
        />
        <MetricCard
          label="Liquid balance"
          value={fmtShort(liquidBalance)}
          helper="Cash, savings, current, and wallet balances available to deploy."
          icon={PiggyBank}
        />
        <MetricCard
          label="Tracked balance"
          value={fmtShort(totalTrackedBalance)}
          helper="Combined balance across all tracked finance accounts."
          icon={ArrowLeftRight}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-5">
          {renderAccountGroup(
            "Bank accounts",
            "Separate your savings and current accounts so transfers and spend sources stay obvious.",
            bankAccounts,
            "No bank accounts yet. Add each savings or current account you use so transaction history stays clean."
          )}
          {renderAccountGroup(
            "Other accounts",
            "Track cash, cards, wallets, investments, and loan-style balances beside your banks.",
            otherAccounts,
            "No other account types yet. Add wallets, cash accounts, investments, or liabilities whenever you need them."
          )}
        </div>

        <div className="rounded-3xl border bg-card/70 p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 border-b pb-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Activity feed</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Income, expenses, transfers, and investments across every
                  account you track here.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <LedgerSelect
                  value={filterType}
                  onValueChange={(nextValue) =>
                    setFilterType(nextValue as TransactionFilterType)
                  }
                  emptyLabel="All types"
                  compact
                  triggerClassName="min-w-[150px]"
                >
                  {TRANSACTION_TYPE_OPTIONS.map((option) => (
                    <LedgerSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </LedgerSelectOption>
                  ))}
                </LedgerSelect>
                <LedgerSelect
                  value={filterAccount}
                  onValueChange={setFilterAccount}
                  emptyLabel="All accounts"
                  compact
                  triggerClassName="min-w-[185px]"
                >
                  {sortedAccounts.map((account) => (
                    <LedgerSelectOption
                      key={account._id}
                      value={String(account._id)}
                    >
                      {formatAccountOptionLabel(account)}
                    </LedgerSelectOption>
                  ))}
                </LedgerSelect>
                {filterType !== "" || filterAccount !== "" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType("");
                      setFilterAccount("");
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Clear filters
                  </button>
                ) : null}
              </div>
            </div>

            {activeFilterAccount ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                  Focused on {activeFilterAccount.name}
                </span>
                <span>{formatAccountTypeLabel(activeFilterAccount.type)} account</span>
                {activeFilterAccount.institution ? (
                  <span>{activeFilterAccount.institution}</span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="pt-4">
            {transactions === undefined ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={`transaction-skeleton-${index}`}
                    className="rounded-2xl border bg-card/60 p-4"
                  >
                    <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                    <div className="mt-3 h-3 w-32 animate-pulse rounded bg-muted" />
                    <div className="mt-3 h-8 w-full animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : visibleTransactions.length === 0 ? (
              <div className="rounded-3xl border border-dashed bg-card/40 px-4 py-12 text-center">
                <h4 className="text-sm font-semibold">No transactions yet</h4>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  {sortedAccounts.length === 0
                    ? "Start by adding at least one account, then log the transactions flowing through it."
                    : "Nothing matches the current filters. Clear them or add a fresh transaction to get the feed moving."}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {sortedAccounts.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => openNewAccount()}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <Landmark className="h-4 w-4" />
                      Add first account
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openNewTransaction()}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4" />
                      Add transaction
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="hidden overflow-hidden rounded-2xl border md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/35">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Account
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Date
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Amount
                        </th>
                        <th className="w-12" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visibleTransactions.map((transaction) => {
                        const presentation =
                          getTransactionPresentation(transaction);
                        const account = accountsById[String(transaction.accountId)];
                        const category = transaction.categoryId
                          ? categoriesById[String(transaction.categoryId)]
                          : undefined;
                        const PresentationIcon = presentation.icon;

                        return (
                          <tr
                            key={transaction._id}
                            className="group transition-colors hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 align-top">
                              <div className="flex items-start gap-3">
                                <div
                                  className={cn(
                                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                                    presentation.iconWrapClassName
                                  )}
                                >
                                  <PresentationIcon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium">
                                    {transaction.description}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span>{presentation.badgeLabel}</span>
                                    {transaction.merchant ? (
                                      <span>{transaction.merchant}</span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                              <p className="font-medium text-foreground">
                                {account?.name ?? "Archived account"}
                              </p>
                              <p className="mt-1">
                                {account
                                  ? formatAccountTypeLabel(account.type)
                                  : "Unavailable"}
                              </p>
                            </td>
                            <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                              {category ? `${category.icon} ${category.name}` : "-"}
                            </td>
                            <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                              {transaction.date}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3 text-right align-top font-semibold",
                                presentation.amountClassName
                              )}
                            >
                              {presentation.prefix}
                              {fmt(transaction.amount)}
                            </td>
                            <td className="px-2 py-3 align-top">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteTransaction(transaction)
                                }
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 opacity-0 transition-all hover:bg-red-500/10 group-hover:opacity-100"
                                aria-label={`Delete ${transaction.description}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {visibleTransactions.map((transaction) => {
                    const presentation = getTransactionPresentation(transaction);
                    const account = accountsById[String(transaction.accountId)];
                    const category = transaction.categoryId
                      ? categoriesById[String(transaction.categoryId)]
                      : undefined;
                    const PresentationIcon = presentation.icon;

                    return (
                      <div
                        key={transaction._id}
                        className="rounded-2xl border bg-card/60 p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                              presentation.iconWrapClassName
                            )}
                          >
                            <PresentationIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">
                                  {transaction.description}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {transaction.date}
                                </p>
                              </div>
                              <p
                                className={cn(
                                  "text-sm font-semibold",
                                  presentation.amountClassName
                                )}
                              >
                                {presentation.prefix}
                                {fmt(transaction.amount)}
                              </p>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full bg-muted px-2.5 py-1">
                                {presentation.badgeLabel}
                              </span>
                              <span>{account?.name ?? "Archived account"}</span>
                              {category ? (
                                <span>{`${category.icon} ${category.name}`}</span>
                              ) : null}
                              {transaction.merchant ? (
                                <span>{transaction.merchant}</span>
                              ) : null}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleDeleteTransaction(transaction)}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-red-500 transition-colors hover:bg-red-500/10"
                            aria-label={`Delete ${transaction.description}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={showAccountModal}
        onClose={() => {
          setShowAccountModal(false);
          setEditingAccountId(null);
        }}
        title={editingAccountId ? "Edit account" : "Add account"}
      >
        <form onSubmit={handleAccountSubmit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Account name" required>
              <input
                value={accountForm.name}
                onChange={(event) =>
                  setAccountForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="HDFC salary account"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Account type" required>
              <LedgerSelect
                value={accountForm.type}
                onValueChange={(nextValue) =>
                  setAccountForm((current) => ({
                    ...current,
                    type: nextValue as AccountTypeValue,
                  }))
                }
                required
              >
                {ACCOUNT_TYPE_OPTIONS.map((option) => (
                  <LedgerSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </LedgerSelectOption>
                ))}
              </LedgerSelect>
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Current balance"
              required
              helper="Use a negative balance for liabilities such as loan or credit accounts."
            >
              <input
                type="number"
                step="0.01"
                value={accountForm.balance}
                onChange={(event) =>
                  setAccountForm((current) => ({
                    ...current,
                    balance: event.target.value,
                  }))
                }
                placeholder="0.00"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Institution">
              <input
                value={accountForm.institution}
                onChange={(event) =>
                  setAccountForm((current) => ({
                    ...current,
                    institution: event.target.value,
                  }))
                }
                placeholder="Bank or provider name"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Currency" helper="Defaults to INR if left unchanged.">
              <input
                value={accountForm.currency}
                onChange={(event) =>
                  setAccountForm((current) => ({
                    ...current,
                    currency: event.target.value.toUpperCase().slice(0, 3),
                  }))
                }
                placeholder="INR"
                className={inputCls}
                maxLength={3}
              />
            </Field>
            <Field
              label="Last 4 digits"
              helper="Helpful for distinguishing multiple accounts from the same bank."
            >
              <input
                value={accountForm.accountNumberLast4}
                onChange={(event) =>
                  setAccountForm((current) => ({
                    ...current,
                    accountNumberLast4: sanitizeLastFourDigits(
                      event.target.value
                    ),
                  }))
                }
                placeholder="1234"
                className={inputCls}
                inputMode="numeric"
              />
            </Field>
          </div>

          <Field
            label="Notes"
            helper={getAccountTypeMeta(accountForm.type).helper}
          >
            <textarea
              value={accountForm.notes}
              onChange={(event) =>
                setAccountForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Context, purpose, or who this account is for."
              className={textareaCls}
            />
          </Field>

          <SaveBtn
            loading={savingAccount}
            label={editingAccountId ? "Update account" : "Create account"}
          />
        </form>
      </Modal>

      <Modal
        open={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        title="Add transaction"
      >
        <form onSubmit={handleTransactionSubmit} className="space-y-4">
          <Field label="Transaction type" required>
            <LedgerSelect
              value={transactionForm.type}
              onValueChange={handleTransactionTypeChange}
              required
            >
              {TRANSACTION_TYPE_OPTIONS.map((option) => (
                <LedgerSelectOption key={option.value} value={option.value}>
                  {option.label}
                </LedgerSelectOption>
              ))}
            </LedgerSelect>
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Account" required>
              <LedgerSelect
                value={transactionForm.accountId}
                onValueChange={(nextValue) =>
                  setTransactionForm((current) => ({
                    ...current,
                    accountId: nextValue,
                    toAccountId:
                      nextValue === current.toAccountId ? "" : current.toAccountId,
                  }))
                }
                placeholder="Select account"
                required
              >
                {sortedAccounts.map((account) => (
                  <LedgerSelectOption
                    key={account._id}
                    value={String(account._id)}
                  >
                    {formatAccountOptionLabel(account)}
                  </LedgerSelectOption>
                ))}
              </LedgerSelect>
            </Field>

            {transactionForm.type === "transfer" ? (
              <Field label="Destination account" required>
                <LedgerSelect
                  value={transactionForm.toAccountId}
                  onValueChange={(nextValue) =>
                    setTransactionForm((current) => ({
                      ...current,
                      toAccountId: nextValue,
                    }))
                  }
                  placeholder="Select destination"
                  required
                >
                  {transferDestinationAccounts.map((account) => (
                    <LedgerSelectOption
                      key={account._id}
                      value={String(account._id)}
                    >
                      {formatAccountOptionLabel(account)}
                    </LedgerSelectOption>
                  ))}
                </LedgerSelect>
              </Field>
            ) : (
              <Field label="Amount" required>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                  className={inputCls}
                  required
                />
              </Field>
            )}
          </div>

          {transactionForm.type === "transfer" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Amount" required>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="Link credit card payment">
                <LedgerSelect
                  value={transactionForm.linkedCreditCardId}
                  onValueChange={(nextValue) =>
                    setTransactionForm((current) => ({
                      ...current,
                      linkedCreditCardId: nextValue,
                    }))
                  }
                  emptyLabel="No linked card"
                >
                  {(creditCards ?? []).map((card: FinanceCreditCard) => (
                    <LedgerSelectOption key={card._id} value={String(card._id)}>
                      {`${card.issuer}${card.cardName ? ` - ${card.cardName}` : ""}${
                        card.lastFour ? ` - xx${card.lastFour}` : ""
                      }`}
                    </LedgerSelectOption>
                  ))}
                </LedgerSelect>
              </Field>
            </div>
          ) : null}

          <Field label="Description" required>
            <input
              value={transactionForm.description}
              onChange={(event) =>
                setTransactionForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Rent, salary, groceries, transfer to savings..."
              className={inputCls}
              required
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Date" required>
              <input
                type="date"
                value={transactionForm.date}
                onChange={(event) =>
                  setTransactionForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                className={inputCls}
                required
              />
            </Field>
            {transactionForm.type === "transfer" ? (
              <Field
                label="Tags"
                helper="Optional comma-separated tags for later search."
              >
                <input
                  value={transactionForm.tags}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      tags: event.target.value,
                    }))
                  }
                  placeholder="salary, sweep, emergency fund"
                  className={inputCls}
                />
              </Field>
            ) : (
              <Field label="Category">
                <LedgerSelect
                  value={transactionForm.categoryId}
                  onValueChange={(nextValue) =>
                    setTransactionForm((current) => ({
                      ...current,
                      categoryId: nextValue,
                    }))
                  }
                  emptyLabel="No category"
                >
                  {filteredCategories.map((category) => (
                    <LedgerSelectOption
                      key={category._id}
                      value={String(category._id)}
                    >
                      {`${category.icon} ${category.name}`}
                    </LedgerSelectOption>
                  ))}
                </LedgerSelect>
              </Field>
            )}
          </div>

          {transactionForm.type !== "transfer" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Merchant / Payee">
                <input
                  value={transactionForm.merchant}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      merchant: event.target.value,
                    }))
                  }
                  placeholder="Optional counterparty"
                  className={inputCls}
                />
              </Field>
              <Field
                label="Tags"
                helper="Optional comma-separated tags for search and reporting."
              >
                <input
                  value={transactionForm.tags}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      tags: event.target.value,
                    }))
                  }
                  placeholder="recurring, household, reimbursable"
                  className={inputCls}
                />
              </Field>
            </div>
          ) : null}

          <Field label="Notes">
            <textarea
              value={transactionForm.notes}
              onChange={(event) =>
                setTransactionForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Anything you want to remember about this movement."
              className={textareaCls}
            />
          </Field>

          <SaveBtn
            loading={savingTransaction}
            label={
              transactionForm.type === "transfer"
                ? "Record transfer"
                : "Save transaction"
            }
          />
        </form>
      </Modal>
    </div>
  );
}
