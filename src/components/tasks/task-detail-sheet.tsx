"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TONE_DOT,
  TONE_LABEL,
  formatTime,
  hasMeaningfulTime,
  statusClass,
  taskTone,
  type TaskEvent,
} from "@/components/tasks/task-event";
import { ArrowUpRight, Calendar, Database, FolderOpen, Tag, X } from "lucide-react";

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-[13px] font-semibold text-foreground">{children}</div>
      </div>
    </div>
  );
}

/**
 * Right-edge detail panel.
 *
 * Built on the Radix primitive rather than the shared `DialogContent` on
 * purpose: that component hard-codes a centred position with zoom + slide-from-
 * centre enter classes, and the tailwindcss-animate utilities that would undo
 * them are not treated as conflicting by tailwind-merge — both sets would
 * survive and stylesheet order would decide the animation. Composing the
 * primitive keeps Radix's focus trap, Escape handling, and scroll lock while
 * leaving the motion fully under our control.
 */
export function TaskDetailSheet({
  task,
  onClose,
}: {
  task: TaskEvent | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const tone = task ? taskTone(task) : "scheduled";
  const date = task ? new Date(task.timestamp) : null;

  return (
    <Dialog open={task !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-[min(420px,92vw)] flex-col",
            "border-l border-border/60 bg-card text-card-foreground",
            "shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.3)] dark:shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.6)]",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
          )}
        >
          {task && date ? (
            <>
              <div className="shrink-0 space-y-2 border-b border-border/70 p-5 pr-14">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[tone])} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {TONE_LABEL[tone]}
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold leading-snug">
                  {task.taskName}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {task.spaceName} / {task.databaseName}
                </DialogDescription>
              </div>

              <div className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto px-5 py-2">
                <DetailRow icon={Calendar} label={task.datePropertyName}>
                  {date.toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {hasMeaningfulTime(task) && (
                    <span className="ml-2 font-bold tabular-nums text-muted-foreground">
                      {formatTime(task.timestamp)}
                    </span>
                  )}
                </DetailRow>

                <DetailRow icon={Tag} label="Status">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-[11px] font-bold leading-none",
                      statusClass(task.statusColor)
                    )}
                  >
                    {task.status || "No status"}
                  </span>
                </DetailRow>

                <DetailRow icon={FolderOpen} label="Space">
                  {task.spaceName}
                </DetailRow>

                <DetailRow icon={Database} label="Database">
                  {task.databaseName}
                </DetailRow>
              </div>

              <div className="shrink-0 border-t border-border/70 p-5">
                <button
                  onClick={() => {
                    onClose();
                    router.push(`/workspace/${task.pageId}`);
                  }}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Open in database
                  <ArrowUpRight className="h-4 w-4" />
                </button>
                <p className="mt-2 text-center text-[11px] font-medium text-muted-foreground">
                  Opens {task.databaseName}, where this row lives.
                </p>
              </div>
            </>
          ) : (
            // Radix requires a Title in the tree for the accessible name.
            <DialogTitle className="sr-only">Task details</DialogTitle>
          )}

          <DialogClose className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
