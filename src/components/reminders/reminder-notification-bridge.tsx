"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import type { Reminder } from "@/types/reminder";

export function ReminderNotificationBridge() {
  const [now, setNow] = useState(() => Date.now());
  const shownIds = useRef<Set<string>>(new Set());
  const { resolvedWorkspaceId } = useResolvedWorkspace();
  const markNotified = useMutation(api.reminders.markNotified);
  const dueReminders = useQuery(
    api.reminders.listDue,
    resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId, now } : "skip"
  ) as Reminder[] | undefined;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!dueReminders || dueReminders.length === 0) return;

    dueReminders.forEach((reminder) => {
      if (shownIds.current.has(reminder._id)) return;
      shownIds.current.add(reminder._id);

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(reminder.title, {
          body: reminder.note ?? reminder.sourceLabel ?? "Reminder is due",
          tag: reminder._id,
        });

        notification.onclick = () => {
          window.focus();
          if (reminder.sourceUrl) {
            window.location.assign(reminder.sourceUrl);
          }
          notification.close();
        };
      } else if (typeof document !== "undefined" && document.visibilityState === "visible") {
        toast.info(reminder.title, {
          description: reminder.note ?? reminder.sourceLabel ?? "Reminder is due now.",
        });
      } else {
        shownIds.current.delete(reminder._id);
        return;
      }

      void markNotified({ id: reminder._id });
    });
  }, [dueReminders, markNotified]);

  return null;
}
