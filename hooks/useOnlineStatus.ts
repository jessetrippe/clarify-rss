"use client";

import { useEffect, useState } from "react";

export function useOnlineStatus() {
  // Always start with true to match server-side render and prevent hydration mismatch
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial online status after hydration
    setIsOnline(navigator.onLine);

    // Update network status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
