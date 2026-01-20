/**
 * Shared fetch utility functions
 */

// Default request timeout in milliseconds
export const REQUEST_TIMEOUT_MS = 30000;

/**
 * Fetch with automatic timeout handling.
 * Aborts the request if it takes longer than the specified timeout.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
