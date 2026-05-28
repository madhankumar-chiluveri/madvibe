import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireWorkspaceAccess } from "./workspaceAccess";
import { anyApi as internal } from "convex/server";
import { Id } from "./_generated/dataModel";
import {
  garageVehicleTypeValidator,
  garageServiceTypeValidator,
  garageExpenseTypeValidator,
  garageDocumentTypeValidator,
} from "./garageShared";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireUserId(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  return String(userId);
}

async function requireVehicleAccess(ctx: any, vehicleId: Id<"garageVehicles">, minimumRole: "viewer" | "editor" | "owner" = "viewer") {
  const userId = await requireUserId(ctx);
  const vehicle = await ctx.db.get(vehicleId);
  if (!vehicle) throw new ConvexError("Vehicle not found");
  
  await requireWorkspaceAccess(ctx, vehicle.workspaceId, minimumRole);
  return { userId, vehicle };
}

// Helper to safely write odometer log if the new reading is valid (monotonic check)
async function logOdometer(
  ctx: any,
  userId: string,
  vehicleId: Id<"garageVehicles">,
  reading: number,
  source: "manual" | "service" | "fuel" | "trip",
  date: string,
  notes?: string
) {
  const vehicle = await ctx.db.get(vehicleId);
  if (!vehicle) throw new ConvexError("Vehicle not found");

  // Get the absolute latest reading across all sources
  const latestLog = await ctx.db
    .query("garageOdometerLogs")
    .withIndex("by_vehicleId", (q: any) => q.eq("vehicleId", vehicleId))
    .order("desc")
    .first();

  const currentReading = latestLog ? latestLog.reading : vehicle.currentOdometer;

  if (reading < currentReading) {
    throw new ConvexError(`Odometer reading cannot decrease. Current latest is ${currentReading} km.`);
  }

  // Insert log
  await ctx.db.insert("garageOdometerLogs", {
    userId,
    vehicleId,
    reading,
    source,
    date,
    notes,
    createdAt: Date.now(),
  });

  // Update vehicle current odometer if this reading is larger
  if (reading > vehicle.currentOdometer) {
    await ctx.db.patch(vehicleId, {
      currentOdometer: reading,
      updatedAt: Date.now(),
    });
  }
}

// ── Vehicles ─────────────────────────────────────────────────────────────────

export const listVehicles = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");

    return await ctx.db
      .query("garageVehicles")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getVehicle = query({
  args: { id: v.id("garageVehicles") },
  handler: async (ctx, args) => {
    const { vehicle } = await requireVehicleAccess(ctx, args.id, "viewer");
    return vehicle;
  },
});

