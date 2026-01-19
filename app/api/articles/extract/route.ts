import { requireUser, jsonError } from "@/lib/server/auth";
import { parseJsonBody } from "@/lib/server/request";
import { RATE_LIMITS } from "@/lib/server/rate-limiter";
import { applyRateLimit } from "@/lib/server/rate-limit";
import { extractArticleContent } from "@/lib/server/article-extractor";
import { validateUrl } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUser(request);
  if (auth instanceof Response) {
    return auth;
  }

  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.articleExtract);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const body = await parseJsonBody<{ articleId: string; url: string }>(request);
  if (!body) {
    return jsonError("Invalid JSON body", 400);
  }
  if (!body.url) {
    return jsonError("URL required", 400);
  }
  if (!body.articleId) {
    return jsonError("Article ID required", 400);
  }

  try {
    const validatedUrl = validateUrl(body.url);
    const result = await extractArticleContent(validatedUrl);
    return Response.json({
      success: result.success,
      content: result.content,
      title: result.title,
      error: result.error,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to extract article",
      400
    );
  }
}
