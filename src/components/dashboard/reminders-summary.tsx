"use client";

import { useState, memo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Clock, Plus, Loader2, Bell, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Reminder {
  _id: string;
  title: string;
  remindAt: number;
  note?: string;
}

interface RemindersSummaryProps {
  reminders: Reminder[];
  workspaceId: string;
}

export const RemindersSummary = memo(function RemindersSummary({
  reminders = [],
  workspaceId,
}: RemindersSummaryProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const createReminder = useMutation(api.reminders.create);
  const completeReminder = useMutation(api.reminders.setCompleted);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || !workspaceId || loading) return;

    setLoading(true);
    try {
      // Create reminder scheduled for 1 hour from now by default
      const remindAt = Date.now() + 60 * 60 * 1000;
      await createReminder({
        workspaceId: workspaceId as any,
        title: trimmed,
        remindAt,
      });
      toast.success("Reminder created");
      setValue("");
    } catch {
      toast.error("Failed to create reminder");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await completeReminder({ id: id as any, completed: true });
      toast.success("Reminder completed");
    } catch {
      toast.error("Failed to complete reminder");
    }
  };

  const formatRemindAt = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    }

    const dateStr = date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    return `${dateStr}, ${timeStr}`;
  };

  return (
    <div className="rounded-[10px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b mb-3">
        <Bell className="w-4 h-4 text-notion-gray-text" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
          Reminders & Alerts
        </span>
        <span className="ml-auto text-[10px] font-bold text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
          {reminders.length} Pending
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[200px] scrollbar-hide mb-4 select-none">
        {reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckSquare className="w-8 h-8 text-muted-foreground/30 mb-1" />
            <p className="text-xs font-semibold text-muted-foreground">All caught up!</p>
            <p className="text-[10px] text-muted-foreground/60">No pending reminders</p>
          </div>
        ) : (
          reminders.map((r) => (
            <div
              key={r._id}
              className="flex items-start justify-between gap-3 p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors group cursor-pointer"
              onClick={() => handleToggle(r._id)}
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-xs font-semibold text-foreground leading-snug truncate group-hover:text-primary">
                  {r.title}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-notion-blue-text" />
                  {formatRemindAt(r.remindAt)}
                </span>
              </div>
              <button
                className="w-4 h-4 border rounded border-border flex items-center justify-center hover:border-notion-green-text hover:bg-notion-green-bg/20 transition-all shrink-0 mt-0.5"
                title="Mark Completed"
              >
                <div className="w-2 h-2 rounded bg-notion-green-text opacity-0 hover:opacity-100 transition-opacity" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleSubmit} className="relative mt-auto">
        <input
          type="text"
          className="w-full bg-muted/40 text-xs outline-none border border-border/80 focus:border-ring/40 rounded-lg pl-3 pr-8 py-2 placeholder:text-muted-foreground text-foreground"
          placeholder="Quick add reminder… (in 1 hr)"
          value={value}
          disabled={loading}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1.5 p-1 rounded-md bg-foreground text-background hover:bg-foreground/80 transition-all"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Plus className="w-3 h-3" />
          )}
        </button>
      </form>
    </div>
  );
});
