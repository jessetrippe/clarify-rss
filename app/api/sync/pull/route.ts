import { requireUser, jsonError } from "@/lib/server/auth";
import { parseJsonBody } from "@/lib/server/request";
import { syncPull, type SyncPullRequest } from "@/lib/server/sync";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUser(request);
  if (auth instanceof Response) {
    return auth;
  }

  const body = await parseJsonBody<SyncPullRequest>(request);
  if (!body) {
    return jsonError("Invalid JSON body", 400);
  }

  try {
    const result = await syncPull(body, auth.user.id);
    return Response.json(result);
  } catch (error) {
    console.error("Sync pull error:", error);
    return jsonError("Internal server error", 500);
  }
}
