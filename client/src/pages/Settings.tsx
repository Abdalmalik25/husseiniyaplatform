import React, { useState, useEffect } from "react";
import { HeaderNavbar } from "@/components/HeaderNavbar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Save,
  Building2,
  Globe,
  Database,
} from "lucide-react";

export default function Settings() {
  const { data: settingsData, refetch } =
    trpc.accounting.getSettings.useQuery();
  const updateSettings = trpc.accounting.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ إعدادات المؤسسة بنجاح");
      refetch();
    },
    onError: e => toast.error(e.message || "فشل حفظ الإعدادات"),
  });

  const [instName, setInstName] = useState("مؤسسة الحسينية لخدمات الأعمال");
  const [currency, setCurrency] = useState("ريال يمني (YER)");
  const [period, setPeriod] = useState("السنة المالية 2026");
  const [manager, setManager] = useState("إدارة المؤسسة");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (settingsData) {
      setInstName(
        settingsData.institutionName || "مؤسسة الحسينية لخدمات الأعمال"
      );
      setCurrency(settingsData.currency || "ريال يمني (YER)");
      setPeriod(settingsData.accountingPeriod || "السنة المالية 2026");
      setManager(settingsData.managerName || "إدارة المؤسسة");
      setNotes((settingsData as any)?.notes || "");
    }
  }, [settingsData]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate({
      institutionName: instName,
      currency,
      accountingPeriod: period,
      managerName: manager,
      notes,
    });
  };

  return (
    <div className="min-h-screen bg-[#fbf8f2] text-[#102a2b] pb-20" dir="rtl">
      <HeaderNavbar />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <Badge className="bg-[#b87945] text-[#102a2b] font-bold text-xs px-3 py-1 mb-1">
              تكوين المنصة
            </Badge>
            <h1 className="text-2xl font-bold font-display text-slate-900 flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-[#b87945]" />
              إعدادات مؤسسة ومكتبة الحسينية
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              تعديل التفضيلات العامة، الهوية التشغيلية، والعملات المعتمدة.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                <Building2 className="w-5 h-5 text-[#b87945]" />
                بيانات المؤسسة العامة
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                البيانات الأساسية التي تظهر في جميع التقارير، السندات، والفواتير
                الصادرة.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    اسم المؤسسة الرسمي
                  </Label>
                  <Input
                    value={instName}
                    onChange={e => setInstName(e.target.value)}
                    className="bg-white border-slate-200 text-xs h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    العملة المعتمدة في النظام
                  </Label>
                  <Input
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="bg-white border-slate-200 text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    الفترة المالية / المحاسبية
                  </Label>
                  <Input
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    className="bg-white border-slate-200 text-xs h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    اسم المشرف / المدير المسؤول
                  </Label>
                  <Input
                    value={manager}
                    onChange={e => setManager(e.target.value)}
                    className="bg-white border-slate-200 text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  ملاحظات وترويسة السندات الرسمية
                </Label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-3 rounded-md border border-slate-200 text-xs bg-white text-slate-800"
                  placeholder="ملاحظات تظهر في ترويسة التقارير والفواتير الرسمية..."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                <Database className="w-5 h-5 text-emerald-600" />
                حالة النظام والتزامن المحلي (PWA & Offline)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs text-slate-700">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold block text-slate-900">
                    تخزين البيانات أوفلاين (IndexedDB)
                  </span>
                  <span className="text-slate-500">
                    حفظ تلقائي لكافة العمليات بدون انقطاع عند غياب الإنترنت.
                  </span>
                </div>
                <Badge className="bg-emerald-600 text-white font-bold">
                  نشط وفعّال
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold block text-slate-900">
                    التزامن التلقائي السحابي
                  </span>
                  <span className="text-slate-500">
                    مزامنة البيانات فور عودة الاتصال بخادم المنصة.
                  </span>
                </div>
                <Badge className="bg-blue-600 text-white font-bold">
                  مستقر
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#b87945]/30 shadow-sm bg-white">
            <CardHeader className="bg-amber-50/60 border-b border-amber-100 p-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                <Globe className="w-5 h-5 text-[#b87945]" />
                البنية متعددة المستأجرين (مؤسسات · دول · فروع · عملات)
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                منظومة الحسينية مبنية لتخدم مؤسسات وفروعاً متعددة تحت نفس
                المنصة، مع عزل كامل للبيانات لكل مشترك.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {[
                  {
                    t: "مؤسسات متعددة (Tenants)",
                    d: "每个 مشترك بياناته مستقلة",
                  },
                  { t: "دول وعملات متعددة", d: "YER, SAR, USD, AED…" },
                  { t: "فروع متعددة", d: "صلاحيات لكل فرع وحركة مستقلة" },
                  { t: "وحدات قياس", d: "م، م²، طن، قطعة، لتر…" },
                  { t: "مراكز تكلفة", d: "توزيع وتتبع التكاليف بدقة" },
                  { t: "مخطط حسابي لكل فرع", d: "تقارير مركزية ومجمّعة" },
                ].map(c => (
                  <div
                    key={c.t}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1"
                  >
                    <p className="font-bold text-slate-900">{c.t}</p>
                    <p className="text-[11px] text-slate-500">{c.d}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                تلميح: تُربط الطلبات الواردة من موقعك الخارجي بالفرع والعملة
                الصحيحين عبر حقول{" "}
                <code className="font-mono text-[#b87945]">branchCode</code> و{" "}
                <code className="font-mono text-[#b87945]">currency</code> في
                مركز التكامل — راجع صفحة «مركز التكامل».
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={updateSettings.isPending}
              className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] font-bold text-xs h-10 px-6 rounded-xl flex items-center gap-2 shadow"
            >
              <Save className="w-4 h-4" />
              {updateSettings.isPending
                ? "جاري الحفظ..."
                : "حفظ إعدادات المؤسسة"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