export const createVehicle = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    nickname: v.optional(v.string()),
    type: garageVehicleTypeValidator,
    registrationNumber: v.optional(v.string()),
    chassisNumber: v.optional(v.string()),
    currentOdometer: v.number(),
    purchaseDate: v.optional(v.string()),
    purchasePrice: v.optional(v.number()),
    modelYear: v.optional(v.number()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    specs: v.optional(
      v.object({
        engineCc: v.optional(v.string()),
        fuelType: v.optional(v.string()),
        oilType: v.optional(v.string()),
        oilCapacity: v.optional(v.string()),
        frontTireSize: v.optional(v.string()),
        rearTireSize: v.optional(v.string()),
        batteryModel: v.optional(v.string()),
        fuelCapacity: v.optional(v.string()),
        transmissionType: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
    insuranceExpiry: v.optional(v.string()),
    insurancePolicyNumber: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    pucExpiry: v.optional(v.string()),
    warrantyExpiry: v.optional(v.string()),
    warrantyKmLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireWorkspaceAccess(ctx, args.workspaceId, "editor");

    const now = Date.now();
    const vehicleId = await ctx.db.insert("garageVehicles", {
      userId,
      workspaceId: args.workspaceId,
      name: args.name,
      nickname: args.nickname,
      type: args.type,
      registrationNumber: args.registrationNumber,
      chassisNumber: args.chassisNumber,
      currentOdometer: args.currentOdometer,
      purchaseDate: args.purchaseDate,
      purchasePrice: args.purchasePrice,
      modelYear: args.modelYear,
      color: args.color,
      icon: args.icon ?? "🏍️",
      imageUrl: args.imageUrl,
      specs: args.specs,
      insuranceExpiry: args.insuranceExpiry,
      insurancePolicyNumber: args.insurancePolicyNumber,
      insuranceProvider: args.insuranceProvider,
      pucExpiry: args.pucExpiry,
      warrantyExpiry: args.warrantyExpiry,
      warrantyKmLimit: args.warrantyKmLimit,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-create initial odometer entry
    const today = new Date().toISOString().slice(0, 10);
    await ctx.db.insert("garageOdometerLogs", {
      userId,
      vehicleId,
      reading: args.currentOdometer,
      source: "manual",
      date: today,
      notes: "Initial odometer reading",
      createdAt: now,
    });

    return vehicleId;
  },
});

export const updateVehicle = mutation({
  args: {
    id: v.id("garageVehicles"),
    name: v.optional(v.string()),
    nickname: v.optional(v.string()),
    type: v.optional(garageVehicleTypeValidator),
    registrationNumber: v.optional(v.string()),
    chassisNumber: v.optional(v.string()),
    currentOdometer: v.optional(v.number()),
    purchaseDate: v.optional(v.string()),
    purchasePrice: v.optional(v.number()),
    modelYear: v.optional(v.number()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    specs: v.optional(
      v.object({
        engineCc: v.optional(v.string()),
        fuelType: v.optional(v.string()),
        oilType: v.optional(v.string()),
        oilCapacity: v.optional(v.string()),
        frontTireSize: v.optional(v.string()),
        rearTireSize: v.optional(v.string()),
        batteryModel: v.optional(v.string()),
        fuelCapacity: v.optional(v.string()),
        transmissionType: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
    insuranceExpiry: v.optional(v.string()),
    insurancePolicyNumber: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    pucExpiry: v.optional(v.string()),
    warrantyExpiry: v.optional(v.string()),
    warrantyKmLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, vehicle } = await requireVehicleAccess(ctx, args.id, "editor");
    const { id, currentOdometer, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    // If currentOdometer is specified, log it properly
    if (currentOdometer !== undefined && currentOdometer !== vehicle.currentOdometer) {
      const today = new Date().toISOString().slice(0, 10);
      await logOdometer(ctx, userId, id, currentOdometer, "manual", today, "Updated specs");
    }
  },
});

export const updateOdometer = mutation({
  args: {
    vehicleId: v.id("garageVehicles"),
    reading: v.number(),
    date: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireVehicleAccess(ctx, args.vehicleId, "editor");
    await logOdometer(ctx, userId, args.vehicleId, args.reading, "manual", args.date, args.notes);
  },
});

export const archiveVehicle = mutation({
  args: { id: v.id("garageVehicles") },
  handler: async (ctx, args) => {
    await requireVehicleAccess(ctx, args.id, "editor");
    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// ── Service Logs ─────────────────────────────────────────────────────────────

export const listServiceLogs = query({
  args: { vehicleId: v.id("garageVehicles") },
  handler: async (ctx, args) => {
    await requireVehicleAccess(ctx, args.vehicleId, "viewer");
    return await ctx.db
      .query("garageServiceLogs")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .order("desc")
      .collect();
  },
});

export const createServiceLog = mutation({
  args: {
    vehicleId: v.id("garageVehicles"),
    serviceType: garageServiceTypeValidator,
    serviceDate: v.string(),
    odometer: v.number(),
    cost: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    serviceProvider: v.optional(v.string()),
    serviceProviderPhone: v.optional(v.string()),
    itemsReplaced: v.array(v.string()),
    laborCost: v.optional(v.number()),
    partsCost: v.optional(v.number()),
    receiptUrl: v.optional(v.string()),
    nextServiceDate: v.optional(v.string()),
    nextServiceOdometer: v.optional(v.number()),
    warrantyApplied: v.optional(v.boolean()),
    syncToLedger: v.boolean(),
    ledgerAccountId: v.optional(v.id("financeAccounts")),
    ledgerCategoryId: v.optional(v.id("financeCategories")),
  },
  handler: async (ctx, args) => {
    const { userId, vehicle } = await requireVehicleAccess(ctx, args.vehicleId, "editor");
    const now = Date.now();

    // 1. Log odometer
    await logOdometer(ctx, userId, args.vehicleId, args.odometer, "service", args.serviceDate, `Logged with service: ${args.title}`);

    // 2. Financial Ledger Sync
    let linkedTransactionId: Id<"financeTransactions"> | undefined = undefined;
    if (args.syncToLedger && args.ledgerAccountId && args.cost > 0) {
      const account = await ctx.db.get(args.ledgerAccountId);
      if (!account || account.userId !== userId) {
        throw new ConvexError("Ledger account not found");
      }

      linkedTransactionId = await ctx.db.insert("financeTransactions", {
        userId,
        accountId: args.ledgerAccountId,
        type: "expense",
        amount: args.cost,
        currency: account.currency ?? "INR",
        categoryId: args.ledgerCategoryId,
        description: `Vehicle Service: ${args.title} (${vehicle.nickname ?? vehicle.name})`,
        notes: args.description ?? "",
        date: args.serviceDate,
        isRecurring: false,
        createdAt: now,
        updatedAt: now,
      });

      // Update balance
      await ctx.db.patch(args.ledgerAccountId, {
        balance: account.balance - args.cost,
        updatedAt: now,
      });
    }

    // 3. Create Service Log
    return await ctx.db.insert("garageServiceLogs", {
      userId,
      vehicleId: args.vehicleId,
      serviceType: args.serviceType,
      serviceDate: args.serviceDate,
      odometer: args.odometer,
      cost: args.cost,
      title: args.title,
      description: args.description,
      serviceProvider: args.serviceProvider,
      serviceProviderPhone: args.serviceProviderPhone,
      itemsReplaced: args.itemsReplaced,
      laborCost: args.laborCost,
      partsCost: args.partsCost,
      receiptUrl: args.receiptUrl,
      nextServiceDate: args.nextServiceDate,
      nextServiceOdometer: args.nextServiceOdometer,
      warrantyApplied: args.warrantyApplied,
      linkedTransactionId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteServiceLog = mutation({
  args: { id: v.id("garageServiceLogs") },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.id);
    if (!log) return;

    const { userId } = await requireVehicleAccess(ctx, log.vehicleId, "editor");

    // Remove linked transaction and reverse balance
    if (log.linkedTransactionId) {
      const tx = await ctx.db.get(log.linkedTransactionId);
      if (tx) {
        const account = await ctx.db.get(tx.accountId);
        if (account) {
          await ctx.db.patch(tx.accountId, {
            balance: account.balance + tx.amount,
            updatedAt: Date.now(),
          });
        }
        await ctx.db.delete(log.linkedTransactionId);
      }
    }

    await ctx.db.delete(args.id);
  },
});

// ── Expense Logs & Fuel ──────────────────────────────────────────────────────

export const listExpenseLogs = query({
  args: {
    vehicleId: v.id("garageVehicles"),
    type: v.optional(garageExpenseTypeValidator),
  },
  handler: async (ctx, args) => {
    await requireVehicleAccess(ctx, args.vehicleId, "viewer");
    const logs = await ctx.db
      .query("garageExpenseLogs")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .order("desc")
      .collect();

    if (args.type) {
      return logs.filter((l) => l.type === args.type);
    }
    return logs;
  },
});

export const createExpenseLog = mutation({
  args: {
    vehicleId: v.id("garageVehicles"),
    date: v.string(),
    type: garageExpenseTypeValidator,
    amount: v.number(),
    odometer: v.optional(v.number()),
    quantity: v.optional(v.number()),
    pricePerUnit: v.optional(v.number()),
    fuelType: v.optional(v.string()),
    isFullTank: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    syncToLedger: v.boolean(),
    ledgerAccountId: v.optional(v.id("financeAccounts")),
    ledgerCategoryId: v.optional(v.id("financeCategories")),
  },
  handler: async (ctx, args) => {
    const { userId, vehicle } = await requireVehicleAccess(ctx, args.vehicleId, "editor");
    const now = Date.now();

    // 1. Log odometer if provided
    if (args.odometer !== undefined) {
      const isFuel = args.type === "fuel" || args.type === "ev_charging";
      await logOdometer(
        ctx,
        userId,
        args.vehicleId,
        args.odometer,
        isFuel ? "fuel" : "manual",
        args.date,
        `Logged with expense: ${args.type}`
      );
    }

    // 2. Financial Ledger Sync
    let linkedTransactionId: Id<"financeTransactions"> | undefined = undefined;
    if (args.syncToLedger && args.ledgerAccountId && args.amount > 0) {
      const account = await ctx.db.get(args.ledgerAccountId);
      if (!account || account.userId !== userId) {
        throw new ConvexError("Ledger account not found");
      }

      linkedTransactionId = await ctx.db.insert("financeTransactions", {
        userId,
        accountId: args.ledgerAccountId,
        type: "expense",
        amount: args.amount,
        currency: account.currency ?? "INR",
        categoryId: args.ledgerCategoryId,
        description: `Vehicle Expense (${args.type}): ${vehicle.nickname ?? vehicle.name}`,
        notes: args.notes ?? "",
        date: args.date,
        isRecurring: false,
        createdAt: now,
        updatedAt: now,
      });

      // Update balance
      await ctx.db.patch(args.ledgerAccountId, {
        balance: account.balance - args.amount,
        updatedAt: now,
      });
    }

    // 3. Create Expense Log
    return await ctx.db.insert("garageExpenseLogs", {
      userId,
      vehicleId: args.vehicleId,
      date: args.date,
      type: args.type,
      amount: args.amount,
      odometer: args.odometer,
      quantity: args.quantity,
      pricePerUnit: args.pricePerUnit,
      fuelType: args.fuelType,
      isFullTank: args.isFullTank,
      notes: args.notes,
      linkedTransactionId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteExpenseLog = mutation({
  args: { id: v.id("garageExpenseLogs") },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.id);
    if (!log) return;

    const { userId } = await requireVehicleAccess(ctx, log.vehicleId, "editor");

    // Remove linked transaction and reverse balance
    if (log.linkedTransactionId) {
      const tx = await ctx.db.get(log.linkedTransactionId);
      if (tx) {
        const account = await ctx.db.get(tx.accountId);
        if (account) {
          await ctx.db.patch(tx.accountId, {
            balance: account.balance + tx.amount,
            updatedAt: Date.now(),
          });
        }
        await ctx.db.delete(log.linkedTransactionId);
      }
    }

    await ctx.db.delete(args.id);
  },
});

// Compute fuel efficiency based on consecutive full tank logs
export const getFuelEfficiency = query({
  args: { vehicleId: v.id("garageVehicles") },
  handler: async (ctx, args) => {
    await requireVehicleAccess(ctx, args.vehicleId, "viewer");

    const fuelLogs = await ctx.db
      .query("garageExpenseLogs")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .order("asc")
      .collect();

    const fuelTypeLogs = fuelLogs.filter(
      (l) => (l.type === "fuel" || l.type === "ev_charging") && l.odometer !== undefined && l.isFullTank && l.quantity !== undefined
    );

    if (fuelTypeLogs.length < 2) {
      return {
        averageEfficiency: 0,
        trend: 0,
        efficiencies: [],
      };
    }

    const efficiencies: { date: string; kmL: number; odometer: number }[] = [];
    for (let i = 1; i < fuelTypeLogs.length; i++) {
      const curr = fuelTypeLogs[i];
      const prev = fuelTypeLogs[i - 1];
      const distance = (curr.odometer ?? 0) - (prev.odometer ?? 0);
      const quantity = curr.quantity ?? 0;

      if (distance > 0 && quantity > 0) {
        efficiencies.push({
          date: curr.date,
          kmL: Number((distance / quantity).toFixed(2)),
          odometer: curr.odometer ?? 0,
        });
      }
    }

    if (efficiencies.length === 0) {
      return { averageEfficiency: 0, trend: 0, efficiencies: [] };
    }

    const averageEfficiency = Number(
      (efficiencies.reduce((s, e) => s + e.kmL, 0) / efficiencies.length).toFixed(2)
    );

    let trend = 0;
    if (efficiencies.length >= 2) {
      const latest = efficiencies[efficiencies.length - 1].kmL;
      const prev = efficiencies[efficiencies.length - 2].kmL;
      trend = Number((latest - prev).toFixed(2));
    }

    return {
      averageEfficiency,
      trend,
      efficiencies,
    };
  },
});

export const getCostHistory = query({
  args: { vehicleId: v.id("garageVehicles"), months: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireVehicleAccess(ctx, args.vehicleId, "viewer");
    const n = args.months ?? 6;
    const now = new Date();
    const results: { month: string; label: string; fuel: number; service: number; other: number }[] = [];

    // Fetch all logs once and filter in-memory for speed
    const expenses = await ctx.db
      .query("garageExpenseLogs")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .collect();

    const services = await ctx.db
      .query("garageServiceLogs")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .collect();

    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const mm = String(m).padStart(2, "0");
      const targetMonth = `${y}-${mm}`; // "YYYY-MM"
      const label = d.toLocaleString("default", { month: "short" });

      const monthExpenses = expenses.filter((e) => e.date.startsWith(targetMonth));
      const monthServices = services.filter((s) => s.serviceDate.startsWith(targetMonth));

      const fuel = monthExpenses
        .filter((e) => e.type === "fuel" || e.type === "ev_charging")
        .reduce((sum, e) => sum + e.amount, 0);

      const other = monthExpenses
        .filter((e) => e.type !== "fuel" && e.type !== "ev_charging")
        .reduce((sum, e) => sum + e.amount, 0);

      const service = monthServices.reduce((sum, s) => sum + s.cost, 0);

      results.push({
        month: targetMonth,
        label,
        fuel,
        service,
        other,
      });
    }

    return results;
  },
});

// ── Maintenance Checklist ─────────────────────────────────────────────────────

export const listMaintenanceItems = query({
  args: { vehicleId: v.id("garageVehicles") },
  handler: async (ctx, args) => {
    await requireVehicleAccess(ctx, args.vehicleId, "viewer");

    return await ctx.db
      .query("garageMaintenanceItems")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .collect();
  },
});

export const createMaintenanceItem = mutation({
  args: {
    vehicleId: v.id("garageVehicles"),
    item: v.string(),
    type: v.union(v.literal("routine"), v.literal("issue"), v.literal("upgrade")),
    intervalKm: v.optional(v.number()),
    intervalDays: v.optional(v.number()),
    dueOdometer: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    setPushReminder: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, vehicle } = await requireVehicleAccess(ctx, args.vehicleId, "editor");
    const now = Date.now();

    let linkedReminderId: Id<"reminders"> | undefined = undefined;

    // Create linked reminder if push is requested and dueDate exists
    if (args.setPushReminder && args.dueDate) {
      const remindAt = new Date(args.dueDate).getTime();
      if (remindAt > now) {
        const scheduledFunctionId = await ctx.scheduler.runAt(remindAt, (internal as any).push.sendReminderPush, {
          userId,
          title: `🔧 Maintenance Due: ${args.item}`,
          body: `Routine maintenance is due today on your ${vehicle.nickname ?? vehicle.name}.`,
          url: `/workspace/garage?vehicleId=${args.vehicleId}&tab=checklist`,
        });

        linkedReminderId = await ctx.db.insert("reminders", {
          userId,
          workspaceId: vehicle.workspaceId,
          title: `🔧 Maintenance Due: ${args.item}`,
          note: `Auto-generated checklist item reminder`,
          remindAt,
          status: "scheduled",
          completedAt: null,
          notifiedAt: null,
          scheduledFunctionId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return await ctx.db.insert("garageMaintenanceItems", {
      userId,
      vehicleId: args.vehicleId,
      item: args.item,
      type: args.type,
      intervalKm: args.intervalKm,
      intervalDays: args.intervalDays,
      dueOdometer: args.dueOdometer,
      dueDate: args.dueDate,
      isCompleted: false,
      completedAt: undefined,
      completedOdometer: undefined,
      linkedReminderId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const completeMaintenanceItem = mutation({
  args: {
    id: v.id("garageMaintenanceItems"),
    completedOdometer: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item || item.isCompleted) return;

    const { userId, vehicle } = await requireVehicleAccess(ctx, item.vehicleId, "editor");
    const now = Date.now();
    const currentOdo = args.completedOdometer ?? vehicle.currentOdometer;

    // 1. If it had a linked reminder, cancel it
    if (item.linkedReminderId) {
      const reminder = await ctx.db.get(item.linkedReminderId);
      if (reminder) {
        if (reminder.scheduledFunctionId) {
          await ctx.scheduler.cancel(reminder.scheduledFunctionId);
        }
        await ctx.db.patch(item.linkedReminderId, {
          status: "completed",
          completedAt: now,
          scheduledFunctionId: undefined,
          updatedAt: now,
        });
      }
    }

    // 2. Mark this item completed
    await ctx.db.patch(args.id, {
      isCompleted: true,
      completedAt: now,
      completedOdometer: currentOdo,
      updatedAt: now,
    });

    // 3. Auto-spawn next checklist item if recurring intervals exist
    if (item.intervalKm || item.intervalDays) {
      const nextDueOdo = item.intervalKm ? currentOdo + item.intervalKm : undefined;
      let nextDueDate: string | undefined = undefined;

      if (item.intervalDays) {
        const d = new Date(now + item.intervalDays * 86400 * 1000);
        nextDueDate = d.toISOString().slice(0, 10);
      }

      let nextReminderId: Id<"reminders"> | undefined = undefined;
      
      // Auto-schedule new reminder if previous one existed and new due date exists
      if (item.linkedReminderId && nextDueDate) {
        const remindAt = new Date(nextDueDate).getTime();
        if (remindAt > now) {
          const scheduledFunctionId = await ctx.scheduler.runAt(remindAt, (internal as any).push.sendReminderPush, {
            userId,
            title: `🔧 Maintenance Due: ${item.item}`,
            body: `Recurring routine maintenance is due today on your ${vehicle.nickname ?? vehicle.name}.`,
            url: `/workspace/garage?vehicleId=${item.vehicleId}&tab=checklist`,
          });

          nextReminderId = await ctx.db.insert("reminders", {
            userId,
            workspaceId: vehicle.workspaceId,
            title: `🔧 Maintenance Due: ${item.item}`,
            note: `Auto-generated checklist item reminder`,
            remindAt,
            status: "scheduled",
            completedAt: null,
            notifiedAt: null,
            scheduledFunctionId,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      await ctx.db.insert("garageMaintenanceItems", {
        userId,
        vehicleId: item.vehicleId,
        item: item.item,
        type: item.type,
        intervalKm: item.intervalKm,
        intervalDays: item.intervalDays,
        dueOdometer: nextDueOdo,
        dueDate: nextDueDate,
        isCompleted: false,
        linkedReminderId: nextReminderId,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const deleteMaintenanceItem = mutation({
  args: { id: v.id("garageMaintenanceItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return;

    await requireVehicleAccess(ctx, item.vehicleId, "editor");

    // Cancel reminder
    if (item.linkedReminderId) {
      const reminder = await ctx.db.get(item.linkedReminderId);
      if (reminder) {
        if (reminder.scheduledFunctionId) {
          await ctx.scheduler.cancel(reminder.scheduledFunctionId);
        }
        await ctx.db.delete(item.linkedReminderId);
      }
    }

    await ctx.db.delete(args.id);
  },
});

// ── Document Vault ───────────────────────────────────────────────────────────

export const listDocuments = query({
  args: { vehicleId: v.id("garageVehicles") },
  handler: async (ctx, args) => {
    await requireVehicleAccess(ctx, args.vehicleId, "viewer");
    return await ctx.db
      .query("garageDocuments")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .order("desc")
      .collect();
  },
});

export const createDocument = mutation({
  args: {
    vehicleId: v.id("garageVehicles"),
    type: garageDocumentTypeValidator,
    label: v.string(),
    fileUrl: v.string(),
    expiryDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireVehicleAccess(ctx, args.vehicleId, "editor");
    return await ctx.db.insert("garageDocuments", {
      userId,
      vehicleId: args.vehicleId,
      type: args.type,
      label: args.label,
      fileUrl: args.fileUrl,
      expiryDate: args.expiryDate,
      notes: args.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteDocument = mutation({
  args: { id: v.id("garageDocuments") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return;

    await requireVehicleAccess(ctx, doc.vehicleId, "editor");
    await ctx.db.delete(args.id);
  },
});

// ── Analytics & Insights ──────────────────────────────────────────────────────

export const getDashboardStats = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");

    const vehicles = await ctx.db
      .query("garageVehicles")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const stats: Record<string, {
      costPerKm: number;
      status: "Healthy" | "Service Due" | "Overdue";
      daysUntilInsurance: number | null;
      daysUntilPuc: number | null;
      daysUntilWarranty: number | null;
      totalCost: number;
    }> = {};

    const now = Date.now();

    for (const v of vehicles) {
      // 1. Calculate costs
      const serviceLogs = await ctx.db
        .query("garageServiceLogs")
        .withIndex("by_vehicleId", (q) => q.eq("vehicleId", v._id))
        .collect();

      const expenseLogs = await ctx.db
        .query("garageExpenseLogs")
        .withIndex("by_vehicleId", (q) => q.eq("vehicleId", v._id))
        .collect();

      const totalServiceCost = serviceLogs.reduce((s, l) => s + l.cost, 0);
      const totalExpenseCost = expenseLogs.reduce((s, l) => s + l.amount, 0);
      const totalCost = totalServiceCost + totalExpenseCost;

      const costPerKm = v.currentOdometer > 0 ? Number((totalCost / v.currentOdometer).toFixed(2)) : 0;

      // 2. Countdowns
      let daysUntilInsurance: number | null = null;
      if (v.insuranceExpiry) {
        const diff = new Date(v.insuranceExpiry).getTime() - now;
        daysUntilInsurance = Math.ceil(diff / (1000 * 86400));
      }

      let daysUntilPuc: number | null = null;
      if (v.pucExpiry) {
        const diff = new Date(v.pucExpiry).getTime() - now;
        daysUntilPuc = Math.ceil(diff / (1000 * 86400));
      }

      let daysUntilWarranty: number | null = null;
      if (v.warrantyExpiry) {
        const diff = new Date(v.warrantyExpiry).getTime() - now;
        daysUntilWarranty = Math.ceil(diff / (1000 * 86400));
      }

      // 3. Health status
      // Standard rule: overdue if checklist items overdue, or service overdue, or PUC/insurance <= 0
      let status: "Healthy" | "Service Due" | "Overdue" = "Healthy";

      // Check checklist items
      const checklist = await ctx.db
        .query("garageMaintenanceItems")
        .withIndex("by_vehicleId", (q) => q.eq("vehicleId", v._id))
        .collect();

      const activeChecklist = checklist.filter((i) => !i.isCompleted);
      const isChecklistOverdue = activeChecklist.some(
        (i) =>
          (i.dueOdometer !== undefined && v.currentOdometer >= i.dueOdometer) ||
          (i.dueDate !== undefined && new Date(i.dueDate).getTime() < now)
      );

      // Check service milestones
      const latestService = serviceLogs[0]; // descending query first or sort
      let isServiceDue = false;
      let isServiceOverdue = false;

      if (latestService) {
        if (latestService.nextServiceOdometer) {
          const diff = latestService.nextServiceOdometer - v.currentOdometer;
          if (diff <= 0) isServiceOverdue = true;
          else if (diff <= 500) isServiceDue = true;
        }
        if (latestService.nextServiceDate) {
          const diffDays = Math.ceil((new Date(latestService.nextServiceDate).getTime() - now) / (1000 * 86400));
          if (diffDays <= 0) isServiceOverdue = true;
          else if (diffDays <= 15) isServiceDue = true;
        }
      }

      if (
        isServiceOverdue ||
        isChecklistOverdue ||
        (daysUntilInsurance !== null && daysUntilInsurance <= 0) ||
        (daysUntilPuc !== null && daysUntilPuc <= 0)
      ) {
        status = "Overdue";
      } else if (
        isServiceDue ||
        (daysUntilInsurance !== null && daysUntilInsurance <= 30) ||
        (daysUntilPuc !== null && daysUntilPuc <= 15)
      ) {
        status = "Service Due";
      }

      stats[v._id] = {
        costPerKm,
        status,
        daysUntilInsurance,
        daysUntilPuc,
        daysUntilWarranty,
        totalCost,
      };
    }

    return stats;
  },
});

export const getGarageInsight = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");

    const vehicles = await ctx.db
      .query("garageVehicles")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (vehicles.length === 0) {
      return "Your garage is empty. Add your vehicles to start tracking metrics and running costs.";
    }

    const now = Date.now();
    const insights: string[] = [];

    for (const v of vehicles) {
      const name = v.nickname ?? v.name;
      
      // Insurance & PUC checks
      if (v.insuranceExpiry) {
        const days = Math.ceil((new Date(v.insuranceExpiry).getTime() - now) / (1000 * 86400));
        if (days < 0) {
          insights.push(`⚠️ ${name}'s insurance expired ${Math.abs(days)} days ago.`);
        } else if (days <= 30) {
          insights.push(`⏳ ${name}'s insurance expires in ${days} days.`);
        }
      }

      if (v.pucExpiry) {
        const days = Math.ceil((new Date(v.pucExpiry).getTime() - now) / (1000 * 86400));
        if (days < 0) {
          insights.push(`⚠️ ${name}'s PUC expired ${Math.abs(days)} days ago.`);
        } else if (days <= 15) {
          insights.push(`⏳ ${name}'s PUC certificate expires in ${days} days.`);
        }
      }

      // Overdue maintenance checklist
      const checklist = await ctx.db
        .query("garageMaintenanceItems")
        .withIndex("by_vehicleId_completed", (q) => q.eq("vehicleId", v._id).eq("isCompleted", false))
        .collect();

      const overdueItems = checklist.filter(
        (i) =>
          (i.dueOdometer !== undefined && v.currentOdometer >= i.dueOdometer) ||
          (i.dueDate !== undefined && new Date(i.dueDate).getTime() < now)
      );

      if (overdueItems.length > 0) {
        const itemNames = overdueItems.slice(0, 2).map((i) => `"${i.item}"`).join(" and ");
        const extra = overdueItems.length > 2 ? ` (+${overdueItems.length - 2} more)` : "";
        insights.push(`🔧 Maintenance item ${itemNames}${extra} is overdue on your ${name}.`);
      }
    }

    // Overall expense insights
    const allExpenses = await ctx.db
      .query("garageExpenseLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);

    const currentMonthCost = allExpenses.filter((e) => e.date.startsWith(currentMonthStr)).reduce((s, e) => s + e.amount, 0);
    const lastMonthCost = allExpenses.filter((e) => e.date.startsWith(lastMonthStr)).reduce((s, e) => s + e.amount, 0);

    if (currentMonthCost > 0 && lastMonthCost > 0) {
      const diff = currentMonthCost - lastMonthCost;
      const pct = Math.abs(Number(((diff / lastMonthCost) * 100).toFixed(1)));
      if (diff > 0 && pct >= 10) {
        insights.push(`📈 Running costs are up ${pct}% this month compared to last month.`);
      } else if (diff < 0 && pct >= 10) {
        insights.push(`📉 Nice! Running costs are down ${pct}% compared to last month.`);
      }
    }

    if (insights.length === 0) {
      return "All vehicles are healthy and active. Insurance, PUC, and routine checklist items are fully up to date!";
    }

    return insights.join(" ");
  },
});

export const checkGarageReminders = mutation({
  args: {},
  handler: async (ctx) => {
    const vehicles = await ctx.db
      .query("garageVehicles")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (const v of vehicles) {
      const name = v.nickname ?? v.name;

      // 1. Insurance Check
      if (v.insuranceExpiry) {
        const expTime = new Date(v.insuranceExpiry).getTime();
        const diffDays = Math.ceil((expTime - now) / oneDayMs);
        if ([30, 15, 7, 1].includes(diffDays)) {
          await ctx.scheduler.runAfter(0, internal.push.sendReminderPush, {
            userId: v.userId,
            title: `🛡️ Insurance Expiry: ${name}`,
            body: `Your vehicle's insurance expires in ${diffDays} days on ${v.insuranceExpiry}.`,
            url: `/workspace/garage?vehicleId=${v._id}&tab=overview`,
          });
        }
      }

      // 2. PUC Check
      if (v.pucExpiry) {
        const expTime = new Date(v.pucExpiry).getTime();
        const diffDays = Math.ceil((expTime - now) / oneDayMs);
        if ([15, 7, 1].includes(diffDays)) {
          await ctx.scheduler.runAfter(0, internal.push.sendReminderPush, {
            userId: v.userId,
            title: `🌿 PUC Expiry: ${name}`,
            body: `Your vehicle's PUC certificate expires in ${diffDays} days on ${v.pucExpiry}.`,
            url: `/workspace/garage?vehicleId=${v._id}&tab=overview`,
          });
        }
      }

      // 3. Warranty Check
      if (v.warrantyExpiry) {
        const expTime = new Date(v.warrantyExpiry).getTime();
        const diffDays = Math.ceil((expTime - now) / oneDayMs);
        if (diffDays === 30) {
          await ctx.scheduler.runAfter(0, internal.push.sendReminderPush, {
            userId: v.userId,
            title: `🛡️ Warranty Expiry: ${name}`,
            body: `Your vehicle's warranty expires in 30 days on ${v.warrantyExpiry}. Check pending issues!`,
            url: `/workspace/garage?vehicleId=${v._id}&tab=overview`,
          });
        }
      }
    }
  },
});
