"use client";

import { useEffect, useRef, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  dialogBackdropClass,
  dialogOverlayClass,
  dialogPanelClass,
  dialogTitleClass,
  inputClass,
} from "@/components/ui/classes";

interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function PromptDialog({
  isOpen,
  title,
  message,
  defaultValue = "",
  placeholder = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      // Focus and select text after a short delay to ensure dialog is visible
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, defaultValue]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
    }
  };

  if (!isOpen) return null;

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
        className={dialogPanelClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-title"
      >
        <h2
          id="prompt-title"
          className={dialogTitleClass}
        >
          {title}
        </h2>

        {message && (
          <p className="text-[var(--muted)] mb-4 text-sm">{message}</p>
        )}

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className={`${inputClass} mb-6`}
          />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className={buttonSecondaryClass}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className={`${buttonPrimaryClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
