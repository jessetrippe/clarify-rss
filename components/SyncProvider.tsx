"use client";

import { useEffect, ReactNode } from "react";
import { syncService } from "@/lib/sync-service";

interface SyncProviderProps {
  children: ReactNode;
}

/**
 * SyncProvider handles automatic sync on app lifecycle events
 * - Syncs on mount (app open)
 - Syncs on window focus
 */
export default function SyncProvider({ children }: SyncProviderProps) {
  useEffect(() => {
    // Sync on mount
    syncService.sync().catch((error) => {
      console.error("Initial sync failed:", error);
    });

    // Sync on window focus
    const handleFocus = () => {
      syncService.sync().catch((error) => {
        console.error("Focus sync failed:", error);
      });
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return <>{children}</>;
}
