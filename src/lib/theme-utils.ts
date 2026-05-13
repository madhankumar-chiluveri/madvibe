import { THEMES, DEFAULT_THEME, THEME_STORAGE_KEY, type ThemeTokens } from "./themes";

export function injectThemeCSSVars(themeName: string, isDark: boolean): void {
  const theme = THEMES[themeName] ?? THEMES[DEFAULT_THEME];
  const tokens = isDark ? theme.dark : theme.light;
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(tokens)) {
    root.style.setProperty(prop, value);
  }
}

export function loadStoredThemeName(): string {
  if (typeof window === "undefined") return DEFAULT_THEME;
  return localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME;
}

export function storeThemeName(name: string): void {
  localStorage.setItem(THEME_STORAGE_KEY, name);
}
