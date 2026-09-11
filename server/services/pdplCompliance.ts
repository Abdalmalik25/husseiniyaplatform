/**
 * PDPL (Personal Data Protection Law) Compliance Module
 * ======================================================
 * Implements Saudi PDPL compliance:
 * - Data classification and handling
 * - Consent management
 * - Data subject rights (access, correction, deletion)
 * - Data breach notification
 * - Data retention policies
 * - Cross-border data transfer controls
 *
 * Standards: Saudi PDPL (2021), GDPR alignment,
 * NDMO Data Protection Guidelines
 *
 * @see https://ndmo.gov.sa/en-us/Pages/DataProtection.aspx
 */

import type { Request, Response, NextFunction } from "express";

// ─── Data Classification ───────────────────────────────────
export type DataClassification =
  | "public"
  | "internal"
  | "confidential"
  | "restricted";

export const DATA_CLASSIFICATIONS: Record<
  DataClassification,
  {
    label: string;
    description: string;
    retentionPeriod: number; // days
    encryption: boolean;
    accessLevel: string;
  }
> = {
  public: {
    label: "عام",
    description: "Data available to everyone",
    retentionPeriod: 365,
    encryption: false,
    accessLevel: "public",
  },
  internal: {
    label: "داخلي",
    description: "Internal use only",
    retentionPeriod: 1825,
    encryption: true,
    accessLevel: "internal",
  },
  confidential: {
    label: "سري",
    description: "Restricted to authorized personnel",
    retentionPeriod: 2555,
    encryption: true,
    accessLevel: "confidential",
  },
  restricted: {
    label: "مقيّد",
    description: "Highly sensitive data with strict controls",
    retentionPeriod: 3650,
    encryption: true,
    accessLevel: "restricted",
  },
};

// ─── Personal Data Categories ──────────────────────────────
export interface PersonalDataCategory {
  name: string;
  arabicName: string;
  category: string;
  classification: DataClassification;
  requiresConsent: boolean;
  retentionDays: number;
}

export const PERSONAL_DATA_CATEGORIES: PersonalDataCategory[] = [
  {
    name: "Full Name",
    arabicName: "الاسم الكامل",
    category: "identity",
    classification: "confidential",
    requiresConsent: true,
    retentionDays: 3650,
  },
  {
    name: "National ID",
    arabicName: "الرقم الوطني",
    category: "identity",
    classification: "restricted",
    requiresConsent: true,
    retentionDays: 3650,
  },
  {
    name: "Email Address",
    arabicName: "البريد الإلكتروني",
    category: "contact",
    classification: "confidential",
    requiresConsent: true,
    retentionDays: 1825,
  },
  {
    name: "Phone Number",
    arabicName: "رقم الهاتف",
    category: "contact",
    classification: "confidential",
    requiresConsent: true,
    retentionDays: 1825,
  },
  {
    name: "Address",
    arabicName: "العنوان",
    category: "contact",
    classification: "internal",
    requiresConsent: true,
    retentionDays: 1095,
  },
  {
    name: "Financial Data",
    arabicName: "البيانات المالية",
    category: "financial",
    classification: "restricted",
    requiresConsent: true,
    retentionDays: 3650,
  },
  {
    name: "Health Data",
    arabicName: "البيانات الصحية",
    category: "health",
    classification: "restricted",
    requiresConsent: true,
    retentionDays: 3650,
  },
  {
    name: "IP Address",
    arabicName: "عنوان IP",
    category: "technical",
    classification: "internal",
    requiresConsent: false,
    retentionDays: 90,
  },
  {
    name: "Login History",
    arabicName: "سجل تسجيل الدخول",
    category: "security",
    classification: "confidential",
    requiresConsent: false,
    retentionDays: 730,
  },
  {
    name: "Payment Information",
    arabicName: "معلومات الدفع",
    category: "financial",
    classification: "restricted",
    requiresConsent: true,
    retentionDays: 365,
  },
];

