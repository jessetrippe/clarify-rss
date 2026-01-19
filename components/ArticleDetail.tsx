"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  getArticleById,
  getFeedById,
  markArticleRead,
  toggleArticleStarred,
  toggleArticleRead,
} from "@/lib/db-operations";
import type { Article, Feed } from "@/lib/types";
import { sanitizeHTML } from "@/lib/sanitize";
import { copyArticleContent } from "@/lib/copy-content";
import { StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { createMapCacheManager } from "@/lib/cache";

// Global cache for articles to enable instant navigation
type CachedArticleData = { article: Article; feed: Feed | null };
const articleCache = createMapCacheManager<string, CachedArticleData>("Article");

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
              console.error("Failed to mark article as read:", error);
            });
        }
      } catch (error) {
        console.error("Error loading article:", error);
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
      setCopyStatus("✓ Copied to clipboard!");
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
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 xl:hidden">
          <button
            onClick={onBack}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            ← Back
          </button>
        </div>
        <div className="text-gray-500 text-center py-12">Article not found</div>
      </div>
    );
  }

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

      {/* Article Header */}
      <article>
        <header className="mb-6">
          <h1 className="text-4xl font-bold mb-3">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4">
            {feed && (
              <Link
                href={`/feeds/${feed.id}`}
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                {feed.title}
              </Link>
            )}
            {article.publishedAt && (
              <span>{format(new Date(article.publishedAt), "PPP 'at' p")}</span>
            )}
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                View original →
              </a>
            )}
          </div>
        </header>

        {/* Actions */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={handleCopyContent}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Copy Content
          </button>
          <button
            onClick={handleToggleStarred}
            className={`px-4 py-2 rounded-md font-medium inline-flex items-center gap-2 ${
              article.isStarred === 1
                ? "bg-yellow-500 text-white hover:bg-yellow-600"
                : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {article.isStarred === 1 ? (
              <>
                <StarSolidIcon className="h-4 w-4" aria-hidden="true" />
                Starred
              </>
            ) : (
              <>
                <StarOutlineIcon className="h-4 w-4" aria-hidden="true" />
                Star
              </>
            )}
          </button>
          <button
            onClick={handleToggleRead}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
          >
            {article.isRead === 1 ? "Mark Unread" : "Mark Read"}
          </button>
        </div>

        {/* Copy Status */}
        {copyStatus && (
          <div
            className={`mb-6 p-3 rounded-md text-sm ${
              copyStatus.startsWith("✓")
                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
            }`}
          >
            {copyStatus}
          </div>
        )}

        {/* Article Content */}
        <div className="prose dark:prose-invert max-w-none">
          {article.content ? (
            <div
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(article.content) }}
            />
          ) : article.summary ? (
            <div className="text-gray-600 dark:text-gray-400">
              <p>{article.summary}</p>
              {article.url && (
                <p className="mt-4">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Read full article →
                  </a>
                </p>
              )}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center py-12 border border-gray-300 dark:border-gray-700 rounded-lg">
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
        </div>
      </article>
    </div>
  );
}
