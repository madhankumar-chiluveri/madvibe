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
import { CheckSquare, Square, Calendar, Bell, Trash2, Plus, Clock } from "lucide-react";
import { PremiumDateTimePicker } from "@/components/ui/premium-date-time-picker";
import { cn } from "@/lib/utils";

interface ChecklistTabProps {
  vehicleId: Id<"garageVehicles">;
  currentOdometer: number;
  openLogModal: boolean;
  setOpenLogModal: (open: boolean) => void;
}

const CHECKLIST_TYPES = [
  { value: "routine", label: "Routine Maintenance ⚙️" },
  { value: "issue", label: "Fix Known Issue ⚠️" },
  { value: "upgrade", label: "Upgrade / Mod 🚀" },
] as const;

export function ChecklistTab({
  vehicleId,
  currentOdometer,
  openLogModal,
  setOpenLogModal,
}: ChecklistTabProps) {
  const checklist = useQuery(api.garage.listMaintenanceItems, { vehicleId });
  const createItem = useMutation(api.garage.createMaintenanceItem);
  const completeItem = useMutation(api.garage.completeMaintenanceItem);
  const deleteItem = useMutation(api.garage.deleteMaintenanceItem);

  // Form State
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState("");
  const [type, setType] = useState<typeof CHECKLIST_TYPES[number]["value"]>("routine");
  const [intervalKm, setIntervalKm] = useState("");
  const [intervalDays, setIntervalDays] = useState("");
  const [dueOdometer, setDueOdometer] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [setPushReminder, setSetPushReminder] = useState(false);

  const resetForm = () => {
    setItem("");
    setType("routine");
    setIntervalKm("");
    setIntervalDays("");
    setDueOdometer("");
    setDueDate("");
    setSetPushReminder(false);
  };

  const handleComplete = async (id: Id<"garageMaintenanceItems">) => {
    try {
      await completeItem({
        id,
        completedOdometer: currentOdometer,
      });
      toast.success("Maintenance item completed!");
    } catch (err) {
      toast.error("Failed to complete checklist item");
    }
  };

  const handleDelete = async (id: Id<"garageMaintenanceItems">) => {
    if (confirm("Are you sure you want to delete this checklist item? If a push reminder is linked, it will also be cancelled.")) {
      try {
        await deleteItem({ id });
        toast.success("Item deleted");
      } catch (err) {
        toast.error("Failed to delete item");
      }
    }
  };

  const handleSubmit = async () => {
    if (!item.trim()) {
      toast.error("Task / Maintenance description is required");
      return;
    }

    setLoading(true);
    try {
      await createItem({
        vehicleId,
        item,
        type,
        intervalKm: intervalKm.trim() ? Number(intervalKm) : undefined,
        intervalDays: intervalDays.trim() ? Number(intervalDays) : undefined,
        dueOdometer: dueOdometer.trim() ? Number(dueOdometer) : undefined,
        dueDate: dueDate.trim() ? dueDate : undefined,
        setPushReminder: dueDate.trim() ? setPushReminder : undefined,
      });

      toast.success("Checklist task added!");
      resetForm();
      setOpenLogModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create checklist task");
    } finally {
      setLoading(false);
    }
  };

  const now = Date.now();

  const activeItems = (checklist ?? []).filter((i: any) => !i.isCompleted);
  const completedItems = (checklist ?? []).filter((i: any) => i.isCompleted);

  // Divide active items into Overdue and Upcoming
  const overdueItems = activeItems.filter(
    (i: any) =>
      (i.dueOdometer !== undefined && currentOdometer >= i.dueOdometer) ||
      (i.dueDate !== undefined && new Date(i.dueDate).getTime() < now)
  );
  
  const upcomingItems = activeItems.filter(
    (i: any) => !overdueItems.some((ov: any) => ov._id === i._id)
  );

  return (
    <div className="space-y-6">
      {/* Active Overdue */}
      {overdueItems.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-notion-red-text uppercase tracking-[0.15em] px-1 flex items-center gap-1.5 animate-pulse">
            🚨 Overdue Tasks
          </h4>
          <div className="space-y-2.5">
            {overdueItems.map((task: any) => (
              <div key={task._id} className="bg-card border border-notion-red-text/20 bg-notion-red-bg/5 rounded-xl p-4 shadow-sm flex items-center justify-between group">
                <div className="flex gap-3 items-center min-w-0">
                  <button
                    onClick={() => handleComplete(task._id)}
                    className="text-notion-red-text shrink-0 hover:scale-105 active:scale-95 transition-transform"
                    title="Mark Done"
                  >
                    <Square className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-foreground block truncate">
                      {task.item}
                    </span>
                    <span className="text-[10px] font-semibold text-notion-red-text flex flex-wrap items-center gap-2 mt-0.5">
                      {task.dueOdometer !== undefined && `Due: ${task.dueOdometer.toLocaleString()} km (overdue by ${(currentOdometer - task.dueOdometer).toLocaleString()} km)`}
                      {task.dueDate !== undefined && `Due: ${new Date(task.dueDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}`}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(task._id)}
                  className="h-9 w-9 text-destructive/70 hover:text-destructive hover:bg-[var(--notion-gray-bg)] rounded-lg md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming tasks */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-1">
          ⏳ Upcoming Checklist Tasks
        </h4>
        {activeItems.length === 0 ? (
          <div className="border border-dashed border-border/60 rounded-xl p-8 text-center bg-card/20 space-y-3">
            <CheckSquare className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">All checklist items are completed!</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Add routine items like &ldquo;Clean and lube chain&rdquo; or custom modifications.
            </p>
            <Button size="sm" onClick={() => setOpenLogModal(true)} className="rounded-xl mt-2">
              Add Task
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingItems.map((task: any) => (
              <div key={task._id} className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex items-center justify-between group">
                <div className="flex gap-3 items-center min-w-0">
                  <button
                    onClick={() => handleComplete(task._id)}
                    className="text-muted-foreground hover:text-primary shrink-0 hover:scale-105 active:scale-95 transition-transform"
                    title="Mark Done"
                  >
                    <Square className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-foreground block truncate">
                      {task.item}
                    </span>
                    <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground mt-0.5 flex-wrap">
                      <span className="capitalize">{task.type}</span>
                      {task.dueOdometer !== undefined && (
                        <>
                          <span>•</span>
                          <span>Due: {task.dueOdometer.toLocaleString()} km (in {(task.dueOdometer - currentOdometer).toLocaleString()} km)</span>
                        </>
                      )}
                      {task.dueDate !== undefined && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                          </span>
                        </>
                      )}
                      {task.linkedReminderId && (
                        <>
                          <span>•</span>
                          <span className="text-primary flex items-center gap-0.5">
                            <Bell className="h-3 w-3" /> Push set
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(task._id)}
                  className="h-9 w-9 text-destructive/70 hover:text-destructive hover:bg-[var(--notion-gray-bg)] rounded-lg md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed items (collapsible) */}
      {completedItems.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-1">
            ✅ Completed Tasks
          </h4>
          <div className="space-y-2 opacity-65">
            {completedItems.map((task: any) => (
              <div key={task._id} className="bg-card border border-border/60 bg-[var(--notion-gray-bg)] rounded-xl p-3 flex items-center justify-between group">
                <div className="flex gap-3 items-center min-w-0">
                  <CheckSquare className="h-5 w-5 text-notion-green-text shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-muted-foreground block line-through truncate">
                      {task.item}
                    </span>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                      {task.completedOdometer && <span>Done at {task.completedOdometer.toLocaleString()} km</span>}
                      {task.completedAt && (
                        <>
                          <span>•</span>
                          <span>Done: {new Date(task.completedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(task._id)}
                  className="h-9 w-9 text-destructive/70 hover:text-destructive hover:bg-[var(--notion-gray-bg)] rounded-lg md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Maintenance task Dialog */}
      <Dialog open={openLogModal} onOpenChange={(v) => { if (!v) { resetForm(); setOpenLogModal(false); } }}>
        <DialogContent className="max-w-md rounded-2xl border border-border/60 bg-card p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Clock className="h-5 w-5 text-primary" />
              Log Checklist Task
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a routine check, scheduled lubrication, safety task, or upgrade work.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Description *</label>
              <Input
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="Clean and lube chain"
                className="rounded-xl border-border/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Category *</label>
              <Select value={type} onValueChange={(val: any) => setType(val)}>
                <SelectTrigger className="rounded-xl border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {CHECKLIST_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due at km reading</label>
                <Input
                  type="number"
                  value={dueOdometer}
                  onChange={(e) => setDueOdometer(e.target.value)}
                  placeholder="e.g. 13000"
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due by Date</label>
                <PremiumDateTimePicker
                  value={(() => {
                    if (!dueDate) return null;
                    const parts = dueDate.split("-");
                    if (parts.length !== 3) return null;
                    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
                  })()}
                  onChange={(ms) => {
                    if (ms === null) {
                      setDueDate("");
                    } else {
                      const dateObj = new Date(ms);
                      const yyyy = dateObj.getFullYear();
                      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
                      const dd = String(dateObj.getDate()).padStart(2, "0");
                      setDueDate(`${yyyy}-${mm}-${dd}`);
                    }
                  }}
                  variant="input"
                  placeholder="Select due date"
                  className="w-full rounded-xl border-border/60 h-10"
                />
              </div>
            </div>

            {/* Recurring details */}
            <div className="rounded-2xl border border-border/60 p-4 bg-[var(--notion-gray-bg)] space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                🔄 Recurring Intervals (Auto-Respawn)
              </span>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                When completed, a new checklist item will auto-create at the completed point + intervals entered below.
              </p>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 pt-1 border-t border-border/40">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Repeat every N km</label>
                  <Input
                    type="number"
                    value={intervalKm}
                    onChange={(e) => setIntervalKm(e.target.value)}
                    placeholder="e.g. 500"
                    className="rounded-xl border-border/60 bg-background text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Repeat every N days</label>
                  <Input
                    type="number"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(e.target.value)}
                    placeholder="e.g. 30"
                    className="rounded-xl border-border/60 bg-background text-xs"
                  />
                </div>
              </div>
            </div>

            {dueDate.trim() && (
              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  id="setPushReminder"
                  checked={setPushReminder}
                  onChange={(e) => setSetPushReminder(e.target.checked)}
                  className="h-5 w-5 rounded border-border/60 text-primary cursor-pointer"
                />
                <label htmlFor="setPushReminder" className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                  Set live push notification reminder for the due date
                </label>
              </div>
            )}
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
              {loading ? "Adding..." : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
