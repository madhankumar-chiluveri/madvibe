import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const OCI_CONFIG_VALIDATOR = v.object({
  namespace: v.string(),
  bucketName: v.string(),
  region: v.string(),
  tenancyOcid: v.string(),
  userOcid: v.string(),
  fingerprint: v.string(),
  privateKeyPem: v.string(),
});

/**
 * Returns the saved OCI config for the current user. The full private key is
 * intentionally returned only to its owner (caller). Settings UI uses this to
 * pre-fill the form.
 */
export const getOciConfig = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return settings?.oci ?? null;
  },
});

export const hasOciConfig = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return Boolean(settings?.oci);
  },
});

export const saveOciConfig = mutation({
  args: { oci: OCI_CONFIG_VALIDATOR },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", String(userId)))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { oci: args.oci });
    } else {
      await ctx.db.insert("userSettings", { userId: String(userId), oci: args.oci });
    }
  },
});

export const clearOciConfig = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", String(userId)))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { oci: undefined });
    }
  },
});
