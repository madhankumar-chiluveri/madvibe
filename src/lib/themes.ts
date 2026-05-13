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
      "--background": "#191918",
      "--foreground": "#E5E4E1",
      "--card": "#1E1E1C",
      "--card-foreground": "#E5E4E1",
      "--popover": "#1E1E1C",
      "--popover-foreground": "#E5E4E1",
      "--sidebar": "#141413",
      "--primary": "#FFFFFE",
      "--primary-foreground": "#191918",
      "--secondary": "#2A2926",
      "--secondary-foreground": "#E5E4E1",
      "--muted": "#2A2926",
      "--muted-foreground": "#6B6A68",
      "--accent": "#2A2926",
      "--accent-foreground": "#E5E4E1",
      "--destructive": "#FF7369",
      "--destructive-foreground": "#191918",
      "--border": "#2A2926",
      "--input": "#2A2926",
      "--ring": "#E5E4E1",
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
