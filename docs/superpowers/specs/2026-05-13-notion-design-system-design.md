# Notion Design System — MadVibe

**Date:** 2026-05-13  
**Status:** Approved  
**Scope:** Full system overhaul — every corner of the app

---

## Summary

Inject Notion's design system across all of MadVibe. Replace the current grayscale token system with Notion's exact color palette. Ship with Geist font. Build a centralized theme architecture that defaults to Notion Warm (light + dark) and makes adding future themes a one-object change.

---

## Decisions

| Decision | Choice |
|----------|--------|
| Font | Geist (replaces Inter; Roboto Serif + JetBrains Mono stay) |
| Light mode style | Notion B — warm off-white (`#FFFFFF` content, `#F7F6F3` sidebar), 8px radius |
| Dark mode style | Notion C — deep warm dark (`#191918` bg, `#141413` sidebar) |
| Semantic colors | Full — Notion's 9 colors carry meaning everywhere (income, expense, tags, badges) |
| Additional themes | Architecture ready, shipping Notion Warm only |

---

## Section 1 — Theme Architecture

### Files

```
src/lib/themes.ts                         ← all token values per theme (TS objects)
src/lib/theme-utils.ts                    ← injectThemeCSSVars() helper
src/components/providers/
  mad-theme-provider.tsx                  ← wraps next-themes, adds themeName context
src/components/settings/
  theme-switcher.tsx                      ← theme picker UI in Settings page
```

### How it works

Each theme is a plain TS object:

```ts
// src/lib/themes.ts
export type ThemeTokens = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

export const THEMES: Record<string, ThemeTokens> = {
  notion: {
    light: {
      "--background": "#FFFFFF",
      "--foreground": "#37352F",
      "--sidebar": "#F7F6F3",
      // ...etc
    },
    dark: {
      "--background": "#191918",
      "--foreground": "#E5E4E1",
      "--sidebar": "#141413",
      // ...etc
    },
  },
  // future themes here — one object, nothing else to change
};

export const DEFAULT_THEME = "notion";
```

`MadThemeProvider` wraps `next-themes`' `ThemeProvider`. On mount it reads `madvibe-theme` from localStorage, sets `data-theme` on `<html>`, and injects the theme's CSS vars. It exposes `{ themeName, setThemeName }` via context. next-themes continues controlling the `dark` class.

The Notion semantic color vars (9 families) are **invariant across themes** — they live directly in `globals.css` `:root` and `.dark` blocks. Only chrome tokens (background, sidebar, card, border, etc.) vary per theme.

---

## Section 2 — CSS Token Values

### globals.css — Notion Warm light

```css
:root {
  --background:        #FFFFFF;
  --foreground:        #37352F;
  --card:              #FFFFFF;
  --card-foreground:   #37352F;
  --popover:           #FFFFFF;
  --popover-foreground:#37352F;
  --sidebar:           #F7F6F3;
  --primary:           #37352F;
  --primary-foreground:#FFFFFF;
  --secondary:         #F7F6F3;
  --secondary-foreground: #37352F;
  --muted:             #F7F6F3;
  --muted-foreground:  #9B9A97;
  --accent:            #EBECED;
  --accent-foreground: #37352F;
  --destructive:       #E03E3E;
  --destructive-foreground: #FFFFFF;
  --border:            #E5E4E0;
  --input:             #E5E4E0;
  --ring:              #37352F;
  --radius:            0.5rem;

  /* Notion semantic colors — light */
  --notion-gray-text:   #787774;  --notion-gray-bg:   #EBECED;
  --notion-brown-text:  #64473A;  --notion-brown-bg:  #E9E5E3;
  --notion-orange-text: #D9730D;  --notion-orange-bg: #FAEBDD;
  --notion-yellow-text: #DFAB01;  --notion-yellow-bg: #FBF3DB;
  --notion-green-text:  #0F7B6C;  --notion-green-bg:  #DDEDEA;
  --notion-blue-text:   #0B6E99;  --notion-blue-bg:   #DDEBF1;
  --notion-purple-text: #6940A5;  --notion-purple-bg: #EAE4F2;
  --notion-pink-text:   #AD1A72;  --notion-pink-bg:   #F4DFEB;
  --notion-red-text:    #E03E3E;  --notion-red-bg:    #FBE4E4;
}
```

### globals.css — Notion Warm dark

