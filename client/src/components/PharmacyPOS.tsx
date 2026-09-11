/**
 * Pharmacy POS Integration Component
 * Smart integration with existing POS workflow
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Pill,
  FileText,
  Shield,
  Clock,
} from "lucide-react";

interface DrugInfo {
  id: number;
  name: string;
  drugSchedule:
    | "OTC"
    | "PRESCRIPTION"
    | "CONTROLLED"
    | "PSYCHOTROPIC"
    | "THERAPEUTIC";
  requiresPrescription: boolean;
  scientificName?: string;
  dosageForm?: string;
  strength?: string;
  currentStock: number;
  salePrice: number;
  expiryDate?: string;
}

interface DrugInteraction {
  type: "MAJOR" | "MODERATE" | "MINOR";
  description: string;
  recommendation?: string;
}

interface PrescriptionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface PharmacyAlert {
  type: "error" | "warning" | "info" | "success";
  message: string;
  details?: string;
}

interface PharmacyPOSProps {
  onAddToSale?: (
    productId: number,
    quantity: number,
    unitPrice: number
  ) => void;
  existingCartItems?: Array<{ productId: number; name: string }>;
}

/**
 * Drug Schedule Badge Component
 */
function DrugScheduleBadge({
  schedule,
}: {
  schedule: DrugInfo["drugSchedule"];
}) {
  const config = {
    OTC: { label: "OTC", color: "bg-green-100 text-success" },
    PRESCRIPTION: {
      label: "يحتاج وصفة",
      color: "bg-yellow-100 text-yellow-800",
    },
    CONTROLLED: { label: "مخدر", color: "bg-destructive/15 text-destructive" },
    PSYCHOTROPIC: { label: "مؤثر", color: "bg-purple-100 text-purple-800" },
    THERAPEUTIC: { label: "علاجي", color: "bg-info/15 text-blue-800" },
  };

  const { label, color } = config[schedule] || config.OTC;

  return <Badge className={`${color} text-xs`}>{label}</Badge>;
}

/**
 * Prescription Validator Component
 */
