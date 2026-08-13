import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context: TrpcContext = {
  user: { id: 91, openId: "checkout-test", name: "Checkout Test", email: "checkout@example.com", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("credits.checkout", () => {
  it("returns an explicit disabled state by default", async () => {
    const previous = process.env.PAYMENT_MODE;
    delete process.env.PAYMENT_MODE;
    const result = await appRouter.createCaller(context).credits.checkout({ planId: "business" });
    if (previous === undefined) delete process.env.PAYMENT_MODE;
    else process.env.PAYMENT_MODE = previous;
    expect(result.status).toBe("disabled");
  });

  it("supports manual handoff and returns configured Stripe URLs when ready", async () => {
    const previous = { mode: process.env.PAYMENT_MODE, key: process.env.STRIPE_SECRET_KEY, success: process.env.PAYMENT_SUCCESS_URL, cancel: process.env.PAYMENT_CANCEL_URL };
    process.env.PAYMENT_MODE = "manual";
    const manual = await appRouter.createCaller(context).credits.checkout({ planId: "business" });
    expect(manual.status).toBe("manual");

    process.env.PAYMENT_MODE = "stripe";
    process.env.STRIPE_SECRET_KEY = "test-secret";
    process.env.PAYMENT_SUCCESS_URL = "/credits?payment=ok";
    process.env.PAYMENT_CANCEL_URL = "/credits?payment=cancel";
    const ready = await appRouter.createCaller(context).credits.checkout({ planId: "business" });
    expect(ready).toMatchObject({ status: "ready", successUrl: "/credits?payment=ok", cancelUrl: "/credits?payment=cancel", planId: "business" });

    if (previous.mode === undefined) delete process.env.PAYMENT_MODE; else process.env.PAYMENT_MODE = previous.mode;
    if (previous.key === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = previous.key;
    if (previous.success === undefined) delete process.env.PAYMENT_SUCCESS_URL; else process.env.PAYMENT_SUCCESS_URL = previous.success;
    if (previous.cancel === undefined) delete process.env.PAYMENT_CANCEL_URL; else process.env.PAYMENT_CANCEL_URL = previous.cancel;
  });
});
