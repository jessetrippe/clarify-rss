import { useState, useEffect } from "react";

// Global state for feed refresh status
let globalRefreshState = false;
const listeners = new Set<(isRefreshing: boolean) => void>();

export function setGlobalRefreshState(isRefreshing: boolean) {
  globalRefreshState = isRefreshing;
  listeners.forEach((listener) => listener(isRefreshing));
}

export function useRefreshState(): boolean {
  const [isRefreshing, setIsRefreshing] = useState(globalRefreshState);

  useEffect(() => {
    const listener = (state: boolean) => setIsRefreshing(state);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return isRefreshing;
}
