/**
 * Security Headers — Enhanced HTTP security headers middleware.
 *
 * Implements:
 * - OWASP Secure Headers Project (comprehensive)
 * - Mozilla Observatory guidelines
 * - SecurityHeaders.com A+ rating checklist
 * - CIS benchmarks for web servers
 *
 * Standards: ISO 27001 A.13.2.1 (network security management),
 * OWASP ASVS 12.1 (communications security).
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Enhanced security headers middleware.
 * Adds headers beyond what Helmet provides.
 */
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // ─── Content Security Policy (CSP) ──────────────────────────────
  // Production: strict (no inline scripts, no eval). The single legitimate
  // inline script (i18n pre-paint init in client/index.html) is allow-listed
  // by SHA-256 hash — keep in sync with server/_core/app.ts and vercel.json.
  // Development: relaxed for Vite HMR (inline refresh preamble, ws:).
  // The dev relaxation NEVER applies in production builds.
  const isDev = process.env.NODE_ENV !== "production";
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:"
        : "script-src 'self' 'sha256-HSBO4Z4UoB9Fy55s07teJBBRNTtpMwmfIsgBnbkGrsw='",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
      "img-src 'self' data: blob:",
      isDev
        ? "connect-src 'self' ws: wss: https://*.neon.tech https://*.vercel.app"
        : "connect-src 'self' https://*.neon.tech https://*.vercel.app",
      "media-src 'self'",
      "object-src 'none'",
      "child-src 'self' blob:",
      "worker-src 'self' blob:",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "upgrade-insecure-requests",
    ].join("; ")
  );

  // ─── Permissions Policy ──────────────────────────────────────────
  // Disable all dangerous browser features
  res.setHeader(
    "Permissions-Policy",
    [
      "accelerometer=()",
      "ambient-light-sensor=()",
      "autoplay=()",
      "battery=()",
      "camera=()",
      "cross-origin-isolated=()",
      "display-capture=()",
      "document-domain=()",
      "encrypted-media=()",
      "execution-while-not-rendered=()",
      "execution-while-out-of-viewport=()",
      "fullscreen=()",
      "geolocation=()",
      "gyroscope=()",
      "keyboard-map=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "navigation-override=()",
      "payment=()",
      "picture-in-picture=()",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "sync-xhr=()",
      "usb=()",
      "web-share=()",
      "xr-spatial-tracking=()",
    ].join(", ")
  );

  // ─── Cross-Origin Policies ───────────────────────────────────────
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");

  // ─── Cache Control for sensitive endpoints ────────────────────────
  if (req.path.startsWith("/api/")) {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  // ─── Referrer Policy ─────────────────────────────────────────────
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // ─── X-Content-Type-Options ──────────────────────────────────────
  res.setHeader("X-Content-Type-Options", "nosniff");

  // ─── X-Frame-Options ─────────────────────────────────────────────
  res.setHeader("X-Frame-Options", "DENY");

  // ─── X-XSS-Protection (legacy but still useful for old browsers) ─
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // ─── X-Permitted-Cross-Domain-Policies ───────────────────────────
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

  // ─── Strict-Transport-Security (HSTS) ────────────────────────────
  res.setHeader(
    "Strict-Transport-Security",
    [
      "max-age=63072000", // 2 years
      "includeSubDomains",
      "preload",
    ].join("; ")
  );

  // ─── Remove server identification ─────────────────────────────────
  res.removeHeader("X-Powered-By");
  res.removeHeader("Server");

  // ─── DNS Prefetch Control ────────────────────────────────────────
  res.setHeader("X-DNS-Prefetch-Control", "on");

  // ─── Download Options (IE) ───────────────────────────────────────
  res.setHeader("X-Download-Options", "noopen");

  // ─── Expect-CT ───────────────────────────────────────────────────
  res.setHeader("Expect-CT", "max-age=86400, enforce");

  // ─── Feature Policy (legacy) ─────────────────────────────────────
  res.setHeader(
    "Feature-Policy",
    "camera 'none'; microphone 'none'; geolocation 'none'"
  );

  next();
}

/**
 * Request size limiter middleware.
 * Prevents DoS via large request bodies.
 */
export function requestSizeLimiter(maxSizeBytes: number = 10 * 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    if (contentLength > maxSizeBytes) {
      res.status(413).json({
        error: "Request entity too large",
        maxSize: maxSizeBytes,
      });
      return;
    }
    next();
  };
}

/**
 * Method override protection.
 * Prevents HTTP method tampering.
 */
export function methodOverrideProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Block dangerous methods
  const dangerousMethods = ["TRACE", "TRACK", "CONNECT"];
  if (dangerousMethods.includes(req.method.toUpperCase())) {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Block X-HTTP-Method-Override header spoofing
  const overrideHeader = req.headers["x-http-method-override"];
  if (overrideHeader && typeof overrideHeader === "string") {
    const allowedOverrides = ["PATCH", "DELETE"];
    if (!allowedOverrides.includes(overrideHeader.toUpperCase())) {
      res.status(400).json({ error: "Invalid method override" });
      return;
    }
  }

  next();
}

/**
 * IP blocking middleware for known bad actors.
 */
const blockedIPs = new Set<string>();
const blockedIPRanges = new Map<string, number>(); // prefix -> block until timestamp

export function blockIp(ip: string, durationMs: number = 3600_000): void {
  if (ip.includes("/")) {
    // CIDR notation — block entire range
    blockedIPRanges.set(ip, Date.now() + durationMs);
  } else {
    blockedIPs.add(ip);
    // Auto-unblock after duration
    setTimeout(() => blockedIPs.delete(ip), durationMs);
  }
}

export function ipBlocker(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    "";

  if (blockedIPs.has(ip)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  // Check CIDR ranges
  for (const [range, until] of blockedIPRanges) {
    if (Date.now() > until) {
      blockedIPRanges.delete(range);
      continue;
    }
    const [prefix] = range.split("/");
    if (ip.startsWith(prefix)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
  }

  next();
}
