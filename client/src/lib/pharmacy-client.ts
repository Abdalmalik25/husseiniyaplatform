/**
 * Pharmacy tRPC Client Hooks
 * Easy-to-use hooks for pharmacy operations
 */

import { trpc } from "./trpc";

/**
 * Get prescription by ID
 */
export function usePrescription(id: number) {
  return trpc.pharmacy.get.useQuery({ id }, { enabled: id > 0 });
}

/**
 * List prescriptions
 */
export function usePrescriptions(options?: {
  status?: "pending" | "verified" | "dispensed" | "cancelled" | "expired";
  customerId?: string;
  limit?: number;
  offset?: number;
}) {
  return trpc.pharmacy.list.useQuery(options);
}

/**
 * Verify prescription
 */
export function useVerifyPrescription() {
  return trpc.pharmacy.verify.useMutation();
}

/**
 * Dispense prescription
 */
export function useDispensePrescription() {
  return trpc.pharmacy.dispense.useMutation();
}

/**
 * Create prescription
 */
export function useCreatePrescription() {
  return trpc.pharmacy.create.useMutation();
}

/**
 * Check drug interactions
 */
export function useCheckInteractions() {
  return trpc.pharmacy.checkInteractions.useQuery(
    { productIds: [] },
    { enabled: false }
  );
}

/**
 * Check advanced drug-drug interactions (bidirectional, FDA-compliant)
 * Use refetch() to trigger on-demand checks.
 */
export function useAdvancedInteractions(productIds: number[]) {
  return trpc.pharmacy.checkAdvancedInteractions.useQuery(
    { productIds },
    { enabled: productIds.length >= 2 }
  );
}

/**
 * Allergy conflict check
 */
export function useAllergyConflicts(customerId: string, productIds: number[]) {
  return trpc.pharmacy.checkAllergyConflicts.useQuery(
    { customerId, productIds },
    { enabled: !!customerId && productIds.length > 0 }
  );
}

/**
 * FEFO (First-Expiry-First-Out) batch picking
 */
export function useFefoBatches(productId: number, quantity: number) {
  return trpc.pharmacy.getFefoBatches.useQuery(
    { productId, quantity },
    { enabled: productId > 0 && quantity > 0 }
  );
}

/**
 * Advanced pharmacy analytics
 */
export function useAdvancedStats() {
  return trpc.pharmacy.getAdvancedStats.useQuery();
}

/**
 * Cancel a prescription
 */
export function useCancelPrescription() {
  return trpc.pharmacy.cancel.useMutation();
}

/**
 * Create a drug recall
 */
export function useCreateDrugRecall() {
  return trpc.pharmacy.createDrugRecall.useMutation();
}

/**
 * List drug recalls
 */
export function useDrugRecalls(status?: string) {
  return trpc.pharmacy.listDrugRecalls.useQuery({ status });
}

/**
 * Resolve a drug recall
 */
export function useResolveDrugRecall() {
  return trpc.pharmacy.resolveDrugRecall.useMutation();
}

/**
 * Create an insurance claim
 */
export function useCreateInsuranceClaim() {
  return trpc.pharmacy.createInsuranceClaim.useMutation();
}

/**
 * Submit an insurance claim
 */
export function useSubmitInsuranceClaim() {
  return trpc.pharmacy.submitInsuranceClaim.useMutation();
}

/**
 * List insurance claims
 */
export function useInsuranceClaims(status?: string) {
  return trpc.pharmacy.listInsuranceClaims.useQuery({ status });
}

/**
 * Add patient allergy
 */
export function useAddAllergy() {
  return trpc.pharmacy.addPatientAllergy.useMutation();
}

/**
 * List patient allergies
 */
export function usePatientAllergies(customerId?: string) {
  return trpc.pharmacy.listPatientAllergies.useQuery({ customerId });
}

/**
 * Add a drug interaction reference
 */
export function useAddDrugInteraction() {
  return trpc.pharmacy.addDrugInteraction.useMutation();
}

/**
 * List drug interactions
 */
export function useDrugInteractions(options?: {
  severity?: "MAJOR" | "MODERATE" | "MINOR";
  search?: string;
}) {
  return trpc.pharmacy.listDrugInteractions.useQuery(options);
}

/**
 * Get expiring batches
 */
export function useExpiringBatches(daysAhead: number = 30) {
  return trpc.pharmacy.getExpiringBatches.useQuery({ daysAhead });
}

/**
 * Get low stock controlled substances
 */
export function useLowStockControlled(threshold: number = 10) {
  return trpc.pharmacy.getLowStockControlled.useQuery({ threshold });
}

/**
 * Get pharmacy statistics
 */
export function usePharmacyStats() {
  return trpc.pharmacy.getStats.useQuery();
}

/**
 * Log controlled substance
 */
export function useLogControlledSubstance() {
  return trpc.pharmacy.logControlledSubstance.useMutation();
}

/**
 * Pharmacy Sale Processor
 * Handles pharmacy-specific sale validation and processing
 * Note: Drug interaction checks are performed via the UI InteractionChecker component
 * before sale processing. Use useAdvancedInteractions hook in React components.
 */
export async function processPharmacySale(params: {
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
  prescriptionId?: number;
  customerId?: string;
  paymentMethod: "cash" | "card" | "insurance";
}) {
  const warnings: string[] = [];

  // Basic validation
  if (!params.items || params.items.length === 0) {
    return {
      success: false,
      errors: ["No items provided for sale"],
    };
  }

  // Validate prescription is required for pharmacy sales
  if (!params.prescriptionId) {
    return {
      success: false,
      errors: ["Prescription ID is required for pharmacy sales"],
    };
  }

  return { success: true, warnings };
}
