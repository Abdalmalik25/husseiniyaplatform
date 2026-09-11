import React from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  FileText,
  Printer,
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  MapPin,
  Clock,
  Hash,
  Ruler,
  Image,
  Type,
  Palette,
} from "lucide-react";
import {
  DEFAULT_DOCUMENT_TEMPLATE,
  mergeDocumentTemplate,
  type DocumentTemplate,
} from "@shared/documentTemplate";

interface DocumentTemplateCardProps {
  docTemplate: DocumentTemplate;
  setDocTemplate: React.Dispatch<React.SetStateAction<DocumentTemplate>>;
  canEditDocTemplate: boolean;
}

export function DocumentTemplateCard({
  docTemplate,
  setDocTemplate,
  canEditDocTemplate,
}: DocumentTemplateCardProps) {
  const docReset = trpc.documentTemplate.reset.useMutation({
    onSuccess: () => {
      setDocTemplate(DEFAULT_DOCUMENT_TEMPLATE);
      toast.success("تم إعادة تعيين القالب إلى الافتراضي");
    },
    onError: e => toast.error(e.message || "فشل إعادة التعيين"),
  });

  const docUpdate = trpc.documentTemplate.update.useMutation({
    onSuccess: () => toast.success("تم حفظ القالب"),
    onError: (e: any) => toast.error(e?.message || "فشل الحفظ"),
  });

  const updateSection = (
    section: "header" | "footer",
    field: string,
    value: any
  ) => {
    setDocTemplate(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const updateLayout = (field: string, value: any) => {
    setDocTemplate(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="border border-brand/30 shadow-sm bg-card">
      <CardHeader className="bg-brand/5 border-b border-border p-4">
        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2 font-display">
          <FileText className="w-5 h-5 text-brand" />
          قالب المستند والطباعة
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          اضبط ترويسة وتذييل جميع المستندات والتقارير والفواتير الصادرة. القيم
          الافتراضية لا تكشف أي بيانات مشترك.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 space-y-6">
        {/* ── Header Section ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Type className="w-4 h-4 text-brand" />
              الترويسة (Header)
            </h3>
            <Badge
              variant={
                docTemplate.header.showCompanyName ? "default" : "secondary"
              }
            >
              {docTemplate.header.showCompanyName ? "مُظهر" : "مُخفي"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <Checkbox
                checked={docTemplate.header.showCompanyName}
                onCheckedChange={checked =>
                  updateSection("header", "showCompanyName", checked === true)
                }
                disabled={!canEditDocTemplate}
              />
              إظهار اسم الشركة
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <Checkbox
                checked={docTemplate.header.showLogo}
                onCheckedChange={checked =>
                  updateSection("header", "showLogo", checked === true)
                }
                disabled={!canEditDocTemplate}
              />
              إظهار الشعار
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <Checkbox
                checked={docTemplate.header.borderBottom}
                onCheckedChange={checked =>
                  updateSection("header", "borderBottom", checked === true)
                }
                disabled={!canEditDocTemplate}
              />
              خط فاصل أسفل الترويسة
            </label>
          </div>

          {docTemplate.header.showCompanyName && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                اسم الشركة في الترويسة
              </Label>
              <Input
                value={docTemplate.header.companyName}
                onChange={e =>
                  updateSection("header", "companyName", e.target.value)
                }
                disabled={!canEditDocTemplate}
                className="bg-card border-border text-xs h-9"
                placeholder="مؤسسة الحسينية لخدمات الأعمال"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                لون الخلفية
              </Label>
              <div className="flex gap-2">
                {["#ffffff", "#f0f4f8", "#fdf9f2", "#102a2b"].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                      updateSection("header", "backgroundColor", color)
                    }
                    disabled={!canEditDocTemplate}
                    className={`w-8 h-8 rounded-lg border-2 ${
                      docTemplate.header.backgroundColor === color
                        ? "border-brand ring-2 ring-brand/30"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                لون النص
              </Label>
              <div className="flex gap-2">
                {["#17211f", "#102a2b", "#333333", "#777777"].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updateSection("header", "textColor", color)}
                    disabled={!canEditDocTemplate}
                    className={`w-8 h-8 rounded-lg border-2 ${
                      docTemplate.header.textColor === color
                        ? "border-brand ring-2 ring-brand/30"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                حجم الخط
              </Label>
              <Select
                value={docTemplate.header.fontSize}
                onValueChange={val => updateSection("header", "fontSize", val)}
                disabled={!canEditDocTemplate}
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="حجم الخط" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">صغير</SelectItem>
                  <SelectItem value="md">متوسط</SelectItem>
                  <SelectItem value="lg">كبير</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                نص مخصص أعلى الترويسة
              </Label>
              <Input
                value={docTemplate.header.customTextAbove}
                onChange={e =>
                  updateSection("header", "customTextAbove", e.target.value)
                }
                disabled={!canEditDocTemplate}
                className="bg-card border-border text-xs h-9"
                placeholder="نص اختياري أعلى الترويسة..."
              />
            </div>
          </div>
        </div>

        {/* ── Footer Section ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Printer className="w-4 h-4 text-brand" />
              التذييل (Footer)
            </h3>
            <Badge
              variant={
                docTemplate.footer.showPageNumbers ? "default" : "secondary"
              }
            >
              {docTemplate.footer.showPageNumbers ? "أرقام الصفحات" : "مُخفي"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <Checkbox
                checked={docTemplate.footer.showPageNumbers}
                onCheckedChange={checked =>
                  updateSection("footer", "showPageNumbers", checked === true)
                }
                disabled={!canEditDocTemplate}
              />
              إظهار أرقام الصفحات
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <Checkbox
                checked={docTemplate.footer.showDate}
                onCheckedChange={checked =>
                  updateSection("footer", "showDate", checked === true)
                }
                disabled={!canEditDocTemplate}
              />
              إظهار التاريخ
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <Checkbox
                checked={docTemplate.footer.showCompanyName}
                onCheckedChange={checked =>
                  updateSection("footer", "showCompanyName", checked === true)
                }
                disabled={!canEditDocTemplate}
              />
              إظهار اسم الشركة
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <Checkbox
                checked={docTemplate.footer.borderTop}
                onCheckedChange={checked =>
                  updateSection("footer", "borderTop", checked === true)
                }
                disabled={!canEditDocTemplate}
              />
              خط فاصل أعلى التذييل
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                لون الخلفية
              </Label>
              <div className="flex gap-2">
                {["#ffffff", "#f0f4f8", "#fdf9f2", "#102a2b"].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                      updateSection("footer", "backgroundColor", color)
                    }
                    disabled={!canEditDocTemplate}
                    className={`w-8 h-8 rounded-lg border-2 ${
                      docTemplate.footer.backgroundColor === color
                        ? "border-brand ring-2 ring-brand/30"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                لون النص
              </Label>
              <div className="flex gap-2">
                {["#777777", "#17211f", "#102a2b", "#333333"].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updateSection("footer", "textColor", color)}
                    disabled={!canEditDocTemplate}
                    className={`w-8 h-8 rounded-lg border-2 ${
                      docTemplate.footer.textColor === color
                        ? "border-brand ring-2 ring-brand/30"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                حجم الخط
              </Label>
              <Select
                value={docTemplate.footer.fontSize}
                onValueChange={val => updateSection("footer", "fontSize", val)}
                disabled={!canEditDocTemplate}
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="حجم الخط" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">صغير</SelectItem>
                  <SelectItem value="md">متوسط</SelectItem>
                  <SelectItem value="lg">كبير</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                نص مخصص أسفل التذييل
              </Label>
              <Input
                value={docTemplate.footer.customTextBelow}
                onChange={e =>
                  updateSection("footer", "customTextBelow", e.target.value)
                }
                disabled={!canEditDocTemplate}
                className="bg-card border-border text-xs h-9"
                placeholder="نص اختياري أسفل التذييل..."
              />
            </div>
          </div>
        </div>

        {/* ── Layout Section ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Ruler className="w-4 h-4 text-brand" />
            إعدادات الورق والهامش
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                حجم الورق
              </Label>
              <Select
                value={docTemplate.paperSize}
                onValueChange={val => updateLayout("paperSize", val)}
                disabled={!canEditDocTemplate}
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="حجم الورق" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="custom">مخصص</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                الاتجاه
              </Label>
              <Select
                value={docTemplate.orientation}
                onValueChange={val => updateLayout("orientation", val)}
                disabled={!canEditDocTemplate}
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="الاتجاه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">عمودي</SelectItem>
                  <SelectItem value="landscape">أفقي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                عائلة الخط
              </Label>
              <Select
                value={docTemplate.fontFamily}
                onValueChange={val => updateLayout("fontFamily", val)}
                disabled={!canEditDocTemplate}
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="عائلة الخط" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="'Segoe UI', Tahoma, Arial, sans-serif">
                    Segoe UI / Tahoma / Arial
                  </SelectItem>
                  <SelectItem value="'Cairo', sans-serif">Cairo</SelectItem>
                  <SelectItem value="'Tajawal', sans-serif">Tajawal</SelectItem>
                  <SelectItem value="'IBM Plex Arabic', sans-serif">
                    IBM Plex Arabic
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                اتجاه النص
              </Label>
              <Select
                value={docTemplate.language}
                onValueChange={val => updateLayout("language", val)}
                disabled={!canEditDocTemplate}
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="اتجاه النص" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">عربي</SelectItem>
                  <SelectItem value="en">إنجليزي</SelectItem>
                  <SelectItem value="both">ثنائي اللغة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: "marginTop", label: "أعلى (px)" },
              { key: "marginBottom", label: "أسفل (px)" },
              { key: "marginLeft", label: "يسار (px)" },
              { key: "marginRight", label: "يمين (px)" },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  {label}
                </Label>
                <Input
                  type="number"
                  value={(docTemplate as any)[key]}
                  onChange={e => updateLayout(key, Number(e.target.value) || 0)}
                  disabled={!canEditDocTemplate}
                  className="h-9 text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canEditDocTemplate}
            onClick={() => setDocTemplate(DEFAULT_DOCUMENT_TEMPLATE)}
          >
            <Trash2 className="w-3 h-3 ml-1" />
            إعادة تعيين
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const html = `
                 <div style="direction:${docTemplate.rtl ? "rtl" : "ltr"}; font-family:${docTemplate.fontFamily}; margin:${docTemplate.marginTop}px ${docTemplate.marginRight}px ${docTemplate.marginBottom}px ${docTemplate.marginLeft}px; background:${docTemplate.header.backgroundColor};">
                   ${docTemplate.header.customTextAbove ? `<div style="color:${docTemplate.header.textColor}; border-bottom:${docTemplate.header.borderBottom ? "1px solid" : "none"}; padding-bottom:10px; margin-bottom:20px;">${docTemplate.header.customTextAbove}</div>` : ""}
                   ${docTemplate.header.showCompanyName && docTemplate.header.companyName ? `<div style="color:${docTemplate.header.textColor}; font-weight:bold; font-size:${docTemplate.header.fontSize === "lg" ? "20px" : docTemplate.header.fontSize === "md" ? "16px" : "14px"};">${docTemplate.header.companyName}</div>` : ""}
                   <div style="color:${docTemplate.footer.textColor}; border-top:${docTemplate.footer.borderTop ? "1px solid" : "none"}; padding-top:10px; margin-top:20px;">
                     ${docTemplate.footer.showPageNumbers ? "صفحة [PAGE] من [PAGES]" : ""}
                     ${docTemplate.footer.showDate ? ` | ${new Date().toLocaleDateString("ar-EG")}` : ""}
                     ${docTemplate.footer.showCompanyName && docTemplate.header.companyName ? ` | ${docTemplate.header.companyName}` : ""}
                     ${docTemplate.footer.customTextBelow ? ` | ${docTemplate.footer.customTextBelow}` : ""}
                   </div>
                 </div>
               `;
              const win = window.open("", "_blank");
              if (win) {
                win.document.write(html);
                win.document.close();
                win.print();
              }
            }}
          >
            <Eye className="w-3 h-3 ml-1" />
            معاينة الطباعة
          </Button>
          <Button
            size="sm"
            className="bg-ink hover:bg-ink-deep text-xs"
            disabled={docUpdate.isPending}
            onClick={() => {
              docUpdate.mutate(docTemplate);
            }}
          >
            حفظ القالب
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
