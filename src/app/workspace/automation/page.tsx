"use client";

import { Workflow, Image as ImageIcon, Link2, Sparkles } from "lucide-react";

import { PinterestPinGenerator } from "@/components/automation/pinterest-pin-generator";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import { cn } from "@/lib/utils";
import { useAppStore, type AutomationTab } from "@/store/app.store";

const AUTOMATIONS: {
  id: AutomationTab;
  label: string;
  helper: string;
  icon: typeof Workflow;
  outputs: string[];
}[] = [
  {
    id: "pinterest-pin-generator",
    label: "Pinterest Pin Generator",
    helper: "Turn a full Amazon product page into affiliate-ready pin copy and a matching visual brief.",
    icon: Workflow,
    outputs: ["Pin title", "Affiliate link", "AI image prompt"],
  },
];

export default function AutomationPage() {
  const { automationTab, setAutomationTab } = useAppStore();

  return (
    <div className="min-h-full bg-background">
      <WorkspaceTopBar moduleTitle="Automation" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-[32px] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(225,29,72,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.14),transparent_32%)] p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
              <Sparkles className="h-3.5 w-3.5" />
              Automation Hub
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-[2.6rem]">
              Run repeatable creative workflows without leaving your workspace.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              This module is where MadVibe can host focused, high-leverage automations. Pinterest pin generation lands first, and the page is already structured so future generators can stack into the same workflow rail.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            {[
              {
                icon: Workflow,
                label: "Live automations",
                value: "1",
                helper: "Pinterest pins ships first",
              },
              {
                icon: Link2,
                label: "Affiliate-ready",
                value: "Tag-safe",
                helper: "Link output keeps the Amazon tag attached",
              },
              {
                icon: ImageIcon,
                label: "Creative package",
                value: "Copy + Visual",
                helper: "Pin title, description, tags, and image prompt",
              },
            ].map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-[28px] border border-border/70 bg-card/90 p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {stat.label}
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/40 text-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                    {stat.value}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.helper}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[32px] border border-border/70 bg-card/90 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Available Automations
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                Start with one focused workflow, then expand the library.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              The selector below is persisted in workspace UI state, so new automations can be added here later without reworking the route structure.
            </p>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {AUTOMATIONS.map((automation) => {
                const Icon = automation.icon;
                const isActive = automationTab === automation.id;

                return (
                  <button
                    key={automation.id}
                    type="button"
                    onClick={() => setAutomationTab(automation.id)}
                    className={cn(
                      "group rounded-[28px] border p-5 text-left transition-all",
                      isActive
                        ? "border-rose-500/25 bg-rose-500/8 shadow-[0_16px_50px_rgba(225,29,72,0.08)]"
                        : "border-border/70 bg-background/70 hover:border-foreground/15 hover:bg-background"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card text-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          isActive
                            ? "bg-rose-500/12 text-rose-700 dark:text-rose-300"
                            : "bg-muted/60 text-muted-foreground"
                        )}
                      >
                        {isActive ? "Selected" : "Live"}
                      </span>
                    </div>
                    <div className="mt-4 text-lg font-semibold text-foreground">{automation.label}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{automation.helper}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {automation.outputs.map((output) => (
                        <span
                          key={output}
                          className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground"
                        >
                          {output}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-[28px] border border-dashed border-border/70 bg-background/60 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Queue
              </div>
              <div className="mt-3 text-lg font-semibold text-foreground">
                Space reserved for the next workflow.
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Product research, batch pins, or richer affiliate exports can slot into this rail once you decide the next priority.
              </p>
            </div>
          </div>
        </section>

        {automationTab === "pinterest-pin-generator" ? <PinterestPinGenerator /> : null}
      </div>
    </div>
  );
}