```css
.dark {
  --background:        #191918;
  --foreground:        #E5E4E1;
  --card:              #1E1E1C;
  --card-foreground:   #E5E4E1;
  --popover:           #1E1E1C;
  --popover-foreground:#E5E4E1;
  --sidebar:           #141413;
  --primary:           #FFFFFE;
  --primary-foreground:#191918;
  --secondary:         #2A2926;
  --secondary-foreground: #E5E4E1;
  --muted:             #2A2926;
  --muted-foreground:  #6B6A68;
  --accent:            #2A2926;
  --accent-foreground: #E5E4E1;
  --destructive:       #FF7369;
  --destructive-foreground: #191918;
  --border:            #2A2926;
  --input:             #2A2926;
  --ring:              #E5E4E1;

  /* Notion semantic colors — dark */
  --notion-gray-text:   #9EA0A2;  --notion-gray-bg:   #454B4E;
  --notion-brown-text:  #937264;  --notion-brown-bg:  #434040;
  --notion-orange-text: #FFA344;  --notion-orange-bg: #594A3A;
  --notion-yellow-text: #FFDC49;  --notion-yellow-bg: #59563B;
  --notion-green-text:  #4DAB9A;  --notion-green-bg:  #354C4B;
  --notion-blue-text:   #529CCA;  --notion-blue-bg:   #364954;
  --notion-purple-text: #9A6DD7;  --notion-purple-bg: #443F57;
  --notion-pink-text:   #E255A1;  --notion-pink-bg:   #533B4C;
  --notion-red-text:    #FF7369;  --notion-red-bg:    #594141;
}
```

### tailwind.config.js additions

```js
colors: {
  // existing shadcn vars unchanged
  "notion-gray":   { text: "var(--notion-gray-text)",   bg: "var(--notion-gray-bg)" },
  "notion-brown":  { text: "var(--notion-brown-text)",  bg: "var(--notion-brown-bg)" },
  "notion-orange": { text: "var(--notion-orange-text)", bg: "var(--notion-orange-bg)" },
  "notion-yellow": { text: "var(--notion-yellow-text)", bg: "var(--notion-yellow-bg)" },
  "notion-green":  { text: "var(--notion-green-text)",  bg: "var(--notion-green-bg)" },
  "notion-blue":   { text: "var(--notion-blue-text)",   bg: "var(--notion-blue-bg)" },
  "notion-purple": { text: "var(--notion-purple-text)", bg: "var(--notion-purple-bg)" },
  "notion-pink":   { text: "var(--notion-pink-text)",   bg: "var(--notion-pink-bg)" },
  "notion-red":    { text: "var(--notion-red-text)",    bg: "var(--notion-red-bg)" },
}
```

---

## Section 3 — Font

### layout.tsx

Replace `Inter` import with `Geist`. Geist is available via `next/font/google` (added to Google Fonts in 2024). If the import fails at build time, fall back to the `geist` npm package (`npm i geist`) and import from `"geist/font/sans"` instead:

```ts
import { Geist, Roboto_Serif, JetBrains_Mono } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
  preload: false,
});
```

Remove `--font-inter` from html className, add `--font-geist`.

**Also change body className** from `font-serif` → `font-sans` so Geist applies app-wide (Roboto Serif is editor-only):

```tsx
<body className="font-sans antialiased">
```

### tailwind.config.js

```js
fontFamily: {
  sans:  ["var(--font-geist)", "system-ui", "sans-serif"],
  serif: ["var(--font-roboto-serif)", "Georgia", "Cambria", "serif"],
  mono:  ["var(--font-jetbrains-mono)", "JetBrains Mono", "Consolas", "monospace"],
},
```

### globals.css

Remove `--font-inter` custom property. Add `--font-geist: "Geist", system-ui, sans-serif`.

---

## Section 4 — UI Components

Files in `src/components/ui/`:

### button.tsx

