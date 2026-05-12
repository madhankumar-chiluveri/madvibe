import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireWorkspaceAccess } from "../workspaceAccess";
import { parsePinManagerCsv } from "./csvUtils";

const EMPTY_PIN = {
  title: "",
  mediaUrl: "",
  pinterestBoard: "India Deals & Finds",
  thumbnail: "",
  description: "",
  link: "",
  publishDate: "",
  keywords: "",
};

const PIN_PATCH_VALIDATOR = v.object({
  title: v.optional(v.string()),
  mediaUrl: v.optional(v.string()),
  pinterestBoard: v.optional(v.string()),
  thumbnail: v.optional(v.string()),
  description: v.optional(v.string()),
  link: v.optional(v.string()),
  publishDate: v.optional(v.string()),
  keywords: v.optional(v.string()),
});

export const listPins = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");
    return await ctx.db
      .query("pinManagerPins")
      .withIndex("by_workspace_sort", (q) => q.eq("workspaceId", args.workspaceId))
      .order("asc")
      .collect();
  },
});

export const addPin = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId, "editor");
    const now = Date.now();
    return await ctx.db.insert("pinManagerPins", {
      workspaceId: args.workspaceId,
      ...EMPTY_PIN,
      sortOrder: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePin = mutation({
  args: { pinId: v.id("pinManagerPins"), patch: PIN_PATCH_VALIDATOR },
  handler: async (ctx, args) => {
    const pin = await ctx.db.get(args.pinId);
    if (!pin) throw new Error("Pin not found");
    await requireWorkspaceAccess(ctx, pin.workspaceId, "editor");
    await ctx.db.patch(args.pinId, { ...args.patch, updatedAt: Date.now() });
  },
});

export const deletePin = mutation({
  args: { pinId: v.id("pinManagerPins") },
  handler: async (ctx, args) => {
    const pin = await ctx.db.get(args.pinId);
    if (!pin) return;
    await requireWorkspaceAccess(ctx, pin.workspaceId, "editor");
    await ctx.db.delete(args.pinId);
  },
});

export const clearPins = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId, "editor");
    const pins = await ctx.db
      .query("pinManagerPins")
      .withIndex("by_workspace_sort", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const pin of pins) await ctx.db.delete(pin._id);
    return pins.length;
  },
});

export const appendCsvText = mutation({
  args: { workspaceId: v.id("workspaces"), csvText: v.string() },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId, "editor");
    const parsed = parsePinManagerCsv(args.csvText);
    if (parsed.length === 0) return 0;

    const existing = await ctx.db
      .query("pinManagerPins")
      .withIndex("by_workspace_sort", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(1);

    let nextSort = existing.length > 0 ? existing[0].sortOrder + 1 : Date.now();
    const now = Date.now();
    for (const row of parsed) {
      await ctx.db.insert("pinManagerPins", {
        workspaceId: args.workspaceId,
        title: row.title ?? "",
        mediaUrl: row.mediaUrl ?? "",
        pinterestBoard: row.pinterestBoard ?? EMPTY_PIN.pinterestBoard,
        thumbnail: row.thumbnail ?? "",
        description: row.description ?? "",
        link: row.link ?? "",
        publishDate: row.publishDate ?? "",
        keywords: row.keywords ?? "",
        sortOrder: nextSort++,
        createdAt: now,
        updatedAt: now,
      });
    }
    return parsed.length;
  },
});

export const replaceCsvText = mutation({
  args: { workspaceId: v.id("workspaces"), csvText: v.string() },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId, "editor");
    const parsed = parsePinManagerCsv(args.csvText);

    const existing = await ctx.db
      .query("pinManagerPins")
      .withIndex("by_workspace_sort", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const pin of existing) await ctx.db.delete(pin._id);

    let sort = Date.now();
    const now = Date.now();
    for (const row of parsed) {
      await ctx.db.insert("pinManagerPins", {
        workspaceId: args.workspaceId,
        title: row.title ?? "",
        mediaUrl: row.mediaUrl ?? "",
        pinterestBoard: row.pinterestBoard ?? EMPTY_PIN.pinterestBoard,
        thumbnail: row.thumbnail ?? "",
        description: row.description ?? "",
        link: row.link ?? "",
        publishDate: row.publishDate ?? "",
        keywords: row.keywords ?? "",
        sortOrder: sort++,
        createdAt: now,
        updatedAt: now,
      });
    }
    return parsed.length;
  },
});

export const attachMediaUrl = mutation({
  args: { pinId: v.id("pinManagerPins"), mediaUrl: v.string() },
  handler: async (ctx, args) => {
    const pin = await ctx.db.get(args.pinId);
    if (!pin) throw new Error("Pin not found");
    await requireWorkspaceAccess(ctx, pin.workspaceId, "editor");
    await ctx.db.patch(args.pinId, { mediaUrl: args.mediaUrl, updatedAt: Date.now() });
  },
});

// Internal version usable by the OCI uploader action without re-checking auth
// (the action has already validated workspace access via the user identity path).
export const _attachMediaUrlInternal = internalMutation({
  args: { pinId: v.id("pinManagerPins"), mediaUrl: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.pinId, { mediaUrl: args.mediaUrl, updatedAt: Date.now() });
  },
});
