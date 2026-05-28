"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState, useMemo, useEffect } from "react";
import { useAppStore, type GarageTab } from "@/store/app.store";
import { cn } from "@/lib/utils";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import { Button } from "@/components/ui/button";
import {
  Car as CarIcon,
  Plus,
  LayoutDashboard,
  Wrench,
  DollarSign,
  Clock,
  FileText,
  Activity,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { VehicleCard } from "@/components/garage/vehicle-card";
import { VehicleDetailHeader } from "@/components/garage/vehicle-detail-header";
import { AddVehicleModal } from "@/components/garage/add-vehicle-modal";

// Tabs imports
import { OverviewTab } from "@/components/garage/overview-tab";
import { ServiceLogTab } from "@/components/garage/service-log-tab";
import { ExpenseLogTab } from "@/components/garage/expense-log-tab";
import { ChecklistTab } from "@/components/garage/checklist-tab";
import { DocumentsTab } from "@/components/garage/documents-tab";

// Specs Edit Dialog Form
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
import { toast } from "sonner";

export default function GaragePage() {
  const { resolvedWorkspaceId } = useResolvedWorkspace();
  const {
    garageTab,
    setGarageTab,
    selectedVehicleId,
    setSelectedVehicleId,
  } = useAppStore();

  // Queries
  const vehicles = useQuery(
    api.garage.listVehicles,
    resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : "skip"
  );
  
  const stats = useQuery(
    api.garage.getDashboardStats,
    resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : "skip"
  );

  const insight = useQuery(
    api.garage.getGarageInsight,
    resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : "skip"
  );

  // Selected vehicle specs details
  const activeVehicle = useMemo(() => {
    if (!vehicles || !selectedVehicleId) return null;
    return (vehicles as any[]).find((v) => v._id === selectedVehicleId) ?? null;
  }, [vehicles, selectedVehicleId]);

  // Selected vehicle cost summaries / fuel metrics
  const activeStats = useMemo(() => {
    if (!stats || !selectedVehicleId) return undefined;
    return stats[selectedVehicleId];
  }, [stats, selectedVehicleId]);

  const fuelStats = useQuery(
    api.garage.getFuelEfficiency,
    selectedVehicleId ? { vehicleId: selectedVehicleId as Id<"garageVehicles"> } : "skip"
  );

  // Modal open states
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [logServiceOpen, setLogServiceOpen] = useState(false);
  const [logExpenseOpen, setLogExpenseOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [editSpecsOpen, setEditSpecsOpen] = useState(false);

  // Mounted tab panels for lazy loading
  const [mounted, setMounted] = useState<Record<GarageTab, boolean>>({
    overview: true,
    services: false,
    expenses: false,
    checklist: false,
    documents: false,
  });

  useEffect(() => {
    if (garageTab) {
      setMounted((prev) => ({ ...prev, [garageTab]: true }));
    }
  }, [garageTab]);

  // Specs Edit Mutation
  const updateVehicle = useMutation(api.garage.updateVehicle);
  const [updatingSpecs, setUpdatingSpecs] = useState(false);
  
  // Specs edit state fields
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [modelYear, setModelYear] = useState("");
  const [color, setColor] = useState("");
  const [icon, setIcon] = useState("");
  const [engineCc, setEngineCc] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [oilType, setOilType] = useState("");
  const [oilCapacity, setOilCapacity] = useState("");
  const [frontTireSize, setFrontTireSize] = useState("");
  const [rearTireSize, setRearTireSize] = useState("");
  const [batteryModel, setBatteryModel] = useState("");
  const [fuelCapacity, setFuelCapacity] = useState("");
  const [transmissionType, setTransmissionType] = useState("");
  const [specsNotes, setSpecsNotes] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [pucExpiry, setPucExpiry] = useState("");
  const [warrantyExpiry, setWarrantyExpiry] = useState("");
  const [warrantyKmLimit, setWarrantyKmLimit] = useState("");

  const handleOpenEditSpecs = () => {
    if (!activeVehicle) return;
    setName(activeVehicle.name);
    setNickname(activeVehicle.nickname ?? "");
    setRegistrationNumber(activeVehicle.registrationNumber ?? "");
    setModelYear(activeVehicle.modelYear ? String(activeVehicle.modelYear) : "");
    setColor(activeVehicle.color ?? "#3b82f6");
    setIcon(activeVehicle.icon ?? "🏍️");
    setEngineCc(activeVehicle.specs?.engineCc ?? "");
    setFuelType(activeVehicle.specs?.fuelType ?? "petrol");
    setOilType(activeVehicle.specs?.oilType ?? "");
    setOilCapacity(activeVehicle.specs?.oilCapacity ?? "");
    setFrontTireSize(activeVehicle.specs?.frontTireSize ?? "");
    setRearTireSize(activeVehicle.specs?.rearTireSize ?? "");
    setBatteryModel(activeVehicle.specs?.batteryModel ?? "");
    setFuelCapacity(activeVehicle.specs?.fuelCapacity ?? "");
    setTransmissionType(activeVehicle.specs?.transmissionType ?? "manual");
    setSpecsNotes(activeVehicle.specs?.notes ?? "");
    setInsuranceExpiry(activeVehicle.insuranceExpiry ?? "");
    setInsurancePolicyNumber(activeVehicle.insurancePolicyNumber ?? "");
    setInsuranceProvider(activeVehicle.insuranceProvider ?? "");
    setPucExpiry(activeVehicle.pucExpiry ?? "");
    setWarrantyExpiry(activeVehicle.warrantyExpiry ?? "");
    setWarrantyKmLimit(activeVehicle.warrantyKmLimit ? String(activeVehicle.warrantyKmLimit) : "");
    
    setEditSpecsOpen(true);
  };

  const handleSaveSpecs = async () => {
    if (!activeVehicle) return;
    if (!name.trim()) {
      toast.error("Vehicle name is required");
      return;
    }

    setUpdatingSpecs(true);
    try {
      await updateVehicle({
        id: activeVehicle._id,
        name,
        nickname: nickname ? nickname : "",
        registrationNumber: registrationNumber ? registrationNumber : "",
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
        insuranceExpiry: insuranceExpiry ? insuranceExpiry : "",
        insurancePolicyNumber: insurancePolicyNumber ? insurancePolicyNumber : "",
        insuranceProvider: insuranceProvider ? insuranceProvider : "",
        pucExpiry: pucExpiry ? pucExpiry : "",
        warrantyExpiry: warrantyExpiry ? warrantyExpiry : "",
        warrantyKmLimit: warrantyKmLimit ? Number(warrantyKmLimit) : undefined,
      });

      toast.success("Specs saved!");
      setEditSpecsOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save specs");
    } finally {
      setUpdatingSpecs(false);
    }
  };

  // Tab configurations
  const tabsConfig = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "services" as const, label: "Service Logs", icon: Wrench },
    { id: "expenses" as const, label: "Running Costs", icon: DollarSign },
    { id: "checklist" as const, label: "Maintenance", icon: Clock },
    { id: "documents" as const, label: "Documents", icon: FileText },
  ];

  if (!resolvedWorkspaceId) {
    return (
      <div className="flex h-full items-center justify-center p-6 bg-background">
        <div className="text-center text-sm text-muted-foreground animate-pulse">
          Connecting workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Top Header Pinned */}
      <WorkspaceTopBar
        moduleTitle="Garage"
        rightContent={
          !selectedVehicleId && vehicles && vehicles.length > 0 ? (
            <Button
              onClick={() => setAddVehicleOpen(true)}
              size="sm"
              className="h-9 text-xs rounded-xl gap-1 shrink-0 bg-primary/90 text-primary-foreground hover:bg-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Vehicle
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto overscroll-contain pb-24 md:pb-6">
        {!selectedVehicleId ? (
          /* DASHBOARD (GRID VIEW) */
          <div className="space-y-6 p-6 max-w-5xl mx-auto">
            {/* 3-Up summary cards */}
            {vehicles && vehicles.length > 0 && stats && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="bg-card border border-border/60 rounded-xl p-4 flex gap-3.5 items-center shadow-sm">
                  <span className="text-2xl p-2 bg-notion-blue-bg text-notion-blue-text rounded-xl shrink-0">🏍️</span>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Active</span>
                    <span className="text-xl font-black text-foreground">{vehicles.length} Rides</span>
                  </div>
                </div>
                <div className="bg-card border border-border/60 rounded-xl p-4 flex gap-3.5 items-center shadow-sm">
                  <span className="text-2xl p-2 bg-notion-green-bg text-notion-green-text rounded-xl shrink-0">₹</span>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Invested</span>
                    <span className="text-xl font-black text-foreground font-mono">
                      ₹{(Object.values(stats as any) as any[]).reduce((sum, v) => sum + (v?.totalCost || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="bg-card border border-border/60 rounded-xl p-4 flex gap-3.5 items-center shadow-sm">
                  <span className="text-2xl p-2 bg-notion-red-bg text-notion-red-text rounded-xl shrink-0">⚠️</span>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Overdue Deadlines</span>
                    <span className="text-xl font-black text-foreground">
                      {(Object.values(stats as any) as any[]).filter((v) => v?.status === "Overdue").length} Alert(s)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle bay empty state or grid */}
            {vehicles === undefined ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton-shimmer h-52 rounded-xl" />
                ))}
              </div>
            ) : vehicles.length === 0 ? (
              <div className="border border-dashed border-border/60 rounded-2xl p-12 text-center bg-card/20 space-y-4 max-w-md mx-auto mt-12">
                <div className="mx-auto w-14 h-14 bg-muted/60 flex items-center justify-center rounded-2xl">
                  <CarIcon className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-base font-bold text-foreground">Your garage bay is empty</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Add your first ride (motorcycle, scooter, car, electric-bike) to track costs, odometer history, service logs, and documents.
                </p>
                <Button onClick={() => setAddVehicleOpen(true)} className="rounded-xl">
                  <Plus className="mr-1.5 h-4 w-4" /> Add Your First Ride
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Active Vehicle Bay
                </h3>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {(vehicles as any[]).map((v) => (
                    <VehicleCard
                      key={v._id}
                      vehicle={v}
                      stats={stats ? (stats as any)[v._id] : undefined}
                    />
                  ))}
                  
                  {/* Plus card shortcut */}
                  <div
                    onClick={() => setAddVehicleOpen(true)}
                    className="border border-dashed border-border/80 hover:border-primary/50 rounded-xl h-56 cursor-pointer flex flex-col items-center justify-center bg-card/10 hover:bg-card/40 transition-all duration-300 group"
                  >
                    <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs font-semibold text-muted-foreground mt-2 group-hover:text-primary transition-colors">
                      Add Vehicle
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Maddy's Intelligent Insight */}
            {vehicles && vehicles.length > 0 && insight && (
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-3 mt-6 border-l-4 border-l-purple-500">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  💡 Maddy&apos;s Garage Insight
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-1 font-medium">
                  {insight}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* VEHICLE DETAIL VIEW */
          <div className="space-y-6 p-6 max-w-5xl mx-auto">
            {activeVehicle ? (
              <>
                {/* 1. Detail header with stats */}
                <VehicleDetailHeader
                  vehicle={activeVehicle}
                  stats={activeStats}
                  onLogService={() => setLogServiceOpen(true)}
                  onLogExpense={() => setLogExpenseOpen(true)}
                  onEditSpecs={handleOpenEditSpecs}
                />

                {/* 2. Horizontally scrollable pill tabs rail */}
                <div className="flex border-b border-border/60 pb-px overflow-x-auto gap-1 scrollbar-none">
                  {tabsConfig.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = garageTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setGarageTab(tab.id)}
                        className={cn(
                          "relative flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors shrink-0",
                          isActive
                            ? "text-foreground border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* 3. Lazy rendering tab content panels */}
                <div className="mt-4">
                  {mounted.overview && (
                    <div className={cn(garageTab === "overview" ? "block animate-fade-in" : "hidden")}>
                      <OverviewTab
                        vehicle={activeVehicle}
                        stats={activeStats}
                        fuelStats={fuelStats}
                        onEditSpecs={handleOpenEditSpecs}
                      />
                    </div>
                  )}

                  {mounted.services && (
                    <div className={cn(garageTab === "services" ? "block animate-fade-in" : "hidden")}>
                      <ServiceLogTab
                        vehicleId={activeVehicle._id}
                        currentOdometer={activeVehicle.currentOdometer}
                        openLogModal={logServiceOpen}
                        setOpenLogModal={setLogServiceOpen}
                      />
                    </div>
                  )}

                  {mounted.expenses && (
                    <div className={cn(garageTab === "expenses" ? "block animate-fade-in" : "hidden")}>
                      <ExpenseLogTab
                        vehicleId={activeVehicle._id}
                        currentOdometer={activeVehicle.currentOdometer}
                        openLogModal={logExpenseOpen}
                        setOpenLogModal={setLogExpenseOpen}
                      />
                    </div>
                  )}

                  {mounted.checklist && (
                    <div className={cn(garageTab === "checklist" ? "block animate-fade-in" : "hidden")}>
                      <ChecklistTab
                        vehicleId={activeVehicle._id}
                        currentOdometer={activeVehicle.currentOdometer}
                        openLogModal={checklistOpen}
                        setOpenLogModal={setChecklistOpen}
                      />
                    </div>
                  )}

                  {mounted.documents && (
                    <div className={cn(garageTab === "documents" ? "block animate-fade-in" : "hidden")}>
                      <DocumentsTab
                        vehicleId={activeVehicle._id}
                        openLogModal={documentOpen}
                        setOpenLogModal={setDocumentOpen}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center p-12 text-sm text-muted-foreground">
                Vehicle not found.{" "}
                <button
                  onClick={() => setSelectedVehicleId(null)}
                  className="text-primary hover:underline font-bold"
                >
                  Return to Garage Bay
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global Add Vehicle Modal */}
      <AddVehicleModal
        open={addVehicleOpen}
        onClose={() => setAddVehicleOpen(false)}
        workspaceId={resolvedWorkspaceId}
      />

      {/* Global Edit Specifications Modal Form */}
      {activeVehicle && (
        <Dialog open={editSpecsOpen} onOpenChange={setEditSpecsOpen}>
          <DialogContent className="max-w-2xl rounded-2xl border border-border/60 bg-card p-0 overflow-y-auto max-h-[90vh]">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <CarIcon className="h-5 w-5 text-primary" />
                Edit Vehicle Details & Specifications
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Refine specs cockpit to get perfect mileage calculations and automatic reminder counts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl border-border/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nickname / Short Label</label>
                  <Input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
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
                    className="rounded-xl border-border/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Model Year</label>
                  <Input
                    type="number"
                    value={modelYear}
                    onChange={(e) => setModelYear(e.target.value)}
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

              <div className="border-t border-border/40 my-2 pt-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Specifications Cockpit</h4>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Engine Capacity (cc)</label>
                    <Input
                      value={engineCc}
                      onChange={(e) => setEngineCc(e.target.value)}
                      className="rounded-xl border-border/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fuel Type</label>
                    <Input
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value)}
                      className="rounded-xl border-border/60"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mt-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Engine Oil Type</label>
                    <Input
                      value={oilType}
                      onChange={(e) => setOilType(e.target.value)}
                      className="rounded-xl border-border/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Engine Oil Capacity</label>
                    <Input
                      value={oilCapacity}
                      onChange={(e) => setOilCapacity(e.target.value)}
                      className="rounded-xl border-border/60"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mt-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Front Tire Size</label>
                    <Input
                      value={frontTireSize}
                      onChange={(e) => setFrontTireSize(e.target.value)}
                      className="rounded-xl border-border/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rear Tire Size</label>
                    <Input
                      value={rearTireSize}
                      onChange={(e) => setRearTireSize(e.target.value)}
                      className="rounded-xl border-border/60"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mt-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Battery Model</label>
                    <Input
                      value={batteryModel}
                      onChange={(e) => setBatteryModel(e.target.value)}
                      className="rounded-xl border-border/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fuel Capacity</label>
                    <Input
                      value={fuelCapacity}
                      onChange={(e) => setFuelCapacity(e.target.value)}
                      className="rounded-xl border-border/60"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40 my-2 pt-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">System Alerts Expiry Dates</h4>
                
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
                      className="rounded-xl border-border/60"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mt-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Insurance Policy Number</label>
                    <Input
                      value={insurancePolicyNumber}
                      onChange={(e) => setInsurancePolicyNumber(e.target.value)}
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

                <div className="grid gap-4 sm:grid-cols-2 mt-3">
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
                      className="rounded-xl border-border/60"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Owner General Notes</label>
                <Textarea
                  value={specsNotes}
                  onChange={(e) => setSpecsNotes(e.target.value)}
                  className="rounded-xl border-border/60 h-20 resize-none"
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-border/60 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditSpecsOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveSpecs}
                disabled={updatingSpecs}
                className="rounded-xl"
              >
                {updatingSpecs ? "Saving..." : "Save Specs"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
