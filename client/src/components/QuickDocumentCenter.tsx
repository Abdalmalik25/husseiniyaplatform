import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/design";
import {
  FileText,
  Receipt,
  BookOpen,
  ArrowLeftRight,
  Calendar,
  ExternalLink,
  Inbox,
} from "lucide-react";

interface Document {
  id: string;
  type: "sales_invoice" | "purchase_invoice" | "journal_entry";
  number: string;
  amount: number;
  date: string;
  status: "draft" | "posted" | "voided";
}

interface QuickDocumentCenterProps {
  documents?: Document[];
}

const defaultDocuments: Document[] = [
  {
    id: "1",
    type: "sales_invoice",
    number: "INV-2024-001",
    amount: 15750,
    date: "2024-03-15",
    status: "posted",
  },
  {
    id: "2",
    type: "purchase_invoice",
    number: "PINV-2024-003",
    amount: 8200,
    date: "2024-03-14",
    status: "posted",
  },
  {
    id: "3",
    type: "journal_entry",
    number: "JE-2024-012",
    amount: 0,
    date: "2024-03-14",
    status: "draft",
  },
  {
    id: "4",
    type: "sales_invoice",
    number: "INV-2024-002",
    amount: 23400,
    date: "2024-03-13",
    status: "posted",
  },
  {
    id: "5",
    type: "purchase_invoice",
    number: "PINV-2024-004",
    amount: 5600,
    date: "2024-03-12",
    status: "voided",
  },
  {
    id: "6",
    type: "sales_invoice",
    number: "INV-2024-003",
    amount: 9870,
    date: "2024-03-11",
    status: "posted",
  },
];

const typeConfig: Record<
  Document["type"],
  { label: string; icon: typeof FileText; color: string }
> = {
  sales_invoice: {
    label: "فاتورة مبيعات",
    icon: Receipt,
    color: "text-success bg-success/10",
  },
  purchase_invoice: {
    label: "فاتورة مشتريات",
    icon: ArrowLeftRight,
    color: "text-info bg-info/10",
  },
  journal_entry: {
    label: "قيود يومية",
    icon: BookOpen,
    color: "text-brand bg-brand/10",
  },
};

const statusConfig: Record<
  Document["status"],
  { label: string; className: string }
> = {
  draft: {
    label: "مسودة",
    className: "bg-warning/15 text-warning border-warning/25",
  },
  posted: {
    label: "مرحل",
    className: "bg-success/15 text-success border-success/25",
  },
  voided: {
    label: "ملغي",
    className: "bg-destructive/15 text-destructive border-destructive/25",
  },
};

export default function QuickDocumentCenter({
  documents = defaultDocuments,
}: QuickDocumentCenterProps) {
  if (!documents.length) {
    return (
      <Card className="bg-card border-border" dir="rtl">
        <CardHeader>
          <CardTitle className="text-foreground font-bold text-lg">
            المستندات الأخيرة
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Inbox className="h-16 w-16 mb-4 opacity-40" />
          <p className="text-sm">لا توجد مستندات حديثة</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border" dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground font-bold text-lg">
          المستندات الأخيرة
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          عرض الكل
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map(doc => {
            const config = typeConfig[doc.type];
            const status = statusConfig[doc.status];
            const Icon = config.icon;

            return (
              <div
                key={doc.id}
                className={cn(
                  "rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted/60 transition-colors cursor-pointer"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={cn("rounded-md p-1.5", config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1.5 py-0", status.className)}
                  >
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-foreground mb-0.5">
                  {doc.number}
                </p>
                <p className="text-xs text-muted-foreground mb-1">
                  {config.label}
                </p>
                {doc.amount > 0 && (
                  <p className="text-sm font-bold text-foreground mb-1">
                    {formatMoney(doc.amount)}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {doc.date}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
