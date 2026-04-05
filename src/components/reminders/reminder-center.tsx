"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { usePush } from "@/hooks/use-push";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/app.store";
import type { Reminder } from "@/types/reminder";
import { ReminderDialog } from "./reminder-dialog";
import {
  formatReminderDate,
  formatReminderRelative,
  getReminderBucket,
} from "./reminder-utils";

export function ReminderCenter() {
  const router = useRouter();
  const { reminderCenterOpen, setReminderCenterOpen } = useAppStore();
  const [now, setNow] = useState(() => Date.now());
  const { resolvedWorkspaceId } = useResolvedWorkspace();
  const { isSupported, permission: pushPermission, subscribe } = usePush();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const reminders = useQuery(
    api.reminders.listByWorkspace,
    resolvedWorkspaceId
      ? { workspaceId: resolvedWorkspaceId, includeCompleted: true, limit: 200 }
      : "skip"
  ) as Reminder[] | undefined;
  const summary = useQuery(
    api.reminders.getSummary,
    resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId, now } : "skip"
  );
  const setCompleted = useMutation(api.reminders.setCompleted);
  const snoozeReminder = useMutation(api.reminders.snooze);
  const removeReminder = useMutation(api.reminders.remove);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported"
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    setNotificationPermission(Notification.permission);
  }, [reminderCenterOpen, pushPermission]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const grouped = useMemo(() => {
    const all = reminders ?? [];

    return {
      overdue: all.filter((reminder) => getReminderBucket(reminder, now) === "overdue"),
      today: all.filter((reminder) => getReminderBucket(reminder, now) === "today"),
      upcoming: all.filter((reminder) => getReminderBucket(reminder, now) === "upcoming"),
      completed: all
        .filter((reminder) => reminder.status === "completed")
        .sort((left, right) => (right.completedAt ?? 0) - (left.completedAt ?? 0))
        .slice(0, 12),
    };
  }, [now, reminders]);

  const handleEnableNotifications = async () => {
    if (!isSupported) {
      toast.error("Push notifications are not supported in this browser");
      return;
    }

    // Already blocked — guide the user to unblock manually
    if (pushPermission === "denied") {
      toast.error("Notifications are blocked for this site.", {
        description: "Click the 🔒 lock icon in your browser's address bar → Site settings → Notifications → Allow, then refresh the page.",
        duration: 10000,
      });
      return;
    }

    setIsSubscribing(true);
    try {
      const result = await subscribe();
      if (result.status === "granted") {
        setNotificationPermission("granted");
        toast.success("Push notifications enabled! You'll get alerts even when the app is closed.", {
          icon: "🔔",
          duration: 5000,
        });
      } else if (result.status === "denied") {
        toast.error("Notifications blocked.", {
          description: "Click the 🔒 lock icon → Site settings → Notifications → Allow, then refresh.",
          duration: 10000,
        });
      } else if (result.status === "dismissed") {
        toast.info("You can enable notifications anytime from here.", { duration: 4000 });
      } else {
        toast.error("Could not enable notifications");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not enable notifications");
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSnooze = async (reminder: Reminder, durationMs: number) => {
    try {
      await snoozeReminder({
        id: reminder._id,
        remindAt: Date.now() + durationMs,
      });
      toast.success("Reminder snoozed");
    } catch (error) {
      console.error(error);
      toast.error("Could not snooze reminder");
    }
  };

  const handleToggleComplete = async (reminder: Reminder) => {
    try {
      await setCompleted({
        id: reminder._id,
        completed: reminder.status !== "completed",
      });
    } catch (error) {
      console.error(error);
      toast.error("Could not update reminder");
    }
  };

  const handleRemove = async (reminder: Reminder) => {
    try {
      await removeReminder({ id: reminder._id });
      toast.success("Reminder deleted");
    } catch (error) {
      console.error(error);
      toast.error("Could not delete reminder");
    }
  };

  const renderSection = (title: string, sectionReminders: Reminder[], emptyText: string) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
          {title}
        </h3>
        <span className="text-xs text-zinc-600">{sectionReminders.length}</span>
      </div>

      {sectionReminders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-zinc-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-2">
          {sectionReminders.map((reminder) => (
            <div
              key={reminder._id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => void handleToggleComplete(reminder)}
                  className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label={reminder.status === "completed" ? "Mark scheduled" : "Mark complete"}
                >
                  {reminder.status === "completed" ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setEditingReminder(reminder)}
                    className="block text-left"
                  >
                    <div className="text-sm font-medium text-zinc-100">{reminder.title}</div>
                    {reminder.note && (
                      <div className="mt-1 text-sm leading-6 text-zinc-400">{reminder.note}</div>
                    )}
                  </button>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatReminderDate(reminder.remindAt)}
                    </span>
                    <span>{formatReminderRelative(reminder.remindAt)}</span>
                    {reminder.sourceLabel && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1">
                        <Bell className="h-3.5 w-3.5" />
                        {reminder.sourceLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {reminder.status !== "completed" && (
                    <button
                      type="button"
                      onClick={() => void handleSnooze(reminder, 60 * 60 * 1000)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
                      title="Snooze 1 hour"
                    >
                      <Clock3 className="h-4 w-4" />
                    </button>
                  )}
                  {reminder.sourceUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        router.push(reminder.sourceUrl!);
                        setReminderCenterOpen(false);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
                      title="Open source"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingReminder(reminder)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
                    title="Edit reminder"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemove(reminder)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-500/12 hover:text-red-300"
                    title="Delete reminder"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={reminderCenterOpen} onOpenChange={setReminderCenterOpen}>
        <DialogContent
          title="Reminders"
          className="max-w-4xl border-white/10 bg-[#141311] text-zinc-100 sm:rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Reminders</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Capture standalone reminders and linked follow-ups from tasks, pages, and databases.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm text-zinc-300">
              <BellRing className="h-4 w-4 text-zinc-500" />
              {summary?.total ?? grouped.overdue.length + grouped.today.length + grouped.upcoming.length} scheduled
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/10 px-3 py-1 text-sm text-red-200">
              {summary?.overdue ?? grouped.overdue.length} overdue
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {isSupported && notificationPermission !== "granted" && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSubscribing}
                  className="rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200"
                  onClick={() => void handleEnableNotifications()}
                >
                  {isSubscribing ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      Enabling...
                    </>
                  ) : (
                    <>
                      <Smartphone className="mr-2 h-4 w-4" />
                      Enable push alerts
                    </>
                  )}
                </Button>
              )}
              {isSupported && notificationPermission === "granted" && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-300">
                  <BellRing className="h-3.5 w-3.5" />
                  Push alerts on
                </span>
              )}
              {!isSupported && notificationPermission !== "unsupported" && notificationPermission !== "granted" && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-500">
                  <BellOff className="h-3.5 w-3.5" />
                  Notifications not supported
                </span>
              )}
              <Button
                type="button"
                className="rounded-xl bg-white text-black hover:bg-zinc-200"
                onClick={() => setComposerOpen(true)}
                disabled={!resolvedWorkspaceId}
              >
                <Plus className="mr-2 h-4 w-4" />
                New reminder
              </Button>
            </div>
          </div>

          <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
            {renderSection("Overdue", grouped.overdue, "Nothing overdue right now.")}
            {renderSection("Today", grouped.today, "No reminders left for today.")}
            {renderSection("Upcoming", grouped.upcoming, "No upcoming reminders yet.")}
            {renderSection("Completed", grouped.completed, "Completed reminders will show here.")}
          </div>
        </DialogContent>
      </Dialog>

      {resolvedWorkspaceId && (
        <ReminderDialog
          open={composerOpen}
          onOpenChange={setComposerOpen}
          workspaceId={resolvedWorkspaceId}
        />
      )}

      {resolvedWorkspaceId && editingReminder && (
        <ReminderDialog
          open={Boolean(editingReminder)}
          onOpenChange={(open) => {
            if (!open) setEditingReminder(null);
          }}
          workspaceId={resolvedWorkspaceId}
          reminder={editingReminder}
        />
      )}
    </>
  );
}
