/**
 * screen-error.tsx — معالجة الأخطاء على مستوى الشاشة
 *
 * Lifecycle-aware error handling with:
 * - severity-based color theming
 * - auto-retry with exponential backoff
 * - debug mode for development
 * - compact/card variants
 * - dismissable errors
 */

import React, { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type ErrorSeverity = "error" | "warning" | "info";

export interface ScreenErrorProps {
  isError: boolean;
  error?: unknown;
  retryLabel?: string;
  retryable?: boolean;
  onRetry?: () => void;
  fallback?: React.ReactNode;
  severity?: ErrorSeverity;
  debug?: boolean;
  title?: string;
  message?: string;
  actions?: Array<{ label: string; onClick: () => void; variant?: "default" | "secondary" | "ghost"; icon?: React.ReactNode }>;
  icon?: React.ReactNode;
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  autoRetry?: boolean;
  autoRetryDelay?: number;
  maxAutoRetries?: number;
  compact?: boolean;
  card?: boolean;
}

export function ScreenError({
  isError,
  error,
  retryLabel = "إعادة المحاولة",
  retryable = true,
  onRetry,
  fallback,
  severity = "error",
  debug = false,
  title = "عفواً - حدث خطأ في التحميل",
  message = "لم نتمكن من تحميل البيانات.",
  actions,
  icon,
  className,
  dismissible = false,
  onDismiss,
  autoRetry = false,
  autoRetryDelay = 3000,
  maxAutoRetries = 3,
  compact = false,
  card = false,
}: ScreenErrorProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Auto-retry with exponential backoff
  useEffect(() => {
    if (!autoRetry || !onRetry || !isError) return;

    if (retryCount >= maxAutoRetries) return;

    const delay = autoRetryDelay * Math.pow(2, retryCount);
    const timer = setTimeout(() => {
      setIsRetrying(true);
      Promise.resolve(onRetry()).finally(() => setIsRetrying(false));
      setRetryCount(c => c + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [autoRetry, onRetry, isError, retryCount, maxAutoRetries, autoRetryDelay]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    onRetry?.();
  }, [onRetry]);

  if (!isError) {
    return fallback ?? null;
  }

  const severityConfig = {
    error: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      icon: "text-red-600 dark:text-red-400",
      text: "text-red-900 dark:text-red-100",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      icon: "text-amber-600 dark:text-amber-400",
      text: "text-amber-900 dark:text-amber-100",
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      icon: "text-blue-600 dark:text-blue-400",
      text: "text-blue-900 dark:text-blue-100",
    },
  };

  const cfg = severityConfig[severity];
  const content = (
    <div
      className={cn(
        "flex flex-col gap-3 p-4 rounded-lg border",
        cfg.bg,
        cfg.border,
        cfg.text,
        compact ? "p-3 text-sm" : "p-4",
        className
      )}
    >
      <div className="flex-1 flex items-start gap-3">
        {icon ?? (
          <AlertTriangle className={cn("mt-0.5 flex-shrink-0", cfg.icon)} />
        )}
        <div className="flex-1">
          <h3 className={cn("font-semibold", compact ? "text-sm" : "text-base")}>
            {title}
          </h3>
          <p className="mt-1 text-sm">{message}</p>
          {debug && Boolean(error) && (
            <pre className="mt-2 w-full overflow-x-auto rounded bg-black/10 p-2 text-xs whitespace-pre-wrap break-all">
              {error instanceof Error
                ? error.message
                : String(error)}
            </pre>
          )}
          {actions && actions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {actions.map((action, i) => (
                <Button
                  key={i}
                  size={compact ? "sm" : "default"}
                  variant={action.variant ?? "secondary"}
                  onClick={action.onClick}
                  disabled={isRetrying}
                >
                  {action.icon}
                  <span className="mr-1">{action.label}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={onDismiss}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      {retryable && onRetry && (
        <Button
          onClick={handleRetry}
          disabled={isRetrying}
          size={compact ? "sm" : "default"}
          variant="ghost"
          className="self-start"
        >
          {isRetrying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">{retryLabel}</span>
        </Button>
      )}
    </div>
  );

  if (card) {
    return (
      <Card className={cn(cfg.border, className)}>
        <CardContent className="pt-6">{content}</CardContent>
      </Card>
    );
  }

  return content;
}
