import { describe, it, expect } from "vitest";
import { resolveSubscription } from "./_core/subscription";

const DAY = 86_400_000;
const now = new Date("2026-08-22T00:00:00Z");

describe("resolveSubscription (flexible lifecycle state machine)", () => {
  it("keeps an unexpired trial in trial with days left", () => {
    const d = resolveSubscription(
      "trial",
      new Date(now.getTime() + 7 * DAY),
      now
    );
    expect(d.status).toBe("trial");
    expect(d.transitionedToGrace).toBe(false);
    expect(d.trialDaysLeft).toBe(7);
  });

  it("auto-transitions an expired trial to grace — never blocks the business", () => {
    const d = resolveSubscription(
      "trial",
      new Date(now.getTime() - 1 * DAY),
      now
    );
    expect(d.status).toBe("grace");
    expect(d.transitionedToGrace).toBe(true);
    expect(d.trialDaysLeft).toBe(0);
  });

  it("passes active and grace through untouched", () => {
    expect(resolveSubscription("active", null, now).status).toBe("active");
    expect(resolveSubscription("grace", null, now).status).toBe("grace");
  });

  it("keeps suspended as suspended (caller blocks explicitly)", () => {
    const d = resolveSubscription("suspended", null, now);
    expect(d.status).toBe("suspended");
  });

  it("treats missing status as trial", () => {
    const d = resolveSubscription(
      null,
      new Date(now.getTime() + 14 * DAY),
      now
    );
    expect(d.status).toBe("trial");
    expect(d.trialDaysLeft).toBe(14);
  });
});