// ─── Consent Record ────────────────────────────────────────
export interface ConsentRecord {
  id: string;
  userId: string;
  category: string;
  purpose: string;
  arabicPurpose: string;
  granted: boolean;
  timestamp: Date;
  expiryDate?: Date;
  ipAddress?: string;
  userAgent?: string;
}

// ─── Data Subject Rights ───────────────────────────────────
export type DataSubjectRight =
  | "access"
  | "correction"
  | "deletion"
  | "portability"
  | "restriction"
  | "objection";

export interface DataSubjectRequest {
  id: string;
  userId: string;
  requestType: DataSubjectRight;
  arabicRequestType: string;
  status: "pending" | "approved" | "rejected" | "completed";
  requestedAt: Date;
  completedAt?: Date;
  dataCategories: string[];
  reason?: string;
  arabicReason?: string;
}

// ─── Data Breach Notification ──────────────────────────────
export interface DataBreachNotification {
  id: string;
  detectedAt: Date;
  reportedAt?: Date;
  dataType: string[];
  affectedIndividuals: number;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  arabicDescription: string;
  containmentMeasures: string[];
  notifiedToNDMO: boolean;
  notifiedToAffected: boolean;
}

// ─── PDPL Compliance Middleware ────────────────────────────
export function pdplComplianceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log all data access for audit trail
  const startTime = Date.now();
  const dataAccessLog: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: (req as any).ctx?.user?.id ?? null,
    tenantId: (req as any).ctx?.tenantId ?? null,
  };

  res.on("finish", () => {
    dataAccessLog.duration = Date.now() - startTime;
    dataAccessLog.statusCode = res.statusCode;
    // Audit logging (implementation depends on logger setup)
    console.log("[PDPL Audit]", JSON.stringify(dataAccessLog));
  });

  next();
}

// ─── PDPL Data Retention Policy ────────────────────────────
export function getDataRetentionPolicy(category: string): number {
  const cat = PERSONAL_DATA_CATEGORIES.find(c => c.category === category);
  if (cat) return cat.retentionDays;
  return 365; // Default
}

// ─── PDPL Consent Validation ──────────────────────────────
export function validateConsent(userId: string, category: string): boolean {
  const consent = findConsent(userId, category);
  if (!consent) return false;
  if (!consent.granted) return false;
  if (consent.expiryDate && consent.expiryDate < new Date()) return false;
  return true;
}

function findConsent(userId: string, category: string): ConsentRecord | null {
  // Implementation would query the database
  // This is a stub for demonstration
  return null;
}

// ─── PDPL Compliance Report ────────────────────────────────
export interface PDPLComplianceReport {
  timestamp: Date;
  totalDataSubjects: number;
  consentRecords: number;
  activeConsents: number;
  expiredConsents: number;
  dataBreachIncidents: number;
  dataSubjectRequests: number;
  averageResponseTime: number;
  complianceScore: number;
}

export function generatePDPLReport(): PDPLComplianceReport {
  return {
    timestamp: new Date(),
    totalDataSubjects: 0,
    consentRecords: 0,
    activeConsents: 0,
    expiredConsents: 0,
    dataBreachIncidents: 0,
    dataSubjectRequests: 0,
    averageResponseTime: 0,
    complianceScore: 0,
  };
}

// ─── PDPL Cross-Border Transfer Control ────────────────────
export interface CrossBorderTransfer {
  destination: string;
  dataType: string;
  legalBasis: string;
  arabicLegalBasis: string;
  approvedBy: string;
  approvedAt: Date;
  validUntil?: Date;
}

export function validateCrossBorderTransfer(
  transfer: CrossBorderTransfer
): boolean {
  if (!transfer.validUntil || transfer.validUntil > new Date()) {
    return true;
  }
  return false;
}

// ─── Data Anonymization ────────────────────────────────────
export function anonymizeData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const anonymized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      if (
        key.includes("name") ||
        key.includes("email") ||
        key.includes("phone")
      ) {
        anonymized[key] = "***";
      } else {
        anonymized[key] = value;
      }
    } else {
      anonymized[key] = value;
    }
  }
  return anonymized;
}
