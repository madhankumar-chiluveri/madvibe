import { useAppStore } from "@/store/app.store";
import { Button } from "@/components/ui/button";
import { OdometerPopover } from "./odometer-popover";
import { ArrowLeft, Plus, Settings2, Trash2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

interface VehicleDetailHeaderProps {
  vehicle: {
    _id: Id<"garageVehicles">;
    name: string;
    nickname?: string;
    type: string;
    icon?: string;
    registrationNumber?: string;
    currentOdometer: number;
    color?: string;
    modelYear?: number;
  };
  stats?: {
    costPerKm: number;
    status: "Healthy" | "Service Due" | "Overdue";
    daysUntilInsurance: number | null;
    daysUntilPuc: number | null;
    daysUntilWarranty: number | null;
    totalCost: number;
  };
  onLogService: () => void;
  onLogExpense: () => void;
  onEditSpecs: () => void;
}

export function VehicleDetailHeader({
  vehicle,
  stats,
  onLogService,
  onLogExpense,
  onEditSpecs,
}: VehicleDetailHeaderProps) {
  const setSelectedVehicleId = useAppStore((state) => state.setSelectedVehicleId);
  const archiveVehicle = useMutation(api.garage.archiveVehicle);

  const handleArchive = async () => {
    if (confirm("Are you sure you want to archive this vehicle? It will hide it from your active garage bay.")) {
      try {
        await archiveVehicle({ id: vehicle._id });
        toast.success("Vehicle archived");
        setSelectedVehicleId(null);
      } catch (err) {
        toast.error("Failed to archive vehicle");
      }
    }
  };

  const status = stats?.status ?? "Healthy";
  const costPerKm = stats?.costPerKm ?? 0;

  const statusColors = {
    Healthy: "bg-notion-green-bg text-notion-green-text border-notion-green-text/20",
    "Service Due": "bg-notion-yellow-bg text-notion-yellow-text border-notion-yellow-text/20",
    Overdue: "bg-notion-red-bg text-notion-red-text border-notion-red-text/20",
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Back and Vehicle Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedVehicleId(null)}
            className="h-10 w-10 shrink-0 rounded-xl hover:bg-[var(--notion-gray-bg)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl shrink-0 select-none p-1.5 bg-[var(--notion-gray-bg)] rounded-xl border border-border/40">
              {vehicle.icon ?? "🏍️"}
            </span>
            <div className="min-w-0 space-y-0.5">
              <h2 className="text-lg font-bold text-foreground leading-tight truncate">
                {vehicle.name}
              </h2>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {vehicle.nickname && (
                  <span className="text-muted-foreground font-semibold">
                    &ldquo;{vehicle.nickname}&rdquo;
                  </span>
                )}
                <span className="text-muted-foreground font-mono uppercase">
                  {vehicle.registrationNumber ?? "NO REG NUMBER"}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-border/80" />
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", statusColors[status])}>
                  {status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions bar */}
        <div className="flex flex-wrap items-center gap-2 pb-1 md:flex-nowrap md:pb-0 shrink-0">
          <OdometerPopover
            vehicleId={vehicle._id}
            currentOdometer={vehicle.currentOdometer}
            trigger={
              <Button
                variant="outline"
                className="h-9 text-xs rounded-xl border-border/60 hover:bg-[var(--notion-gray-bg)] shrink-0 gap-1.5"
              >
                ⊙ {vehicle.currentOdometer.toLocaleString()} km
              </Button>
            }
          />
          <Button
            size="sm"
            onClick={onLogService}
            className="h-9 text-xs rounded-xl gap-1 shrink-0 bg-primary/90 text-primary-foreground hover:bg-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Log Service
          </Button>
          <Button
            size="sm"
            onClick={onLogExpense}
            variant="outline"
            className="h-9 text-xs rounded-xl gap-1 shrink-0 border-border/60 hover:bg-[var(--notion-gray-bg)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Log Expense
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={onEditSpecs}
            className="h-9 w-9 shrink-0 rounded-xl border border-border/60 hover:bg-[var(--notion-gray-bg)]"
            title="Edit Specs"
          >
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleArchive}
            className="h-9 w-9 shrink-0 rounded-xl border border-border/60 text-destructive/80 hover:text-destructive hover:bg-[var(--notion-gray-bg)]"
            title="Archive Vehicle"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mini Specs overview at the bottom of header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border/40 text-xs">
        <div className="space-y-1">
          <span className="text-muted-foreground block font-medium">Type</span>
          <span className="font-semibold text-foreground uppercase tracking-wide">
            {vehicle.type.replace("_", " ")}
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground block font-medium">Running Cost</span>
          <span className="font-bold text-foreground font-mono">
            ₹{costPerKm.toFixed(2)}/km
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground block font-medium">Total Cost</span>
          <span className="font-bold text-foreground font-mono">
            ₹{stats?.totalCost.toLocaleString() ?? 0}
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground block font-medium">Model Year</span>
          <span className="font-semibold text-foreground">
            {vehicle.modelYear ?? "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
}
