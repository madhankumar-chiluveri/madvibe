"use client";

import { useMemo } from "react";
import { AlertTriangle, Download, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/download-csv";
import { serializeCsv } from "@/lib/csv-parser";
import type { Pin } from "./pin-table";

const HEADERS = [
  "Title",
  "Media URL",
  "Pinterest board",
  "Thumbnail",
  "Description",
  "Link",
  "Publish date",
  "Keywords",
] as const;

export function ExportSection({ pins }: { pins: Pin[] }) {
  const { rows, missingIndices } = useMemo(() => {
    const rows: string[][] = [];
    const missingIndices: number[] = [];
    pins.forEach((pin, idx) => {
      rows.push([
        pin.title,
        pin.mediaUrl,
        pin.pinterestBoard,
        pin.thumbnail,
        pin.description,
        pin.link,
        pin.publishDate,
        pin.keywords,
      ]);
      if (!pin.mediaUrl.trim()) missingIndices.push(idx + 1);
    });
    return { rows, missingIndices };
  }, [pins]);

  const handleDownload = () => {
    const csv = serializeCsv(HEADERS, rows);
    downloadCsv(`pinterest_bulk_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
        <div>
          <p className="text-sm font-medium flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" /> Export Pinterest bulk CSV
          </p>
          <p className="text-xs text-muted-foreground">
            8 columns, Unix line endings, ready for the Pinterest bulk import flow.
          </p>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {missingIndices.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-semibold">{missingIndices.length} row{missingIndices.length === 1 ? "" : "s"}</span>{" "}
              missing a Media URL — upload an image or paste a URL before publishing. Row
              {missingIndices.length === 1 ? " " : "s "}
              <span className="font-mono">{missingIndices.slice(0, 12).join(", ")}</span>
              {missingIndices.length > 12 ? "…" : ""}
            </p>
          </div>
        )}
        <Button onClick={handleDownload} disabled={pins.length === 0}>
          <Download className="mr-1.5 h-4 w-4" /> Download CSV
        </Button>
      </div>
    </section>
  );
}
