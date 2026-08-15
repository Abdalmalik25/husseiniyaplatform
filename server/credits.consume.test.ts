import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { creditTransactions, creditWallets } from "../drizzle/schema";
import { consumeCredit, getDb } from "./db";

let db: Awaited<ReturnType<typeof getDb>>;
const userId = -Math.floor(Date.now() / 1000);

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("credits.consume integration", () => {
  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database is required for the credits.consume integration test");
    await db.delete(creditTransactions).where(eq(creditTransactions.userId, userId));
    await db.delete(creditWallets).where(eq(creditWallets.userId, userId));
    await db.insert(creditWallets).values({ userId, freeCredits: 1, paidCredits: 0 });
  });

  afterAll(async () => {
    if (!db) return;
    await db.delete(creditTransactions).where(eq(creditTransactions.userId, userId));
    await db.delete(creditWallets).where(eq(creditWallets.userId, userId));
  });

  it("allows only one successful debit when two requests race for one credit", async () => {
    const [first, second] = await Promise.all([
      consumeCredit(userId, "integration-race-a"),
      consumeCredit(userId, "integration-race-b"),
    ]);

    expect([first.success, second.success].filter(Boolean)).toHaveLength(1);
    expect([first.reason, second.reason].filter(Boolean)).toContain("insufficient-credits");

    const wallet = (await db!.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1))[0];
    const debits = await db!.select().from(creditTransactions).where(and(eq(creditTransactions.userId, userId), eq(creditTransactions.type, "consume")));
    expect(wallet?.freeCredits).toBe(0);
    expect(debits).toHaveLength(1);

    const repeated = await consumeCredit(userId, "integration-repeat");
    expect(repeated).toEqual({ success: false, reason: "insufficient-credits" });
  });
});
