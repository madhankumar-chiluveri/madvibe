"use client";

import { Check } from "lucide-react";
import { THEME_OPTIONS } from "@/lib/themes";
import { useMadTheme } from "@/components/providers/mad-theme-provider";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { themeName, setThemeName } = useMadTheme();

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {THEME_OPTIONS.map((themeOption) => {
        const selected = themeName === themeOption.name;
        return (
          <button
            key={themeOption.name}
            type="button"
            onClick={() => setThemeName(themeOption.name)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              selected
                ? "border-foreground bg-foreground/5"
                : "border-border hover:border-foreground/40 hover:bg-muted/40"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="overflow-hidden rounded-md border border-border/70">
                  <div className="flex h-8 w-24">
                    <div
                      className="h-full w-8"
                      style={{
                        backgroundColor: themeOption.swatch.lightSidebar,
                      }}
                    />
                    <div
                      className="h-full flex-1"
                      style={{
                        backgroundColor: themeOption.swatch.lightBackground,
                      }}
                    />
                  </div>
                  <div className="flex h-3 w-24 border-t border-border/70">
                    <div
                      className="h-full w-8"
                      style={{ backgroundColor: themeOption.swatch.darkSidebar }}
                    />
                    <div
                      className="h-full flex-1"
                      style={{ backgroundColor: themeOption.swatch.darkBackground }}
                    />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {themeOption.label}
                </p>
              </div>

              {selected ? (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
