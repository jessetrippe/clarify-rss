"use client";

import { useEffect, useRef } from "react";
import {
  buttonPrimaryClass,
  dialogBackdropClass,
  dialogMessageClass,
  dialogOverlayClass,
  dialogPanelClass,
  dialogTitleClass,
} from "@/components/ui/classes";

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
}

export default function AlertDialog({
  isOpen,
  title,
  message,
  confirmLabel = "OK",
  onClose,
}: AlertDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const button = dialogRef.current.querySelector<HTMLButtonElement>("button");
      button?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={dialogOverlayClass}>
      {/* Backdrop */}
      <div
        className={dialogBackdropClass}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={dialogPanelClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-title"
      >
        <h2
          id="alert-title"
          className={dialogTitleClass}
        >
          {title}
        </h2>

        <p className={dialogMessageClass}>{message}</p>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className={buttonPrimaryClass}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
