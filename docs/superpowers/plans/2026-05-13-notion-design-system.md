# Notion Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace MadVibe's grayscale token system with Notion's exact color palette, Geist font, and a centralized theme architecture covering every component and module page.

**Architecture:** CSS custom properties in `globals.css` are the single source of truth for all color tokens. A thin `MadThemeProvider` wraps next-themes to add named-theme support via `data-theme` on `<html>`. Notion's 9 semantic color families (gray/brown/orange/yellow/green/blue/purple/pink/red) are added as invariant CSS vars and mapped as Tailwind utilities so they can be used inline throughout the app.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS, shadcn/ui (Radix), next-themes, `geist` npm package, TypeScript

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/lib/themes.ts` |
| Create | `src/lib/theme-utils.ts` |
| Create | `src/components/providers/mad-theme-provider.tsx` |
| Create | `src/components/settings/theme-switcher.tsx` |
| Modify | `src/app/layout.tsx` |
| Modify | `src/app/globals.css` |
| Modify | `tailwind.config.js` |
| Modify | `src/components/ui/button.tsx` |
| Modify | `src/components/ui/input.tsx` |
| Modify | `src/components/ui/textarea.tsx` |
| Modify | `src/components/ui/dialog.tsx` |
| Modify | `src/components/ui/dropdown-menu.tsx` |
| Modify | `src/components/ui/select.tsx` |
| Modify | `src/components/sidebar/sidebar.tsx` |
| Modify | `src/components/workspace/workspace-top-bar.tsx` |
| Modify | `src/components/layout/mobile-nav.tsx` |
| Modify | `src/app/workspace/overview/page.tsx` |
| Modify | `src/app/workspace/feed/page.tsx` |
| Modify | `src/app/workspace/ledger/page.tsx` |
| Modify | `src/components/ledger/transactions-tab-v2.tsx` |
| Modify | `src/app/workspace/automation/page.tsx` |
| Modify | `src/app/workspace/settings/page.tsx` |

---

## Task 1: Install Geist Font

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install**

```bash
npm install geist
```

- [ ] **Step 2: Verify**

```bash
npm ls geist
```

Expected: `geist@x.x.x` in output.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add geist font package"
```

---

## Task 2: Theme Token Definitions

**Files:**
- Create: `src/lib/themes.ts`
- Create: `src/lib/theme-utils.ts`

- [ ] **Step 1: Create `src/lib/themes.ts`**

```ts
export type ThemeTokens = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

export const THEMES: Record<string, ThemeTokens> = {
  notion: {
    light: {
      "--background":           "#FFFFFF",
      "--foreground":           "#37352F",
      "--card":                 "#FFFFFF",
      "--card-foreground":      "#37352F",
      "--popover":              "#FFFFFF",
      "--popover-foreground":   "#37352F",
      "--sidebar":              "#F7F6F3",
      "--primary":              "#37352F",
      "--primary-foreground":   "#FFFFFF",
      "--secondary":            "#F7F6F3",
      "--secondary-foreground": "#37352F",
      "--muted":                "#F7F6F3",
      "--muted-foreground":     "#9B9A97",
      "--accent":               "#EBECED",
      "--accent-foreground":    "#37352F",
      "--destructive":          "#E03E3E",
      "--destructive-foreground": "#FFFFFF",
      "--border":               "#E5E4E0",
      "--input":                "#E5E4E0",
      "--ring":                 "#37352F",
    },
    dark: {
      "--background":           "#191918",
      "--foreground":           "#E5E4E1",
      "--card":                 "#1E1E1C",
      "--card-foreground":      "#E5E4E1",
      "--popover":              "#1E1E1C",
      "--popover-foreground":   "#E5E4E1",
      "--sidebar":              "#141413",
      "--primary":              "#FFFFFE",
      "--primary-foreground":   "#191918",
      "--secondary":            "#2A2926",
      "--secondary-foreground": "#E5E4E1",
      "--muted":                "#2A2926",
      "--muted-foreground":     "#6B6A68",
      "--accent":               "#2A2926",
      "--accent-foreground":    "#E5E4E1",
      "--destructive":          "#FF7369",
      "--destructive-foreground": "#191918",
      "--border":               "#2A2926",
      "--input":                "#2A2926",
      "--ring":                 "#E5E4E1",
    },
  },
};

export const DEFAULT_THEME = "notion";
export const THEME_STORAGE_KEY = "madvibe-theme";
```

- [ ] **Step 2: Create `src/lib/theme-utils.ts`**

