import { internalMutation } from "../_generated/server";

/**
 * One-off cleanup of the legacy `pin_generator` automation rows and their
 * backing scaffolding (pages, databases, views, rows). Run manually via the
 * Convex dashboard once — the automation module no longer creates databases,
 * pages, or views for new tiles.
 */
export const wipeOldAutomations = internalMutation({
  args: {},
  handler: async (ctx) => {
    let runsDeleted = 0;
    let rowsDeleted = 0;
    let viewsDeleted = 0;
    let databasesDeleted = 0;
    let pagesDeleted = 0;
    let automationsDeleted = 0;

    const runs = await ctx.db.query("automationRuns").collect();
    for (const run of runs) {
      await ctx.db.delete(run._id);
      runsDeleted++;
    }

    const automations = await ctx.db.query("automations").collect();
    for (const automation of automations) {
      if (automation.databaseId) {
        const rows = await ctx.db
          .query("rows")
          .withIndex("by_databaseId", (q) => q.eq("databaseId", automation.databaseId!))
          .collect();
        for (const row of rows) {
          await ctx.db.delete(row._id);
          rowsDeleted++;
        }

        const views = await ctx.db
          .query("views")
          .withIndex("by_databaseId", (q) => q.eq("databaseId", automation.databaseId!))
          .collect();
        for (const view of views) {
          await ctx.db.delete(view._id);
          viewsDeleted++;
        }

        await ctx.db.delete(automation.databaseId);
        databasesDeleted++;
      }

      if (automation.pageId) {
        await ctx.db.delete(automation.pageId);
        pagesDeleted++;
      }

      await ctx.db.delete(automation._id);
      automationsDeleted++;
    }

    return {
      runsDeleted,
      rowsDeleted,
      viewsDeleted,
      databasesDeleted,
      pagesDeleted,
      automationsDeleted,
    };
  },
});
