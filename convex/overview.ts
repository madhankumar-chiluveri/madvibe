import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireWorkspaceAccess, requireAuthenticatedUserId } from "./workspaceAccess";
import type { Id } from "./_generated/dataModel";

export const getWorkspaceCalendarTasks = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");

    // Get all pages in the workspace (not archived) once to build a lookup map
    const allPages = await ctx.db
      .query("pages")
      .withIndex("by_workspaceId_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .collect();

    const pagesMap = new Map(allPages.map((p) => [p._id, p]));

    // Find space/page title helper
    const resolveSpaceName = (pageId: any): string => {
      let current = pagesMap.get(pageId);
      let depth = 0;
      while (current && depth < 10) {
        if (current.isSpaceRoot) {
          return current.title;
        }
        if (!current.parentId) {
          return current.title;
        }
        current = pagesMap.get(current.parentId);
        depth++;
      }
      return "Main Workspace";
    };

    // Filter database pages
    const dbPages = allPages.filter((p) => p.type === "database");
    const result = [];

    for (const page of dbPages) {
      const db = await ctx.db
        .query("databases")
        .withIndex("by_pageId", (q) => q.eq("pageId", page._id))
        .first();

      if (!db) continue;

      const titleProp = db.properties.find(
        (p: any) =>
          p.type === "title" ||
          p.name?.toLowerCase() === "task" ||
          p.name?.toLowerCase() === "name"
      );
      const dateProps = db.properties.filter(
        (p: any) => p.type === "date" || p.type === "created_time"
      );
      const statusProp = db.properties.find(
        (p: any) => p.name?.toLowerCase() === "status" && p.type === "select"
      );

      if (dateProps.length === 0) continue;

      const rows = await ctx.db
        .query("rows")
        .withIndex("by_databaseId", (q) => q.eq("databaseId", db._id))
        .filter((q) => q.neq(q.field("isArchived"), true))
        .collect();

      const spaceName = resolveSpaceName(page._id);

      for (const row of rows) {
        const taskName = titleProp ? row.data[titleProp.id] || "Untitled" : "Untitled";

        let statusVal = null;
        let statusColor = null;
        if (statusProp && row.data[statusProp.id]) {
          const val = row.data[statusProp.id];
          const options = statusProp.config?.options || statusProp.options || [];
          const opt = options.find((o: any) => o.id === val || o.label === val);
          statusVal = opt ? opt.label : String(val);
          statusColor = opt ? opt.color : null;
        }

        for (const dateProp of dateProps) {
          const rawVal = row.data[dateProp.id];
          if (rawVal) {
            let timestamp: number | null = null;
            if (typeof rawVal === "number") {
              timestamp = rawVal;
            } else if (typeof rawVal === "string") {
              const parsed = Date.parse(rawVal);
              if (!isNaN(parsed)) {
                timestamp = parsed;
              }
            }

            if (timestamp) {
              result.push({
                rowId: row._id,
                databaseId: db._id,
                pageId: page._id,
                databaseName: page.title || db.name || "Untitled Database",
                spaceName,
                taskName: String(taskName),
                datePropertyName: dateProp.name || "Date",
                datePropertyId: dateProp.id,
                datePropertyType: dateProp.type,
                timestamp,
                status: statusVal,
                statusColor,
              });
            }
          }
        }
      }
    }

    return result;
  },
});

