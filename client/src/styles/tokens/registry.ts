/**
 * ALHUSAINIA — Design Token Registry
 * ===================================
 * Runtime-accessible token registry that bridges design tokens
 * and CSS variables. Used by the ThemeProvider to dynamically
 * inject/update theme values.
 */

import { brandScale, semanticColors, themePalettes } from "./colors";
import { fontSizes, fontFamilies, fontWeights } from "./typography";

export function tokensForTheme(
  themeId: keyof typeof themePalettes
): Record<string, string> {
  const palette = themePalettes[themeId] ?? themePalettes.light;
  const tokens: Record<string, string> = {};

  // Map semantic colors to CSS variables
  for (const [key, value] of Object.entries(palette)) {
    tokens[`--${key}`] = value;
  }

  // Brand scale
  for (const [key, value] of Object.entries(brandScale)) {
    tokens[`--brand-${key}`] = value;
  }
  tokens["--brand"] = brandScale[500];
  tokens["--brand-deep"] = brandScale[700];

  // Typography
  tokens["--font-display"] = fontFamilies.display;
  tokens["--font-body"] = fontFamilies.body;
  tokens["--font-mono"] = fontFamilies.mono;

  return tokens;
}

/** Inject CSS variables into :root — called by ThemeProvider on theme change. */
export function injectThemeTokens(themeId: keyof typeof themePalettes): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const tokens = tokensForTheme(themeId);
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}

export { semanticColors };
