"use client";

import { useEffect, useRef } from "react";
import {
  buttonDangerClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  dialogBackdropClass,
  dialogMessageClass,
  dialogOverlayClass,
  dialogPanelClass,
  dialogTitleClass,
} from "@/components/ui/classes";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "default";
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const firstButton = dialogRef.current.querySelector<HTMLButtonElement>("button");
      firstButton?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const confirmButtonClass =
    variant === "danger"
      ? buttonDangerClass
      : buttonPrimaryClass;

  return (
    <div className={dialogOverlayClass}>
      {/* Backdrop */}
      <div
        className={dialogBackdropClass}
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={dialogPanelClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <h2
          id="dialog-title"
          className={dialogTitleClass}
        >
          {title}
        </h2>

        <p className={dialogMessageClass}>{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className={buttonSecondaryClass}
          >
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={confirmButtonClass}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
