export type ThemeTokens = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

export const THEMES: Record<string, ThemeTokens> = {
  notion: {
    light: {
      "--background": "#FAF8F3",
      "--background-rgb": "250 248 243",
      "--foreground": "#2A2620",
      "--foreground-rgb": "42 38 32",
      "--card": "#FFFDFA",
      "--card-rgb": "255 253 250",
      "--card-foreground": "#2A2620",
      "--card-foreground-rgb": "42 38 32",
      "--popover": "#FFFDFA",
      "--popover-rgb": "255 253 250",
      "--popover-foreground": "#2A2620",
      "--popover-foreground-rgb": "42 38 32",
      "--sidebar": "#F2ECE1",
      "--sidebar-rgb": "242 236 225",
      "--primary": "#2A2620",
      "--primary-rgb": "42 38 32",
      "--primary-foreground": "#FAF8F3",
      "--primary-foreground-rgb": "250 248 243",
      "--secondary": "#F2ECE1",
      "--secondary-rgb": "242 236 225",
      "--secondary-foreground": "#2A2620",
      "--secondary-foreground-rgb": "42 38 32",
      "--muted": "#FBF7F0",
      "--muted-rgb": "251 247 240",
      "--muted-foreground": "#938B7C",
      "--muted-foreground-rgb": "147 139 124",
      "--accent": "#F2ECE1",
      "--accent-rgb": "242 236 225",
      "--accent-foreground": "#2A2620",
      "--accent-foreground-rgb": "42 38 32",
      "--destructive": "#E03E3E",
      "--destructive-rgb": "224 62 62",
      "--destructive-foreground": "#FFFFFF",
      "--destructive-foreground-rgb": "255 255 255",
      "--border": "#ECE3D5",
      "--border-rgb": "236 227 213",
      "--input": "#ECE3D5",
      "--input-rgb": "236 227 213",
      "--ring": "#2A2620",
      "--ring-rgb": "42 38 32",
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
      lightSidebar: "#F2ECE1",
      lightBackground: "#FAF8F3",
      darkSidebar: "#141413",
      darkBackground: "#191918",
    },
  },
] as const;

export type ThemeName = keyof typeof THEMES;
