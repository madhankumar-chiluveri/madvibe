import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar, Wrench, Trash2, ArrowUpRight, Phone, FileText } from "lucide-react";

interface ServiceLogTabProps {
  vehicleId: Id<"garageVehicles">;
  currentOdometer: number;
  openLogModal: boolean;
  setOpenLogModal: (open: boolean) => void;
}

const SERVICE_TYPES = [
  { value: "free_service", label: "Free Service" },
  { value: "paid_service", label: "Paid Service" },
  { value: "breakdown_repair", label: "Breakdown Repair" },
  { value: "accident_repair", label: "Accident Repair" },
  { value: "warranty_claim", label: "Warranty Claim" },
  { value: "custom", label: "Custom Service" },
] as const;

export function ServiceLogTab({
  vehicleId,
  currentOdometer,
  openLogModal,
  setOpenLogModal,
}: ServiceLogTabProps) {
  const serviceLogs = useQuery(api.garage.listServiceLogs, { vehicleId });
  const createServiceLog = useMutation(api.garage.createServiceLog);
  const deleteServiceLog = useMutation(api.garage.deleteServiceLog);

  // Financial ledger queries
  const ledgerAccounts = useQuery(api.ledger.listAccounts) ?? [];
  const ledgerCategories = useQuery(api.ledger.listCategories, { type: "expense" }) ?? [];

  // Form State
  const [loading, setLoading] = useState(false);
  const [serviceType, setServiceType] = useState<typeof SERVICE_TYPES[number]["value"]>("paid_service");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [odometer, setOdometer] = useState(String(currentOdometer));
  const [cost, setCost] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceProvider, setServiceProvider] = useState("");
  const [serviceProviderPhone, setServiceProviderPhone] = useState("");
  const [itemsReplacedInput, setItemsReplacedInput] = useState("");
  const [itemsReplaced, setItemsReplaced] = useState<string[]>([]);
  const [laborCost, setLaborCost] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [nextServiceOdometer, setNextServiceOdometer] = useState("");
  const [warrantyApplied, setWarrantyApplied] = useState(false);

  // Ledger integration state
  const [syncToLedger, setSyncToLedger] = useState(false);
  const [ledgerAccountId, setLedgerAccountId] = useState("");
  const [ledgerCategoryId, setLedgerCategoryId] = useState("");

  const resetForm = () => {
    setServiceType("paid_service");
    setServiceDate(new Date().toISOString().slice(0, 10));
    setOdometer(String(currentOdometer));
    setCost("");
    setTitle("");
    setDescription("");
    setServiceProvider("");
    setServiceProviderPhone("");
    setItemsReplacedInput("");
    setItemsReplaced([]);
    setLaborCost("");
    setPartsCost("");
    setReceiptUrl("");
    setNextServiceDate("");
    setNextServiceOdometer("");
    setWarrantyApplied(false);
    setSyncToLedger(false);
    setLedgerAccountId("");
    setLedgerCategoryId("");
  };

  const handleAddItem = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && itemsReplacedInput.trim()) {
      e.preventDefault();
      if (!itemsReplaced.includes(itemsReplacedInput.trim())) {
        setItemsReplaced([...itemsReplaced, itemsReplacedInput.trim()]);
      }
      setItemsReplacedInput("");
    }
  };

  const handleRemoveItem = (index: number) => {
    setItemsReplaced(itemsReplaced.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Service title is required");
      return;
    }
    if (!odometer.trim() || isNaN(Number(odometer)) || Number(odometer) < currentOdometer) {
      toast.error(`Odometer reading must be at least ${currentOdometer} km`);
      return;
    }
    if (!cost.trim() || isNaN(Number(cost)) || Number(cost) < 0) {
      toast.error("Valid service cost is required");
      return;
    }

    if (syncToLedger && !ledgerAccountId) {
      toast.error("Please select a Ledger Account to sync with");
      return;
    }

    setLoading(true);
    try {
      await createServiceLog({
        vehicleId,
        serviceType,
        serviceDate,
        odometer: Number(odometer),
        cost: Number(cost),
        title,
        description: description ? description : undefined,
        serviceProvider: serviceProvider ? serviceProvider : undefined,
        serviceProviderPhone: serviceProviderPhone ? serviceProviderPhone : undefined,
        itemsReplaced,
        laborCost: laborCost ? Number(laborCost) : undefined,
        partsCost: partsCost ? Number(partsCost) : undefined,
        receiptUrl: receiptUrl ? receiptUrl : undefined,
        nextServiceDate: nextServiceDate ? nextServiceDate : undefined,
        nextServiceOdometer: nextServiceOdometer ? Number(nextServiceOdometer) : undefined,
        warrantyApplied,
        syncToLedger,
        ledgerAccountId: ledgerAccountId ? (ledgerAccountId as Id<"financeAccounts">) : undefined,
        ledgerCategoryId: ledgerCategoryId ? (ledgerCategoryId as Id<"financeCategories">) : undefined,
      });

      toast.success("Service log created!");
      resetForm();
      setOpenLogModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to log service");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: Id<"garageServiceLogs">) => {
    if (confirm("Are you sure you want to delete this service log record? If it was synced to Ledger, the expense transaction will also be deleted.")) {
      try {
        await deleteServiceLog({ id });
        toast.success("Service record deleted");
      } catch (err) {
        toast.error("Failed to delete log");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Service log cards list */}
      <div className="space-y-4">
        {serviceLogs === undefined ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="skeleton-shimmer h-32 rounded-xl" />
            ))}
          </div>
        ) : serviceLogs.length === 0 ? (
          <div className="border border-dashed border-border/60 rounded-xl p-8 text-center bg-card/20 space-y-3">
            <Wrench className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">No service logs tracked yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Track routine service milestones, paid breakdown repairs, or warranty claims here.
            </p>
            <Button size="sm" onClick={() => setOpenLogModal(true)} className="rounded-xl mt-2">
              Log First Service
            </Button>
          </div>
        ) : (
          serviceLogs.map((log: any) => (
            <div key={log._id} className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4 relative group">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔧</span>
                    <h4 className="text-sm font-bold text-foreground leading-tight">
                      {log.title}
                    </h4>
                    <span className="text-[10px] bg-[var(--notion-gray-bg)] border border-border/40 text-muted-foreground font-semibold px-2 py-0.5 rounded-full capitalize">
                      {log.serviceType.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(log.serviceDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </span>
                    <span>•</span>
                    <span>⊙ {log.odometer.toLocaleString()} km</span>
                    {log.serviceProvider && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-foreground/80">{log.serviceProvider}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-foreground font-mono">
                      ₹{log.cost.toLocaleString()}
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

              {/* Tag items replaced list */}
              {log.itemsReplaced && log.itemsReplaced.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {log.itemsReplaced.map((item: any, idx: number) => (
                    <span
                      key={idx}
                      className="text-[10px] font-semibold bg-notion-blue-bg border border-notion-blue-text/10 text-notion-blue-text px-2 py-0.5 rounded-md"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {log.description && (
                <p className="text-xs text-muted-foreground leading-relaxed pl-1 whitespace-pre-wrap">
                  {log.description}
                </p>
              )}

              {/* Mechanic details or next due milestones */}
              {(log.nextServiceOdometer || log.nextServiceDate) && (
                <div className="bg-[var(--notion-gray-bg)] border border-border/40 rounded-xl p-3 text-xs flex flex-wrap gap-x-6 gap-y-2 items-center leading-relaxed">
                  <span className="font-semibold text-foreground/90 flex items-center gap-1.5">
                    💡 Next service target:
                  </span>
                  {log.nextServiceOdometer && (
                    <span className="font-medium">
                      Odometer: <span className="font-bold font-mono">{log.nextServiceOdometer.toLocaleString()} km</span>
                    </span>
                  )}
                  {log.nextServiceDate && (
                    <span className="font-medium">
                      Date: <span className="font-bold">{new Date(log.nextServiceDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Service Dialog Form */}
      <Dialog open={openLogModal} onOpenChange={(v) => { if (!v) { resetForm(); setOpenLogModal(false); } }}>
        <DialogContent className="max-w-2xl rounded-2xl border border-border/60 bg-card p-0 overflow-y-auto max-h-[90vh]">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Wrench className="h-5 w-5 text-primary" />
              Log Service Record
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a routine check, paid repair service, or warranty fix to audit lifecycle trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="2nd Paid Service"
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Type *</label>
                <Select value={serviceType} onValueChange={(val: any) => setServiceType(val)}>
                  <SelectTrigger className="rounded-xl border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {SERVICE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date *</label>
                <Input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Odometer reading (km) *</label>
                <Input
                  type="number"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Cost (INR) *</label>
                <Input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="2500"
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parts Cost</label>
                <Input
                  type="number"
                  value={partsCost}
                  onChange={(e) => setPartsCost(e.target.value)}
                  placeholder="1800"
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labor / Overhead Cost</label>
                <Input
                  type="number"
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)}
                  placeholder="700"
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items Replaced / Work Done</label>
              <div className="flex flex-wrap gap-1.5 mb-2 border border-border/60 rounded-xl p-2 min-h-12 bg-background">
                {itemsReplaced.map((item, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-medium bg-notion-blue-bg text-notion-blue-text px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                  >
                    {item}
                    <button type="button" onClick={() => handleRemoveItem(idx)} className="text-[10px] opacity-75 hover:opacity-100">×</button>
                  </span>
                ))}
                {itemsReplaced.length === 0 && (
                  <span className="text-xs text-muted-foreground p-1">No items added yet. Type press Enter to log tags.</span>
                )}
              </div>
              <Input
                value={itemsReplacedInput}
                onChange={(e) => setItemsReplacedInput(e.target.value)}
                onKeyDown={handleAddItem}
                placeholder="Engine Oil, Spark Plug, Air Filter (Press Enter to add)"
                className="rounded-xl border-border/60"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Station</label>
                <Input
                  value={serviceProvider}
                  onChange={(e) => setServiceProvider(e.target.value)}
                  placeholder="Royal Enfield Flagship Dealer"
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Station Phone</label>
                <Input
                  value={serviceProviderPhone}
                  onChange={(e) => setServiceProviderPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next Service Date Target</label>
                <Input
                  type="date"
                  value={nextServiceDate}
                  onChange={(e) => setNextServiceDate(e.target.value)}
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next Service km Target</label>
                <Input
                  type="number"
                  value={nextServiceOdometer}
                  onChange={(e) => setNextServiceOdometer(e.target.value)}
                  placeholder="17450"
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes & Descriptions</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mechanic mentioned brake pads are at 40% wear, should replace next service."
                className="rounded-xl border-border/60 h-20 resize-none"
              />
            </div>

            {/* Financial ledger sync section */}
            <div className="border border-border/60 rounded-2xl p-4 bg-[var(--notion-gray-bg)] space-y-4">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="syncToLedger"
                  checked={syncToLedger}
                  onChange={(e) => setSyncToLedger(e.target.checked)}
                  className="h-4 w-4 rounded border-border/60 text-primary cursor-pointer"
                />
                <label htmlFor="syncToLedger" className="text-xs font-bold uppercase tracking-wider text-foreground cursor-pointer select-none">
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
              {loading ? "Logging..." : "Log Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
