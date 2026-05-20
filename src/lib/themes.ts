export type ThemeTokens = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

export const THEMES: Record<string, ThemeTokens> = {
  notion: {
    light: {
      "--background": "#FFFFFF",
      "--foreground": "#37352F",
      "--card": "#FFFFFF",
      "--card-foreground": "#37352F",
      "--popover": "#FFFFFF",
      "--popover-foreground": "#37352F",
      "--sidebar": "#F7F6F3",
      "--primary": "#37352F",
      "--primary-foreground": "#FFFFFF",
      "--secondary": "#F7F6F3",
      "--secondary-foreground": "#37352F",
      "--muted": "#F7F6F3",
      "--muted-foreground": "#9B9A97",
      "--accent": "#EBECED",
      "--accent-foreground": "#37352F",
      "--destructive": "#E03E3E",
      "--destructive-foreground": "#FFFFFF",
      "--border": "#E5E4E0",
      "--input": "#E5E4E0",
      "--ring": "#37352F",
    },
    dark: {
      "--background": "#191919",
      "--foreground": "#EDEDED",
      "--card": "#202020",
      "--card-foreground": "#EDEDED",
      "--popover": "#252525",
      "--popover-foreground": "#EDEDED",
      "--sidebar": "#161616",
      "--primary": "#FFFFFF",
      "--primary-foreground": "#191919",
      "--secondary": "#252525",
      "--secondary-foreground": "#EDEDED",
      "--muted": "#252525",
      "--muted-foreground": "#9B9B9B",
      "--accent": "#2F2F2F",
      "--accent-foreground": "#EDEDED",
      "--destructive": "#FF7369",
      "--destructive-foreground": "#191919",
      "--border": "#2E2E2E",
      "--input": "#2E2E2E",
      "--ring": "#EDEDED",
    },
  },
};

export const DEFAULT_THEME = "notion";
export const THEME_STORAGE_KEY = "madvibe-theme";

export const THEME_OPTIONS = [
  {
    name: "notion",
    label: "Notion Warm",
    swatch: {
      lightSidebar: "#F7F6F3",
      lightBackground: "#FFFFFF",
      darkSidebar: "#141413",
      darkBackground: "#191918",
    },
  },
] as const;

export type ThemeName = keyof typeof THEMES;
