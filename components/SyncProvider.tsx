"use client";

import { useEffect, ReactNode } from "react";
import { syncService } from "@/lib/sync-service";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface SyncProviderProps {
  children: ReactNode;
}

/**
 * SyncProvider handles automatic sync on app lifecycle events
 * - Syncs on mount (app open)
 * - Syncs on window focus
 * - Only syncs when online
 */
export default function SyncProvider({ children }: SyncProviderProps) {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    // Skip sync if offline
    if (!isOnline) {
      console.log("Skipping sync: offline");
      return;
    }

    // Sync on mount
    syncService.sync().catch((error) => {
      console.error("Initial sync failed:", error);
    });

    // Sync on window focus
    const handleFocus = () => {
      if (!navigator.onLine) {
        console.log("Skipping focus sync: offline");
        return;
      }
      syncService.sync().catch((error) => {
        console.error("Focus sync failed:", error);
      });
    };

    // Sync when coming back online
    const handleOnline = () => {
      console.log("Back online, syncing...");
      syncService.sync().catch((error) => {
        console.error("Online sync failed:", error);
      });
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [isOnline]);

  return <>{children}</>;
}
