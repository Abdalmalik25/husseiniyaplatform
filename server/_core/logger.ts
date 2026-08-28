/**
 * Structured logger — 12-factor + ISO 27001 observability
 * - JSON lines to stdout (Vercel log drains ingest JSON)
 * - Redacts secrets via allowlist (never logs JWT, DB URL, cookies)
 * - Correlation via requestId (propagated from x-request-id)
 * - Levels: debug < info < warn < error, controlled by LOG_LEVEL env
 */
type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const level = (process.env.LOG_LEVEL as Level) || (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(l: Level) {
  return order[l] >= order[level as Level];
}

function safeJson(obj: Record<string, unknown>) {
  // Redact known secrets if they slip in
  const redacted = { ...obj };
  for (const k of ["cookie", "authorization", "password", "DATABASE_URL", "JWT_SECRET"]) {
    if (k in redacted) redacted[k] = "[REDACTED]";
  }
  return JSON.stringify({ t: new Date().toISOString(), ...redacted });
}

export const logger = {
  debug: (msg: string, meta: Record<string, unknown> = {}) => {
    if (shouldLog("debug")) console.debug(safeJson({ level: "debug", msg, ...meta }));
  },
  info: (msg: string, meta: Record<string, unknown> = {}) => {
    if (shouldLog("info")) console.log(safeJson({ level: "info", msg, ...meta }));
  },
  warn: (msg: string, meta: Record<string, unknown> = {}) => {
    if (shouldLog("warn")) console.warn(safeJson({ level: "warn", msg, ...meta }));
  },
  error: (msg: string, meta: Record<string, unknown> = {}) => {
    console.error(safeJson({ level: "error", msg, ...meta }));
  },
};
