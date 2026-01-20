import { jsonResponse } from "@/lib/server/auth";
import { handlePreflight } from "@/lib/server/cors";

export const runtime = "nodejs";

export async function OPTIONS(request: Request): Promise<Response> {
  return handlePreflight(request);
}

export async function GET(request: Request): Promise<Response> {
  return jsonResponse(request, { status: "ok", timestamp: Date.now() });
}
