/**
 * CORS helper for API routes
 */

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  "https://clarify.news",
  "https://www.clarify.news",
  // Allow localhost in development
  ...(process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://127.0.0.1:3000"]
    : []),
].filter(Boolean) as string[];

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";

  // Check if origin is allowed
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    // Allow same-origin requests (no origin header)
    !origin;

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin || "*" : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function corsResponse(
  request: Request,
  body: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(request),
    },
  });
}

export function corsErrorResponse(
  request: Request,
  message: string,
  status = 400
): Response {
  return corsResponse(request, { error: message }, status);
}

export function handlePreflight(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
