"use client";

import { memo } from "react";
import { Car, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Vehicle {
  _id: string;
  name: string;
  nickname?: string;
  currentOdometer: number;
  status: "Healthy" | "Service Due" | "Overdue";
  daysUntilInsurance: number | null;
  daysUntilPuc: number | null;
  insuranceExpiry?: string;
  pucExpiry?: string;
}

interface VehiclesSummaryProps {
  vehicles: Vehicle[];
}

export const VehiclesSummary = memo(function VehiclesSummary({ vehicles = [] }: VehiclesSummaryProps) {
  const formatOdo = (km: number) => {
    return new Intl.NumberFormat("en-IN").format(km) + " km";
  };

  const getStatusBadgeClass = (status: Vehicle["status"]) => {
    if (status === "Overdue") return "bg-notion-red-bg text-notion-red-text border-notion-red-text/25";
    if (status === "Service Due") return "bg-notion-yellow-bg text-notion-yellow-text border-notion-yellow-text/25";
    return "bg-notion-green-bg text-notion-green-text border-notion-green-text/25";
  };

  return (
    <div className="rounded-[10px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b mb-3">
        <Car className="w-4 h-4 text-notion-purple-text" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
          Garage & Vehicles
        </span>
        <span className="ml-auto text-[10px] font-bold text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
          {vehicles.length} Active
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[200px] scrollbar-hide select-none">
        {vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Car className="w-8 h-8 text-muted-foreground/30 mb-1" />
            <p className="text-xs font-semibold text-muted-foreground">Garage is Empty</p>
            <p className="text-[10px] text-muted-foreground/60">Add vehicles in the Garage module</p>
          </div>
        ) : (
          vehicles.map((v) => {
            const hasInsuranceWarning = v.daysUntilInsurance !== null && v.daysUntilInsurance <= 30;
            const hasPucWarning = v.daysUntilPuc !== null && v.daysUntilPuc <= 15;

            return (
              <div
                key={v._id}
                className="flex flex-col gap-2 p-3 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                {/* Nickname, Odometer, Status */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-foreground truncate">
                      {v.nickname || v.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      Odometer: {formatOdo(v.currentOdometer)}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full border font-bold shrink-0",
                      getStatusBadgeClass(v.status)
                    )}
                  >
                    {v.status}
                  </span>
                </div>

                {/* Expiry Counters */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Insurance countdown */}
                  {v.daysUntilInsurance !== null && (
                    <span
                      className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border",
                        v.daysUntilInsurance <= 0
                          ? "bg-notion-red-bg text-notion-red-text border-notion-red-text/20"
                          : v.daysUntilInsurance <= 30
                          ? "bg-notion-orange-bg text-notion-orange-text border-notion-orange-text/20"
                          : "bg-notion-gray-bg/60 text-muted-foreground border-border"
                      )}
                    >
                      <ShieldAlert className="w-2.5 h-2.5" />
                      Ins:{" "}
                      {v.daysUntilInsurance <= 0
                        ? "Expired"
                        : `${v.daysUntilInsurance}d`}
                    </span>
                  )}

                  {/* PUC countdown */}
                  {v.daysUntilPuc !== null && (
                    <span
                      className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border",
                        v.daysUntilPuc <= 0
                          ? "bg-notion-red-bg text-notion-red-text border-notion-red-text/20"
                          : v.daysUntilPuc <= 15
                          ? "bg-notion-orange-bg text-notion-orange-text border-notion-orange-text/20"
                          : "bg-notion-gray-bg/60 text-muted-foreground border-border"
                      )}
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      PUC:{" "}
                      {v.daysUntilPuc <= 0
                        ? "Expired"
                        : `${v.daysUntilPuc}d`}
                    </span>
                  )}

                  {/* Healthy Status fallback label */}
                  {v.daysUntilInsurance === null && v.daysUntilPuc === null && (
                    <span className="text-[9px] text-notion-green-text font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Fully up-to-date
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
