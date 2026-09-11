/**
 * ErrorState — enterprise error boundary + graceful empty state
 * from NexoraOS / Husseiniya Platform design philosophy
 */

import React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, Info, X } from "lucide-react";

export type ErrorSeverity = "error" | "warning" | "info";

export interface ErrorStateProps {
  isError?: boolean;
  message?: string;
  title?: string;
  onRetry?: () => void;
  actionLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  severity?: ErrorSeverity;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "ghost";
  };
  children?: React.ReactNode;
  className?: string;
  iconSize?: number;
  onDismiss?: () => void;
  dismissible?: boolean;
}

function severityColors(severity: ErrorSeverity) {
  switch (severity) {
    case "error":
      return {
        bg: "bg-destructive/5 border-destructive/20 text-destructive",
        border: "border-destructive/20",
        icon: "text-destructive",
        text: "text-destructive",
      };
    case "warning":
      return {
        bg: "bg-warning/5 border-warning/20 text-warning",
        border: "border-warning/20",
        icon: "text-warning",
        text: "text-warning",
      };
    case "info":
      return {
        bg: "bg-info/5 border-info/20 text-info",
        border: "border-info/20",
        icon: "text-info",
        text: "text-info",
      };
  }
}

export function ErrorState({
  isError = false,
  message,
  title = "حدث خطأ ما",
  onRetry,
  actionLabel = "إعادة تحميل الصفحة",
  icon: Icon = AlertTriangle,
  severity = "error",
  action,
  children,
  className,
  iconSize = 32,
  onDismiss,
  dismissible = false,
}: ErrorStateProps) {
  const colors = severityColors(severity);

  if (!isError && !children) return null;

  return (
    <div role="alert" className={cn(
      "relative rounded-2xl border p-5 text-center",
      colors.border,
      className
    )}>
      <div className="flex justify-center mb-3">
        <Icon className={cn("w-[32px] h-[32px]", colors.icon)} />
      </div>
      <h3 className={cn("text-sm font-bold text-foreground mb-1", colors.text)}>
        {title}
      </h3>
      {message && (
        <p className="text-xs text-muted-foreground mb-4 max-w-lg mx-auto">
          {message}
        </p>
      )}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-all duration-200",
              action.variant === "primary" &&
                "bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep border-brand/30",
              action.variant === "secondary" &&
                "bg-card text-foreground border-border hover:bg-muted",
              action.variant === "ghost" &&
                "bg-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            {action.label}
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep border border-brand/30 transition-all duration-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {actionLabel}
          </button>
        )}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {!isError && children}
    </div>
  );
}

interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
  className?: string;
}

export function ErrorBoundaryFallback({
  error,
  resetError,
  className,
}: ErrorBoundaryFallbackProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center bg-ink/95 z-50 p-8",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-md w-full bg-card rounded-2xl border border-border p-6 shadow-xl">
        <ErrorState
          isError
          title="فشل تحميل الصفحة"
          message={error.message || "حدث خطأ غير متوقع في تحميل الصفحة"}
          onRetry={resetError}
          actionLabel="إعادة التحميل"
          severity="error"
          icon={AlertTriangle}
          iconSize={48}
        />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon: Icon = Info,
  className,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border/50 bg-muted/20 p-8 text-center",
        className
      )}
    >
      <Icon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
      <h3 className="text-sm font-bold text-foreground mb-1">{title}</h3>
      {message && (
        <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
          {message}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep border border-brand/30 transition-all duration-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default ErrorState;
