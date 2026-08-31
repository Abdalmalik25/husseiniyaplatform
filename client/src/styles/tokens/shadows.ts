/**
 * ALHUSAINIA — Design Token System (Shadows & Elevation)
 * =======================================================
 * Named elevation tiers that map to realistic shadow + border
 * combinations for the "Heritage Ledger" glassmorphism language.
 */

export const shadows = {
  // Glassmorphism surfaces (the signature look)
  "glass-sm": "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
  glass:
    "0 4px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.1)",
  "glass-lg":
    "0 10px 30px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
  "glass-xl":
    "0 20px 50px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
  // Brand-accent glows
  "glow-brand-sm": "0 0 20px rgba(184,121,69,0.15)",
  "glow-brand": "0 0 40px rgba(184,121,69,0.25)",
  "glow-brand-lg": "0 0 60px rgba(184,121,69,0.4)",
  "glow-emerald": "0 0 20px rgba(5,150,105,0.2), 0 0 60px rgba(5,150,105,0.08)",
  "glow-ink": "0 8px 32px rgba(14,42,43,0.3), 0 2px 8px rgba(14,42,43,0.15)",
  // Standard elevations (for cards, modals)
  sm: "0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 3px 0 rgba(0,0,0,0.04)",
  DEFAULT: "0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px 0 rgba(0,0,0,0.03)",
  md: "0 4px 6px -1px rgba(0,0,0,0.04), 0 2px 4px -1px rgba(0,0,0,0.03)",
  lg: "0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)",
  xl: "0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02)",
  "2xl": "0 25px 50px -12px rgba(0,0,0,0.08)",
  "3xl": "0 35px 60px -20px rgba(0,0,0,0.12)",
} as const;

export type ShadowKey = keyof typeof shadows;
