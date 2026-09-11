import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare, Square, Trash2, Download, Tag, X } from "lucide-react";

interface BulkOperationsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onStatusChange?: (status: string) => void;
  statusOptions?: { label: string; value: string }[];
}

export function BulkOperationsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onExport,
  onStatusChange,
  statusOptions = [],
}: BulkOperationsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      dir="rtl"
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3 px-4 py-3",
        "rounded-2xl border border-border/50",
        "bg-card/95 backdrop-blur-xl shadow-xl",
        "animate-in slide-in-from-bottom-4 fade-in-0 duration-300"
      )}
    >
      {/* Selection Count */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs px-2 py-0.5 font-mono">
          {selectedCount} / {totalCount}
        </Badge>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          محدد
        </span>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Select All / Deselect All */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onSelectAll}
        >
          <CheckSquare className="size-3.5" />
          <span className="hidden sm:inline">تحديد الكل</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onDeselectAll}
        >
          <Square className="size-3.5" />
          <span className="hidden sm:inline">إلغاء التحديد</span>
        </Button>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Status Change */}
      {onStatusChange && statusOptions.length > 0 && (
        <>
          <div className="flex items-center gap-1.5">
            <Tag className="size-3.5 text-muted-foreground" />
            <Select onValueChange={onStatusChange}>
              <SelectTrigger className="h-8 w-auto text-xs border-0 bg-transparent">
                <SelectValue placeholder="تغيير الحالة" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-px h-6 bg-border" />
        </>
      )}

      {/* Export */}
      {onExport && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onExport}
        >
          <Download className="size-3.5" />
          <span className="hidden sm:inline">تصدير</span>
        </Button>
      )}

      {/* Delete */}
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
          <span className="hidden sm:inline">حذف المحدد</span>
        </Button>
      )}
    </div>
  );
}
