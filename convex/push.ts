"use node";

// Node.js runtime — only Actions allowed here.
// Queries/Mutations/Subscriptions are in pushHelpers.ts

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import webpush from "web-push";
import { internal } from "./_generated/api";

// Scheduled by ctx.scheduler.runAt from reminders.ts
export const sendReminderPush = internalAction({
    args: {
        userId: v.string(),
        title: v.string(),
        body: v.string(),
        url: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@madvibe.com";

        if (!vapidPublicKey || !vapidPrivateKey) {
            console.error("VAPID keys missing — set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Convex env.");
            return;
        }

        // Configure VAPID inside handler so env vars are always fresh
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        const subscriptions = await ctx.runQuery(internal.pushHelpers.getSubscriptions, {
            userId: args.userId,
        });

        if (!subscriptions.length) {
            console.log("No push subscriptions found for user", args.userId);
            return;
        }

        const payload = JSON.stringify({
            title: args.title,
            body: args.body,
            url: args.url || "/",
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-maskable-192x192.png",
        });

        for (const sub of subscriptions) {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                },
            };

            try {
                await webpush.sendNotification(pushSubscription, payload);
                console.log("✓ Push sent to", sub.endpoint.slice(0, 60) + "...");
            } catch (err: any) {
                console.error("✗ Push failed for endpoint:", sub.endpoint.slice(0, 60), "status:", err?.statusCode);
                // Remove stale subscriptions (expired / unsubscribed device)
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await ctx.runMutation(internal.pushHelpers.removeSubscriptionInternal, { id: sub._id });
                }
            }
        }
    },
});
