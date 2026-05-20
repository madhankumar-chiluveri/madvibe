"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import type { ReminderSeed } from "@/types/reminder";
import { ReminderDialog } from "./reminder-dialog";

interface ReminderTriggerButtonProps {
  workspaceId: Id<"workspaces">;
  initialValues?: ReminderSeed;
  className?: string;
  label?: string;
  title?: string;
  iconOnly?: boolean;
}

export function ReminderTriggerButton({
  workspaceId,
  initialValues,
  className,
  label = "Remind me",
  title,
  iconOnly = false,
}: ReminderTriggerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        title={title ?? label}
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors",
          iconOnly
            ? "h-8 w-8 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
            : "px-2 py-1 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <Bell className="h-4 w-4" />
        {!iconOnly && <span>{label}</span>}
      </button>

      <ReminderDialog
        open={open}
        onOpenChange={setOpen}
        workspaceId={workspaceId}
        initialValues={initialValues}
      />
    </>
  );
}
