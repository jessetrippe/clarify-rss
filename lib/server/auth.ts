import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function requireUser(
  request: Request
): Promise<{ user: User } | Response> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonError("Server not configured", 500);
  }

  const authHeader = request.headers.get("authorization") || "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!tokenMatch) {
    return jsonError("Unauthorized", 401);
  }

  const token = tokenMatch[1];
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return jsonError("Unauthorized", 401);
  }

  return { user: data.user };
}

export function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
