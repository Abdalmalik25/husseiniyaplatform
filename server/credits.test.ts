import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const guestContext = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;

const userContext = {
  user: {
    id: 7,
    openId: "credits-user",
    name: "مستخدم تجريبي",
    email: "credits@example.com",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} as TrpcContext;

describe("credits procedures", () => {
  it("requires authentication to read the wallet", async () => {
    const caller = appRouter.createCaller(guestContext);
    await expect(caller.credits.me()).rejects.toBeTruthy();
  });

  it("returns a safe wallet shape for an authenticated user", async () => {
    const caller = appRouter.createCaller(userContext);
    const wallet = await caller.credits.me();
    expect(wallet).toHaveProperty("freeCredits");
    expect(wallet).toHaveProperty("paidCredits");
  });
});
