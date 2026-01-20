"use client";

import Link from "next/link";
import { NewspaperIcon } from "@heroicons/react/24/outline";
import { emptyStateClass } from "@/components/ui/classes";

interface EmptyArticleListProps {
  hasArticles: boolean;
  showSettingsLink: boolean;
}

export default function EmptyArticleList({
  hasArticles,
  showSettingsLink,
}: EmptyArticleListProps) {
  return (
    <div className={emptyStateClass}>
      <NewspaperIcon className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" aria-hidden="true" />
      <p className="text-lg mb-2">
        {hasArticles ? "No unread articles" : "No articles yet"}
      </p>
      <p className="text-sm mb-4">
        {hasArticles
          ? "You're all caught up. Toggle to All to view everything."
          : "Add a feed in Settings to pull your first articles."}
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
