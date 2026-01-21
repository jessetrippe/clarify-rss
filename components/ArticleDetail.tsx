"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  getArticleById,
  getFeedById,
  markArticleRead,
  toggleArticleStarred,
  toggleArticleRead,
  updateArticleContent,
  updateArticleExtractionStatus,
} from "@/lib/db-operations";
import { extractArticleContent } from "@/lib/feed-api";
import type { Article, Feed } from "@/lib/types";
import { sanitizeHTML } from "@/lib/sanitize";
import { copyArticleContent } from "@/lib/copy-content";
import {
  ClipboardIcon,
  StarIcon as StarOutlineIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { articleCache } from "@/lib/article-cache";
import { uiLogger } from "@/lib/logger";
import { emptyStateClass } from "@/components/ui/classes";
import Toast from "@/components/ui/Toast";
import { getTextLength } from "@/lib/html-utils";

/**
 * Check if content appears truncated (common patterns from RSS feeds)
 */
function isTruncatedContent(content: string | undefined, summary?: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  const contentLength = getTextLength(content);
  const summaryLength = getTextLength(summary);

  // Common truncation patterns
  const hasTruncationMarkers =
    trimmed.endsWith('…') ||
    trimmed.endsWith('...') ||
    trimmed.includes('Read the full story at') ||
    trimmed.includes('Continue reading') ||
    trimmed.includes('[...]') ||
    trimmed.includes('Read more');

  // Likely just a summary or preview blurb
  const isSummaryLength =
    contentLength > 0 &&
    contentLength < 600 &&
    summaryLength > 0 &&
    contentLength <= summaryLength + 40;

  return hasTruncationMarkers || isSummaryLength;
}

interface ArticleDetailProps {
  articleId: string;
  onBack: () => void;
}

export default function ArticleDetail({ articleId, onBack }: ArticleDetailProps) {
  // Initialize state from cache for instant rendering
  const [articleState, setArticleState] = useState<{
    article: Article | null;
    feed: Feed | null;
    isLoading: boolean;
  }>(() => {
    const cached = articleCache.get(articleId);
    return {
      article: cached?.article || null,
      feed: cached?.feed || null,
      isLoading: !cached,
    };
  });

  const { article, feed, isLoading } = articleState;
  const [copyStatus, setCopyStatus] = useState<string>("");
  const copyStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extraction state
  const [extractionState, setExtractionState] = useState<{
    isExtracting: boolean;
    error?: string;
  }>({ isExtracting: false });
  const extractionAttemptedRef = useRef<string | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyStatusTimeoutRef.current) {
        clearTimeout(copyStatusTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadArticleData = async () => {
      // Only set loading if we don't have cached data
      if (!articleCache.has(articleId)) {
        setArticleState(prev => ({ ...prev, isLoading: true }));
      }

      try {
        const articleData = await getArticleById(articleId);

        if (!articleData) {
          if (mounted) {
            // Navigate back to list if article not found
            onBack();
          }
          return;
        }

        if (!mounted) return;

        // Load feed data first, then set all state at once
        const feedData = await getFeedById(articleData.feedId);

        if (!mounted) return;

        // Set article and feed together to reduce renders
        setArticleState({
          article: articleData,
          feed: feedData || null,
          isLoading: false,
        });

        // Update cache with complete data
        articleCache.set(articleId, { article: articleData, feed: feedData || null });

        // Mark as read in background (don't await)
        if (articleData.isRead === 0) {
          markArticleRead(articleId)
            .then(() => {
              if (mounted) {
                setArticleState(prev => ({
                  ...prev,
                  article: prev.article ? { ...prev.article, isRead: 1 } : null,
                }));
              }
            })
            .catch((error) => {
              uiLogger.error("Failed to mark article as read:", error);
            });
        }
      } catch (error) {
        uiLogger.error("Error loading article:", error);
        if (mounted) {
          setArticleState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    if (articleId) {
      loadArticleData();
    }

    return () => {
      mounted = false;
    };
  }, [articleId, onBack]);

  // Auto-extract article content when viewing an article with summary but no content
  const handleExtractContent = useCallback(async () => {
    if (!article?.url || !article.id) return;

    setExtractionState({ isExtracting: true });
    extractionAttemptedRef.current = article.id;

    try {
      // Update status to extracting
      await updateArticleExtractionStatus(article.id, 'extracting');

      const result = await extractArticleContent(article.id, article.url);

      if (result.success && result.content) {
        // Update database with extracted content
        await updateArticleContent(article.id, result.content, 'completed');

        // Update local state
        setArticleState(prev => ({
          ...prev,
          article: prev.article ? {
            ...prev.article,
            content: result.content,
            extractionStatus: 'completed' as const,
            extractedAt: new Date(),
          } : null,
        }));

        setExtractionState({ isExtracting: false });
      } else {
        // Update database with failed status
        await updateArticleExtractionStatus(article.id, 'failed', result.error);

        // Update local state
        setArticleState(prev => ({
          ...prev,
          article: prev.article ? {
            ...prev.article,
            extractionStatus: 'failed' as const,
            extractionError: result.error,
          } : null,
        }));

        setExtractionState({ isExtracting: false, error: result.error });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await updateArticleExtractionStatus(article.id, 'failed', errorMessage);
      setExtractionState({ isExtracting: false, error: errorMessage });
    }
  }, [article?.id, article?.url]);

  // Memoize extraction check to avoid recalculating on every render
  const shouldAutoExtract = useMemo(() => {
    if (!article) return false;

    // Check if we should auto-extract:
    // - Has no content, OR has truncated content
    // - Has a URL to extract from
    // - Hasn't already been extracted (completed or failed)
    const needsExtraction =
      !article.content || isTruncatedContent(article.content, article.summary);

    return (
      needsExtraction &&
      !!article.url &&
      article.extractionStatus !== 'completed' &&
      article.extractionStatus !== 'failed'
    );
  }, [article?.id, article?.content, article?.summary, article?.url, article?.extractionStatus]);

  // Auto-trigger extraction when article loads
  useEffect(() => {
    // Only extract if check passes AND we haven't attempted for this article yet
    if (shouldAutoExtract && extractionAttemptedRef.current !== article?.id) {
      handleExtractContent();
    }
  }, [shouldAutoExtract, article?.id, handleExtractContent]);

  if (!articleId) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center py-12">
        Invalid article
      </div>
    );
  }

  const handleToggleStarred = useCallback(async () => {
    if (!article) return;

    try {
      const newStarredState = await toggleArticleStarred(article.id);
      setArticleState(prev => ({
        ...prev,
        article: prev.article ? { ...prev.article, isStarred: newStarredState } : null,
      }));
    } catch {
      // Error handling - state remains unchanged
    }
  }, [article]);

  const handleToggleRead = useCallback(async () => {
    if (!article) return;

    try {
      const newReadState = await toggleArticleRead(article.id);
      setArticleState(prev => ({
        ...prev,
        article: prev.article ? { ...prev.article, isRead: newReadState } : null,
      }));
    } catch {
      // Error handling - state remains unchanged
    }
  }, [article]);

  const handleCopyContent = useCallback(async () => {
    if (!article) return;

    // Clear any existing timeout
    if (copyStatusTimeoutRef.current) {
      clearTimeout(copyStatusTimeoutRef.current);
    }

    setCopyStatus("Copying...");

    const result = await copyArticleContent({
      title: article.title,
      url: article.url,
      content: article.content,
      summary: article.summary,
    });

    if (result.success) {
      setCopyStatus("✓ Copied to clipboard");
      copyStatusTimeoutRef.current = setTimeout(() => setCopyStatus(""), 3000);
    } else {
      setCopyStatus(`✗ ${result.error}`);
      copyStatusTimeoutRef.current = setTimeout(() => setCopyStatus(""), 5000);
    }
  }, [article]);

  // Only show loading skeleton if we don't have cached data
  if (isLoading && !article) {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Back button - only on mobile */}
        <div className="mb-6 xl:hidden">
          <button
            onClick={onBack}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm transition-colors duration-200"
          >
            ← Back
          </button>
        </div>
        {/* Skeleton UI for first-time loads */}
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
          <div className="flex gap-3 mb-8">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div>
        <div className="mb-4 xl:hidden">
          <button
            onClick={onBack}
            className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm transition-colors"
          >
            ← Back to list
          </button>
        </div>
        <div className="text-[var(--muted)] text-center py-12">Article not found</div>
      </div>
    );
  }

  return (
    <div>
      {/* Back button - only on mobile */}
      <div className="mb-4 xl:hidden">
        <button
          onClick={onBack}
          className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm transition-colors"
        >
          ← Back to list
        </button>
      </div>

      {/* Toasts */}
      {copyStatus && (
        <Toast tone={copyStatus.startsWith("✓") ? "success" : "error"}>
          {copyStatus}
        </Toast>
      )}
      {extractionState.isExtracting && (
        <Toast tone="info">
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Fetching full article
          </span>
        </Toast>
      )}
      {extractionState.error && !extractionState.isExtracting && (
        <Toast
          tone="warning"
          actionLabel="Try again"
          onAction={() => {
            extractionAttemptedRef.current = null;
            handleExtractContent();
          }}
        >
          <span className="font-medium">{extractionState.error}</span>
        </Toast>
      )}

      <article className="max-w-2xl mx-auto">
        <header className="pb-6 mb-6 border-b border-[var(--border)] flex flex-col gap-4">
          <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-balance">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
            {feed && (
              <Link
                href={`/feeds/${feed.id}`}
                className="font-medium hover:text-[var(--accent)]"
              >
                {feed.title}
              </Link>
            )}
            {feed && article.publishedAt && <span>·</span>}
            {article.publishedAt && (
              <span>{format(new Date(article.publishedAt), "MMMM d, yyyy")}</span>
            )}
            {article.url && (
              <>
                <span>·</span>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--accent)]"
                >
                  Original
                </a>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleCopyContent}
              className="px-3 py-1.5 text-sm font-medium text-[var(--accent)] border border-[var(--accent)] rounded hover:bg-[var(--accent)] hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              <ClipboardIcon className="h-4 w-4" aria-hidden="true" />
              Copy
            </button>
            <button
              onClick={handleToggleStarred}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors inline-flex items-center gap-1.5 ${
                article.isStarred === 1
                  ? "text-amber-600 dark:text-amber-400 border border-amber-500 hover:bg-amber-500 hover:text-white"
                  : "text-[var(--muted)] border border-[var(--border)] hover:border-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {article.isStarred === 1 ? (
                <StarSolidIcon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <StarOutlineIcon className="h-4 w-4" aria-hidden="true" />
              )}
              {article.isStarred === 1 ? "Starred" : "Star"}
            </button>
            <button
              onClick={handleToggleRead}
              className="px-3 py-1.5 text-sm font-medium text-[var(--muted)] border border-[var(--border)] rounded hover:border-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              {article.isRead === 1 ? "Mark Unread" : "Mark Read"}
            </button>
          </div>
        </header>

        {/* Article Content */}
        {article.content ? (
          <div
            className="prose dark:prose-invert prose-lg max-w-none font-serif prose-headings:font-sans"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(article.content) }}
          />
        ) : article.summary ? (
          <div className="prose dark:prose-invert prose-lg max-w-none">
            <p className="text-[var(--muted)]">{article.summary}</p>
            {article.url && !extractionState.isExtracting && (
              <p className="mt-4">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read full article →
                </a>
              </p>
            )}
          </div>
        ) : (
          <div className={emptyStateClass}>
            <p className="mb-4">No content available for this article.</p>
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                View original article →
              </a>
            )}
          </div>
        )}
      </article>
    </div>
  );
}
