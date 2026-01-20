/**
 * Input validation utilities
 */

/**
 * Check if a hostname is a private/local address
 * Covers RFC 1918 ranges, localhost, and other reserved addresses
 */
function isPrivateHost(hostname: string): boolean {
  // Localhost variants
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]" ||
    hostname === "::1"
  ) {
    return true;
  }

  // IPv6 localhost
  if (hostname.startsWith("[::") || hostname.startsWith("[::]")) {
    return true;
  }

  // RFC 1918 private ranges
  // 10.0.0.0 - 10.255.255.255
  if (hostname.startsWith("10.")) {
    return true;
  }

  // 192.168.0.0 - 192.168.255.255
  if (hostname.startsWith("192.168.")) {
    return true;
  }

  // 172.16.0.0 - 172.31.255.255
  if (hostname.startsWith("172.")) {
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      const secondOctet = parseInt(parts[1], 10);
      if (!isNaN(secondOctet) && secondOctet >= 16 && secondOctet <= 31) {
        return true;
      }
    }
  }

  // Link-local addresses (169.254.x.x)
  if (hostname.startsWith("169.254.")) {
    return true;
  }

  // Loopback range (127.x.x.x)
  if (hostname.startsWith("127.")) {
    return true;
  }

  return false;
}

/**
 * Validate and normalize a URL string
 * Returns the normalized URL or throws an error if invalid
 */
export function validateUrl(urlString: string): string {
  if (!urlString || typeof urlString !== "string") {
    throw new Error("URL is required");
  }

  const trimmed = urlString.trim();

  if (!trimmed) {
    throw new Error("URL cannot be empty");
  }

  // Add protocol if missing
  let normalizedUrl = trimmed;
  if (!normalizedUrl.match(/^https?:\/\//i)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    const url = new URL(normalizedUrl);

    // Only allow http and https protocols
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Only HTTP and HTTPS URLs are allowed");
    }

    // Prevent localhost/private IPs in production
    const hostname = url.hostname.toLowerCase();
    if (process.env.NODE_ENV === "production" && isPrivateHost(hostname)) {
      throw new Error("Private/local URLs are not allowed");
    }

    return url.toString();
  } catch (error) {
    if (error instanceof Error && error.message.includes("not allowed")) {
      throw error;
    }
    throw new Error("Invalid URL format");
  }
}

/**
 * Check if a URL is valid without throwing
 */
export function isValidUrl(urlString: string): boolean {
  try {
    validateUrl(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a URL for comparison (removes trailing slashes, normalizes protocol)
 */
export function normalizeUrlForComparison(urlString: string): string {
  try {
    const url = new URL(urlString);
    // Remove trailing slash from pathname
    let pathname = url.pathname;
    if (pathname.endsWith("/") && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }
    return `${url.protocol}//${url.host}${pathname}${url.search}`;
  } catch {
    return urlString;
  }
}

/**
 * Validate a string is not empty and within length limits
 */
export function validateString(
  value: string,
  fieldName: string,
  options: { minLength?: number; maxLength?: number; required?: boolean } = {}
): string {
  const { minLength = 0, maxLength = 10000, required = true } = options;

  if (required && (!value || typeof value !== "string")) {
    throw new Error(`${fieldName} is required`);
  }

  if (!value) {
    return "";
  }

  const trimmed = value.trim();

  if (required && trimmed.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be at most ${maxLength} characters`);
  }

  return trimmed;
}
