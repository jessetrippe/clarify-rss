"use client";

import { Bars3Icon } from "@heroicons/react/24/outline";
import { useMobileMenu } from "@/components/MobileMenuProvider";
import { useRefreshState } from "@/hooks/useFeedRefreshState";

interface ListPaneHeaderProps {
  title: string;
  count: number;
  showRead: boolean;
  onShowReadChange: (checked: boolean) => void;
}

export default function ListPaneHeader({
  title,
  count,
  showRead,
  onShowReadChange,
}: ListPaneHeaderProps) {
  const { openMenu } = useMobileMenu();
  const isRefreshing = useRefreshState();

  return (
    <div className="flex justify-between items-center mb-6 gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={openMenu}
          className="xl:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors duration-200 shrink-0"
          aria-label="Open menu"
        >
          <Bars3Icon className="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 className="text-2xl font-bold truncate flex items-center gap-2">
          <span>
            {title} ({count})
          </span>
          {isRefreshing && (
            <svg
              className="animate-spin h-5 w-5 text-gray-400"
              viewBox="0 0 24 24"
              aria-label="Refreshing feeds"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
        </h2>
      </div>
      <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
        <button
          type="button"
          onClick={() => onShowReadChange(false)}
          className={`px-3 py-1 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
            !showRead
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          Unread
        </button>
        <button
          type="button"
          onClick={() => onShowReadChange(true)}
          className={`px-3 py-1 text-sm font-medium transition-colors duration-200 border-l border-gray-300 dark:border-gray-600 whitespace-nowrap ${
            showRead
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          All
        </button>
      </div>
    </div>
  );
}