| Variant | Light | Dark |
|---------|-------|------|
| `default` | bg `--primary` (#37352F), text white | bg `--primary` (#FFFFFE), text dark |
| `ghost` | hover bg `--notion-gray-bg` | hover bg `--accent` |
| `outline` | border `--border`, hover bg `--notion-gray-bg` | same via vars |
| `destructive` | bg `--destructive` (#E03E3E) | bg `--destructive` (#FF7369) |

### input.tsx / textarea.tsx

- Border: `--border`, bg: `--background`
- Focus: `ring-1 ring-ring/30` (softer than current)
- Placeholder: `--muted-foreground`
- Font size: 14px, line-height 1.5

### dialog.tsx

- bg: `--card`, border: `--border/60`
- Shadow: `0 20px 60px -20px rgba(0,0,0,0.3)` light / `0 20px 60px -20px rgba(0,0,0,0.6)` dark
- Title: 16px/600, Description: 14px muted-foreground

### dropdown-menu.tsx / select.tsx

- Content bg: `--card`, border: `--border/80`
- Item: 13px/500, hover bg: `var(--notion-gray-bg)`
- Item padding: `6px 8px`, radius: `6px`
- Separator: `--border/60`

### skeleton.tsx

- bg: `--muted`, shimmer via existing `.skeleton-shimmer`

---

## Section 5 — Workspace Shell

### sidebar.tsx

- Root bg: `--sidebar`
- Nav items: padding `5px 8px`, radius `6px`, font 13px/500
- Active state light: `background: rgba(55,53,47,0.08)`, text `--foreground`
- Active state dark: `background: rgba(255,255,255,0.07)`, text `--foreground`
- Hover: `rgba(55,53,47,0.04)` light / `rgba(255,255,255,0.04)` dark
- Section labels: 11px/700 uppercase, `--muted-foreground`
- Dividers: `--border/60`

### workspace-top-bar.tsx

- bg: `--background`, border-bottom: `--border/50`
- Title: 14px/600, Breadcrumb separator: `--muted-foreground/40`

### mobile-nav.tsx

- bg: `--sidebar`, border-top: `--border/60`
- Active icon + label: `--foreground`, inactive: `--muted-foreground`

---

## Section 6 — Module Pages

### Overview (`/workspace/overview`)

- Greeting: 28px/700 Geist, `--foreground`
- Stat cards: bg `--card`, border `--border`, radius `10px`, shadow `0 1px 3px rgba(0,0,0,0.06)`
- Quick capture bar: bg `--card`, border `--border`, focus ring `--ring/20`
- Module tags: use `notion-*-bg/text` utilities

### Brain (`/workspace/brain`)

- Page list items: hover bg `--notion-gray-bg`
- Database view tabs: active border-bottom `--foreground`
- Database cell tags: `notion-*-bg/text` by color name stored in row data
- Empty state: `--muted-foreground`, 14px

### Ledger (`/workspace/ledger`)

Semantic color mapping:
- Income amounts + tags → `notion-green-text` / `notion-green-bg`
- Expense amounts + tags → `notion-red-text` / `notion-red-bg`
- Savings/investment → `notion-blue-text` / `notion-blue-bg`
- Pending/warning → `notion-yellow-text` / `notion-yellow-bg`
- Account cards: bg `--card`, border `--border`
- Transaction rows: border-bottom `--border/40`

### Feed (`/workspace/feed`)

- Article cards: bg `--card`, border `--border`, hover shadow
- Category chips: mapped to Notion colors (AI/ML → blue, Finance → green, Tech → purple, etc.)
- Read/unread state: unread `--foreground`, read `--muted-foreground`

### Automation (`/workspace/automation`)

- Card panels: bg `--card`, border `--border`
- Status badges: success → `notion-green`, pending → `notion-yellow`, error → `notion-red`

### Settings (`/workspace/settings`)

- Section headers: 12px/700 uppercase `--muted-foreground`
- Form rows: border-bottom `--border/40`
- Theme switcher: added at top of Appearance section — shows "Notion Warm" swatch with light/dark toggle

---

## Section 7 — Theme Switcher UI

Location: `Settings → Appearance` (already exists, add theme picker above dark mode toggle).

Component: `src/components/settings/theme-switcher.tsx`

Shows named theme cards (initially just "Notion Warm") as a single-select grid. Each card shows a 2-color swatch (sidebar + background tone) and the theme name. Selected state: border `--foreground`. Persist selection to localStorage key `madvibe-theme`.

---

## Implementation Order

Execute in strict layers — each layer testable before the next:

1. `src/lib/themes.ts` + `src/lib/theme-utils.ts` — define tokens, no UI yet
2. `src/components/providers/mad-theme-provider.tsx` — wire provider
3. `src/app/layout.tsx` — Geist font + wrap with MadThemeProvider
4. `src/app/globals.css` — replace all token values, add Notion semantic vars
5. `tailwind.config.js` — add notion-* color extensions + Geist font family
6. `src/components/ui/*` — update all shadcn components
7. `src/components/sidebar/sidebar.tsx` + top-bar + mobile-nav
8. `src/app/workspace/overview/page.tsx`
9. `src/app/workspace/brain/` + database components
10. `src/app/workspace/ledger/` + transaction components
11. `src/app/workspace/feed/` components
12. `src/app/workspace/automation/` components
13. `src/app/workspace/settings/page.tsx` + theme-switcher.tsx

---

## Constraints

- `convex/_generated/` never touched
- BlockNote overrides in globals.css updated to use Notion vars but structure unchanged
- `serverExternalPackages` in next.config.js unchanged
- No new npm packages except `geist` font (already available via next/font/google)
- Performance: no CSS-in-JS, no runtime style injection beyond the one-time theme var injection on mount
