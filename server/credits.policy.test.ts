import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_CONFIG } from "../shared/config";
import { resolveCreditCost, resolveCreditPriority } from "./db";

describe("credit policy configuration", () => {
  it("accepts a paid-first policy and safely falls back otherwise", () => {
    expect(resolveCreditPriority("paid-first")).toBe("paid-first");
    expect(resolveCreditPriority("unknown")).toBe(DEFAULT_SITE_CONFIG.credits.consumptionPriority);
  });

  it("normalizes a positive credit cost and rejects invalid values", () => {
    expect(resolveCreditCost("3.8")).toBe(3);
    expect(resolveCreditCost("invalid")).toBe(DEFAULT_SITE_CONFIG.credits.costPerAction);
    expect(resolveCreditCost(0)).toBe(DEFAULT_SITE_CONFIG.credits.costPerAction);
  });
});
