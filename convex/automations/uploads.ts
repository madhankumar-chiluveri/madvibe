import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";
import { requireWorkspaceAccess } from "../workspaceAccess";

export const listRecentUploads = query({
  args: { workspaceId: v.id("workspaces"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");
    return await ctx.db
      .query("ociUploadLog")
      .withIndex("by_workspace_uploaded", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(args.limit ?? 25);
  },
});

// Internal helpers consumed by the Node action in `ociUploader.ts`.
export const _loadConfigAndWorkspace = internalQuery({
  args: { userId: v.string(), workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const isOwner = workspace.userId === args.userId;
    let role: "viewer" | "editor" | "owner" | null = isOwner ? "owner" : null;
    if (!isOwner) {
      const membership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspaceId_userId", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("userId", args.userId),
        )
        .unique();
      role = membership?.role ?? null;
    }
    if (!role || role === "viewer") {
      throw new Error("You do not have permission to upload to this workspace");
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return { oci: settings?.oci ?? null };
  },
});

export const _loadSelfConfig = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    return settings ?? null;
  },
});

export const _recordUploadLog = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    filename: v.string(),
    publicUrl: v.string(),
    sizeBytes: v.number(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("ociUploadLog", {
      workspaceId: args.workspaceId,
      userId: args.userId,
      filename: args.filename,
      publicUrl: args.publicUrl,
      sizeBytes: args.sizeBytes,
      contentType: args.contentType,
      uploadedAt: Date.now(),
    });
  },
});
