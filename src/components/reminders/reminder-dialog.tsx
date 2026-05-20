"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PremiumDateTimePicker } from "@/components/ui/premium-date-time-picker";
import type { Reminder, ReminderSeed } from "@/types/reminder";
import { getDefaultReminderTimestamp } from "./reminder-utils";

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: Id<"workspaces">;
  initialValues?: ReminderSeed;
  reminder?: Reminder | null;
}

interface ReminderFormState {
  title: string;
  note: string;
  remindAt: number | null;
}

function buildInitialState(initialValues?: ReminderSeed, reminder?: Reminder | null): ReminderFormState {
  const remindAt =
    reminder?.remindAt ??
    initialValues?.remindAt ??
    getDefaultReminderTimestamp();

  return {
    title: reminder?.title ?? initialValues?.title ?? "",
    note: reminder?.note ?? initialValues?.note ?? "",
    remindAt,
  };
}

export function ReminderDialog({
  open,
  onOpenChange,
  workspaceId,
  initialValues,
  reminder,
}: ReminderDialogProps) {
  const createReminder = useMutation(api.reminders.create);
  const updateReminder = useMutation(api.reminders.update);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ReminderFormState>(() => buildInitialState(initialValues, reminder));

  const reminderResetKey = [
    reminder?._id ?? "new",
    reminder?.updatedAt ?? "",
    reminder?.title ?? "",
    reminder?.note ?? "",
    reminder?.remindAt ?? "",
    initialValues?.title ?? "",
    initialValues?.note ?? "",
    initialValues?.remindAt ?? "",
    initialValues?.pageId ?? "",
    initialValues?.databaseId ?? "",
    initialValues?.rowId ?? "",
    initialValues?.sourceLabel ?? "",
    initialValues?.sourceUrl ?? "",
  ].join("::");

  useEffect(() => {
    if (!open) return;
    const nextForm = buildInitialState(initialValues, reminder);
    setForm((current) =>
      current.title === nextForm.title &&
      current.note === nextForm.note &&
      current.remindAt === nextForm.remindAt
        ? current
        : nextForm
    );
  }, [open, reminderResetKey]);

  const sourceLabel = reminder?.sourceLabel ?? initialValues?.sourceLabel;
  const sourceUrl = reminder?.sourceUrl ?? initialValues?.sourceUrl;

  const handleSave = async () => {
    const title = form.title.trim();
    if (!title) {
      toast.error("Enter a reminder title");
      return;
    }

    const remindAt = form.remindAt;
    if (!remindAt) {
      toast.error("Choose a valid reminder time");
      return;
    }

    setSaving(true);
    try {
      if (reminder) {
        await updateReminder({
          id: reminder._id,
          title,
          note: form.note.trim() || undefined,
          remindAt,
          sourceLabel,
          sourceUrl,
        });
      } else {
        await createReminder({
          workspaceId,
          title,
          note: form.note.trim() || undefined,
          remindAt,
          pageId: initialValues?.pageId ?? null,
          databaseId: initialValues?.databaseId ?? null,
          rowId: initialValues?.rowId ?? null,
          sourceLabel,
          sourceUrl,
        });
      }

      onOpenChange(false);
      toast.success(reminder ? "Reminder updated" : "Reminder created");
    } catch (error) {
      console.error(error);
      toast.error("Could not save reminder");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={reminder ? "Edit reminder" : "New reminder"}
        className="max-w-xl border-foreground/10 bg-card text-foreground sm:rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {reminder ? "Edit reminder" : "Create reminder"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Capture a follow-up for a task, page, or anything you want surfaced later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Title
            </div>
            <Input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Review renewal status"
              className="h-10 rounded-xl border-foreground/10 bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-foreground/15"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Reminder time
            </div>
            <PremiumDateTimePicker
              value={form.remindAt}
              onChange={(nextValue) => setForm((current) => ({ ...current, remindAt: nextValue }))}
              mode="datetime"
              variant="input"
              placeholder="Pick a date and time"
              className="h-11 rounded-2xl border-foreground/10 bg-input hover:bg-accent"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Note
            </div>
            <Textarea
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Optional details, context, or next action."
              className="min-h-[104px] rounded-2xl border-foreground/10 bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-foreground/15"
            />
          </div>

          {sourceLabel && (
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 text-sm text-foreground/80">
              <div className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Linked source
              </div>
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span>{sourceLabel}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl text-foreground/80 hover:bg-foreground/[0.06] hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            type="button"
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : reminder ? "Save changes" : "Create reminder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
