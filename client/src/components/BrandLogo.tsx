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
 * ALHUSAINIA brand mark — an open "ledger/book" monogram inside a heritage
 * teal tile with a bronze spine, evoking accounts + library. Font-independent
 * so it renders identically in favicons, emails, and low-end devices.
 */
export function BrandMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="شعار الحسينية"
      className={className}
    >
      <defs>
        <linearGradient id="alhTile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#13383a" />
          <stop offset="100%" stopColor="#0a1f20" />
        </linearGradient>
        <linearGradient id="alhBook" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4a574" />
          <stop offset="100%" stopColor="#b87945" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#alhTile)" />
      <rect
        x="2.5"
        y="2.5"
        width="59"
        height="59"
        rx="13.5"
        fill="none"
        stroke="#b87945"
        strokeOpacity="0.35"
      />
      {/* Open book / ledger */}
      <path
        d="M14 23c7.5-6 13-6 18-1.5C37 17 42.5 17 50 23v18c-7.5-6-13-6-18-1.5C27.5 35 22 35 14 41z"
        fill="url(#alhBook)"
      />
      {/* Center spine */}
      <path d="M32 21.5v20.5" stroke="#0a1f20" strokeWidth="2.4" strokeLinecap="round" />
      {/* Page lines */}
      <path d="M19 29h10M19 34h10M35 29h10M35 34h10" stroke="#0a1f20" strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function BrandLogo({
  size = 36,
  withWordmark = true,
  wordmarkClassName,
  onDark = true,
  className,
}: BrandLogoProps) {
  const wordColor = wordmarkClassName ?? (onDark ? "text-white" : "text-[#0e2a2b]");
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <BrandMark size={size} />
      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className={`font-display font-black tracking-tight text-[15px] ${wordColor}`}
          >
            الحسينية
          </span>
          <span
            className={`font-mono font-bold tracking-[0.18em] text-[9px] ${
              onDark ? "text-[#d4a574]" : "text-[#b87945]"
            }`}
          >
            ALHUSAINIA
          </span>
        </span>
      )}
    </span>
  );
}
