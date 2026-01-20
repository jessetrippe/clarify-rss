import { requireUser, jsonError, jsonResponse } from "@/lib/server/auth";
import { parseJsonBody } from "@/lib/server/request";
import { syncPull, type SyncPullRequest } from "@/lib/server/sync";
import { handlePreflight } from "@/lib/server/cors";
import { createLogger } from "@/lib/logger";

export const runtime = "nodejs";

const logger = createLogger("API:sync/pull");

export async function OPTIONS(request: Request): Promise<Response> {
  return handlePreflight(request);
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUser(request);
  if (auth instanceof Response) {
    return auth;
  }

  const body = await parseJsonBody<SyncPullRequest>(request);
  if (!body) {
    return jsonError(request, "Invalid JSON body", 400);
  }

  try {
    const result = await syncPull(body, auth.user.id);
    return jsonResponse(request, result);
  } catch (error) {
    logger.error("Sync pull error:", error);
    return jsonError(request, "Internal server error", 500);
  }
}
