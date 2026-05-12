"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ChevronLeft, LayoutGrid, Sparkles } from "lucide-react";

import { api } from "../../../../../convex/_generated/api";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { PinTable, type Pin } from "@/components/automation/pin-table";
import { CsvPasteImport } from "@/components/automation/csv-paste-import";
import { ImageUploadMapper } from "@/components/automation/image-upload-mapper";
import { ExportSection } from "@/components/automation/export-section";
import { OciConfigBanner } from "@/components/automation/oci-config-banner";

export default function PinStudioPage() {
  const { resolvedWorkspaceId } = useResolvedWorkspace();
  const pins = useQuery(
    api.automations.pinManager.listPins,
    resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : "skip",
  );
  const ociConfigured = useQuery(api.automations.ociSettings.hasOciConfig);

  const ready = resolvedWorkspaceId && pins !== undefined && ociConfigured !== undefined;
  const pinsArray = (pins ?? []) as Pin[];
  const withUrlCount = pinsArray.filter((p) => p.mediaUrl.trim().length > 0).length;

  return (
    <div className="min-h-full bg-background">
      <WorkspaceTopBar
        breadcrumbContent={
          <div className="flex items-center gap-1 text-sm">
            <Link href="/workspace/automation" className="text-muted-foreground hover:text-foreground">
              Automation
            </Link>
            <span className="opacity-40">/</span>
            <span className="text-foreground font-medium">Pinterest Pin Studio</span>
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12 space-y-6">
        <header className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/25 via-orange-500/20 to-rose-500/15 ring-1 ring-amber-500/30">
            <LayoutGrid className="h-7 w-7 text-amber-500 dark:text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Pinterest pipeline
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Pinterest Pin Studio</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Paste a CSV to populate the Pinterest bulk-upload table, drop in pin images and let MadVibe push them to
              your Oracle OCI bucket, then download the final CSV ready for Pinterest. No row leaves your workspace.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Stat label={pinsArray.length === 1 ? "row" : "rows"} value={pinsArray.length} />
              <Stat label="with Media URL" value={withUrlCount} />
              <Stat
                label={ociConfigured ? "OCI connected" : "OCI not configured"}
                tone={ociConfigured ? "ok" : "warn"}
              />
            </div>
          </div>
          <Link
            href="/workspace/automation"
            className="hidden md:inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> All automations
          </Link>
        </header>

        {!ready && (
          <div className="space-y-6">
            <div className="skeleton-shimmer h-48 rounded-2xl border" />
            <div className="skeleton-shimmer h-40 rounded-2xl border" />
            <div className="skeleton-shimmer h-56 rounded-2xl border" />
          </div>
        )}

        {ready && !ociConfigured && <OciConfigBanner />}

        {ready && resolvedWorkspaceId && (
          <>
            <PinTable workspaceId={resolvedWorkspaceId} pins={pinsArray} />
            <CsvPasteImport workspaceId={resolvedWorkspaceId} />
            <ImageUploadMapper
              workspaceId={resolvedWorkspaceId}
              pins={pinsArray}
              ociConfigured={Boolean(ociConfigured)}
            />
            <ExportSection pins={pinsArray} />
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value?: number;
  tone?: "default" | "ok" | "warn";
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
        : "border-border bg-muted/30 text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 ${toneClass}`}>
      {value !== undefined && <span className="font-semibold text-foreground">{value}</span>}
      <span>{label}</span>
    </span>
  );
}
