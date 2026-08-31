/**
 * ALHUSAINIA — Design Token System (Effects & Animations)
 * =======================================================
 * Animation durations, easings, and transition presets.
 * All animations respect `prefers-reduced-motion: reduce`.
 */

export const durations = {
  instant: "0.05s",
  fast: "0.15s",
  normal: "0.25s",
  slow: "0.45s",
  slower: "0.75s",
  slowest: "1.2s",
} as const;

export const easings = {
  // Standard easing — balanced, natural
  standard: "cubic-bezier(0.4, 0, 0.2, 1)",
  // Emphatic — for entrance animations
  emphasized: "cubic-bezier(0.22, 1, 0.36, 1)",
  // Expressive — for interactive hover effects
  expressive: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  // Linear
  linear: "linear",
} as const;

export const transitions = {
  "all-fast": `all ${durations.fast} ${easings.standard}`,
  "all-normal": `all ${durations.normal} ${easings.standard}`,
  "all-slow": `all ${durations.slow} ${easings.emphasized}`,
  colors: `color, background-color, border-color ${durations.normal} ${easings.standard}`,
  transform: `transform ${durations.fast} ${easings.standard}`,
  opacity: `opacity ${durations.normal} ${easings.emphasized}`,
} as const;

export const animations = {
  "float-slow": "float-slow 14s ease-in-out infinite",
  "pulse-brand": "pulse-brand 2s ease-in-out infinite",
  "slide-indeterminate":
    "slide-indeterminate 1.4s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite",
  "bounce-up": "bounce-up 2.2s ease-in-out infinite",
} as const;

// Reveal animation presets (used in Landing sections)
export const revealPresets = {
  left: "opacity 0.8s ease, transform 0.8s ease",
  right: "opacity 0.8s ease, transform 0.8s ease",
  scale: "opacity 0.7s ease, transform 0.7s ease",
} as const;
