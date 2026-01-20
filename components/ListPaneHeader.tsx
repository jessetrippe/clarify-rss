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
    <div className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)] px-4 py-3">
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={openMenu}
            className="xl:hidden p-1.5 rounded hover:bg-[var(--border)] text-[var(--muted)] transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-semibold truncate tracking-tight">
              {title}
            </h2>
            <span className="text-sm text-[var(--muted)]">
              {count}
            </span>
            {isRefreshing && (
              <svg
                className="animate-spin h-4 w-4 text-[var(--muted)]"
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
          </div>
        </div>
        <div className="inline-flex rounded overflow-hidden border border-[var(--border)] shrink-0">
          <button
            type="button"
            onClick={() => onShowReadChange(false)}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              !showRead
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Unread
          </button>
          <button
            type="button"
            onClick={() => onShowReadChange(true)}
            className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-[var(--border)] ${
              showRead
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            All
          </button>
        </div>
      </div>
    </div>
  );
}