```ts
import { THEMES, DEFAULT_THEME, THEME_STORAGE_KEY, type ThemeTokens } from "./themes";

export function getThemeTokens(themeName: string): ThemeTokens {
  return THEMES[themeName] ?? THEMES[DEFAULT_THEME];
}

export function injectThemeCSSVars(themeName: string, isDark: boolean): void {
  if (typeof document === "undefined") return;
  const tokens = getThemeTokens(themeName);
  const vars = isDark ? tokens.dark : tokens.light;
  const root = document.documentElement;
  Object.entries(vars).forEach(([prop, value]) => {
    root.style.setProperty(prop, value);
  });
}

export function loadStoredThemeName(): string {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function storeThemeName(name: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, name);
  } catch {}
}
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: no errors from the new files.

- [ ] **Step 4: Commit**

```bash
git add src/lib/themes.ts src/lib/theme-utils.ts
git commit -m "feat: add centralized theme token definitions"
```

---

## Task 3: MadThemeProvider

**Files:**
- Create: `src/components/providers/mad-theme-provider.tsx`

- [ ] **Step 1: Create the provider**

```tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useTheme } from "next-themes";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type ThemeTokens,
} from "@/lib/themes";
import {
  injectThemeCSSVars,
  loadStoredThemeName,
  storeThemeName,
} from "@/lib/theme-utils";

interface MadThemeContextValue {
  themeName: string;
  setThemeName: (name: string) => void;
}

const MadThemeContext = createContext<MadThemeContextValue>({
  themeName: DEFAULT_THEME,
  setThemeName: () => {},
});

export function useMadTheme() {
  return useContext(MadThemeContext);
}

export function MadThemeProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [themeName, setThemeNameState] = useState<string>(DEFAULT_THEME);

  // On mount: load persisted theme name
  useEffect(() => {
    setThemeNameState(loadStoredThemeName());
  }, []);

  // Re-inject CSS vars whenever theme name or dark/light mode changes
  useEffect(() => {
    const isDark = resolvedTheme === "dark";
    injectThemeCSSVars(themeName, isDark);
    document.documentElement.setAttribute("data-theme", themeName);
  }, [themeName, resolvedTheme]);

  function setThemeName(name: string) {
    setThemeNameState(name);
    storeThemeName(name);
  }

  return (
    <MadThemeContext.Provider value={{ themeName, setThemeName }}>
      {children}
    </MadThemeContext.Provider>
  );
}
```

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/providers/mad-theme-provider.tsx
git commit -m "feat: add MadThemeProvider for centralized theme management"
```

---

## Task 4: Font + Layout Wiring

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace the layout file**

```tsx
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Roboto_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { MadThemeProvider } from "@/components/providers/mad-theme-provider";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { Toaster } from "@/components/ui/sonner";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import Script from "next/script";

const robotoSerif = Roboto_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-serif",
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  preload: false,
});

export const metadata: Metadata = {
  title: "MadVibe",
  description: "Your AI-powered personal BRAIN OS. Organise everything with Maddy.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MadVibe",
  },
  icons: {
    icon: [
      { url: "/app-icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/icons/favicon-32x32.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#191918" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${GeistSans.variable} ${robotoSerif.variable} ${jetbrainsMono.variable}`}
      >
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  if (typeof window === 'undefined') return;
                  var isLocalhost =
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';
                  if (!isLocalhost) return;
                  if (!('serviceWorker' in navigator)) return;

                  var resetFlag = 'madvibe-sw-reset-once';
                  if (sessionStorage.getItem(resetFlag)) return;

                  navigator.serviceWorker.getRegistrations().then(function (registrations) {
                    if (!registrations || registrations.length === 0) return;
                    sessionStorage.setItem(resetFlag, '1');
                    Promise.all(registrations.map(function (r) { return r.unregister(); }))
                      .finally(function () {
                        if ('caches' in window) {
                          caches.keys()
                            .then(function (keys) {
                              return Promise.all(
                                keys
                                  .filter(function (k) { return k.indexOf('madvibe-') === 0; })
                                  .map(function (k) { return caches.delete(k); })
                              );
                            })
                            .finally(function () { window.location.reload(); });
                        } else {
                          window.location.reload();
                        }
                      });
                  });
                })();
              `,
            }}
          />
        </head>
        <body className="font-sans antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <MadThemeProvider>
              <ConvexClientProvider>
                <OfflineBanner />
                {children}
                <InstallPrompt />
                <Toaster richColors position="bottom-right" />
              </ConvexClientProvider>
            </MadThemeProvider>
          </ThemeProvider>
          <Script
            id="sw-register"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  if ('${process.env.NODE_ENV}' === 'production') {
                    navigator.serviceWorker.register('/sw.js')
                      .then(() => console.log('[SW] Registered'))
                      .catch(e => console.warn('[SW] Registration failed', e));
                  } else {
                    navigator.serviceWorker.getRegistrations()
                      .then(registrations => registrations.forEach(r => r.unregister()))
                      .catch(() => {});
                    caches.keys()
                      .then(keys => Promise.all(keys.filter(k => k.startsWith('madvibe-')).map(k => caches.delete(k))))
                      .catch(() => {});
                  }
                }
              `,
            }}
          />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | head -40
```

Expected: no TypeScript errors. Build may warn about other things but should not fail on these files.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: switch to Geist font and wire MadThemeProvider"
```

