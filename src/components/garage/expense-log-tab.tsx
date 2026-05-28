import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
} from "recharts";
import { Calendar, DollarSign, Fuel, Filter, Trash2, ArrowUpRight } from "lucide-react";
import { PremiumDateTimePicker } from "@/components/ui/premium-date-time-picker";
import { cn } from "@/lib/utils";

interface ExpenseLogTabProps {
  vehicleId: Id<"garageVehicles">;
  currentOdometer: number;
  openLogModal: boolean;
  setOpenLogModal: (open: boolean) => void;
}

const EXPENSE_TYPES = [
  { value: "fuel", label: "Fuel Fill-up ⛽" },
  { value: "ev_charging", label: "EV Charging ⚡🔌" },
  { value: "insurance", label: "Insurance Renewal 🛡️" },
  { value: "toll", label: "Toll Gate 🛣️" },
  { value: "parking", label: "Parking Fees 🅿️" },
  { value: "accessory", label: "Accessories 🎒" },
  { value: "modification", label: "Modifications 🛠️" },
  { value: "fine", label: "Challan / Fine 🚨" },
  { value: "washing", label: "Washing / Detailing 🧼" },
  { value: "other", label: "Other Running Cost 💰" },
] as const;

export function ExpenseLogTab({
  vehicleId,
  currentOdometer,
  openLogModal,
  setOpenLogModal,
}: ExpenseLogTabProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const expenseLogs = useQuery(api.garage.listExpenseLogs, {
    vehicleId,
    type: filterType === "all" ? undefined : (filterType as any),
  });

  const createExpenseLog = useMutation(api.garage.createExpenseLog);
  const deleteExpenseLog = useMutation(api.garage.deleteExpenseLog);

  const fuelEfficiency = useQuery(api.garage.getFuelEfficiency, { vehicleId });
  const costHistory = useQuery(api.garage.getCostHistory, { vehicleId }) ?? [];

  // Financial ledger queries
  const ledgerAccounts = useQuery(api.ledger.listAccounts) ?? [];
  const ledgerCategories = useQuery(api.ledger.listCategories, { type: "expense" }) ?? [];

  // Form State
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<typeof EXPENSE_TYPES[number]["value"]>("fuel");
  const [amount, setAmount] = useState("");
  const [odometer, setOdometer] = useState(String(currentOdometer));
  const [quantity, setQuantity] = useState(""); // Liters or kWh
  const [isFullTank, setIsFullTank] = useState(true);
  const [notes, setNotes] = useState("");

  // Ledger integration state
  const [syncToLedger, setSyncToLedger] = useState(false);
  const [ledgerAccountId, setLedgerAccountId] = useState("");
  const [ledgerCategoryId, setLedgerCategoryId] = useState("");

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setType("fuel");
    setAmount("");
    setOdometer(String(currentOdometer));
    setQuantity("");
    setIsFullTank(true);
    setNotes("");
    setSyncToLedger(false);
    setLedgerAccountId("");
    setLedgerCategoryId("");
  };

  const handleTypeChange = (val: typeof type) => {
    setType(val);
    if (val !== "fuel" && val !== "ev_charging") {
      setQuantity("");
      setIsFullTank(false);
    } else {
      setIsFullTank(true);
    }
  };

  const handleSubmit = async () => {
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Valid amount is required");
      return;
    }

    if (odometer.trim() && (isNaN(Number(odometer)) || Number(odometer) < currentOdometer)) {
      toast.error(`Odometer reading must be at least ${currentOdometer} km`);
      return;
    }

    if (syncToLedger && !ledgerAccountId) {
      toast.error("Please select a Ledger Account to sync with");
      return;
    }

    setLoading(true);
    try {
      const pricePerUnit = quantity && amount ? Number(amount) / Number(quantity) : undefined;

      await createExpenseLog({
        vehicleId,
        date,
        type,
        amount: Number(amount),
        odometer: odometer.trim() ? Number(odometer) : undefined,
        quantity: quantity.trim() ? Number(quantity) : undefined,
        pricePerUnit,
        fuelType: type === "fuel" ? "petrol" : type === "ev_charging" ? "ev" : undefined,
        isFullTank: type === "fuel" || type === "ev_charging" ? isFullTank : undefined,
        notes: notes ? notes : undefined,
        syncToLedger,
        ledgerAccountId: ledgerAccountId ? (ledgerAccountId as Id<"financeAccounts">) : undefined,
        ledgerCategoryId: ledgerCategoryId ? (ledgerCategoryId as Id<"financeCategories">) : undefined,
      });

      toast.success("Expense logged!");
      resetForm();
      setOpenLogModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to log expense");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: Id<"garageExpenseLogs">) => {
    if (confirm("Are you sure you want to delete this expense record? If it was synced to Ledger, the expense transaction will also be deleted.")) {
      try {
        await deleteExpenseLog({ id });
        toast.success("Expense record deleted");
      } catch (err) {
        toast.error("Failed to delete record");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 2-Column charts and summaries */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Cost Summary Chart */}
        <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm md:col-span-2 space-y-4">
          <h4 className="text-xs font-bold text-foreground uppercase border-b border-border/40 pb-2 tracking-wider">
            📊 Monthly Running Costs (Stacked)
          </h4>
          <div className="h-44 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costHistory}>
                <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <ChartTooltip
                  cursor={{ fill: "rgba(0,0,0,0.02)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border/60 rounded-xl p-3 shadow-lg text-xs space-y-1">
                          <p className="font-bold text-foreground">{data.month}</p>
                          <p className="text-notion-green-text">Fuel: ₹{data.fuel.toLocaleString()}</p>
                          <p className="text-notion-blue-text">Service: ₹{data.service.toLocaleString()}</p>
                          <p className="text-muted-foreground">Other: ₹{data.other.toLocaleString()}</p>
                          <p className="border-t border-border/40 pt-1 font-bold text-foreground">
                            Total: ₹{(data.fuel + data.service + data.other).toLocaleString()}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="fuel" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="service" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="other" stackId="a" fill="#a1a1aa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fuel summary cockpit card */}
        <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm flex flex-col justify-between h-56 md:h-auto">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Cockpit Insights
            </span>
            <h4 className="text-sm font-bold text-foreground">⛽ Fuel Analysis</h4>
          </div>

          <div className="space-y-3 my-4">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Average efficiency</span>
              <span className="text-xl font-extrabold text-foreground font-mono">
                {fuelEfficiency?.averageEfficiency ? `${fuelEfficiency.averageEfficiency} km/L` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-baseline border-t border-border/40 pt-2">
              <span className="text-xs text-muted-foreground">Latest fill-up trend</span>
              <span className={cn(
                "text-xs font-bold font-mono",
                (fuelEfficiency?.trend ?? 0) > 0
                  ? "text-notion-green-text"
                  : (fuelEfficiency?.trend ?? 0) < 0
                    ? "text-notion-red-text"
                    : "text-muted-foreground"
              )}>
                {fuelEfficiency?.trend && fuelEfficiency.trend !== 0
                  ? `${fuelEfficiency.trend > 0 ? "↑" : "↓"} ${Math.abs(fuelEfficiency.trend)} km/L`
                  : "Steady"}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--notion-gray-bg)] border border-border/40 p-2.5 text-[10px] text-muted-foreground leading-relaxed">
            💡 Full tank method maps your exact odometer variance across fill-ups to guarantee true real-world efficiency.
          </div>
        </div>
      </div>

      {/* Filter and list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Expense Logging Audit Trail
          </h3>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 text-xs rounded-lg border-border/60 w-36">
                <SelectValue placeholder="All Expenses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs">All Cost Types</SelectItem>
                {EXPENSE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label.split(" ")[0]} {t.label.replace(/[^a-zA-Z\s/-]/g, "").trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Expenses list */}
        <div className="space-y-3">
          {expenseLogs === undefined ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="skeleton-shimmer h-20 rounded-xl" />
              ))}
            </div>
          ) : expenseLogs.length === 0 ? (
            <div className="border border-dashed border-border/60 rounded-xl p-8 text-center bg-card/20 space-y-2">
              <Fuel className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">No expenses logged yet</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Log fuel fill-ups, charging, tolls, fine tickets, washing or custom parts.
              </p>
            </div>
          ) : (
            expenseLogs.map((log: any) => (
            <div key={log._id} className="bg-card border border-border/60 rounded-xl p-4 shadow-sm relative group flex justify-between items-center">
                <div className="flex gap-3 items-center min-w-0">
                  <span className="text-xl shrink-0 p-1.5 bg-[var(--notion-gray-bg)] rounded-xl border border-border/40">
                    {log.type === "fuel" ? "⛽" : log.type === "ev_charging" ? "⚡" : log.type === "insurance" ? "🛡️" : log.type === "toll" ? "🛣️" : "💰"}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground capitalize">
                        {log.type.replace("_", " ")}
                      </span>
                      {log.isFullTank && (
                        <span className="text-[9px] bg-notion-green-bg border border-notion-green-text/20 text-notion-green-text font-bold px-1.5 py-0.2 rounded">
                          Full Tank
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 font-medium flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </span>
                      {log.odometer !== undefined && (
                        <>
                          <span>•</span>
                          <span>⊙ {log.odometer.toLocaleString()} km</span>
                        </>
                      )}
                      {log.quantity !== undefined && (
                        <>
                          <span>•</span>
                          <span>
                            {log.quantity} {log.type === "ev_charging" ? "kWh" : "L"}
                            {log.pricePerUnit !== undefined && ` @ ₹${log.pricePerUnit.toFixed(1)}/unit`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-foreground font-mono">
                      ₹{log.amount.toLocaleString()}
                    </span>
                    {log.linkedTransactionId && (
                      <span className="text-[9px] text-notion-green-text font-bold flex items-center gap-0.5 justify-end">
                        <ArrowUpRight className="h-2.5 w-2.5" /> Synced
                      </span>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(log._id)}
                    className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-[var(--notion-gray-bg)] rounded-lg md:opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
            </div>
          ))
          )}
        </div>
      </div>

      {/* Add Cost Dialog Form */}
      <Dialog open={openLogModal} onOpenChange={(v) => { if (!v) { resetForm(); setOpenLogModal(false); } }}>
        <DialogContent className="max-w-md rounded-2xl border border-border/60 bg-card p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <DollarSign className="h-5 w-5 text-primary" />
              Log Vehicle Cost
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a fuel fill-up, toll fee, parking charge, accessory, or service ticket.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expense Type *</label>
              <Select value={type} onValueChange={(val: any) => handleTypeChange(val)}>
                <SelectTrigger className="rounded-xl border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {EXPENSE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date *</label>
                <PremiumDateTimePicker
                  value={(() => {
                    if (!date) return null;
                    const parts = date.split("-");
                    if (parts.length !== 3) return null;
                    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
                  })()}
                  onChange={(ms) => {
                    if (ms === null) {
                      setDate("");
                    } else {
                      const dateObj = new Date(ms);
                      const yyyy = dateObj.getFullYear();
                      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
                      const dd = String(dateObj.getDate()).padStart(2, "0");
                      setDate(`${yyyy}-${mm}-${dd}`);
                    }
                  }}
                  variant="input"
                  placeholder="Select transaction date"
                  className="w-full rounded-xl border-border/60 h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount (INR) *</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="₹850"
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Odometer (km)</label>
                <Input
                  type="number"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="Optional"
                  className="rounded-xl border-border/60"
                />
              </div>
              {(type === "fuel" || type === "ev_charging") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {type === "ev_charging" ? "Energy (kWh)" : "Quantity (Liters)"}
                  </label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="9.5"
                    className="rounded-xl border-border/60"
                  />
                </div>
              )}
            </div>

            {(type === "fuel" || type === "ev_charging") && (
              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  id="isFullTank"
                  checked={isFullTank}
                  onChange={(e) => setIsFullTank(e.target.checked)}
                  className="h-4 w-4 rounded border-border/60 text-primary cursor-pointer"
                />
                <label htmlFor="isFullTank" className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                  Check this if fuel fill-up represents a Full Tank (required for mileage calculations)
                </label>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Indian Oil Petrol Pump, NH4"
                className="rounded-xl border-border/60"
              />
            </div>

            {/* Financial ledger sync section */}
            <div className="border border-border/60 rounded-2xl p-4 bg-[var(--notion-gray-bg)] space-y-4">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="syncCostToLedger"
                  checked={syncToLedger}
                  onChange={(e) => setSyncToLedger(e.target.checked)}
                  className="h-4 w-4 rounded border-border/60 text-primary cursor-pointer"
                />
                <label htmlFor="syncCostToLedger" className="text-xs font-bold uppercase tracking-wider text-foreground cursor-pointer select-none">
                  💼 Auto Sync with Finance Ledger
                </label>
              </div>

              {syncToLedger && (
                <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/40">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Debit Account *</label>
                    <Select value={ledgerAccountId} onValueChange={setLedgerAccountId}>
                      <SelectTrigger className="rounded-xl border-border/60 bg-background text-xs">
                        <SelectValue placeholder="Select Bank Account" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {ledgerAccounts.map((acc: any) => (
                          <SelectItem key={acc._id} value={acc._id} className="text-xs">
                            {acc.name} (₹{acc.balance.toLocaleString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Ledger Category</label>
                    <Select value={ledgerCategoryId} onValueChange={setLedgerCategoryId}>
                      <SelectTrigger className="rounded-xl border-border/60 bg-background text-xs">
                        <SelectValue placeholder="Select Category (optional)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {ledgerCategories.map((cat: any) => (
                          <SelectItem key={cat._id} value={cat._id} className="text-xs">
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/60 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { resetForm(); setOpenLogModal(false); }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-xl"
            >
              {loading ? "Logging..." : "Log Cost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
