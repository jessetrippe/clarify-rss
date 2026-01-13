"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

export default function ArticleDetail() {
  const params = useParams();
  const router = useRouter();
  const articleId = decodeURIComponent(params.id as string);

  const [article, setArticle] = useState<Article | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState<string>("");

  useEffect(() => {
    const loadArticleData = async () => {
      setIsLoading(true);
      try {
        const articleData = await getArticleById(articleId);

        if (!articleData) {
          router.push("/");
          return;
        }

        setArticle(articleData);

        // Mark as read (auto-mark on open)
        if (!articleData.isRead) {
          await markArticleRead(articleId);
          // Update local state
          setArticle({ ...articleData, isRead: true });
        }

        // Load feed data
        const feedData = await getFeedById(articleData.feedId);
        setFeed(feedData || null);
      } catch (error) {
        console.error("Error loading article:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadArticleData();
  }, [articleId, router]);

  const handleToggleStarred = async () => {
    if (!article) return;

    try {
      const newStarredState = await toggleArticleStarred(article.id);
      setArticle({ ...article, isStarred: newStarredState });
    } catch (error) {
      console.error("Error toggling starred:", error);
    }
  };

  const handleToggleRead = async () => {
    if (!article) return;

    try {
      const newReadState = await toggleArticleRead(article.id);
      setArticle({ ...article, isRead: newReadState });
    } catch (error) {
      console.error("Error toggling read:", error);
    }
  };

  const handleCopyContent = async () => {
    if (!article) return;

    setCopyStatus("Copying...");

    const result = await copyArticleContent({
      title: article.title,
      url: article.url,
      content: article.content,
      summary: article.summary,
    });

    if (result.success) {
      setCopyStatus("✓ Copied to clipboard!");
      setTimeout(() => setCopyStatus(""), 3000);
    } else {
      setCopyStatus(`✗ ${result.error}`);
      setTimeout(() => setCopyStatus(""), 5000);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            ← Back to All Items
          </Link>
        </div>
        <div className="text-gray-500 text-center py-12">Loading article...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div>
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            ← Back to All Items
          </Link>
        </div>
        <div className="text-gray-500 text-center py-12">Article not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          ← Back to All Items
        </Link>
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
            className={`px-4 py-2 rounded-md font-medium ${
              article.isStarred
                ? "bg-yellow-500 text-white hover:bg-yellow-600"
                : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {article.isStarred ? "★ Starred" : "☆ Star"}
          </button>
          <button
            onClick={handleToggleRead}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
          >
            {article.isRead ? "Mark Unread" : "Mark Read"}
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
