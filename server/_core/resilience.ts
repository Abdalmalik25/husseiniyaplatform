/**
 * server/_core/resilience.ts — failure-isolation primitives.
 *
 * Goal: external or transient failures must degrade gracefully instead of
 * crashing request handlers or the cron tick ("no-failure" policy):
 *  - withRetry: exponential backoff + full jitter for transient errors.
 *  - withTimeout: hard deadline so a hung dependency can't hang a handler.
 *  - CircuitBreaker: stops hammering a failing dependency and lets it heal.
 */

export interface RetryOptions {
  /** Total attempts including the first one (default: 3). */
  retries?: number;
  /** Base delay in ms before the first retry (default: 300). */
  baseDelayMs?: number;
  /** Upper bound for a single backoff delay (default: 5_000). */
  maxDelayMs?: number;
  /** Optional label used in logs. */
  label?: string;
  /** Called before each retry attempt. */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isRetryable(error: unknown): boolean {
  // Abort/network/timeouts and 5xx-style errors are transient by nature.
  if (error instanceof Error) {
    const msg = error.message || "";
    return (
      error.name === "AbortError" ||
      error.name === "TimeoutError" ||
      /timeout|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed|socket|5\d\d/i.test(
        msg
      )
    );
  }
  return false;
}

/** Retry an async operation with exponential backoff + full jitter. */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = Math.max(0, options.retries ?? 3);
  const baseDelayMs = Math.max(1, options.baseDelayMs ?? 300);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 5_000);

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      // Last attempt or non-retryable error → rethrow immediately.
      if (attempt > retries || !isRetryable(error)) throw error;
      const jittered =
        baseDelayMs * Math.pow(2, attempt - 1) * (0.5 + Math.random());
      const delayMs = Math.min(maxDelayMs, Math.round(jittered));
      options.onRetry?.(error, attempt, delayMs);
      if (options.label) {
        console.warn(
          `[resilience] retry #${attempt}/${retries} for ${options.label} in ${delayMs}ms:`,
          error instanceof Error ? error.message : error
        );
      }
      await sleep(delayMs);
    }
  }
  /* c8 ignore next */
  throw lastError;
}

/** Reject if the promise does not settle within `ms` milliseconds. */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "operation"
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timed out after ${ms}ms`);
      err.name = "TimeoutError";
      reject(err);
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Circuit breaker: after `threshold` consecutive failures the breaker opens
 * for `cooldownMs` and calls fail fast with a clear error, giving the
 * downstream dependency time to recover.
 */
export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;

  constructor(
    private readonly threshold = 5,
    private readonly cooldownMs = 30_000,
    private readonly name = "circuit"
  ) {}

  get isOpen(): boolean {
    if (this.failures < this.threshold) return false;
    if (Date.now() - this.openedAt >= this.cooldownMs) {
      // Half-open: allow one probe through.
      this.failures = this.threshold - 1;
      return false;
    }
    return true;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      throw new Error(
        `[${this.name}] circuit open — failing fast until ${this.cooldownMs}ms cooldown elapses`
      );
    }
    try {
      const result = await fn();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      if (this.failures === this.threshold) this.openedAt = Date.now();
      throw error;
    }
  }
}
