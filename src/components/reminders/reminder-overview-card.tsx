"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { BellRing, ChevronRight, Plus } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app.store";
import type { Reminder } from "@/types/reminder";
import { ReminderDialog } from "./reminder-dialog";
import {
  formatReminderDate,
  formatReminderRelative,
  getReminderBucket,
} from "./reminder-utils";

export function ReminderOverviewCard() {
  const setReminderCenterOpen = useAppStore((state) => state.setReminderCenterOpen);
  const { resolvedWorkspaceId } = useResolvedWorkspace();
  const reminders = useQuery(
    api.reminders.listByWorkspace,
    resolvedWorkspaceId
      ? { workspaceId: resolvedWorkspaceId, includeCompleted: false, limit: 8 }
      : "skip"
  ) as Reminder[] | undefined;
  const [composerOpen, setComposerOpen] = useState(false);
  const now = Date.now();

  const nextReminders = useMemo(
    () =>
      (reminders ?? [])
        .filter((reminder) => reminder.status === "scheduled")
        .sort((left, right) => left.remindAt - right.remindAt)
        .slice(0, 4),
    [reminders]
  );

  return (
    <>
      <div className="bg-card border rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <BellRing className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reminders</span>
          <button
            type="button"
            onClick={() => setReminderCenterOpen(true)}
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            Open all
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-2.5">
          {nextReminders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-5 text-center text-sm text-muted-foreground">
              No reminders yet. Create one for a task, project, or follow-up.
            </div>
          ) : (
            nextReminders.map((reminder) => {
              const bucket = getReminderBucket(reminder, now);
              const bucketClass =
                bucket === "overdue"
                  ? "border-red-500/20 bg-red-500/8 text-red-300"
                  : bucket === "today"
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                    : "border-white/10 bg-white/[0.03] text-foreground";

              return (
                <div
                  key={reminder._id}
                  className={`rounded-xl border px-3 py-2 ${bucketClass}`}
                >
                  <div className="text-sm font-medium">{reminder.title}</div>
                  <div className="mt-1 text-xs opacity-80">
                    {formatReminderDate(reminder.remindAt)} · {formatReminderRelative(reminder.remindAt)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-4 h-9 w-full rounded-xl"
          onClick={() => setComposerOpen(true)}
          disabled={!resolvedWorkspaceId}
        >
          <Plus className="mr-2 h-4 w-4" />
          New reminder
        </Button>
      </div>

      {resolvedWorkspaceId && (
        <ReminderDialog
          open={composerOpen}
          onOpenChange={setComposerOpen}
          workspaceId={resolvedWorkspaceId}
        />
      )}
    </>
  );
}
