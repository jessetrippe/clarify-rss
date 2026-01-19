"use client";

import { useEffect, ReactNode, useRef } from "react";
import { syncService } from "@/lib/sync-service";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { feedRefreshService } from "@/lib/feed-refresh-service";
import { setGlobalRefreshState } from "@/hooks/useFeedRefreshState";

interface SyncProviderProps {
  children: ReactNode;
}

// Minimum time between syncs (5 minutes)
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;

/**
 * SyncProvider handles automatic sync on app lifecycle events
 * - Refreshes all feeds to fetch new articles (on mount and when coming back online)
 * - Syncs user state (read/starred) with backend
 * - Only syncs when online
 */
export default function SyncProvider({ children }: SyncProviderProps) {
  const isOnline = useOnlineStatus();
  const syncInFlight = useRef(false);
  const lastSyncTime = useRef<number>(0);

  useEffect(() => {
    // Skip sync if offline
    if (!isOnline) {
      return;
    }

    const performFullSync = async (force = false) => {
      console.log("[SyncProvider] performFullSync called, force:", force, "syncInFlight:", syncInFlight.current);

      if (syncInFlight.current) {
        console.log("[SyncProvider] Sync already in flight, skipping");
        return;
      }

      // Check if enough time has passed since last sync (unless forced)
      if (!force) {
        const timeSinceLastSync = Date.now() - lastSyncTime.current;
        console.log("[SyncProvider] Time since last sync:", timeSinceLastSync, "ms");
        if (timeSinceLastSync < MIN_SYNC_INTERVAL_MS) {
          console.log("[SyncProvider] Too soon to sync, skipping");
          return;
        }
      }

      console.log("[SyncProvider] Starting full sync...");
      syncInFlight.current = true;

      try {
        // Step 1: Set refresh state
        setGlobalRefreshState(true);

        // Step 2: Refresh all feeds (fetch new articles)
        console.log("[SyncProvider] Refreshing feeds...");
        await feedRefreshService.refreshAllFeeds();

        // Step 3: Sync state with backend (read/starred changes)
        console.log("[SyncProvider] Syncing state with backend...");
        await syncService.sync();

        // Step 4: Update last sync time
        lastSyncTime.current = Date.now();

        // Step 5: Clear refresh state
        setGlobalRefreshState(false);
        console.log("[SyncProvider] Sync complete");
      } catch (error) {
        console.error("Sync failed:", error);
        setGlobalRefreshState(false);
      } finally {
        syncInFlight.current = false;
      }
    };

    // Initial sync on mount (force to ensure it runs)
    performFullSync(true);

    // Sync when coming back online (force to get fresh data)
    const handleOnline = () => {
      performFullSync(true);
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [isOnline]);

  return <>{children}</>;
}
