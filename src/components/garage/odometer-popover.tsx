import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gauge } from "lucide-react";

interface OdometerPopoverProps {
  vehicleId: Id<"garageVehicles">;
  currentOdometer: number;
  trigger?: React.ReactNode;
}

export function OdometerPopover({ vehicleId, currentOdometer, trigger }: OdometerPopoverProps) {
  const updateOdometer = useMutation(api.garage.updateOdometer);
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState(String(currentOdometer));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setReading(String(currentOdometer));
  }, [currentOdometer]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(reading);
    if (isNaN(num) || num < 0) {
      toast.error("Please enter a valid odometer reading");
      return;
    }

    if (num < currentOdometer) {
      toast.error(`Odometer cannot be less than current reading: ${currentOdometer} km`);
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await updateOdometer({
        vehicleId,
        reading: num,
        date: today,
        notes: "Manual update",
      });
      toast.success("Odometer updated!");
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update odometer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-lg border-border/60 hover:bg-[var(--notion-gray-bg)] text-xs gap-1.5"
          >
            <Gauge className="h-3.5 w-3.5" />
            ⊙ {currentOdometer.toLocaleString()} km
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[min(16rem,calc(100vw-2rem))] rounded-xl border border-border/60 bg-card p-3 shadow-xl" align="end">
        <form onSubmit={handleUpdate} className="space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Update Odometer
            </span>
            <span className="text-xs text-muted-foreground block">
              Current: {currentOdometer.toLocaleString()} km
            </span>
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              className="h-9 rounded-lg border-border/60 text-sm font-medium"
              placeholder="New reading"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || Number(reading) === currentOdometer}
              className="rounded-lg shrink-0 h-9"
            >
              {loading ? "..." : "Save"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
