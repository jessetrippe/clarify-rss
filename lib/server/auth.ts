import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getCorsHeaders } from "@/lib/server/cors";

export async function requireUser(
  request: Request
): Promise<{ user: User } | Response> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonError(request, "Server not configured", 500);
  }

  const authHeader = request.headers.get("authorization") || "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!tokenMatch) {
    return jsonError(request, "Unauthorized", 401);
  }

  const token = tokenMatch[1];
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return jsonError(request, "Unauthorized", 401);
  }

  return { user: data.user };
}

export function jsonError(
  request: Request,
  message: string,
  status = 400
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(request),
    },
  });
}

export function jsonResponse(
  request: Request,
  data: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(request),
    },
  });
}
