/**
 * Shared network utility functions
 */

/**
 * Check if an error is a network-related error.
 * These errors are expected when the backend is unavailable and don't need to be logged.
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    error.name === "AbortError" ||
    error.message.includes("Failed to fetch") ||
    error.message.includes("NetworkError") ||
    error.message.includes("Network request failed")
  );
}
