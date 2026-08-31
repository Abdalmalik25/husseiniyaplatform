/**
 * ALHUSAINIA — Design Token System (Typography)
 * ==============================================
 * Typed source of truth for the typographic scale.
 * Mirrors CSS `@theme` in index.css for Tailwind interop.
 *
 * Font stack: IBM Plex Sans Arabic (body) + Tajawal (headings).
 * All fonts are self-hosted WOFF2 with font-display: swap.
 */

export type FontSizeKey =
  | "4xs"
  | "3xs"
  | "2xs"
  | "xs"
  | "sm"
  | "base"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl";

export interface FontSizeToken {
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
}

/**
 * Modular scale (ratio 1.25) — each step multiplies by ~1.25.
 * Line heights follow a 1.1–1.6 curve optimized for Arabic readability.
 * Arabic text typically needs 1.5–1.7 line-height; Latin 1.4–1.6.
 */
export const fontSizes: Record<FontSizeKey, FontSizeToken> = {
  "4xs": { fontSize: "0.625rem", lineHeight: "1" }, // 10px
  "3xs": { fontSize: "0.694rem", lineHeight: "1.1" }, // 11px
  "2xs": { fontSize: "0.778rem", lineHeight: "1.2" }, // 12.4px
  xs: { fontSize: "0.875rem", lineHeight: "1.3" }, // 14px
  sm: { fontSize: "0.972rem", lineHeight: "1.35" }, // 15.5px
  base: { fontSize: "1rem", lineHeight: "1.5" }, // 16px
  lg: { fontSize: "1.125rem", lineHeight: "1.5" }, // 18px
  xl: { fontSize: "1.266rem", lineHeight: "1.5" }, // 20.25px
  "2xl": { fontSize: "1.5rem", lineHeight: "1.4" }, // 24px
  "3xl": { fontSize: "1.875rem", lineHeight: "1.3" }, // 30px
  "4xl": { fontSize: "2.25rem", lineHeight: "1.2" }, // 36px
} as const;

export const fontFamilies = {
  display:
    '"Tajawal", "IBM Plex Sans Arabic", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  body: '"IBM Plex Sans Arabic", "Tajawal", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", "JetBrains Mono", Menlo, Consolas, monospace',
} as const;

export const fontWeights = {
  light: "300",
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
  black: "900",
} as const;

export const fontOpticalSizing = {
  // Arabic glyphs benefit from `auto` optical sizing at larger sizes
  heading: "auto",
  body: "auto",
} as const;

export const textStyles = {
  "heading-1": {
    fontSize: fontSizes["4xl"],
    fontWeight: fontWeights.black,
    fontFamily: fontFamilies.display,
  },
  "heading-2": {
    fontSize: fontSizes["3xl"],
    fontWeight: fontWeights.extrabold,
    fontFamily: fontFamilies.display,
  },
  "heading-3": {
    fontSize: fontSizes["2xl"],
    fontWeight: fontWeights.bold,
    fontFamily: fontFamilies.display,
  },
  "body-large": {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
    fontFamily: fontFamilies.body,
  },
  "body-base": {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.regular,
    fontFamily: fontFamilies.body,
  },
  "body-small": {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    fontFamily: fontFamilies.body,
  },
  caption: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    fontFamily: fontFamilies.body,
  },
} as const;