---

## Task 5: CSS Token Values

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace the entire `@layer base { :root { ... } .dark { ... } }` block**

Find this block in `globals.css` (lines 6–55) and replace it with:

```css
@layer base {
  :root {
    --font-geist: var(--font-geist-sans), system-ui, sans-serif;
    --font-roboto-serif: "Roboto Serif", serif;
    --background:           #FFFFFF;
    --foreground:           #37352F;
    --card:                 #FFFFFF;
    --card-foreground:      #37352F;
    --popover:              #FFFFFF;
    --popover-foreground:   #37352F;
    --sidebar:              #F7F6F3;
    --primary:              #37352F;
    --primary-foreground:   #FFFFFF;
    --secondary:            #F7F6F3;
    --secondary-foreground: #37352F;
    --muted:                #F7F6F3;
    --muted-foreground:     #9B9A97;
    --accent:               #EBECED;
    --accent-foreground:    #37352F;
    --destructive:          #E03E3E;
    --destructive-foreground: #FFFFFF;
    --border:               #E5E4E0;
    --input:                #E5E4E0;
    --ring:                 #37352F;
    --radius:               0.5rem;

    /* Notion semantic colors — light */
    --notion-gray-text:   #787774; --notion-gray-bg:   #EBECED;
    --notion-brown-text:  #64473A; --notion-brown-bg:  #E9E5E3;
    --notion-orange-text: #D9730D; --notion-orange-bg: #FAEBDD;
    --notion-yellow-text: #DFAB01; --notion-yellow-bg: #FBF3DB;
    --notion-green-text:  #0F7B6C; --notion-green-bg:  #DDEDEA;
    --notion-blue-text:   #0B6E99; --notion-blue-bg:   #DDEBF1;
    --notion-purple-text: #6940A5; --notion-purple-bg: #EAE4F2;
    --notion-pink-text:   #AD1A72; --notion-pink-bg:   #F4DFEB;
    --notion-red-text:    #E03E3E; --notion-red-bg:    #FBE4E4;
  }

  .dark {
    --background:           #191918;
    --foreground:           #E5E4E1;
    --card:                 #1E1E1C;
    --card-foreground:      #E5E4E1;
    --popover:              #1E1E1C;
    --popover-foreground:   #E5E4E1;
    --sidebar:              #141413;
    --primary:              #FFFFFE;
    --primary-foreground:   #191918;
    --secondary:            #2A2926;
    --secondary-foreground: #E5E4E1;
    --muted:                #2A2926;
    --muted-foreground:     #6B6A68;
    --accent:               #2A2926;
    --accent-foreground:    #E5E4E1;
    --destructive:          #FF7369;
    --destructive-foreground: #191918;
    --border:               #2A2926;
    --input:                #2A2926;
    --ring:                 #E5E4E1;

    /* Notion semantic colors — dark */
    --notion-gray-text:   #9EA0A2; --notion-gray-bg:   #454B4E;
    --notion-brown-text:  #937264; --notion-brown-bg:  #434040;
    --notion-orange-text: #FFA344; --notion-orange-bg: #594A3A;
    --notion-yellow-text: #FFDC49; --notion-yellow-bg: #59563B;
    --notion-green-text:  #4DAB9A; --notion-green-bg:  #354C4B;
    --notion-blue-text:   #529CCA; --notion-blue-bg:   #364954;
    --notion-purple-text: #9A6DD7; --notion-purple-bg: #443F57;
    --notion-pink-text:   #E255A1; --notion-pink-bg:   #533B4C;
    --notion-red-text:    #FF7369; --notion-red-bg:    #594141;
  }
}
```

Also replace the `.maddy-gradient-bg` and `.maddy-gradient-text` definitions (around line 101–110) with Notion-warm versions:

```css
.maddy-gradient-bg {
  background: linear-gradient(135deg, #37352F 0%, #4A4845 50%, #37352F 100%);
}

.dark .maddy-gradient-bg {
  background: linear-gradient(135deg, #191918 0%, #2A2926 50%, #191918 100%);
}

.maddy-gradient-text {
  background: linear-gradient(135deg, #37352F 0%, #787774 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.dark .maddy-gradient-text {
  background: linear-gradient(135deg, #E5E4E1 0%, #9B9A97 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

- [ ] **Step 2: Start dev server and visually check**

```bash
npm run dev
```

Open http://localhost:3000 — the app should now show warm off-white backgrounds in light mode and deep warm dark in dark mode.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: replace grayscale tokens with Notion Warm CSS vars"
```

---

