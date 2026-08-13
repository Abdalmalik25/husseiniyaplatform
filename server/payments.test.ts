import { describe, expect, it } from "vitest";
import { createCheckoutRequest } from "./payments";

describe("configurable payment adapter", () => {
  it("keeps checkout disabled by default", () => {
    const result = createCheckoutRequest("business");
    expect(result.status).toBe("disabled");
  });

  it("returns a manual handoff without pretending to charge", () => {
    const previous = process.env.PAYMENT_MODE;
    process.env.PAYMENT_MODE = "manual";
    const result = createCheckoutRequest("business");
    if (previous === undefined) delete process.env.PAYMENT_MODE;
    else process.env.PAYMENT_MODE = previous;
    expect(result.status).toBe("manual");
  });
});
