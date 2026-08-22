/**
 * rateLimit — lightweight in-memory sliding-window limiter for tRPC
 * procedures (the express-rate-limit middleware already covers HTTP-level
 * throttling; this guards individual expensive/public procedures such as
 * guest order placement, which decrements real stock).
 *
 * Single-instance only (matches the current single-node deployment). On
 * multi-instance deployments, back this with Redis.
 */

const buckets = new Map<string, number[]>();

// Periodic sweep so abandoned keys don't grow the map unbounded.
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, hits] of Array.from(buckets.entries())) {
    // Drop buckets whose newest hit is older than 1 hour.
    const newest = hits[hits.length - 1] ?? 0;
    if (now - newest > 60 * 60 * 1000) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the caller may retry (0 when ok). */
  retryAfterSec: number;
  remaining: number;
};

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  sweep(now);

  const hits = buckets.get(key) ?? [];
  const windowStart = now - windowMs;
  const recent = hits.filter(t => t > windowStart);

  if (recent.length >= max) {
    const oldest = recent[0];
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    );
    buckets.set(key, recent);
    return { ok: false, retryAfterSec, remaining: 0 };
  }

  recent.push(now);
  buckets.set(key, recent);
  return { ok: true, retryAfterSec: 0, remaining: max - recent.length };
}

/** Test helper: clears all buckets. */
export function resetRateLimits() {
  buckets.clear();
}
