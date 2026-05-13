"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowUpRight, Cloud, FileSpreadsheet, ImagePlus, LayoutGrid, Sparkles, Table2 } from "lucide-react";

import { api } from "../../../../convex/_generated/api";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";

export default function AutomationPage() {
  const { resolvedWorkspaceId } = useResolvedWorkspace();
  const pins = useQuery(
    api.automations.pinManager.listPins,
    resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : "skip",
  );
  const ociConfigured = useQuery(api.automations.ociSettings.hasOciConfig);

  const pinCount = pins?.length ?? 0;
  const withUrlCount = (pins ?? []).filter((p: any) => p.mediaUrl?.trim().length > 0).length;

  return (
    <div className="min-h-full bg-background">
      <WorkspaceTopBar moduleTitle="Automation" />

      <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Pre-built workflows
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Automations</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            One-click workflows that handle the boring middle of every Pinterest launch. Open a tile to start.
          </p>
        </div>

        {/* Single tile */}
        <Link
          href="/workspace/automation/pin-studio"
          className="group relative block overflow-hidden rounded-3xl border border-border bg-card transition-all hover:border-amber-500/40 hover:shadow-xl"
        >
          {/* Background gradient wash */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
          {/* Decorative top-right glow */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl opacity-50 transition-opacity group-hover:opacity-80" />
          {/* Decorative bottom-left glow */}
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl opacity-40 transition-opacity group-hover:opacity-70" />

          <div className="relative grid gap-8 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
            {/* Left column — copy */}
            <div className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-rose-500/20 ring-1 ring-amber-500/40">
                  <LayoutGrid className="h-7 w-7 text-amber-500 dark:text-amber-300" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Pinterest
                </span>
              </div>

              <h2 className="mt-6 text-2xl font-semibold tracking-tight md:text-3xl">Pinterest Pin Studio</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                Paste a CSV, drop in pin images, push them to Oracle OCI, and download the final bulk-upload CSV — all
                in one screen.
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-xs">
                <Stat label={pinCount === 1 ? "row" : "rows"} value={pinCount} />
                <Stat label="with Media URL" value={withUrlCount} />
                <Stat
                  label={ociConfigured ? "OCI connected" : "OCI not configured"}
                  tone={ociConfigured ? "ok" : "warn"}
                />
              </div>

              <div className="mt-auto pt-6">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform group-hover:translate-x-0.5">
                  Open Pin Studio
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </div>

            {/* Right column — feature list */}
            <div className="rounded-2xl border border-border/60 bg-background/60 p-5 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Inside</p>
              <ul className="mt-3 space-y-3 text-sm">
                <FeatureRow icon={Table2} label="Inline-editable Pinterest bulk table" />
                <FeatureRow icon={FileSpreadsheet} label="Paste CSV → append, replace, or clear rows" />
                <FeatureRow icon={ImagePlus} label="Drag images, auto-map to rows by filename" />
                <FeatureRow icon={Cloud} label="One-shot upload to OCI, fills Media URLs" />
              </ul>
            </div>
          </div>
        </Link>

        {/* Hint for future tiles */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          More automations land here as MadVibe grows.
        </p>
      </div>
    </div>
  );
}

function FeatureRow({ icon: Icon, label }: { icon: typeof Cloud; label: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="leading-snug">{label}</span>
    </li>
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
      ? "border-notion-green-text/30 bg-notion-green-bg text-notion-green-text"
      : tone === "warn"
        ? "border-notion-yellow-text/30 bg-notion-yellow-bg text-notion-yellow-text"
        : "border-border bg-card text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 ${toneClass}`}>
      {value !== undefined && <span className="font-semibold text-foreground">{value}</span>}
      <span>{label}</span>
    </span>
  );
}
