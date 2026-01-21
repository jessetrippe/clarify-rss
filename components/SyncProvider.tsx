"use client";

import { useEffect, ReactNode, useRef } from "react";
import { syncService } from "@/lib/sync-service";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { feedRefreshService } from "@/lib/feed-refresh-service";
import { setGlobalRefreshState } from "@/hooks/useFeedRefreshState";
import { syncLogger } from "@/lib/logger";
import { isNetworkError } from "@/lib/network-utils";
import { getSyncState } from "@/lib/db-operations";

interface SyncProviderProps {
  children: ReactNode;
}

// Minimum time between syncs (5 minutes)
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;
// Minimum time before forcing sync on mount (2 minutes)
const MIN_FORCE_SYNC_INTERVAL_MS = 2 * 60 * 1000;

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
      syncLogger.debug("performFullSync called, force:", force, "syncInFlight:", syncInFlight.current);

      if (syncInFlight.current) {
        syncLogger.debug("Sync already in flight, skipping");
        return;
      }

      // Check if enough time has passed since last sync (unless forced)
      if (!force) {
        const timeSinceLastSync = Date.now() - lastSyncTime.current;
        if (timeSinceLastSync < MIN_SYNC_INTERVAL_MS) {
          syncLogger.debug("Too soon to sync, skipping");
          return;
        }
      }

      syncLogger.debug("Starting full sync...");
      syncInFlight.current = true;

      try {
        // Step 1: Set refresh state
        setGlobalRefreshState(true);

        // Step 2: Refresh all feeds (fetch new articles)
        syncLogger.debug("Refreshing feeds...");
        await feedRefreshService.refreshAllFeeds();

        // Step 3: Sync state with backend (read/starred changes)
        syncLogger.debug("Syncing state with backend...");
        await syncService.sync();

        // Step 4: Update last sync time
        lastSyncTime.current = Date.now();

        // Step 5: Clear refresh state
        setGlobalRefreshState(false);
        syncLogger.debug("Sync complete");
      } catch (error) {
        // Don't log network errors (expected when backend is unavailable)
        if (!isNetworkError(error)) {
          syncLogger.error("Sync failed:", error);
        }
        setGlobalRefreshState(false);
      } finally {
        syncInFlight.current = false;
      }
    };

    // Initial sync on mount - check if we synced recently before forcing
    const checkAndSync = async () => {
      const syncState = await getSyncState();
      const lastDbSync = syncState?.lastSyncAt?.getTime() || 0;
      const timeSinceDbSync = Date.now() - lastDbSync;

      // Only force if no sync in the last 2 minutes
      const shouldForce = timeSinceDbSync >= MIN_FORCE_SYNC_INTERVAL_MS;
      syncLogger.debug("Initial sync check - lastDbSync:", lastDbSync, "shouldForce:", shouldForce);

      performFullSync(shouldForce);
    };

    checkAndSync();

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
