/**
 * doubleEntryValidator — pure domain service (ISO 25010 maintainability)
 * Validates that a set of journal legs is balanced (sum debits == sum credits)
 * within a configurable tolerance. Pure, no DB, fully testable.
 * Used by server/routers.ts postInvoiceGlEntries and manual journal flows.
 */
export type Leg = { type: "debit" | "credit"; amount: number | string };

export function isBalanced(legs: Leg[], tolerance = 0.01): boolean {
  let debit = 0;
  let credit = 0;
  for (const l of legs) {
    const v = typeof l.amount === "string" ? parseFloat(l.amount) : l.amount;
    if (!Number.isFinite(v) || v < 0) return false;
    if (l.type === "debit") debit += v;
    else credit += v;
  }
  return Math.abs(debit - credit) <= tolerance;
}

export function imbalance(legs: Leg[]): number {
  let d = 0,
    c = 0;
  for (const l of legs) {
    const v = typeof l.amount === "string" ? parseFloat(l.amount) : l.amount;
    if (l.type === "debit") d += v;
    else c += v;
  }
  return d - c;
}

export function validateOrThrow(legs: Leg[], context?: string): void {
  if (!isBalanced(legs)) {
    const diff = imbalance(legs);
    throw new Error(
      `قيود غير متوازنة${context ? ` (${context})` : ""}: الفرق ${diff.toFixed(2)}`
    );
  }
}
