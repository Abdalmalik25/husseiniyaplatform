import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// These are integration tests: they need a live DATABASE_URL (and the LLM
// test additionally needs LLM_API_URL/LLM_API_KEY). Without them they are
// skipped instead of failing.
const dbAvailable = () => !!process.env.DATABASE_URL;
const llmAvailable = () =>
  !!process.env.LLM_API_URL && !!process.env.LLM_API_KEY;

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-husainia",
    email: "husainia@example.com",
    name: "مسؤول الحسينية",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Al-Husainia Accounting System Routers", () => {
  it.skipIf(!dbAvailable())(
    "retrieves settings successfully",
    async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const settings = await caller.accounting.getSettings();

      expect(settings).toBeDefined();
      expect(settings.institutionName).toBe("مؤسسة الحسينية لخدمات الأعمال");
    },
    15000
  );

  it.skipIf(!dbAvailable())(
    "retrieves chart of accounts successfully",
    async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const accounts = await caller.accounting.getAccounts();

      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBeGreaterThan(0);
    },
    15000
  );

  it.skipIf(!dbAvailable() || !llmAvailable())(
    "retrieves smart suggestions and insights",
    async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const suggestions = await caller.accounting.getSmartSuggestions({
        operationType: "إيراد",
      });

      expect(suggestions).toBeDefined();
      expect(suggestions.insights.length).toBeGreaterThan(0);
    },
    15000
  );

  it.skipIf(!dbAvailable())(
    "adds and retrieves financial transactions successfully",
    async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const accounts = await caller.accounting.getAccounts();
      const firstAcc = accounts[0];

      const res = await caller.accounting.addTransaction({
        accountId: firstAcc.id,
        amount: "15000.00",
        type: "debit",
        transactionDate: "2026-08-11",
        narration: "اختبار إدخال وحدة محاسبية",
        lifecycleStatus: "saved",
      });

      expect(res).toEqual({ success: true });

      const txs = await caller.accounting.getTransactions();
      expect(txs.length).toBeGreaterThan(0);
      const found = txs.find(t => t.narration === "اختبار إدخال وحدة محاسبية");
      expect(found).toBeDefined();
    },
    15000
  );
});
