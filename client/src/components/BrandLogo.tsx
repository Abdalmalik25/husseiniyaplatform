import React from "react";

type BrandLogoProps = {
  /** Pixel size of the square monogram tile. */
  size?: number;
  /** Show the Arabic/English wordmark next to the mark. */
  withWordmark?: boolean;
  /** Wordmark text color (defaults to currentColor). */
  wordmarkClassName?: string;
  /** Force a light wordmark (for dark backgrounds). */
  onDark?: boolean;
  className?: string;
};

/**
 * ────────────────────────────────────────────────────────────────────────
 * ALHUSAINIA — Official Global Brand Mark
 * ────────────────────────────────────────────────────────────────────────
 *
 * Design Language: "The Open Ledger"
 * ──────────────────────────────────
 * A clean, formal, globally-legible monogram built on strict geometry:
 *
 *   • An open book (knowledge & services) rendered as two symmetric
 *     golden pages meeting at a central spine.
 *   • A rising ledger line crossing the pages — accounting & growth.
 *   • A deep-teal heritage tile with a precise gold keyline.
 *
 * Deliberately minimal: one idea, one silhouette, instantly recognizable
 * at 16px favicon size and on print. Built on a 64×64 grid with 8pt
 * spacing. Font-free and resolution-independent.
 */
export function BrandMark({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="شعار منصة الحسينية لخدمات الأعمال"
      className={className}
    >
      <defs>
        {/* Tile gradient: deep teal heritage */}
        <linearGradient id="alhTile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#164043" />
          <stop offset="55%" stopColor="#0e2a2b" />
          <stop offset="100%" stopColor="#08191a" />
        </linearGradient>

        {/* Gold gradient for the book pages */}
        <linearGradient id="alhGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e7c9a6" />
          <stop offset="100%" stopColor="#b87945" />
        </linearGradient>
      </defs>

      {/* ── Foundation tile ── */}
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#alhTile)" />

      {/* Apex double keyline — خارجي رفيع + داخلي وهّاج */}
      <rect
        x="3.5"
        y="3.5"
        width="57"
        height="57"
        rx="12.5"
        fill="none"
        stroke="#b87945"
        strokeOpacity="0.38"
        strokeWidth="1.2"
      />
      <rect
        x="5.2"
        y="5.2"
        width="53.6"
        height="53.6"
        rx="11"
        fill="none"
        stroke="#e7c9a6"
        strokeOpacity="0.14"
        strokeWidth="0.7"
      />
      {/* Apex inner highlight */}
      <radialGradient id="alhHighlight" cx="0.35" cy="0.25" r="0.8">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.09" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#alhHighlight)" />

      {/* ── The Open Book (two symmetric pages) ── */}
      {/* Left page */}
      <path
        d="M13 22 C20 16.5, 26 16.5, 31 21 L31 42 C26 37.5, 20 37.5, 13 43 Z"
        fill="url(#alhGold)"
      />
      {/* Right page */}
      <path
        d="M51 22 C44 16.5, 38 16.5, 33 21 L33 42 C38 37.5, 44 37.5, 51 43 Z"
        fill="url(#alhGold)"
      />

      {/* ── Central spine ── */}
      <path
        d="M32 21 L32 42"
        stroke="#0a1f20"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* ── Rising ledger line (growth & accounting) — Apex gold tip ── */}
      <path
        d="M18 33 L25 29 L31 31.5 L38 26.5 L46 22.5"
        fill="none"
        stroke="#0a1f20"
        strokeOpacity="0.58"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Ledger arrow head — ذهبي */}
      <path
        d="M42.8 22 L46.5 22 L46.5 25.7"
        fill="none"
        stroke="#e7c9a6"
        strokeOpacity="0.95"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="46.5" cy="22" r="1.1" fill="#e7c9a6" opacity={0.95} />
    </svg>
  );
}

/**
 * Full lockup: mark + bilingual wordmark.
 * Arabic name primary, English secondary in letterspaced mono.
 */
export function BrandLogo({
  size = 36,
  withWordmark = true,
  wordmarkClassName,
  onDark = true,
  className,
}: BrandLogoProps) {
  const wordColor = wordmarkClassName ?? (onDark ? "text-white" : "text-ink");
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <BrandMark size={size} />
      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className={`font-display font-black tracking-tight text-[13.5px] leading-none ${wordColor}`}
            style={{ fontFamily: '"Tajawal", system-ui, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            الحسينية لخدمات الأعمال
          </span>
          <span
            className={`font-display font-bold tracking-[0.18em] text-[8.5px] mt-0.5 ${
              onDark ? "text-brand-300" : "text-brand"
            }`}
            style={{ fontFamily: '"Tajawal", system-ui, sans-serif', fontWeight: 700 }}
          >
            ALHUSAINIA BUSINESS SERVICES
          </span>
        </span>
      )}
    </span>
  );
}
