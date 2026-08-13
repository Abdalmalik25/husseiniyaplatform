import { describe, expect, it } from "vitest";
import { calculateCreditUsage } from "./db";

describe("credit balance behavior", () => {
  it("uses free credits before paid credits by default", () => {
    expect(calculateCreditUsage({ freeCredits: 2, paidCredits: 9 })).toEqual({ success: true, bucket: "freeCredits", cost: 1 });
  });

  it("supports paid-first consumption policy", () => {
    expect(calculateCreditUsage({ freeCredits: 2, paidCredits: 9 }, { priority: "paid-first" })).toEqual({ success: true, bucket: "paidCredits", cost: 1 });
  });

  it("requires the configured cost to be available in one bucket", () => {
    expect(calculateCreditUsage({ freeCredits: 2, paidCredits: 1 }, { cost: 2 })).toEqual({ success: true, bucket: "freeCredits", cost: 2 });
    expect(calculateCreditUsage({ freeCredits: 1, paidCredits: 1 }, { cost: 2 })).toEqual({ success: false, reason: "insufficient-credits" });
  });

  it("rejects an exhausted wallet instead of allowing repeated consumption", () => {
    expect(calculateCreditUsage({ freeCredits: 0, paidCredits: 0 })).toEqual({ success: false, reason: "insufficient-credits" });
  });
});
