// This file runs in the default Convex runtime (NOT Node.js)
// It contains the internal query/mutation helpers used by push actions

import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const saveSubscription = mutation({
    args: {
        endpoint: v.string(),
        p256dh: v.string(),
        auth: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");
        const userId = identity.subject;

        const existing = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("endpoint"), args.endpoint))
            .first();

        if (!existing) {
            await ctx.db.insert("pushSubscriptions", {
                userId,
                endpoint: args.endpoint,
                p256dh: args.p256dh,
                auth: args.auth,
                createdAt: Date.now(),
            });
        }
    },
});

export const removeSubscription = mutation({
    args: { endpoint: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const existing = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .filter((q) => q.eq(q.field("endpoint"), args.endpoint))
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});

export const hasSubscription = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return false;
        const sub = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .first();
        return !!sub;
    },
});

export const getSubscriptions = internalQuery({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();
    },
});

export const removeSubscriptionInternal = internalMutation({
    args: { id: v.id("pushSubscriptions") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
