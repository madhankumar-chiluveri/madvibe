import { useAppStore } from "@/store/app.store";
import { OdometerPopover } from "./odometer-popover";
import { cn } from "@/lib/utils";
import { Calendar, Shield, Activity, DollarSign } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface VehicleCardProps {
  vehicle: {
    _id: Id<"garageVehicles">;
    name: string;
    nickname?: string;
    type: string;
    icon?: string;
    registrationNumber?: string;
    currentOdometer: number;
    color?: string;
  };
  stats?: {
    costPerKm: number;
    status: "Healthy" | "Service Due" | "Overdue";
    daysUntilInsurance: number | null;
    daysUntilPuc: number | null;
    daysUntilWarranty: number | null;
    totalCost: number;
  };
}

export function VehicleCard({ vehicle, stats }: VehicleCardProps) {
  const setSelectedVehicleId = useAppStore((state) => state.setSelectedVehicleId);

  // Status pill colors
  const statusColors = {
    Healthy: "bg-notion-green-bg text-notion-green-text border-notion-green-text/20",
    "Service Due": "bg-notion-yellow-bg text-notion-yellow-text border-notion-yellow-text/20",
    Overdue: "bg-notion-red-bg text-notion-red-text border-notion-red-text/20",
  };

  const status = stats?.status ?? "Healthy";
  const costPerKm = stats?.costPerKm ?? 0;
  const daysInsurance = stats?.daysUntilInsurance ?? null;

  return (
    <div
      onClick={() => setSelectedVehicleId(vehicle._id)}
      style={{ borderLeftColor: vehicle.color || "#3b82f6", borderLeftWidth: "4px" }}
      className={cn(
        "bg-card border border-border/60 rounded-xl p-5 cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between h-56",
        "hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out"
      )}
    >
      <div>
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-foreground leading-tight truncate max-w-[200px]">
              {vehicle.nickname ?? vehicle.name}
            </h3>
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
              {vehicle.registrationNumber ?? "NO REG NUMBER"}
            </p>
          </div>
          <span className="text-2xl shrink-0 select-none p-1 bg-[var(--notion-gray-bg)] rounded-lg">
            {vehicle.icon ?? "🏍️"}
          </span>
        </div>

        <div className="flex gap-2 mt-3 items-center flex-wrap">
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", statusColors[status])}>
            {status}
          </span>
          <span className="text-[10px] bg-muted/60 text-muted-foreground font-medium px-2 py-0.5 rounded-full border border-border/40">
            {vehicle.type.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="space-y-2 mt-4 pt-3 border-t border-border/40 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>Insurance</span>
          </div>
          <span
            className={cn(
              "font-medium",
              daysInsurance === null
                ? "text-muted-foreground"
                : daysInsurance <= 0
                  ? "text-notion-red-text font-semibold"
                  : daysInsurance <= 30
                    ? "text-notion-yellow-text font-semibold animate-pulse"
                    : "text-foreground"
            )}
          >
            {daysInsurance === null
              ? "Not set"
              : daysInsurance <= 0
                ? "Expired ⚠️"
                : `${daysInsurance} days left`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span>Running Cost</span>
          </div>
          <span className="font-semibold text-foreground font-mono">
            ₹{costPerKm.toFixed(2)}/km
          </span>
        </div>
      </div>

      {/* Card footer: quick update odometer */}
      <div className="mt-3 flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
          <Activity className="h-3 w-3" />
          <span>Last active today</span>
        </div>
        <OdometerPopover
          vehicleId={vehicle._id}
          currentOdometer={vehicle.currentOdometer}
        />
      </div>
    </div>
  );
}
