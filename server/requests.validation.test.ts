import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;

describe("requests input validation", () => {
  it("rejects a service request without required details", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(caller.requests.service({ name: "علي", phone: "0500000000", email: "", serviceType: "استشارة", details: "" })).rejects.toBeTruthy();
  });

  it("rejects an appointment without a valid phone", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(caller.requests.appointment({ name: "علي", phone: "", email: "", specialty: "هندسة", appointmentDate: "2026-08-15", appointmentTime: "10:00", notes: "" })).rejects.toBeTruthy();
  });
});