export function PrescriptionValidator({
  onValidated,
}: {
  onValidated: (prescriptionId: number | null) => void;
}) {
  const [prescriptionNumber, setPrescriptionNumber] = useState("");
  const [validation, setValidation] = useState<PrescriptionValidation | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const handleValidate = useCallback(async () => {
    if (!prescriptionNumber.trim()) return;

    setLoading(true);
    try {
      // Simulated validation - in real app, call API
      const isValid = prescriptionNumber.length >= 4;
      setValidation({
        isValid,
        errors: isValid ? [] : ["رقم الوصفة غير صالح"],
        warnings: [],
      });

      if (isValid) {
        onValidated(parseInt(prescriptionNumber));
      }
    } catch (error) {
      setValidation({
        isValid: false,
        errors: ["خطأ في التحقق من الوصفة"],
        warnings: [],
      });
    } finally {
      setLoading(false);
    }
  }, [prescriptionNumber, onValidated]);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          التحقق من الوصفة الطبية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="رقم الوصفة الطبية"
            value={prescriptionNumber}
            onChange={e => setPrescriptionNumber(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleValidate}
            disabled={loading || !prescriptionNumber.trim()}
            size="sm"
          >
            {loading ? "جارٍ التحقق..." : "تحقق"}
          </Button>
        </div>

        {validation && (
          <div
            className={`p-3 rounded-lg ${
              validation.isValid
                ? "bg-success/15 text-success"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              {validation.isValid ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="font-medium">
                {validation.isValid ? "الوصفة صالحة" : "الوصفة غير صالحة"}
              </span>
            </div>
            {validation.errors.map((error, i) => (
              <p key={i} className="text-sm mt-1">
                {error}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Drug Interaction Checker Component
 */
export function DrugInteractionChecker({
  products,
}: {
  products: Array<{ productId: number; name: string }>;
}) {
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [checking, setChecking] = useState(false);

  const checkInteractions = useCallback(async () => {
    if (products.length < 2) return;

    setChecking(true);
    try {
      // Simulated - in real app, call API
      const productNames = products.map(p => p.name);

      // Mock interaction detection
      const mockInteractions: DrugInteraction[] = [];

      // Check for common drug interactions based on names
      const hasAntibiotic = productNames.some(
        n => n.includes("أموكسيسيلين") || n.includes("مضاد")
      );
      const hasBloodThinner = productNames.some(
        n => n.includes("وارفارين") || n.includes("أسبرين")
      );

      if (hasAntibiotic && hasBloodThinner) {
        mockInteractions.push({
          type: "MODERATE",
          description: "قد يؤثر المضاد الحيوي على فعالية مميع الدم",
          recommendation: "مراقبة وقت التجلط",
        });
      }

      setInteractions(mockInteractions);
    } catch (error) {
      console.error("Error checking interactions:", error);
    } finally {
      setChecking(false);
    }
  }, [products]);

  useEffect(() => {
    checkInteractions();
  }, [checkInteractions]);

  if (interactions.length === 0) return null;

  return (
    <Card className="mb-4 border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-800">
          <AlertTriangle className="h-4 w-4" />
          تنبيهات التفاعلات الدوائية
        </CardTitle>
      </CardHeader>
      <CardContent>
        {checking && <p className="text-sm text-yellow-700">جارٍ الفحص...</p>}
        {interactions.map((interaction, i) => (
          <div
            key={i}
            className={`p-2 rounded ${
              interaction.type === "MAJOR"
                ? "bg-destructive/15"
                : "bg-yellow-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  interaction.type === "MAJOR"
                    ? "destructive"
                    : interaction.type === "MODERATE"
                      ? "secondary"
                      : "outline"
                }
              >
                {interaction.type === "MAJOR"
                  ? "خطير"
                  : interaction.type === "MODERATE"
                    ? "متوسط"
                    : "بسيط"}
              </Badge>
              <span className="font-medium">{interaction.description}</span>
            </div>
            {interaction.recommendation && (
              <p className="text-sm mt-1 text-yellow-700">
                التوصية: {interaction.recommendation}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Drug Info Panel Component
 */
export function DrugInfoPanel({
  drug,
  onAdd,
}: {
  drug: DrugInfo | null;
  onAdd: () => void;
}) {
  if (!drug) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4 text-center text-muted-foreground">
          <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>اختر منتجاً لعرض التفاصيل</p>
        </CardContent>
      </Card>
    );
  }

  const daysToExpiry = drug.expiryDate
    ? Math.ceil(
        (new Date(drug.expiryDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{drug.name}</CardTitle>
          <DrugScheduleBadge schedule={drug.drugSchedule} />
        </div>
        {drug.scientificName && (
          <p className="text-xs text-muted-foreground">{drug.scientificName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">السعر:</span>
            <span className="font-medium mr-1">
              {drug.salePrice.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">المخزون:</span>
            <span
              className={`font-medium mr-1 ${
                drug.currentStock < 10 ? "text-destructive" : ""
              }`}
            >
              {drug.currentStock}
            </span>
          </div>
          {drug.dosageForm && (
            <div>
              <span className="text-muted-foreground">الشكل:</span>
              <span className="font-medium mr-1">{drug.dosageForm}</span>
            </div>
          )}
          {drug.strength && (
            <div>
              <span className="text-muted-foreground">التركيز:</span>
              <span className="font-medium mr-1">{drug.strength}</span>
            </div>
          )}
        </div>

        {drug.expiryDate && (
          <div
            className={`flex items-center gap-2 p-2 rounded ${
              daysToExpiry && daysToExpiry < 0
                ? "bg-destructive/15 text-destructive"
                : daysToExpiry && daysToExpiry < 30
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-foreground"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              {daysToExpiry && daysToExpiry < 0
                ? "منتهي الصلاحية!"
                : `ينتهي خلال ${daysToExpiry} يوم`}
            </span>
          </div>
        )}

        {drug.requiresPrescription && (
          <div className="flex items-center gap-2 p-2 rounded bg-info/15 text-blue-800">
            <Shield className="h-4 w-4" />
            <span className="text-sm">يتطلب وصفة طبية</span>
          </div>
        )}

        <Button onClick={onAdd} className="w-full" size="sm">
          إضافة للبيع
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Pharmacy Alerts Panel Component
 */
export function PharmacyAlerts({ alerts }: { alerts: PharmacyAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`p-3 rounded-lg flex items-start gap-2 ${
            alert.type === "error"
              ? "bg-destructive/15 text-destructive"
              : alert.type === "warning"
                ? "bg-yellow-50 text-yellow-800"
                : alert.type === "success"
                  ? "bg-success/15 text-success"
                  : "bg-info/15 text-blue-800"
          }`}
        >
          {alert.type === "error" && <AlertCircle className="h-4 w-4 mt-0.5" />}
          {alert.type === "warning" && (
            <AlertTriangle className="h-4 w-4 mt-0.5" />
          )}
          {alert.type === "success" && (
            <CheckCircle className="h-4 w-4 mt-0.5" />
          )}
          <div>
            <p className="font-medium">{alert.message}</p>
            {alert.details && (
              <p className="text-sm opacity-80">{alert.details}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Main Pharmacy POS Integration Hook
 */
export function usePharmacyPOS() {
  const [prescriptionId, setPrescriptionId] = useState<number | null>(null);
  const [cartProducts, setCartProducts] = useState<
    Array<{ productId: number; name: string }>
  >([]);
  const [alerts, setAlerts] = useState<PharmacyAlert[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<DrugInfo | null>(null);

  const addToCart = useCallback((productId: number, name: string) => {
    setCartProducts(prev => {
      const exists = prev.find(p => p.productId === productId);
      if (exists) return prev;
      return [...prev, { productId, name }];
    });
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCartProducts(prev => prev.filter(p => p.productId !== productId));
  }, []);

  const addAlert = useCallback((alert: PharmacyAlert) => {
    setAlerts(prev => [...prev, alert]);
    // Auto-dismiss after 5 seconds for non-errors
    if (alert.type !== "error") {
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a !== alert));
      }, 5000);
    }
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    prescriptionId,
    setPrescriptionId,
    cartProducts,
    setCartProducts,
    addToCart,
    removeFromCart,
    alerts,
    addAlert,
    clearAlerts,
    selectedDrug,
    setSelectedDrug,
  };
}
