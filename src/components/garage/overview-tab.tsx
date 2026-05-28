import { Shield, Droplets, PenTool, Battery, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface OverviewTabProps {
  vehicle: {
    name: string;
    type: string;
    icon?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    specs?: {
      engineCc?: string;
      fuelType?: string;
      oilType?: string;
      oilCapacity?: string;
      frontTireSize?: string;
      rearTireSize?: string;
      batteryModel?: string;
      fuelCapacity?: string;
      transmissionType?: string;
      notes?: string;
    };
    insuranceExpiry?: string;
    insurancePolicyNumber?: string;
    insuranceProvider?: string;
    pucExpiry?: string;
    warrantyExpiry?: string;
    warrantyKmLimit?: number;
    currentOdometer: number;
  };
  stats?: {
    costPerKm: number;
    status: "Healthy" | "Service Due" | "Overdue";
    daysUntilInsurance: number | null;
    daysUntilPuc: number | null;
    daysUntilWarranty: number | null;
    totalCost: number;
  };
  fuelStats?: {
    averageEfficiency: number;
    trend: number;
  };
  onEditSpecs: () => void;
}

export function OverviewTab({ vehicle, stats, fuelStats, onEditSpecs }: OverviewTabProps) {
  const daysInsurance = stats?.daysUntilInsurance ?? null;
  const daysPuc = stats?.daysUntilPuc ?? null;
  const daysWarranty = stats?.daysUntilWarranty ?? null;
  const efficiency = fuelStats?.averageEfficiency ?? 0;
  const trend = fuelStats?.trend ?? 0;

  // Render specifications rows cleanly
  const specItems = [
    { label: "Engine Displacement", value: vehicle.specs?.engineCc ?? "Not set", category: "Engine", icon: PenTool },
    { label: "Transmission Type", value: vehicle.specs?.transmissionType ?? "Not set", category: "Engine", icon: PenTool },
    { label: "Fuel System / Type", value: vehicle.specs?.fuelType ?? "Not set", category: "Engine", icon: PenTool },
    { label: "Fuel Tank Capacity", value: vehicle.specs?.fuelCapacity ? `${vehicle.specs.fuelCapacity}` : "Not set", category: "Engine", icon: PenTool },
    
    { label: "Engine Oil Type", value: vehicle.specs?.oilType ?? "Not set", category: "Fluids", icon: Droplets },
    { label: "Engine Oil Capacity", value: vehicle.specs?.oilCapacity ?? "Not set", category: "Fluids", icon: Droplets },
    
    { label: "Front Tire Size", value: vehicle.specs?.frontTireSize ?? "Not set", category: "Tires", icon: CircleAlert },
    { label: "Rear Tire Size", value: vehicle.specs?.rearTireSize ?? "Not set", category: "Tires", icon: CircleAlert },
    
    { label: "Battery Model", value: vehicle.specs?.batteryModel ?? "Not set", category: "Battery", icon: Battery },
  ];

  return (
    <div className="space-y-6">
      {/* 3-Up Gauge cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Gauge 1: Fuel Efficiency */}
        <div className="bg-card border border-border/60 rounded-xl p-5 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Fuel Efficiency
            </span>
            <span className="text-lg">⛽</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-foreground font-mono">
              {efficiency > 0 ? `${efficiency}` : "N/A"}
            </span>
            <span className="text-xs text-muted-foreground font-medium">km/L average</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] mt-2">
            {efficiency > 0 ? (
              trend > 0 ? (
                <span className="text-notion-green-text font-bold flex items-center">
                  ↑ {trend} km/L
                </span>
              ) : trend < 0 ? (
                <span className="text-notion-red-text font-bold flex items-center">
                  ↓ {Math.abs(trend)} km/L
                </span>
              ) : (
                <span className="text-muted-foreground">Steady trend</span>
              )
            ) : (
              <span className="text-muted-foreground">Log full tanks to compute</span>
            )}
            {efficiency > 0 && <span className="text-muted-foreground">vs previous fill-up</span>}
          </div>
        </div>

        {/* Gauge 2: Insurance Expiry */}
        <div className="bg-card border border-border/60 rounded-xl p-5 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Insurance Countdown
            </span>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={cn(
              "text-3xl font-extrabold font-mono",
              daysInsurance === null
                ? "text-muted-foreground"
                : daysInsurance <= 0
                  ? "text-notion-red-text"
                  : daysInsurance <= 30
                    ? "text-notion-yellow-text animate-pulse"
                    : "text-foreground"
            )}>
              {daysInsurance === null ? "N/A" : daysInsurance <= 0 ? "Expired" : daysInsurance}
            </span>
            {daysInsurance !== null && daysInsurance > 0 && (
              <span className="text-xs text-muted-foreground font-medium">days remaining</span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 truncate">
            {vehicle.insuranceExpiry
              ? `Expiry date: ${new Date(vehicle.insuranceExpiry).toLocaleDateString("en-IN", { dateStyle: "medium" })}`
              : "No policy date entered"}
          </div>
        </div>

        {/* Gauge 3: PUC Expiry */}
        <div className="bg-card border border-border/60 rounded-xl p-5 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              PUC Deadline
            </span>
            <span className="text-lg">🌿</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={cn(
              "text-3xl font-extrabold font-mono",
              daysPuc === null
                ? "text-muted-foreground"
                : daysPuc <= 0
                  ? "text-notion-red-text"
                  : daysPuc <= 15
                    ? "text-notion-yellow-text"
                    : "text-foreground"
            )}>
              {daysPuc === null ? "N/A" : daysPuc <= 0 ? "Expired" : daysPuc}
            </span>
            {daysPuc !== null && daysPuc > 0 && (
              <span className="text-xs text-muted-foreground font-medium">days remaining</span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 truncate">
            {vehicle.pucExpiry
              ? `Expiry date: ${new Date(vehicle.pucExpiry).toLocaleDateString("en-IN", { dateStyle: "medium" })}`
              : "No certificate date set"}
          </div>
        </div>
      </div>

      {/* Warranty Banner if applicable */}
      {vehicle.warrantyExpiry && (
        <div className={cn(
          "rounded-2xl border p-4 flex gap-3 items-center text-xs leading-5 border-border/60 shadow-sm",
          daysWarranty !== null && daysWarranty <= 0
            ? "bg-notion-gray-bg text-muted-foreground"
            : daysWarranty !== null && daysWarranty <= 30
              ? "bg-notion-yellow-bg text-notion-yellow-text"
              : "bg-notion-blue-bg text-notion-blue-text border-notion-blue-text/10"
        )}>
          <span className="text-lg">🛡️</span>
          <div>
            <span className="font-semibold block">
              {daysWarranty !== null && daysWarranty <= 0
                ? "Vehicle Warranty Expired"
                : `Warranty Active until ${new Date(vehicle.warrantyExpiry).toLocaleDateString("en-IN", { dateStyle: "medium" })}`}
            </span>
            {vehicle.warrantyKmLimit && (
              <span className="text-muted-foreground">
                Limit: {vehicle.warrantyKmLimit.toLocaleString()} km (Current: {vehicle.currentOdometer.toLocaleString()} km)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Spec cockpit cards */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Vehicle Specs Cockpit
          </h3>
          <button
            onClick={onEditSpecs}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Edit Specifications
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {["Engine", "Fluids", "Tires", "Battery"].map((category) => {
            const items = specItems.filter((i) => i.category === category);
            return (
              <div key={category} className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase border-b border-border/40 pb-2 tracking-wider flex items-center gap-1.5">
                  {category === "Engine" && "🏍️"}
                  {category === "Fluids" && "💧"}
                  {category === "Tires" && "⭕"}
                  {category === "Battery" && "🔋"}
                  {category} Specifications
                </h4>
                <div className="divide-y divide-border/30 text-xs">
                  {items.map((item) => (
                    <div key={item.label} className="py-2.5 flex justify-between gap-4">
                      <span className="text-muted-foreground font-medium">{item.label}</span>
                      <span className="font-semibold text-foreground text-right">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {vehicle.specs?.notes && (
        <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-2">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Owner Notes & Specific Instructions
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {vehicle.specs.notes}
          </p>
        </div>
      )}
    </div>
  );
}
