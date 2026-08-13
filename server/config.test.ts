import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_CONFIG } from "../shared/config";
import { resolveTrialCredits } from "./db";

describe("runtime configuration", () => {
  it("uses the configured trial credit amount", () => {
    expect(resolveTrialCredits("7")).toBe(7);
    expect(resolveTrialCredits(12.9)).toBe(12);
  });

  it("falls back to the safe default for invalid values", () => {
    expect(resolveTrialCredits("not-a-number")).toBe(DEFAULT_SITE_CONFIG.credits.trialAmount);
    expect(resolveTrialCredits(-4)).toBe(DEFAULT_SITE_CONFIG.credits.trialAmount);
  });
});
