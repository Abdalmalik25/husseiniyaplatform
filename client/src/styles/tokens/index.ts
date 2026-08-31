/**
 * ALHUSAINIA — Design Token System Registry
 * ==========================================
 * Central barrel export for all design tokens.
 * Import from `@/styles/tokens` for typed, centralized access.
 */

// Re-export the most-used tokens at top level for ergonomic access
export { brandScale, semanticColors, themePalettes } from "./colors";
export {
  fontSizes,
  fontFamilies,
  fontWeights,
  textStyles,
  type FontSizeKey,
} from "./typography";
export { spacing, safeArea } from "./spacing";
export { radii } from "./radius";
export { shadows, type ShadowKey } from "./shadows";
export {
  durations,
  easings,
  transitions,
  animations,
  revealPresets,
} from "./effects";