## Task 6: Tailwind Config

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1: Replace `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Notion semantic color utilities
        "notion-gray":   { text: "var(--notion-gray-text)",   bg: "var(--notion-gray-bg)" },
        "notion-brown":  { text: "var(--notion-brown-text)",  bg: "var(--notion-brown-bg)" },
        "notion-orange": { text: "var(--notion-orange-text)", bg: "var(--notion-orange-bg)" },
        "notion-yellow": { text: "var(--notion-yellow-text)", bg: "var(--notion-yellow-bg)" },
        "notion-green":  { text: "var(--notion-green-text)",  bg: "var(--notion-green-bg)" },
        "notion-blue":   { text: "var(--notion-blue-text)",   bg: "var(--notion-blue-bg)" },
        "notion-purple": { text: "var(--notion-purple-text)", bg: "var(--notion-purple-bg)" },
        "notion-pink":   { text: "var(--notion-pink-text)",   bg: "var(--notion-pink-bg)" },
        "notion-red":    { text: "var(--notion-red-text)",    bg: "var(--notion-red-bg)" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans:  ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-roboto-serif)", "Georgia", "Cambria", "serif"],
        mono:  ["var(--font-jetbrains-mono)", "JetBrains Mono", "Consolas", "monospace"],
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
        "slide-in": "slide-in-from-right 0.2s ease-out",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-from-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

Note: the existing shadcn tokens use `hsl(var(--x))` format. The Notion token values in `globals.css` are hex, not HSL. Tailwind color references that use `hsl(var(--background))` will now resolve to `hsl(#FFFFFF)` which is invalid. Fix: update ALL shadcn token colors in tailwind.config to use `var(--x)` (no hsl wrapper) since the CSS vars are now hex values directly:

Replace the shadcn color block with:

```js
colors: {
  background: "var(--background)",
  foreground: "var(--foreground)",
  card: {
    DEFAULT: "var(--card)",
    foreground: "var(--card-foreground)",
  },
  popover: {
    DEFAULT: "var(--popover)",
    foreground: "var(--popover-foreground)",
  },
  primary: {
    DEFAULT: "var(--primary)",
    foreground: "var(--primary-foreground)",
  },
  secondary: {
    DEFAULT: "var(--secondary)",
    foreground: "var(--secondary-foreground)",
  },
  muted: {
    DEFAULT: "var(--muted)",
    foreground: "var(--muted-foreground)",
  },
  accent: {
    DEFAULT: "var(--accent)",
    foreground: "var(--accent-foreground)",
  },
  destructive: {
    DEFAULT: "var(--destructive)",
    foreground: "var(--destructive-foreground)",
  },
  border: "var(--border)",
  input: "var(--input)",
  ring: "var(--ring)",
  // Notion semantic color utilities
  "notion-gray":   { text: "var(--notion-gray-text)",   bg: "var(--notion-gray-bg)" },
  "notion-brown":  { text: "var(--notion-brown-text)",  bg: "var(--notion-brown-bg)" },
  "notion-orange": { text: "var(--notion-orange-text)", bg: "var(--notion-orange-bg)" },
  "notion-yellow": { text: "var(--notion-yellow-text)", bg: "var(--notion-yellow-bg)" },
  "notion-green":  { text: "var(--notion-green-text)",  bg: "var(--notion-green-bg)" },
  "notion-blue":   { text: "var(--notion-blue-text)",   bg: "var(--notion-blue-bg)" },
  "notion-purple": { text: "var(--notion-purple-text)", bg: "var(--notion-purple-bg)" },
  "notion-pink":   { text: "var(--notion-pink-text)",   bg: "var(--notion-pink-bg)" },
  "notion-red":    { text: "var(--notion-red-text)",    bg: "var(--notion-red-bg)" },
},
```

Also update `globals.css` to remove the `hsl()` wrappers in the `body` and `border-color` rules since vars are now hex:

In `globals.css`, find:
```css
  *,
  ::before,
  ::after {
    border-color: hsl(var(--border));
  }

  body {
    @apply bg-background text-foreground;
  }
```

The `@apply bg-background text-foreground` still works because Tailwind maps those via `var(--background)` / `var(--foreground)` now. The `border-color: hsl(var(--border))` line should become `border-color: var(--border)` since the value is already a hex color.

- [ ] **Step 2: Verify dev server still loads**

```bash
npm run dev
```

Open http://localhost:3000, check that background, text, and borders render with correct Notion Warm colors.

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js src/app/globals.css
git commit -m "feat: add Notion semantic color utilities to Tailwind config"
```

---

## Task 7: shadcn/UI Components

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/textarea.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/dropdown-menu.tsx`
- Modify: `src/components/ui/select.tsx`

- [ ] **Step 1: Update `src/components/ui/button.tsx`**

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground shadow-sm hover:opacity-90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:opacity-90",
        outline:     "border border-border bg-background shadow-sm hover:bg-[var(--notion-gray-bg)] hover:text-foreground",
        secondary:   "bg-secondary text-secondary-foreground shadow-sm hover:bg-[var(--notion-gray-bg)]",
        ghost:       "hover:bg-[var(--notion-gray-bg)] hover:text-foreground",
        link:        "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 rounded-md px-3 text-xs",
        lg:      "h-10 rounded-md px-8",
        icon:    "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

- [ ] **Step 2: Update `src/components/ui/input.tsx`**

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm leading-relaxed shadow-none transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:border-foreground/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```

- [ ] **Step 3: Update `src/components/ui/textarea.tsx`**

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-none transition-colors",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:border-foreground/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
```

- [ ] **Step 4: Update `src/components/ui/dialog.tsx`** — update `DialogContent` shadow and `DialogTitle` size

In `DialogContent`, change the className to add Notion-style shadow:

Find:
```
"fixed left-[50%] top-[50%] z-50 grid w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-1.5rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-[24px] border bg-background p-5 shadow-lg duration-200 ..."
```

Replace `shadow-lg` with `shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]` and add `bg-card` replacing `bg-background`:

```
"fixed left-[50%] top-[50%] z-50 grid w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-1.5rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-[24px] border border-border/60 bg-card p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:w-full sm:rounded-lg sm:p-6"
```

In `DialogTitle`, change size:
```
className={cn("text-base font-semibold leading-none tracking-tight", className)}
```

- [ ] **Step 5: Update `src/components/ui/dropdown-menu.tsx`** — item padding, hover color, content radius

In `DropdownMenuContent` className, change `rounded-md` to `rounded-lg` and add `border-border/80`:

```
"z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border/80 bg-card p-1 text-card-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
```

In `DropdownMenuItem`, replace `focus:bg-accent focus:text-accent-foreground` with `focus:bg-[var(--notion-gray-bg)] focus:text-foreground`, and change padding `px-2 py-1.5` to `px-2 py-[6px]` and text to `text-[13px] font-medium`:

```
"relative flex cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-[6px] text-[13px] font-medium outline-none transition-colors focus:bg-[var(--notion-gray-bg)] focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0"
```

In `DropdownMenuSeparator`, change `bg-muted` to `bg-border/60`:
```
"-mx-1 my-1 h-px bg-border/60"
```

In `DropdownMenuLabel`:
```
"px-2 py-[6px] text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
```

- [ ] **Step 6: Update `src/components/ui/select.tsx`** — same treatment as dropdown

In `SelectContent`, change `rounded-md border bg-popover text-popover-foreground` to `rounded-lg border border-border/80 bg-card text-card-foreground`.

In `SelectItem`, change `focus:bg-accent focus:text-accent-foreground` to `focus:bg-[var(--notion-gray-bg)] focus:text-foreground` and `rounded-sm` to `rounded-[6px]` and text to `text-[13px]`.

In `SelectLabel`, change to `text-[11px] font-semibold uppercase tracking-widest text-muted-foreground`.

In `SelectSeparator`, change `bg-muted` to `bg-border/60`.

- [ ] **Step 7: Lint and visual check**

```bash
npm run lint
```

Open dev server, test a dialog, dropdown, and select to confirm Notion Warm colors apply.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/textarea.tsx src/components/ui/dialog.tsx src/components/ui/dropdown-menu.tsx src/components/ui/select.tsx
git commit -m "feat: update shadcn/ui components to Notion design tokens"
```

---

## Task 8: Workspace Shell (Sidebar + Top Bar + Mobile Nav)

**Files:**
- Modify: `src/components/sidebar/sidebar.tsx`
- Modify: `src/components/workspace/workspace-top-bar.tsx`
- Modify: `src/components/layout/mobile-nav.tsx`

- [ ] **Step 1: Fix sidebar hardcoded dark colors**

In `src/components/sidebar/sidebar.tsx`, search for and replace these hardcoded color strings. Each replacement uses semantic CSS var equivalents:

| Find | Replace with |
|------|-------------|
| `bg-[#181715]` | `bg-[var(--sidebar)]` |
| `border-white/10` | `border-border/60` |
| `border-white/12` | `border-border/50` |
| `border-white/16` | `border-border/70` |
| `bg-white/[0.03]` | `bg-muted/40` |
| `bg-white/[0.04]` | `bg-muted/50` |
| `bg-white/[0.05]` | `bg-muted/60` |
| `bg-white/[0.06]` | `bg-muted/70` |
| `hover:bg-white/[0.04]` | `hover:bg-muted/50` |
| `hover:bg-white/[0.06]` | `hover:bg-muted/70` |
| `text-zinc-100` | `text-foreground` |
| `text-zinc-400` | `text-muted-foreground` |
| `hover:text-white` | `hover:text-foreground` |
| `text-zinc-200` | `text-muted-foreground` |

Also in `ModuleRailItem`, update active state:

Find:
```
isActive
  ? "border-primary/30 bg-primary/12 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
  : isDocked
    ? "border-white/12 bg-white/[0.05] text-zinc-100"
    : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/[0.04] hover:text-foreground"
```

Replace with:
```
isActive
  ? "border-border bg-[var(--notion-gray-bg)] text-foreground font-medium"
  : isDocked
    ? "border-border/50 bg-muted/60 text-foreground"
    : "border-transparent text-muted-foreground hover:border-border/50 hover:bg-[var(--notion-gray-bg)] hover:text-foreground"
```

Update the active indicator dot:
Find: `isActive ? "bg-primary" : "bg-zinc-200"`
Replace: `isActive ? "bg-foreground/60" : "bg-muted-foreground/40"`

- [ ] **Step 2: Fix workspace-top-bar hardcoded colors**

In `src/components/workspace/workspace-top-bar.tsx`, find the mobile nav button:

```
"flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 transition-colors hover:border-white/16 hover:bg-white/[0.06] hover:text-white md:hidden"
```

Replace with:
```
"flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground transition-colors hover:border-border hover:bg-[var(--notion-gray-bg)] hover:text-foreground md:hidden"
```

- [ ] **Step 3: Fix mobile-nav background**

In `src/components/layout/mobile-nav.tsx`, find:

```
"fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t bg-background/95 backdrop-blur-sm"
```

Replace with:
```
"fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-border/60 bg-[var(--sidebar)] backdrop-blur-sm"
```

- [ ] **Step 4: Lint and visual check**

```bash
npm run lint
```

Check sidebar, top bar, and mobile nav in both light and dark mode.

- [ ] **Step 5: Commit**

```bash
git add src/components/sidebar/sidebar.tsx src/components/workspace/workspace-top-bar.tsx src/components/layout/mobile-nav.tsx
git commit -m "feat: apply Notion design tokens to workspace shell components"
```

---

## Task 9: Overview Page

**Files:**
- Modify: `src/app/workspace/overview/page.tsx`

- [ ] **Step 1: Update QuickCaptureBar**

Find the quick capture container div (around line 118):

```
"relative flex items-center gap-2 bg-muted/50 border rounded-xl px-4 min-h-[48px] focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all"
```

Replace with:
```
"relative flex items-center gap-2 bg-card border border-border rounded-lg px-4 min-h-[48px] focus-within:ring-1 focus-within:ring-ring/40 focus-within:border-foreground/30 transition-all"
```

Find the hint badge:
```
"text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0"
```

Replace with:
```
"text-xs font-medium text-[var(--notion-gray-text)] bg-[var(--notion-gray-bg)] px-2 py-0.5 rounded shrink-0"
```

- [ ] **Step 2: Update PomodoroWidget**

Find (around line 167):
```
"bg-card border rounded-2xl p-4 flex flex-col items-center gap-3"
```

Replace with:
```
"bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-3"
```

For the focus/stop button, update destructive variant:
```
focusActive
  ? "bg-[var(--notion-red-bg)] text-[var(--notion-red-text)] hover:opacity-90"
  : "bg-primary text-primary-foreground hover:opacity-90"
```

For focus time selector buttons:
```
focusMinutes === m
  ? "bg-[var(--notion-blue-bg)] border-[var(--notion-blue-text)] text-[var(--notion-blue-text)]"
  : "text-muted-foreground hover:bg-[var(--notion-gray-bg)] border-border"
```

- [ ] **Step 3: Update HabitStrip**

Find (around line 236):
```
"col-span-full bg-card border rounded-2xl p-4"
```

Replace with:
```
"col-span-full bg-card border border-border rounded-xl p-4"
```

For habit buttons, update active/done state:
```
done
  ? "bg-[var(--notion-green-bg)] border-[var(--notion-green-text)]/40 text-[var(--notion-green-text)]"
  : "bg-card border-border text-muted-foreground hover:bg-[var(--notion-gray-bg)]"
```

- [ ] **Step 4: Update LedgerSnapshot (income/expense colors)**

In the overview page `LedgerSnapshot` component, find income/expense color classes and replace with Notion semantic colors:

Replace `text-emerald-400`, `text-green-400`, `text-green-500` → `text-[var(--notion-green-text)]`
Replace `text-red-400`, `text-rose-400`, `text-red-500` → `text-[var(--notion-red-text)]`
Replace `text-blue-400`, `text-blue-500` → `text-[var(--notion-blue-text)]`

- [ ] **Step 5: Lint**

```bash
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/app/workspace/overview/page.tsx
git commit -m "feat: apply Notion semantic colors to overview page"
```

---

## Task 10: Feed Page

**Files:**
- Modify: `src/app/workspace/feed/page.tsx`

- [ ] **Step 1: Replace CATEGORIES color config**

Find (lines 12–18):
```ts
const CATEGORIES = [
  { id: null, label: "For You", color: "bg-violet-500/20 text-violet-700 dark:text-violet-400" },
  { id: "ai_ml", label: "AI & ML", color: "bg-blue-500/20 text-blue-700 dark:text-blue-400" },
  { id: "tech_it", label: "Tech & IT", color: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400" },
  { id: "productivity", label: "Productivity", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
  { id: "must_know", label: "Must Know", color: "bg-orange-500/20 text-orange-700 dark:text-orange-400" },
] as const;
```

Replace with:
```ts
const CATEGORIES = [
  { id: null,          label: "For You",      bgVar: "var(--notion-purple-bg)", textVar: "var(--notion-purple-text)" },
  { id: "ai_ml",       label: "AI & ML",      bgVar: "var(--notion-blue-bg)",   textVar: "var(--notion-blue-text)" },
  { id: "tech_it",     label: "Tech & IT",    bgVar: "var(--notion-gray-bg)",   textVar: "var(--notion-gray-text)" },
  { id: "productivity",label: "Productivity", bgVar: "var(--notion-green-bg)",  textVar: "var(--notion-green-text)" },
  { id: "must_know",   label: "Must Know",    bgVar: "var(--notion-orange-bg)", textVar: "var(--notion-orange-text)" },
] as const;

type Category = typeof CATEGORIES[number];
```

- [ ] **Step 2: Update category chip rendering**

Search for any JSX that renders category chips using `.color` and update to use `bgVar`/`textVar` inline styles instead:

```tsx
// Before:
<span className={cn("...", category.color)}>

// After (wherever category chip is rendered):
<span
  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
  style={{ background: category.bgVar, color: category.textVar }}
>
```

- [ ] **Step 3: Remove gradient helpers and replace**

Delete `getCategoryGradient` and `getCategoryGradientSmall` functions. Replace any usages with a simple background using the Notion palette:

```tsx
// Replace gradient class strings on article cards with:
style={{ borderTop: `2px solid ${category.textVar}` }}
```

For article card containers, replace gradient `from-*/via-*/to-*` classes with:
```
"bg-card border border-border rounded-xl overflow-hidden hover:border-border hover:shadow-sm transition-all"
```

- [ ] **Step 4: Lint**

```bash
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add src/app/workspace/feed/page.tsx
git commit -m "feat: replace Tailwind color classes with Notion semantic colors in feed"
```

---

## Task 11: Ledger Page + Transactions Component

**Files:**
- Modify: `src/app/workspace/ledger/page.tsx`
- Modify: `src/components/ledger/transactions-tab-v2.tsx`

- [ ] **Step 1: Replace CHART_COLORS in ledger/page.tsx**

Find (line 48):
```ts
const CHART_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#06b6d4"];
```

Replace with Notion-aligned chart colors (these stay as hex since recharts requires hex):
```ts
const CHART_COLORS = [
  "#529CCA", // notion-blue
  "#FFA344", // notion-orange
  "#4DAB9A", // notion-green
  "#FF7369", // notion-red
  "#9A6DD7", // notion-purple
  "#FFDC49", // notion-yellow
  "#E255A1", // notion-pink
  "#937264", // notion-brown
  "#9EA0A2", // notion-gray
];
```

- [ ] **Step 2: Apply semantic colors to income/expense amounts in ledger/page.tsx**

Search for hardcoded color classes for financial amounts throughout the file:

Replace `text-emerald-400`, `text-green-400`, `text-green-500`, `text-emerald-500` → `text-[var(--notion-green-text)]`
Replace `text-red-400`, `text-rose-400`, `text-red-500` → `text-[var(--notion-red-text)]`
Replace `text-blue-400`, `text-blue-500`, `text-cyan-400` → `text-[var(--notion-blue-text)]`
Replace `text-amber-400`, `text-yellow-500` → `text-[var(--notion-yellow-text)]`

For transaction type badges/chips, replace hardcoded bg colors:
Replace `bg-emerald-500/10 text-emerald-400` → `bg-[var(--notion-green-bg)] text-[var(--notion-green-text)]`
Replace `bg-red-500/10 text-red-400` → `bg-[var(--notion-red-bg)] text-[var(--notion-red-text)]`
Replace `bg-blue-500/10 text-blue-400` → `bg-[var(--notion-blue-bg)] text-[var(--notion-blue-text)]`

- [ ] **Step 3: Same treatment in transactions-tab-v2.tsx**

Apply the same find/replace patterns from Step 2 to `src/components/ledger/transactions-tab-v2.tsx`.

Also update any card containers:
Replace `bg-white/5`, `bg-white/[0.05]`, `bg-zinc-800`, `bg-zinc-900` → `bg-card`
Replace `border-white/10`, `border-zinc-700/50` → `border-border`

- [ ] **Step 4: Lint**

```bash
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add src/app/workspace/ledger/page.tsx src/components/ledger/transactions-tab-v2.tsx
git commit -m "feat: apply Notion semantic colors to ledger module"
```

---

## Task 12: Automation Page

**Files:**
- Modify: `src/app/workspace/automation/page.tsx`

- [ ] **Step 1: Update the automation tile card**

Find the main tile `<Link>` component and update hover/glow classes to use Notion amber/orange:

The card already uses `bg-card` and `border-border` which will inherit correctly from CSS vars. Update the accent/glow elements:

Find `hover:border-amber-500/40` → keep (amber glow on automation tile is intentional branding)

Find the gradient wash:
```
"pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent opacity-60 transition-opacity group-hover:opacity-100"
```
Keep as-is — automation module's amber identity is intentional.

Find the status/badge chip:
```
"inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
```
Replace with:
```
"inline-flex items-center gap-1 rounded-full border border-border bg-[var(--notion-gray-bg)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
```

Find the hero badge:
```
"inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground"
```
Replace with:
```
"inline-flex items-center gap-2 rounded-full border border-border bg-[var(--notion-gray-bg)] px-3 py-1 text-xs font-medium text-muted-foreground"
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/app/workspace/automation/page.tsx
git commit -m "feat: apply Notion tokens to automation page"
```

---

## Task 13: Theme Switcher + Settings Page

**Files:**
- Create: `src/components/settings/theme-switcher.tsx`
- Modify: `src/app/workspace/settings/page.tsx`

- [ ] **Step 1: Create `src/components/settings/theme-switcher.tsx`**

```tsx
"use client";

import { useMadTheme } from "@/components/providers/mad-theme-provider";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const AVAILABLE_THEMES = [
  {
    id: "notion",
    name: "Notion Warm",
    lightSwatch: "#F7F6F3",
    darkSwatch: "#141413",
    contentSwatch: "#FFFFFF",
    darkContentSwatch: "#191918",
  },
] as const;

export function ThemeSwitcher() {
  const { themeName, setThemeName } = useMadTheme();

  return (
    <div className="flex flex-wrap gap-3">
      {AVAILABLE_THEMES.map((t) => {
        const isSelected = themeName === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setThemeName(t.id)}
            className={cn(
              "relative flex flex-col gap-2 rounded-lg border-2 p-3 text-left transition-all",
              isSelected
                ? "border-foreground shadow-sm"
                : "border-border hover:border-foreground/30"
            )}
          >
            {/* Swatch pair */}
            <div className="flex gap-1.5">
              <span
                className="h-8 w-8 rounded-md border border-border/40"
                style={{ background: t.lightSwatch }}
                title="Light sidebar"
              />
              <span
                className="h-8 w-8 rounded-md border border-border/40"
                style={{ background: t.contentSwatch }}
                title="Light content"
              />
              <span
                className="h-8 w-8 rounded-md border border-border/40"
                style={{ background: t.darkSwatch }}
                title="Dark sidebar"
              />
              <span
                className="h-8 w-8 rounded-md border border-border/40"
                style={{ background: t.darkContentSwatch }}
                title="Dark content"
              />
            </div>
            <span className="text-xs font-medium text-foreground">{t.name}</span>
            {isSelected && (
              <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-foreground">
                <Check className="h-2.5 w-2.5 text-background" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Add ThemeSwitcher to the Appearance section in settings/page.tsx**

Find the import block at the top and add:
```tsx
import { ThemeSwitcher } from "@/components/settings/theme-switcher";
```

Find the Appearance section in the JSX (search for `Palette` icon or `"appearance"` section heading). Above the dark/light/system theme toggle, add:

```tsx
<div className="mb-6">
  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
    Theme
  </p>
  <ThemeSwitcher />
</div>
```

- [ ] **Step 3: Lint and visual check**

```bash
npm run lint
```

Navigate to Settings → Appearance and confirm the ThemeSwitcher renders with the Notion Warm swatch and a checkmark.

- [ ] **Step 4: Final build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: build completes without TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/theme-switcher.tsx src/app/workspace/settings/page.tsx
git commit -m "feat: add ThemeSwitcher component and wire into Settings appearance section"
```

---

## Final Verification

- [ ] Run `npm run lint` — zero new errors
- [ ] Run `npm run build` — build completes
- [ ] Open app in light mode — warm off-white `#F7F6F3` sidebar, `#FFFFFF` content, `#37352F` text
- [ ] Toggle to dark mode — `#141413` sidebar, `#191918` content, `#E5E4E1` text
- [ ] Open Settings → Appearance — ThemeSwitcher visible with Notion Warm swatch
- [ ] Open Ledger — income amounts render in `--notion-green-text`, expenses in `--notion-red-text`
- [ ] Open Feed — category chips use Notion color palette
- [ ] Open a Dialog — shadow correct, bg is `--card`
- [ ] Open a Dropdown — items 13px, Notion gray hover

---

## Self-Review Notes

- **hsl() wrapper removal**: Task 6 explicitly calls out that CSS vars are now hex, not `H S% L%` format. The Tailwind config must use `var(--x)` not `hsl(var(--x))`. Task 6 step 1 handles this.
- **Geist variable name**: The `geist` package uses `--font-geist-sans` (not `--font-geist`). Task 6 tailwind config uses `var(--font-geist-sans)` consistently.
- **Sidebar hardcoded colors**: Task 8 step 1 provides an explicit find/replace table — no guesswork.
- **No test framework**: Verification steps use `npm run lint` + `npm run build` + visual dev server checks instead of automated tests.
- **Convex generated files**: None of the 22 modified/created files touch `convex/_generated/`.
