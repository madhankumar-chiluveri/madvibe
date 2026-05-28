import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Car } from "lucide-react";

interface AddVehicleModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces">;
}

const VEHICLE_TYPES = [
  { value: "bike", label: "Motorcycle 🏍️" },
  { value: "scooter", label: "Scooter 🛵" },
  { value: "car", label: "Car 🚗" },
  { value: "electric_bike", label: "Electric Bike ⚡🏍️" },
  { value: "electric_car", label: "Electric Car ⚡🚗" },
  { value: "bicycle", label: "Bicycle 🚲" },
] as const;

export function AddVehicleModal({ open, onClose, workspaceId }: AddVehicleModalProps) {
  const createVehicle = useMutation(api.garage.createVehicle);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Form State
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [type, setType] = useState<typeof VEHICLE_TYPES[number]["value"]>("bike");
  const [currentOdometer, setCurrentOdometer] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [modelYear, setModelYear] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [icon, setIcon] = useState("🏍️");
  
  // Specs
  const [engineCc, setEngineCc] = useState("");
  const [fuelType, setFuelType] = useState("petrol");
  const [oilType, setOilType] = useState("");
  const [oilCapacity, setOilCapacity] = useState("");
  const [frontTireSize, setFrontTireSize] = useState("");
  const [rearTireSize, setRearTireSize] = useState("");
  const [batteryModel, setBatteryModel] = useState("");
  const [fuelCapacity, setFuelCapacity] = useState("");
  const [transmissionType, setTransmissionType] = useState("manual");
  const [specsNotes, setSpecsNotes] = useState("");

  // Deadlines
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [pucExpiry, setPucExpiry] = useState("");
  const [warrantyExpiry, setWarrantyExpiry] = useState("");
  const [warrantyKmLimit, setWarrantyKmLimit] = useState("");

  const resetForm = () => {
    setName("");
    setNickname("");
    setType("bike");
    setCurrentOdometer("");
    setRegistrationNumber("");
    setChassisNumber("");
    setPurchaseDate("");
    setPurchasePrice("");
    setModelYear("");
    setColor("#3b82f6");
    setIcon("🏍️");
    setEngineCc("");
    setFuelType("petrol");
    setOilType("");
    setOilCapacity("");
    setFrontTireSize("");
    setRearTireSize("");
    setBatteryModel("");
    setFuelCapacity("");
    setTransmissionType("manual");
    setSpecsNotes("");
    setInsuranceExpiry("");
    setInsurancePolicyNumber("");
    setInsuranceProvider("");
    setPucExpiry("");
    setWarrantyExpiry("");
    setWarrantyKmLimit("");
    setStep(1);
  };

  const handleTypeChange = (val: typeof type) => {
    setType(val);
    if (val === "bike" || val === "scooter") {
      setIcon("🏍️");
      setFuelType("petrol");
      setTransmissionType("manual");
    } else if (val === "car") {
      setIcon("🚗");
      setFuelType("petrol");
      setTransmissionType("manual");
    } else if (val === "electric_bike") {
      setIcon("⚡🏍️");
      setFuelType("electric");
      setTransmissionType("automatic");
    } else if (val === "electric_car") {
      setIcon("⚡🚗");
      setFuelType("electric");
      setTransmissionType("automatic");
    } else if (val === "bicycle") {
      setIcon("🚲");
      setFuelType("manual");
      setTransmissionType("manual");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Vehicle name is required");
      return;
    }
    if (!currentOdometer.trim() || isNaN(Number(currentOdometer))) {
      toast.error("Valid initial odometer reading is required");
      return;
    }

    setLoading(true);
    try {
      await createVehicle({
        workspaceId,
        name,
        nickname: nickname ? nickname : undefined,
        type,
        registrationNumber: registrationNumber ? registrationNumber : undefined,
        chassisNumber: chassisNumber ? chassisNumber : undefined,
        currentOdometer: Number(currentOdometer),
        purchaseDate: purchaseDate ? purchaseDate : undefined,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        modelYear: modelYear ? Number(modelYear) : undefined,
        color,
        icon,
        specs: {
          engineCc: engineCc ? engineCc : undefined,
          fuelType: fuelType ? fuelType : undefined,
          oilType: oilType ? oilType : undefined,
          oilCapacity: oilCapacity ? oilCapacity : undefined,
          frontTireSize: frontTireSize ? frontTireSize : undefined,
          rearTireSize: rearTireSize ? rearTireSize : undefined,
          batteryModel: batteryModel ? batteryModel : undefined,
          fuelCapacity: fuelCapacity ? fuelCapacity : undefined,
          transmissionType: transmissionType ? transmissionType : undefined,
          notes: specsNotes ? specsNotes : undefined,
        },
        insuranceExpiry: insuranceExpiry ? insuranceExpiry : undefined,
        insurancePolicyNumber: insurancePolicyNumber ? insurancePolicyNumber : undefined,
        insuranceProvider: insuranceProvider ? insuranceProvider : undefined,
        pucExpiry: pucExpiry ? pucExpiry : undefined,
        warrantyExpiry: warrantyExpiry ? warrantyExpiry : undefined,
        warrantyKmLimit: warrantyKmLimit ? Number(warrantyKmLimit) : undefined,
      });

      toast.success("Vehicle created successfully!");
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create vehicle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-2xl rounded-2xl border border-border/60 bg-card p-0 md:max-w-xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Car className="h-5 w-5 text-primary" />
            Add New Vehicle
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Step {step} of 3 — {step === 1 ? "Basic Details" : step === 2 ? "Specifications (Optional)" : "Deadlines & Insurances (Optional)"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Basic details */}
        {step === 1 && (
          <div className="space-y-4 px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Royal Enfield Himalayan 450"
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nickname / Short Label</label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Himalayan"
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle Type *</label>
                <Select value={type} onValueChange={(val: any) => handleTypeChange(val)}>
                  <SelectTrigger className="rounded-xl border-border/60">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {VEHICLE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Odometer (km) *</label>
                <Input
                  type="number"
                  value={currentOdometer}
                  onChange={(e) => setCurrentOdometer(e.target.value)}
                  placeholder="12450"
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reg Number</label>
                <Input
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                  placeholder="KA-03-HA-1234"
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Model Year</label>
                <Input
                  type="number"
                  value={modelYear}
                  onChange={(e) => setModelYear(e.target.value)}
                  placeholder="2024"
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5 flex flex-col justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Color Accent</label>
                <div className="flex gap-2 items-center h-10">
                  <Input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer shrink-0 bg-transparent"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 rounded-xl text-xs uppercase font-mono border-border/60"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purchase Date</label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purchase Price (INR)</label>
                <Input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="320000"
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Specs cockpit (optional) */}
        {step === 2 && (
          <div className="space-y-4 px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Engine Capacity (cc)</label>
                <Input
                  value={engineCc}
                  onChange={(e) => setEngineCc(e.target.value)}
                  placeholder="452 cc"
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fuel Type</label>
                <Select value={fuelType} onValueChange={setFuelType}>
                  <SelectTrigger className="rounded-xl border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="petrol">Petrol ⛽</SelectItem>
                    <SelectItem value="diesel">Diesel ⛽</SelectItem>
                    <SelectItem value="electric">Electric ⚡</SelectItem>
                    <SelectItem value="cng">CNG ⛽</SelectItem>
                    <SelectItem value="manual">Manual/Pedal 🚲</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fluids/Engine Oil Type</label>
                <Input
                  value={oilType}
                  onChange={(e) => setOilType(e.target.value)}
                  placeholder="10W40 Semi-Synthetic"
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Oil Capacity</label>
                <Input
                  value={oilCapacity}
                  onChange={(e) => setOilCapacity(e.target.value)}
                  placeholder="2.1 Liters"
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Front Tire Size</label>
                <Input
                  value={frontTireSize}
                  onChange={(e) => setFrontTireSize(e.target.value)}
                  placeholder="90/90-21"
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rear Tire Size</label>
                <Input
                  value={rearTireSize}
                  onChange={(e) => setRearTireSize(e.target.value)}
                  placeholder="140/80-17"
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Battery Model/Capacity</label>
                <Input
                  value={batteryModel}
                  onChange={(e) => setBatteryModel(e.target.value)}
                  placeholder="YTX9-BS 12V 8Ah"
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fuel Capacity (Liters/kWh)</label>
                <Input
                  value={fuelCapacity}
                  onChange={(e) => setFuelCapacity(e.target.value)}
                  placeholder="17 Liters"
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Deadlines & Insurance (optional) */}
        {step === 3 && (
          <div className="space-y-4 px-6 py-4">
            <div className="rounded-2xl border border-border/60 bg-[var(--notion-gray-bg)] p-3 text-xs leading-5 text-muted-foreground">
              💡 Dates entered here will auto-trigger system push notifications to you 30, 15, 7, and 1 days before expiry.
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Insurance Expiry Date</label>
                <Input
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Insurance Provider</label>
                <Input
                  value={insuranceProvider}
                  onChange={(e) => setInsuranceProvider(e.target.value)}
                  placeholder="ICICI Lombard"
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Insurance Policy Number</label>
                <Input
                  value={insurancePolicyNumber}
                  onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                  placeholder="3005/2012847/00"
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PUC Expiry Date</label>
                <Input
                  type="date"
                  value={pucExpiry}
                  onChange={(e) => setPucExpiry(e.target.value)}
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Warranty Expiry Date</label>
                <Input
                  type="date"
                  value={warrantyExpiry}
                  onChange={(e) => setWarrantyExpiry(e.target.value)}
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Warranty km Limit</label>
                <Input
                  type="number"
                  value={warrantyKmLimit}
                  onChange={(e) => setWarrantyKmLimit(e.target.value)}
                  placeholder="40000"
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t border-border/60 flex items-center justify-between">
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="rounded-xl border-border/60"
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => { resetForm(); onClose(); }}
              className="rounded-xl"
            >
              Cancel
            </Button>
          </div>
          <div>
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                className="rounded-xl"
                disabled={step === 1 && !name.trim()}
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-xl"
              >
                {loading ? "Adding..." : "Add Vehicle"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
