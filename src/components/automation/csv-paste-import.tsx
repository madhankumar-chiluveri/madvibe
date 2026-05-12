"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { ClipboardPaste, Eraser, FilePlus2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

const SAMPLE_HEADERS = "Title,Media URL,Pinterest board,Thumbnail,Description,Link,Publish date,Keywords";

export function CsvPasteImport({ workspaceId }: { workspaceId: Id<"workspaces"> }) {
  const appendCsvText = useMutation(api.automations.pinManager.appendCsvText);
  const replaceCsvText = useMutation(api.automations.pinManager.replaceCsvText);
  const clearPins = useMutation(api.automations.pinManager.clearPins);

  const [text, setText] = useState("");
  const [pending, setPending] = useState<"append" | "replace" | "clear" | null>(null);

  const run = async (mode: "append" | "replace") => {
    if (!text.trim()) {
      toast.error("Paste some CSV content first.");
      return;
    }
    setPending(mode);
    try {
      const count =
        mode === "append"
          ? await appendCsvText({ workspaceId, csvText: text })
          : await replaceCsvText({ workspaceId, csvText: text });
      toast.success(
        `${mode === "append" ? "Appended" : "Replaced with"} ${count} row${count === 1 ? "" : "s"}.`,
      );
      if (mode === "replace") setText("");
    } catch (err: any) {
      toast.error(err?.message ?? "CSV import failed");
    } finally {
      setPending(null);
    }
  };

  const handleClear = async () => {
    if (!confirm("Delete every pin row in this workspace?")) return;
    setPending("clear");
    try {
      const removed = await clearPins({ workspaceId });
      toast.success(`Cleared ${removed} row${removed === 1 ? "" : "s"}.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not clear");
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <header className="flex flex-col gap-1 border-b border-border/60 bg-muted/30 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium flex items-center gap-1.5">
            <ClipboardPaste className="h-4 w-4 text-muted-foreground" /> Paste CSV text
          </p>
          <p className="text-xs text-muted-foreground">
            Headers auto-detected. Recognized columns map to the table — unknown columns are ignored.
          </p>
        </div>
        <code className="text-[11px] text-muted-foreground/80 font-mono truncate max-w-full md:max-w-[420px]">
          {SAMPLE_HEADERS}
        </code>
      </header>

      <div className="p-4 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={`Title,Media URL,Pinterest board,...\nFirst row,,,,,,,\nSecond row,,,,,,,`}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-y"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={pending !== null}
            onClick={() => void run("append")}
          >
            {pending === "append" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-1.5 h-4 w-4" />}
            Append rows
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending !== null}
            onClick={() => void run("replace")}
          >
            {pending === "replace" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-1.5 h-4 w-4" />}
            Replace table
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive ml-auto"
            disabled={pending !== null}
            onClick={() => void handleClear()}
          >
            {pending === "clear" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Eraser className="mr-1.5 h-4 w-4" />}
            Clear table
          </Button>
        </div>
      </div>
    </section>
  );
}
