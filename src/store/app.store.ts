// ─────────────────────────────────────────────────────────────
// src/store/app.store.ts  — Global UI / session state
// ─────────────────────────────────────────────────────────────
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Id } from "../../convex/_generated/dataModel";
import type { AccentColor, FontFamily, Theme } from "@/types/ui";

type ActiveModule = "overview" | "feed" | "brain" | "ledger" | "garage" | "fit";
export type GarageTab = "overview" | "services" | "expenses" | "checklist" | "documents";
export type LedgerTab = "dashboard" | "credit_cards" | "loans" | "investments" | "budget" | "goals" | "recurring" | "market";
type FeedCategory = "for_you" | "ai_ml" | "tech_it" | "productivity" | "must_know" | "general" | null;

interface AppState {
  currentWorkspaceId: Id<"workspaces"> | null;
  setCurrentWorkspaceId: (id: Id<"workspaces"> | null) => void;

  activeModule: ActiveModule;
  setActiveModule: (m: ActiveModule) => void;

  contextPaneCollapsed: boolean;
  setContextPaneCollapsed: (v: boolean) => void;
  toggleContextPaneCollapsed: () => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (v: boolean) => void;

  reminderCenterOpen: boolean;
  setReminderCenterOpen: (v: boolean) => void;

  quickCaptureOpen: boolean;
  setQuickCaptureOpen: (v: boolean) => void;

  theme: Theme;
  setTheme: (t: Theme) => void;
  accentColor: AccentColor;
  setAccentColor: (c: AccentColor) => void;
  fontFamily: FontFamily;
  setFontFamily: (f: FontFamily) => void;

  recentPageIds: Id<"pages">[];
  addRecentPage: (id: Id<"pages">) => void;

  expandedPageIds: string[];
  toggleExpanded: (id: string) => void;
  setExpanded: (id: string, v: boolean) => void;
  isExpanded: (id: string) => boolean;

  focusActive: boolean;
  focusMinutes: number;
  focusStartedAt: number | null;
  startFocus: () => void;
  stopFocus: () => void;
  setFocusMinutes: (m: number) => void;

  feedCategory: FeedCategory;
  setFeedCategory: (c: FeedCategory) => void;

  ledgerTab: LedgerTab;
  setLedgerTab: (t: LedgerTab) => void;

  garageTab: GarageTab;
  setGarageTab: (t: GarageTab) => void;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentWorkspaceId: null,
      setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),

      activeModule: "overview",
      setActiveModule: (m) => set({ activeModule: m }),

      contextPaneCollapsed: false,
      setContextPaneCollapsed: (v) => set({ contextPaneCollapsed: v }),
      toggleContextPaneCollapsed: () =>
        set((s) => ({ contextPaneCollapsed: !s.contextPaneCollapsed })),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),

      reminderCenterOpen: false,
      setReminderCenterOpen: (v) => set({ reminderCenterOpen: v }),

      quickCaptureOpen: false,
      setQuickCaptureOpen: (v) => set({ quickCaptureOpen: v }),

      theme: "system",
      setTheme: (t) => set({ theme: t }),
      accentColor: "violet",
      setAccentColor: (c) => set({ accentColor: c }),
      fontFamily: "default",
      setFontFamily: (f) => set({ fontFamily: f }),

      recentPageIds: [],
      addRecentPage: (id) => {
        const current = get().recentPageIds.filter((p) => p !== id);
        set({ recentPageIds: [id, ...current].slice(0, 20) });
      },

      expandedPageIds: [],
      toggleExpanded: (id) => {
        const ids = get().expandedPageIds;
        set({
          expandedPageIds: ids.includes(id)
            ? ids.filter((i) => i !== id)
            : [...ids, id],
        });
      },
      setExpanded: (id, v) => {
        const ids = get().expandedPageIds;
        set({
          expandedPageIds: v
            ? ids.includes(id) ? ids : [...ids, id]
            : ids.filter((i) => i !== id),
        });
      },
      isExpanded: (id) => get().expandedPageIds.includes(id),

      focusActive: false,
      focusMinutes: 25,
      focusStartedAt: null,
      startFocus: () => set({ focusActive: true, focusStartedAt: Date.now() }),
      stopFocus: () => set({ focusActive: false, focusStartedAt: null }),
      setFocusMinutes: (m) => set({ focusMinutes: m }),

      feedCategory: null,
      setFeedCategory: (c) => set({ feedCategory: c }),

      ledgerTab: "dashboard",
      setLedgerTab: (t) => set({ ledgerTab: t }),

      garageTab: "overview",
      setGarageTab: (t) => set({ garageTab: t }),
      selectedVehicleId: null,
      setSelectedVehicleId: (id) => set({ selectedVehicleId: id }),
    }),
    {
      name: "madvibe-app-state",
      version: 4,
      migrate: (persistedState: any, version: number) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState;
        }

        const state = persistedState as Record<string, unknown>;
        const activeModule =
          state.activeModule === "news"
            ? "feed"
            : state.activeModule === "finance"
              ? "ledger"
              : state.activeModule === "kb"
                ? "brain"
                : state.activeModule;

        return {
          ...state,
          activeModule,
          contextPaneCollapsed:
            state.contextPaneCollapsed ?? state.sidebarCollapsed ?? false,
          feedCategory: state.feedCategory ?? state.newsCategory ?? null,
          ledgerTab: state.ledgerTab ?? state.financeTab ?? "dashboard",
          garageTab: state.garageTab ?? "overview",
          selectedVehicleId: state.selectedVehicleId ?? null,
        };
      },
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : ({} as Storage)
      ),
      partialize: (s) => ({
        currentWorkspaceId: s.currentWorkspaceId,
        activeModule: s.activeModule,
        contextPaneCollapsed: s.contextPaneCollapsed,
        theme: s.theme,
        accentColor: s.accentColor,
        fontFamily: s.fontFamily,
        recentPageIds: s.recentPageIds,
        expandedPageIds: s.expandedPageIds,
        focusMinutes: s.focusMinutes,
        feedCategory: s.feedCategory,
        ledgerTab: s.ledgerTab,
        garageTab: s.garageTab,
        selectedVehicleId: s.selectedVehicleId,
      }),
    }
  )
);
