/**
 * Client Security — Browser-side security utilities.
 *
 * Implements:
 * - Content Security Policy violation reporting
 * - XSS detection and prevention
 * - Secure cookie handling
 * - Device fingerprinting
 * - Session management
 *
 * Standards: OWASP ASVS 3.1 (authentication),
 * OWASP ASVS 3.2 (session management).
 */

// ─── CSP Violation Reporting ────────────────────────────────────────
/**
 * Report CSP violations to the server.
 */
export function reportCspViolation(
  violation: SecurityPolicyViolationEvent
): void {
  const report = {
    "document-uri": violation.documentURI,
    referrer: violation.referrer,
    "blocked-uri": violation.blockedURI,
    "violated-directive": violation.violatedDirective,
    "effective-directive": violation.effectiveDirective,
    "original-policy": violation.originalPolicy,
    disposition: violation.disposition,
    "status-code": violation.statusCode,
    "source-file": violation.sourceFile,
    "line-number": violation.lineNumber,
    "column-number": violation.columnNumber,
    timestamp: new Date().toISOString(),
  };

  // Send to server
  fetch("/api/security/csp-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
    keepalive: true,
  }).catch(() => {});
}

/**
 * Initialize CSP violation listener.
 */
export function initCspReporting(): void {
  if (typeof document !== "undefined") {
    document.addEventListener("securitypolicyviolation", reportCspViolation);
  }
}

// ─── XSS Detection ──────────────────────────────────────────────────
/**
 * Detect potential XSS in user input before sending to server.
 */
export function detectXss(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b/gi,
    /<object\b/gi,
    /<embed\b/gi,
    /<applet\b/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /expression\(/gi,
    /<svg\b[^>]*onload/gi,
    /<img[^>]+onerror/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize HTML input — strip all tags.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

// ─── Secure Cookie Helpers ──────────────────────────────────────────
/**
 * Set a secure cookie.
 */
export function setSecureCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
    sameSite?: "strict" | "lax" | "none";
    secure?: boolean;
  } = {}
): void {
  const {
    maxAge = 86400,
    path = "/",
    sameSite = "strict",
    secure = true,
  } = options;

  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    `max-age=${maxAge}`,
    `path=${path}`,
    `SameSite=${sameSite}`,
    secure ? "Secure" : "",
    "HttpOnly",
  ]
    .filter(Boolean)
    .join("; ");
}

/**
 * Get a cookie value by name.
 */
export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Delete a cookie.
 */
export function deleteCookie(name: string): void {
  setSecureCookie(name, "", { maxAge: 0 });
}

// ─── Device Fingerprinting ──────────────────────────────────────────
/**
 * Generate a lightweight device fingerprint for session binding.
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  // Screen properties
  components.push(`${screen.width}x${screen.height}`);
  components.push(`${screen.colorDepth}`);
  components.push(`${window.devicePixelRatio}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // Hardware concurrency
  components.push(`${navigator.hardwareConcurrency || 0}`);

  // Touch support
  components.push(`${navigator.maxTouchPoints || 0}`);

  // Canvas fingerprint
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("Cwm fjord bank glyphs vext quiz", 2, 15);
      components.push(canvas.toDataURL().substring(0, 100));
    }
  } catch {
    // Canvas not available
  }

  // WebGL fingerprint
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch {
    // WebGL not available
  }

  // Hash all components
  const raw = components.join("|");
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 32);
}

// ─── Session Management ─────────────────────────────────────────────
const SESSION_KEY = "pos_session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface PosSession {
  id: string;
  startedAt: number;
  lastActivity: number;
  tenantId: number;
  userId: string;
}

/**
 * Get or create a POS session.
 */
export function getOrCreateSession(
  tenantId: number,
  userId: string
): PosSession {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) {
    try {
      const session = JSON.parse(stored) as PosSession;
      const timeSinceActivity = Date.now() - session.lastActivity;
      if (timeSinceActivity < SESSION_TIMEOUT_MS) {
        session.lastActivity = Date.now();
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session;
      }
    } catch {
      // Invalid session data
    }
  }

  // Create new session
  const session: PosSession = {
    id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    startedAt: Date.now(),
    lastActivity: Date.now(),
    tenantId,
    userId,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/**
 * Update session activity timestamp.
 */
export function updateSessionActivity(): void {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) {
    try {
      const session = JSON.parse(stored) as PosSession;
      session.lastActivity = Date.now();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Ignore
    }
  }
}

/**
 * Check if session is still valid.
 */
export function isSessionValid(): boolean {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return false;
  try {
    const session = JSON.parse(stored) as PosSession;
    return Date.now() - session.lastActivity < SESSION_TIMEOUT_MS;
  } catch {
    return false;
  }
}

/**
 * Clear POS session.
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