export const getOverviewMetrics = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");

    const now = Date.now();

    // 1. Pages/Projects counts
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_workspaceId_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .collect();

    const dbPages = pages.filter((p) => p.type === "database");
    const totalProjects = dbPages.length;

    // 2. Tasks aggregated count
    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let pendingTasks = 0;

    for (const page of dbPages) {
      const db = await ctx.db
        .query("databases")
        .withIndex("by_pageId", (q) => q.eq("pageId", page._id))
        .first();

      if (!db) continue;

      const rows = await ctx.db
        .query("rows")
        .withIndex("by_databaseId", (q) => q.eq("databaseId", db._id))
        .filter((q) => q.neq(q.field("isArchived"), true))
        .collect();

      const statusProp = db.properties.find(
        (p: any) => p.name?.toLowerCase() === "status" && p.type === "select"
      );

      for (const row of rows) {
        totalTasks++;
        if (statusProp) {
          const val = row.data[statusProp.id];
          const options = statusProp.config?.options || statusProp.options || [];
          const opt = options.find((o: any) => o.id === val || o.label === val);
          const statusLabel = (opt ? opt.label : String(val || "")).toLowerCase();

          if (statusLabel === "done" || statusLabel === "completed") {
            completedTasks++;
          } else if (statusLabel === "in progress" || statusLabel === "running") {
            inProgressTasks++;
          } else {
            pendingTasks++;
          }
        } else {
          const checkboxProp = db.properties.find((p: any) => p.type === "checkbox");
          if (checkboxProp && row.data[checkboxProp.id] === true) {
            completedTasks++;
          } else {
            pendingTasks++;
          }
        }
      }
    }

    // 3. Finances
    const monthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const startDate = `${monthStr}-01`;
    const [year, month] = monthStr.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${monthStr}-${String(lastDay).padStart(2, "0")}`;

    const txns = await ctx.db
      .query("financeTransactions")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).gte("date", startDate)
      )
      .filter((q) => q.lte(q.field("date"), endDate))
      .collect();

    const income = txns
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expenses = txns
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    const accounts = await ctx.db
      .query("financeAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    const netWorth = accounts.reduce((s, a) => s + a.balance, 0);

    // 4. Habits
    const todayStr = new Date().toISOString().slice(0, 10);
    const habits = await ctx.db
      .query("habits")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const logs = await ctx.db
      .query("habitLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", todayStr))
      .collect();

    const completedHabitsCount = logs.filter((l) => l.completed).length;
    const totalHabitsCount = habits.length;

    let longestStreak = 0;
    for (const h of habits) {
      if (h.streak > longestStreak) {
        longestStreak = h.streak;
      }
    }

    // 5. Reminders
    const scheduledReminders = await ctx.db
      .query("reminders")
      .withIndex("by_workspaceId_status_remindAt", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "scheduled")
      )
      .order("asc")
      .collect();

    const nextReminders = scheduledReminders
      .filter((r) => r.userId === userId)
      .slice(0, 5)
      .map((r) => ({
        _id: r._id,
        title: r.title,
        remindAt: r.remindAt,
        note: r.note,
      }));

    // 6. Vehicles
    const vehicles = await ctx.db
      .query("garageVehicles")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const activeVehicles = [];
    for (const v of vehicles) {
      const serviceLogs = await ctx.db
        .query("garageServiceLogs")
        .withIndex("by_vehicleId", (q) => q.eq("vehicleId", v._id))
        .collect();

      let daysUntilInsurance = null;
      if (v.insuranceExpiry) {
        daysUntilInsurance = Math.ceil((new Date(v.insuranceExpiry).getTime() - now) / (1000 * 86400));
      }

      let daysUntilPuc = null;
      if (v.pucExpiry) {
        daysUntilPuc = Math.ceil((new Date(v.pucExpiry).getTime() - now) / (1000 * 86400));
      }

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

      const latestService = serviceLogs[0];
      let isServiceDue = false;
      let isServiceOverdue = false;

      if (latestService) {
        if (latestService.nextServiceOdometer) {
          const diff = latestService.nextServiceOdometer - v.currentOdometer;
          if (diff <= 0) isServiceOverdue = true;
          else if (diff <= 500) isServiceDue = true;
        }
        if (latestService.nextServiceDate) {
          const diffDays = Math.ceil(
            (new Date(latestService.nextServiceDate).getTime() - now) / (1000 * 86400)
          );
          if (diffDays <= 0) isServiceOverdue = true;
          else if (diffDays <= 15) isServiceDue = true;
        }
      }

      let status: "Healthy" | "Service Due" | "Overdue" = "Healthy";
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

      activeVehicles.push({
        _id: v._id,
        name: v.name,
        nickname: v.nickname,
        currentOdometer: v.currentOdometer,
        status,
        daysUntilInsurance,
        daysUntilPuc,
        insuranceExpiry: v.insuranceExpiry,
        pucExpiry: v.pucExpiry,
      });
    }

    return {
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        pending: pendingTasks,
        projects: totalProjects,
      },
      finances: {
        netWorth,
        income,
        expenses,
        accounts: accounts.map((a) => ({
          _id: a._id,
          name: a.name,
          balance: a.balance,
          color: a.color || "gray",
          type: a.type,
          currency: a.currency || "INR",
        })),
      },
      habits: {
        total: totalHabitsCount,
        completed: completedHabitsCount,
        percentage: totalHabitsCount > 0 ? Math.round((completedHabitsCount / totalHabitsCount) * 100) : 0,
        longestStreak,
      },
      reminders: nextReminders,
      vehicles: activeVehicles,
    };
  },
});
