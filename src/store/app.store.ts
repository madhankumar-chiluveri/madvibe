// ─────────────────────────────────────────────────────────────
// src/store/app.store.ts  — Global UI / session state
// ─────────────────────────────────────────────────────────────
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Id } from "../../convex/_generated/dataModel";
import type { AccentColor, FontFamily, Theme } from "@/types/ui";

type ActiveModule = "overview" | "news" | "kb" | "finance" | "ai";
type FinanceTab = "dashboard" | "transactions" | "budget" | "investments" | "reports";
type NewsCategory = "for_you" | "ai_ml" | "tech_it" | "productivity" | "must_know" | "general" | null;

interface AppState {
  currentWorkspaceId: Id<"workspaces"> | null;
  setCurrentWorkspaceId: (id: Id<"workspaces"> | null) => void;

  activeModule: ActiveModule;
  setActiveModule: (m: ActiveModule) => void;

  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (v: boolean) => void;

  quickCaptureOpen: boolean;
  setQuickCaptureOpen: (v: boolean) => void;

  theme: Theme;
  setTheme: (t: Theme) => void;
  accentColor: AccentColor;
  setAccentColor: (c: AccentColor) => void;
  fontFamily: FontFamily;
  setFontFamily: (f: FontFamily) => void;

  maddyEnabled: boolean;
  setMaddyEnabled: (v: boolean) => void;
  geminiApiKey: string;
  setGeminiApiKey: (k: string) => void;

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

  newsCategory: NewsCategory;
  setNewsCategory: (c: NewsCategory) => void;

  financeTab: FinanceTab;
  setFinanceTab: (t: FinanceTab) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentWorkspaceId: null,
      setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),

      activeModule: "overview",
      setActiveModule: (m) => set({ activeModule: m }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),

      quickCaptureOpen: false,
      setQuickCaptureOpen: (v) => set({ quickCaptureOpen: v }),

      theme: "system",
      setTheme: (t) => set({ theme: t }),
      accentColor: "violet",
      setAccentColor: (c) => set({ accentColor: c }),
      fontFamily: "default",
      setFontFamily: (f) => set({ fontFamily: f }),

      maddyEnabled: true,
      setMaddyEnabled: (v) => set({ maddyEnabled: v }),
      geminiApiKey: "",
      setGeminiApiKey: (k) => set({ geminiApiKey: k }),

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

      newsCategory: null,
      setNewsCategory: (c) => set({ newsCategory: c }),

      financeTab: "dashboard",
      setFinanceTab: (t) => set({ financeTab: t }),
    }),
    {
      name: "madverse-app-state",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : ({} as Storage)
      ),
      partialize: (s) => ({
        currentWorkspaceId: s.currentWorkspaceId,
        activeModule: s.activeModule,
        sidebarCollapsed: s.sidebarCollapsed,
        theme: s.theme,
        accentColor: s.accentColor,
        fontFamily: s.fontFamily,
        maddyEnabled: s.maddyEnabled,
        geminiApiKey: s.geminiApiKey,
        recentPageIds: s.recentPageIds,
        expandedPageIds: s.expandedPageIds,
        focusMinutes: s.focusMinutes,
        newsCategory: s.newsCategory,
        financeTab: s.financeTab,
      }),
    }
  )
);
