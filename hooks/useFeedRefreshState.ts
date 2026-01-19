import { useState, useEffect } from "react";

// Global state for feed refresh status
let globalRefreshState = false;
const listeners = new Set<(isRefreshing: boolean) => void>();

export function setGlobalRefreshState(isRefreshing: boolean) {
  globalRefreshState = isRefreshing;
  listeners.forEach((listener) => listener(isRefreshing));
}

export function useRefreshState(): boolean {
  // Always start with false to match server-side render and prevent hydration mismatch
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Sync to actual global state after hydration
    setIsRefreshing(globalRefreshState);

    const listener = (state: boolean) => setIsRefreshing(state);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return isRefreshing;
}
