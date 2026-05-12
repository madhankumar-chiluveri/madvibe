import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export type PushSubscribeResult =
    | { status: "granted" }
    | { status: "denied" }
    | { status: "dismissed" }
    | { status: "error"; message: string };

export function usePush() {
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");

    const saveSubscription = useMutation(api.pushHelpers.saveSubscription);

    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
            setIsSupported(true);
            setPermission(Notification.permission);
        }
    }, []);

    // Refresh permission state (e.g. when user panel reopens)
    const refreshPermission = () => {
        if (typeof window !== "undefined" && "Notification" in window) {
            setPermission(Notification.permission);
        }
    };

    const subscribe = async (): Promise<PushSubscribeResult> => {
        if (!isSupported) return { status: "error", message: "Push not supported in this browser" };

        // Already denied by user in browser settings — can't programmatically re-prompt
        if (Notification.permission === "denied") {
            setPermission("denied");
            return { status: "denied" };
        }

        try {
            const permissionResult = await Notification.requestPermission();
            setPermission(permissionResult);

            if (permissionResult === "denied") {
                return { status: "denied" };
            }

            if (permissionResult !== "granted") {
                return { status: "dismissed" };
            }

            const registration = await navigator.serviceWorker.ready;

            const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!publicVapidKey) {
                return { status: "error", message: "Missing VAPID public key in environment" };
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
            });

            const sub = JSON.parse(JSON.stringify(subscription));

            await saveSubscription({
                endpoint: sub.endpoint,
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
            });

            return { status: "granted" };
        } catch (error) {
            console.error("Failed to subscribe to push notifications:", error);
            return { status: "error", message: String(error) };
        }
    };

    return { isSupported, permission, subscribe, refreshPermission };
}
