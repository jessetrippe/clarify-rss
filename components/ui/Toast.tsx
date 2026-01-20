"use client";

import type { ReactNode } from "react";

type ToastTone = "info" | "success" | "error" | "warning";

const TONE_STYLES: Record<ToastTone, string> = {
  info: "bg-blue-600 border-blue-600 text-white",
  success: "bg-green-600 border-green-600 text-white",
  error: "bg-red-600 border-red-600 text-white",
  warning: "bg-amber-600 border-amber-600 text-white",
};

interface ToastProps {
  children: ReactNode;
  tone?: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function Toast({
  children,
  tone = "info",
  actionLabel,
  onAction,
  className = "",
}: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-xs px-3 py-1.5 rounded-md text-sm shadow-lg border ${TONE_STYLES[tone]} ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">{children}</div>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="text-xs font-semibold underline underline-offset-2 whitespace-nowrap"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
