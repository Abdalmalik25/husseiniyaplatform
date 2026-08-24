import { SalesRep } from "../drizzle/schema";

export interface CommissionResult {
  commission: number;
  bonus: number;
  total: number;
}

/**
 * Calculates the commission (and any threshold bonus) owed to a sales rep
 * for a given invoice total.
 *
 * - commissionType "percent": commission = total * commissionValue / 100
 * - commissionType "fixed":   commission = commissionValue (flat amount)
 * - bonus applies when total >= bonusThreshold (bonusAmount, can be 0)
 */
export function calculateCommission(args: {
  invoiceTotal: number;
  salesRep: Pick<
    SalesRep,
    "commissionType" | "commissionValue" | "bonusThreshold" | "bonusAmount"
  >;
}): CommissionResult {
  const rep = args.salesRep;
  const total = Number(args.invoiceTotal) || 0;
  const commission =
    rep.commissionType === "percent"
      ? (total * (Number(rep.commissionValue) || 0)) / 100
      : Number(rep.commissionValue) || 0;
  let bonus = 0;
  if (
    rep.bonusThreshold != null &&
    !Number.isNaN(Number(rep.bonusThreshold)) &&
    total >= Number(rep.bonusThreshold)
  ) {
    bonus = Number(rep.bonusAmount) || 0;
  }
  return {
    commission: Math.round(commission * 100) / 100,
    bonus: Math.round(bonus * 100) / 100,
    total: Math.round((commission + bonus) * 100) / 100,
  };
}
