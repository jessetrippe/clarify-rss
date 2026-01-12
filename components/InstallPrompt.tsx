"use client";

import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useState } from "react";

export default function InstallPrompt() {
  const { isInstallable, promptInstall, dismissPrompt } = useInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isDismissed) return null;

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (!accepted) {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    dismissPrompt();
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Install Clarify RSS</h3>
            <p className="text-xs text-blue-100">
              Install this app on your device for quick access and offline
              reading.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-blue-200 hover:text-white flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 bg-white text-blue-600 px-4 py-2 rounded text-sm font-medium hover:bg-blue-50 transition"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm text-blue-100 hover:text-white transition"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
