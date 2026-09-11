/**
 * Input Sanitization — Server-side XSS and injection prevention.
 *
 * Implements:
 * - OWASP XSS Prevention Cheat Sheet (Level 2)
 * - OWASP Injection Prevention Cheat Sheet
 * - DOMPurify-like sanitization for server-side
 *
 * Standards: OWASP ASVS 5.3 (output encoding),
 * PCI-DSS 6.5.7 (cross-site scripting).
 */

/**
 * Sanitize a string to prevent XSS attacks.
 * Strips all HTML tags and encodes special characters.
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") return "";

  return (
    input
      // Strip HTML tags
      .replace(/<[^>]*>/g, "")
      // Encode special characters
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
      // Remove null bytes
      .replace(/\0/g, "")
      // Trim
      .trim()
  );
}

/**
 * Deeply sanitize an object, sanitizing all string values.
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Detect potential SQL injection patterns in input.
 */
export function detectSqlInjection(input: string): boolean {
  if (!input || typeof input !== "string") return false;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|FETCH|DECLARE|TRUNCATE|COMMENT)\b)/i,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
    /(\/\/|;|\b(DROP|DELETE|INSERT|UPDATE)\b)/i,
    /(';\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE)\b)/i,
    /(UNION\s+(ALL\s+)?SELECT)/i,
    /(SELECT\s+.*\s+FROM\s+)/i,
    /(INSERT\s+INTO\s+)/i,
    /(UPDATE\s+\w+\s+SET\s+)/i,
    /(DELETE\s+FROM\s+)/i,
    /(EXEC(\s|ute)?\s*\()/i,
    /(0x[0-9a-f]+)/i,
    /(\b(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\()/i,
    /(\b(CONVERT|CAST)\b\s*\()/i,
    /(\b(IF|CASE|WHEN|THEN|ELSE|END)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect potential NoSQL injection patterns in input.
 */
export function detectNoSqlInjection(input: string): boolean {
  if (!input || typeof input !== "string") return false;

  const nosqlPatterns = [
    /\$where/i,
    /\$regex/i,
    /\$gt|\$gte|\$lt|\$lte/i,
    /\$ne|\$nin|\$in/i,
    /\$exists/i,
    /\$and|\$or/i,
    /\$expr/i,
    /\$function/i,
    /\$accumulator/i,
    /db\.\w+\.\w+\(/i,
    /function\s*\(/i,
  ];

  return nosqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect path traversal attempts.
 */
export function detectPathTraversal(input: string): boolean {
  if (!input || typeof input !== "string") return false;

  const pathPatterns = [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e/i,
    /%252e%252e/i,
    /\.\.%2f/i,
    /\.\.%5c/i,
    /\/etc\/passwd/i,
    /\/etc\/shadow/i,
    /\/proc\//i,
    /\/windows\/system32/i,
    /\.\./,
  ];

  return pathPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect command injection attempts.
 */
export function detectCommandInjection(input: string): boolean {
  if (!input || typeof input !== "string") return false;

  const cmdPatterns = [
    /[;&|`$]/,
    /\$\(/,
    /\$\{/,
    /\|\|/,
    /&&/,
    /;\s*(rm|cat|echo|wget|curl|sh|bash|python|perl|ruby|node|java)/i,
    /`[^`]*`/,
  ];

  return cmdPatterns.some(pattern => pattern.test(input));
}

/**
 * Comprehensive threat detection for input.
 */
export function detectThreats(input: string): {
  isSafe: boolean;
  threats: string[];
} {
  const threats: string[] = [];

  if (detectSqlInjection(input)) threats.push("SQL_INJECTION");
  if (detectNoSqlInjection(input)) threats.push("NOSQL_INJECTION");
  if (detectPathTraversal(input)) threats.push("PATH_TRAVERSAL");
  if (detectCommandInjection(input)) threats.push("COMMAND_INJECTION");

  // Check for script tags
  if (/<script/i.test(input)) threats.push("XSS_SCRIPT_TAG");
  if (/<iframe/i.test(input)) threats.push("XSS_IFRAME");
  if (/javascript:/i.test(input)) threats.push("XSS_JAVASCRIPT_URI");
  if (/on\w+\s*=/i.test(input)) threats.push("XSS_EVENT_HANDLER");

  return {
    isSafe: threats.length === 0,
    threats,
  };
}

/**
 * Sanitize email address.
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== "string") return "";
  return email.toLowerCase().trim().replace(/[<>]/g, "");
}

/**
 * Sanitize phone number — keep only valid phone characters.
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== "string") return "";
  return phone.replace(/[^0-9+\-() ]/g, "").trim();
}

/**
 * Sanitize a filename — prevent directory traversal and special characters.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== "string") return "";
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+/, "")
    .substring(0, 255);
}

/**
 * Validate and sanitize a URL — prevent XSS via javascript: protocol.
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();

  // Only allow http/https protocols
  if (/^(https?:\/\/)/i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.href;
    } catch {
      return "";
    }
  }

  // Block javascript:, data:, vbscript:, etc.
  return "";
}

/**
 * Middleware-style sanitization for request body.
 */
export function sanitizeBody(body: any): any {
  if (!body || typeof body !== "object") return body;
  return sanitizeObject(body);
}
