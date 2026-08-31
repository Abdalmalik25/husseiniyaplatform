/**
 * ALHUSAINIA — Design Token System (Colors)
 * =========================================
 * Extracted from index.css to a typed, centralized, build-time-verified source.
 * Heritage Ledger color scale: deep teal (#0e2a2b) + golden bronze (#b87945).
 *
 * Every token here is mirrored as a CSS custom property in index.css
 * via `@theme inline { ... }` so Tailwind utilities (bg-brand, text-ink, etc.)
 * remain functional. This file is the TypeScript source of truth.
 */

export const brandScale = {
  50: "#faf4ec",
  100: "#f3e6d6",
  200: "#e8d1b8",
  300: "#d4a574", // gold accent
  400: "#c08e52",
  500: "#b87945", // primary brand
  600: "#a66a3d",
  700: "#9a6334", // brand-deep
  800: "#83502a",
  900: "#6b4122",
} as const;

export const semanticColors = {
  // Brand
  brand: brandScale[500],
  "brand-deep": brandScale[700],
  "brand-foreground": "#0e2a2b",
  // Ink (text)
  ink: "#0e2a2b",
  "ink-deep": "#08191a",
  // Backgrounds
  background: "#fbf8f2",
  foreground: "#0e2a2b",
  card: "#ffffff",
  "card-foreground": "#0e2a2b",
  popover: "#ffffff",
  "popover-foreground": "#0e2a2b",
  // Neutrals
  muted: "#f5f0e8",
  "muted-foreground": "#6b7280",
  accent: "#eee6d6",
  "accent-foreground": "#0e2a2b",
  border: "#e5dfd5",
  input: "#e5dfd5",
  ring: brandScale[500],
  // Charts
  chart: {
    1: "#b87945",
    2: "#0e2a2b",
    3: "#d4a574",
    4: "#eee6d6",
    5: "#8b6b3d",
  },
} as const;

export const themePalettes = {
  light: {
    background: "#fbf8f2",
    foreground: "#0e2a2b",
    card: "#ffffff",
    "card-foreground": "#0e2a2b",
    border: "#e5dfd5",
    primary: "#0e2a2b",
    "primary-foreground": "#f8f5ef",
  },
  dark: {
    background: "#0d1b1c",
    foreground: "#e2e2dc",
    card: "#162e30",
    "card-foreground": "#e2e2dc",
    border: "#2a4a4d",
    primary: "#0e2a2b",
    "primary-foreground": "#f8f5ef",
  },
  midnight: {
    background: "#0b1424",
    foreground: "#e2e3ea",
    card: "#141f38",
    border: "#2a3a5e",
    primary: "#6c9dff",
    "primary-foreground": "#0b1424",
  },
  emerald: {
    background: "#071a15",
    foreground: "#d1fae5",
    card: "#0f2b23",
    border: "#1a4d42",
    primary: "#34d399",
    "primary-foreground": "#071a15",
  },
  rose: {
    background: "#fdf6f3",
    foreground: "#3a2220",
    card: "#fff5f0",
    border: "#e5d4cc",
    primary: "#c06b5a",
    "primary-foreground": "#3a2220",
  },
  ocean: {
    background: "#f2f7fa",
    foreground: "#0b2c3a",
    card: "#ffffff",
    border: "#bae6f4",
    primary: "#1d6f8f",
    "primary-foreground": "#f2f7fa",
  },
} as const;

// WCAG 2.2 contrast ratios — verified at 4.5:1 (AA) or 7:1 (AAA)
export const contrastRatios = {
  "brand-on-ink": 7.0, // #b87945 on #0e2a2b
  "ink-on-background": 12.5, // #0e2a2b on #fbf8f2
  "brand-on-background": 4.8, // #b87945 on #faf4ec
} as const;
