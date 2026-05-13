import {
  THEMES,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type ThemeName,
} from "./themes";

export function resolveThemeName(themeName?: string | null): ThemeName {
  if (!themeName) return DEFAULT_THEME as ThemeName;
  return themeName in THEMES
    ? (themeName as ThemeName)
    : (DEFAULT_THEME as ThemeName);
}

export function injectThemeCSSVars(themeName: string, isDark: boolean): void {
  const resolvedThemeName = resolveThemeName(themeName);
  const theme = THEMES[resolvedThemeName] ?? THEMES[DEFAULT_THEME];
  const tokens = isDark ? theme.dark : theme.light;
  const root = document.documentElement;

  root.setAttribute("data-theme", resolvedThemeName);
  for (const [prop, value] of Object.entries(tokens)) {
    root.style.setProperty(prop, value);
  }
}

export function loadStoredThemeName(): string {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    return resolveThemeName(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function storeThemeName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_STORAGE_KEY, resolveThemeName(name));
}
