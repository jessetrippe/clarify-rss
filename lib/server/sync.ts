import { supabaseAdmin } from "@/lib/supabase/server";
import { cursorFromRow, parseCursor } from "@/lib/server/cursor";

export interface SyncPullRequest {
  cursor?: string;
  feedCursor?: string;
  articleCursor?: string;
  limit?: number;
}

export interface SyncPullResponse {
  feeds: FeedRow[];
  articles: ArticleRow[];
  feedCursor: string;
  articleCursor: string;
  hasMore: boolean;
}

export interface SyncPushRequest {
  feeds: FeedRow[];
  articles: ArticleRow[];
}

export interface SyncPushResponse {
  success: boolean;
  feedsProcessed: number;
  articlesProcessed: number;
  conflicts: number;
}

export interface FeedRow {
  id: string;
  user_id?: string;
  url: string;
  title: string;
  last_fetched_at?: number | null;
  last_error?: string | null;
  created_at: number;
  updated_at: number;
  is_deleted: number;
}

export interface ArticleRow {
  id: string;
  user_id?: string;
  feed_id: string;
  guid?: string | null;
  url?: string | null;
  title: string;
  content?: string | null;
  summary?: string | null;
  published_at?: number | null;
  is_read: number;
  is_starred: number;
  created_at: number;
  updated_at: number;
  is_deleted: number;
  extraction_status?: string | null;
  extraction_error?: string | null;
  extracted_at?: number | null;
}

function quotePostgrestValue(value: string): string {
  const escaped = value.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

export async function syncPull(
  request: SyncPullRequest,
  userId: string
): Promise<SyncPullResponse> {
  const legacyCursor = request.cursor || "0";
  const feedCursor = request.feedCursor || legacyCursor;
  const articleCursor = request.articleCursor || legacyCursor;
  const limit = request.limit || 100;

  const feedCursorParts = parseCursor(feedCursor);
  const articleCursorParts = parseCursor(articleCursor);

  let feedsQuery = supabaseAdmin
    .from("feeds")
    .select("*")
    .eq("user_id", userId);

  if (feedCursorParts.updatedAt || feedCursorParts.id) {
    if (feedCursorParts.id) {
      feedsQuery = feedsQuery.or(
        `updated_at.gt.${feedCursorParts.updatedAt},and(updated_at.eq.${feedCursorParts.updatedAt},id.gt.${quotePostgrestValue(feedCursorParts.id)})`
      );
    } else {
      feedsQuery = feedsQuery.gt("updated_at", feedCursorParts.updatedAt);
    }
  }

  const { data: feeds, error: feedsError } = await feedsQuery
    .order("updated_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (feedsError) {
    throw new Error(feedsError.message);
  }

  let articlesQuery = supabaseAdmin
    .from("articles")
    .select("*")
    .eq("user_id", userId);

  if (articleCursorParts.updatedAt || articleCursorParts.id) {
    if (articleCursorParts.id) {
      articlesQuery = articlesQuery.or(
        `updated_at.gt.${articleCursorParts.updatedAt},and(updated_at.eq.${articleCursorParts.updatedAt},id.gt.${quotePostgrestValue(articleCursorParts.id)})`
      );
    } else {
      articlesQuery = articlesQuery.gt("updated_at", articleCursorParts.updatedAt);
    }
  }

  const { data: articles, error: articlesError } = await articlesQuery
    .order("updated_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (articlesError) {
    throw new Error(articlesError.message);
  }

  const feedsResult = (feeds || []) as FeedRow[];
  const articlesResult = (articles || []) as ArticleRow[];

  const sanitizedFeeds = feedsResult.map(({ user_id, ...feed }) => feed);
  const sanitizedArticles = articlesResult.map(({ user_id, ...article }) => article);

  const hasMore =
    sanitizedFeeds.length === limit || sanitizedArticles.length === limit;

  const newFeedCursor =
    sanitizedFeeds.length > 0
      ? cursorFromRow(
          sanitizedFeeds[sanitizedFeeds.length - 1].updated_at,
          sanitizedFeeds[sanitizedFeeds.length - 1].id
        )
      : feedCursor;
  const newArticleCursor =
    sanitizedArticles.length > 0
      ? cursorFromRow(
          sanitizedArticles[sanitizedArticles.length - 1].updated_at,
          sanitizedArticles[sanitizedArticles.length - 1].id
        )
      : articleCursor;

  return {
    feeds: sanitizedFeeds,
    articles: sanitizedArticles,
    feedCursor: newFeedCursor,
    articleCursor: newArticleCursor,
    hasMore,
  };
}

export async function syncPush(
  request: SyncPushRequest,
  userId: string
): Promise<SyncPushResponse> {
  let feedsProcessed = 0;
  let articlesProcessed = 0;
  let conflicts = 0;

  for (const feed of request.feeds) {
    const { data: existing, error } = await supabaseAdmin
      .from("feeds")
      .select("updated_at,id")
      .eq("user_id", userId)
      .eq("id", feed.id)
      .maybeSingle<{ updated_at: number; id: string }>();

    if (error) {
      throw new Error(error.message);
    }

    if (existing) {
      const serverNewer = existing.updated_at > feed.updated_at;
      const sameTimeServerWins =
        existing.updated_at === feed.updated_at && existing.id > feed.id;

      if (serverNewer || sameTimeServerWins) {
        conflicts++;
        continue;
      }
    }

    const { error: upsertError } = await supabaseAdmin
      .from("feeds")
      .upsert(
        {
          ...feed,
          user_id: userId,
        },
        { onConflict: "id" }
      );

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    feedsProcessed++;
  }

  for (const article of request.articles) {
    const { data: existing, error } = await supabaseAdmin
      .from("articles")
      .select("updated_at,id")
      .eq("user_id", userId)
      .eq("id", article.id)
      .maybeSingle<{ updated_at: number; id: string }>();

    if (error) {
      throw new Error(error.message);
    }

    if (existing) {
      const serverNewer = existing.updated_at > article.updated_at;
      const sameTimeServerWins =
        existing.updated_at === article.updated_at && existing.id > article.id;

      if (serverNewer || sameTimeServerWins) {
        conflicts++;
        continue;
      }
    }

    const { error: upsertError } = await supabaseAdmin
      .from("articles")
      .upsert(
        {
          ...article,
          user_id: userId,
        },
        { onConflict: "id" }
      );

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    articlesProcessed++;
  }

  return {
    success: true,
    feedsProcessed,
    articlesProcessed,
    conflicts,
  };
}
