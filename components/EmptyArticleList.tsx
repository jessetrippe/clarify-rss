"use client";

import Link from "next/link";

interface EmptyArticleListProps {
  hasArticles: boolean;
  showSettingsLink: boolean;
}

export default function EmptyArticleList({
  hasArticles,
  showSettingsLink,
}: EmptyArticleListProps) {
  return (
    <div className="text-gray-500 dark:text-gray-400 text-center py-12 border border-gray-300 dark:border-gray-700 rounded-lg">
      <p className="text-lg mb-2">
        {hasArticles ? "No unread articles" : "No articles yet"}
      </p>
      <p className="text-sm mb-4">
        {hasArticles
          ? "Toggle to All to view everything"
          : "Add your first feed to get started"}
      </p>
      {showSettingsLink && (
        <Link
          href="/settings"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go to Settings
        </Link>
      )}
    </div>
  );
}
