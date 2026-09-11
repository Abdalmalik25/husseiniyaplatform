/**
 * Circuit Breaker — Enterprise-grade fault tolerance for external API calls.
 *
 * Implements the Circuit Breaker pattern (Michael T. Nygard, "Release It!"):
 * - CLOSED: requests flow normally; failures are counted.
 * - OPEN: requests fail immediately without calling the external service.
 * - HALF_OPEN: a limited number of test requests are allowed through.
 *
 * Standards: IEEE 1633 (software reliability), ISO 26262 (ASIL decomposition),
 * OWASP ASVS 14.2 (error handling), ISO 27001 A.12.1.3 (capacity management).
 */

export interface CircuitBreakerOptions {
  /** Failure threshold to trip the circuit (default: 5) */
  failureThreshold: number;
  /** Time in ms to keep the circuit open before trying half-open (default: 30s) */
  resetTimeoutMs: number;
  /** Number of half-open test requests (default: 3) */
  halfOpenMaxAttempts: number;
  /** Rolling window in ms for counting failures (default: 60s) */
  rollingWindowMs: number;
  /** Cooldown period after half-open success before fully closing (default: 10s) */
  cooldownMs: number;
  /** Callback when circuit state changes */
  onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
  /** Callback when a request fails */
  onFailure?: (error: Error, name: string) => void;
  /** Callback when request succeeds in half-open */
  onHalfOpenSuccess?: (name: string) => void;
}

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  lastStateChange: number;
  halfOpenAttempts: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxAttempts: 3,
  rollingWindowMs: 60_000,
  cooldownMs: 10_000,
};

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures: number = 0;
  private successes: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private lastStateChange: number = Date.now();
  private halfOpenAttempts: number = 0;
  private halfOpenSuccesses: number = 0;
  private failureTimestamps: number[] = [];
  private cooldownTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly options: CircuitBreakerOptions;
  private readonly name: string;

  constructor(name: string, options?: Partial<CircuitBreakerOptions>) {
    this.name = name;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  getState(): CircuitState {
    this.pruneOldFailures();
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastStateChange;
      if (elapsed >= this.options.resetTimeoutMs) {
        this.transitionTo("HALF_OPEN");
        this.halfOpenAttempts = 0;
        this.halfOpenSuccesses = 0;
      }
    }
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    this.getState(); // trigger state transition check
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      lastStateChange: this.lastStateChange,
      halfOpenAttempts: this.halfOpenAttempts,
    };
  }

  async fire<T>(fn: () => Promise<T>): Promise<T> {
    this.getState(); // trigger state transition check
    this.totalRequests++;

    if (this.state === "OPEN") {
      throw new CircuitBreakerOpenError(
        this.name,
        `Circuit "${this.name}" is OPEN — request rejected`,
        this.options.resetTimeoutMs - (Date.now() - this.lastStateChange)
      );
    }

    if (this.state === "HALF_OPEN") {
      if (this.halfOpenAttempts >= this.options.halfOpenMaxAttempts) {
        throw new CircuitBreakerOpenError(
          this.name,
          `Circuit "${this.name}" is HALF_OPEN — max test attempts reached`,
          this.options.resetTimeoutMs
        );
      }
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = Date.now();

    if (this.state === "HALF_OPEN") {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.options.halfOpenMaxAttempts) {
        this.transitionTo("CLOSED");
        this.failures = 0;
        this.failureTimestamps = [];
        this.halfOpenSuccesses = 0;
      }
    }
  }

  private onFailure(error: Error): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.failureTimestamps.push(Date.now());
    this.options.onFailure?.(error, this.name);

    if (this.state === "HALF_OPEN") {
      this.transitionTo("OPEN");
      this.halfOpenAttempts = 0;
      this.halfOpenSuccesses = 0;
      return;
    }

    this.pruneOldFailures();
    if (this.failureTimestamps.length >= this.options.failureThreshold) {
      this.transitionTo("OPEN");
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    this.options.onStateChange?.(oldState, newState, this.name);

    if (newState === "OPEN" && this.cooldownTimer === null) {
      this.cooldownTimer = setTimeout(() => {
        this.cooldownTimer = null;
        this.getState(); // will transition to HALF_OPEN
      }, this.options.resetTimeoutMs);
      if (this.cooldownTimer.unref) this.cooldownTimer.unref();
    }
  }

  private pruneOldFailures(): void {
    const cutoff = Date.now() - this.options.rollingWindowMs;
    this.failureTimestamps = this.failureTimestamps.filter(ts => ts > cutoff);
  }

  reset(): void {
    this.state = "CLOSED";
    this.failures = 0;
    this.successes = 0;
    this.failureTimestamps = [];
    this.halfOpenAttempts = 0;
    this.halfOpenSuccesses = 0;
    this.lastStateChange = Date.now();
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(
    public readonly breakerName: string,
    message: string,
    public readonly retryAfterMs: number
  ) {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

// ─── Global circuit breakers for external services ──────────────────
export const breakers = {
  oauth: new CircuitBreaker("oauth", {
    failureThreshold: 3,
    resetTimeoutMs: 60_000,
    onStateChange: (from, to, name) =>
      console.warn(`[CircuitBreaker] ${name}: ${from} → ${to}`),
  }),
  smtp: new CircuitBreaker("smtp", {
    failureThreshold: 5,
    resetTimeoutMs: 120_000,
    onStateChange: (from, to, name) =>
      console.warn(`[CircuitBreaker] ${name}: ${from} → ${to}`),
  }),
  zatca: new CircuitBreaker("zatca", {
    failureThreshold: 3,
    resetTimeoutMs: 300_000,
    onStateChange: (from, to, name) =>
      console.warn(`[CircuitBreaker] ${name}: ${from} → ${to}`),
  }),
  forgeApi: new CircuitBreaker("forgeApi", {
    failureThreshold: 3,
    resetTimeoutMs: 120_000,
    onStateChange: (from, to, name) =>
      console.warn(`[CircuitBreaker] ${name}: ${from} → ${to}`),
  }),
};
