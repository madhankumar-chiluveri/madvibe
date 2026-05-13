"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
  useTheme,
} from "next-themes";
import { DEFAULT_THEME, THEMES, type ThemeName } from "@/lib/themes";
import {
  injectThemeCSSVars,
  loadStoredThemeName,
  resolveThemeName,
  storeThemeName,
} from "@/lib/theme-utils";

type MadThemeContextValue = {
  themeName: ThemeName;
  setThemeName: (themeName: string) => void;
};

const MadThemeContext = createContext<MadThemeContextValue | null>(null);

function MadThemeRuntime({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, theme } = useTheme();
  const [themeName, setThemeNameState] = useState<ThemeName>(
    DEFAULT_THEME as ThemeName
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setThemeNameState(loadStoredThemeName() as ThemeName);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const isDark = (resolvedTheme ?? theme) === "dark";
    injectThemeCSSVars(themeName, isDark);
    storeThemeName(themeName);
  }, [hydrated, resolvedTheme, theme, themeName]);

  const setThemeName = useCallback((nextThemeName: string) => {
    setThemeNameState(resolveThemeName(nextThemeName));
  }, []);

  const value = useMemo<MadThemeContextValue>(
    () => ({
      themeName,
      setThemeName,
    }),
    [setThemeName, themeName]
  );

  return (
    <MadThemeContext.Provider value={value}>{children}</MadThemeContext.Provider>
  );
}

export function MadThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <MadThemeRuntime>{children}</MadThemeRuntime>
    </NextThemesProvider>
  );
}

export function useMadTheme() {
  const context = useContext(MadThemeContext);
  if (!context) {
    throw new Error("useMadTheme must be used within MadThemeProvider.");
  }
  return context;
}

export function getThemeNames(): ThemeName[] {
  return Object.keys(THEMES) as ThemeName[];
}
