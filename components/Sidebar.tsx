"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import type { Feed } from "@/lib/types";
import { getFeedIconCandidates } from "@/lib/feed-icon";
import { getAllFeeds, getUnreadCountsByFeed, getCounts } from "@/lib/db-operations";
import { StarIcon, Cog6ToothIcon, InboxIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useMobileMenu } from "@/components/MobileMenuProvider";

export default function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { isOpen, closeMenu } = useMobileMenu();
  const feeds = useLiveQuery(async () => getAllFeeds(), []) as Feed[] | undefined;
  const unreadCounts = useLiveQuery(async () => getUnreadCountsByFeed(), []) as Record<string, number> | undefined;
  const counts = useLiveQuery(async () => getCounts(), []) as
    | { unreadCount: number; starredCount: number }
    | undefined;

  const isActive = (href: string) => pathname === href;
  const isFeedActive = (feedId: string) => pathname === `/feeds/${feedId}`;

  const handleNavClick = () => {
    if (isOpen) closeMenu();
  };

  return (
    <aside className={`
      w-72 shrink-0 bg-[var(--background)]
      border-r border-[var(--border)]
      h-screen overflow-y-auto px-3 py-4 flex flex-col
      ${className}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-2">
        <Link href="/" className="text-lg font-bold tracking-tight font-serif">
          Clarify RSS
        </Link>
        {isOpen && (
          <button
            type="button"
            onClick={closeMenu}
            className="xl:hidden p-1.5 rounded hover:bg-[var(--border)] text-[var(--muted)] transition-colors"
            aria-label="Close menu"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="space-y-0.5">
        <Link
          href="/"
          className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors ${
            isActive("/")
              ? "bg-[var(--accent)] text-white font-medium"
              : "text-[var(--foreground)] hover:bg-[var(--border)]"
          }`}
          onClick={handleNavClick}
        >
          <InboxIcon className="h-4 w-4" aria-hidden="true" />
          All Items
          {counts && counts.unreadCount > 0 && (
            <span className={`ml-auto text-xs tabular-nums shrink-0 ${
              isActive("/")
                ? "text-white/80"
                : "text-[var(--muted)]"
            }`}>
              {counts.unreadCount}
            </span>
          )}
        </Link>
        <Link
          href="/starred"
          className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors ${
            isActive("/starred")
              ? "bg-[var(--accent)] text-white font-medium"
              : "text-[var(--foreground)] hover:bg-[var(--border)]"
          }`}
          onClick={handleNavClick}
        >
          <StarIcon className="h-4 w-4" aria-hidden="true" />
          Starred
          {counts && counts.starredCount > 0 && (
            <span className={`ml-auto text-xs tabular-nums shrink-0 ${
              isActive("/starred")
                ? "text-white/80"
                : "text-[var(--muted)]"
            }`}>
              {counts.starredCount}
            </span>
          )}
        </Link>
      </nav>

      {/* Feeds Section */}
      <div className="mt-6 flex-1 min-h-0">
        <div className="px-2 text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-2">
          Feeds
        </div>
        <nav className="space-y-0.5 overflow-y-auto">
          {feeds?.length ? (
            feeds.map((feed) => {
              const iconCandidates = getFeedIconCandidates(feed);
              const active = isFeedActive(feed.id);
              return (
                <Link
                  key={feed.id}
                  href={`/feeds/${feed.id}`}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors ${
                    active
                      ? "bg-[var(--accent)] text-white font-medium"
                      : "text-[var(--foreground)] hover:bg-[var(--border)]"
                  }`}
                  onClick={handleNavClick}
                >
                  {iconCandidates.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={iconCandidates[0]}
                      alt=""
                      data-fallback-index="0"
                      className={`h-4 w-4 rounded object-contain shrink-0 dark:bg-white dark:p-0.5 ${active ? "" : "opacity-80"}`}
                      onError={(event) => {
                        const currentIndex = Number(
                          event.currentTarget.dataset.fallbackIndex || "0"
                        );
                        const nextIndex = currentIndex + 1;
                        const nextIcon = iconCandidates[nextIndex];
                        if (nextIcon) {
                          event.currentTarget.dataset.fallbackIndex = String(nextIndex);
                          event.currentTarget.src = nextIcon;
                          return;
                        }
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className={`h-4 w-4 rounded text-[9px] font-semibold flex items-center justify-center shrink-0 ${
                      active ? "bg-white/20" : "bg-[var(--border)] text-[var(--muted)]"
                    }`}>
                      {feed.title?.slice(0, 1).toUpperCase() || "?"}
                    </span>
                  )}
                  <span className="truncate flex-1">{feed.title}</span>
                  {unreadCounts && unreadCounts[feed.id] > 0 && (
                    <span className={`text-xs tabular-nums shrink-0 ${
                      active ? "text-white/80" : "text-[var(--muted)]"
                    }`}>
                      {unreadCounts[feed.id]}
                    </span>
                  )}
                </Link>
              );
            })
          ) : (
            <div className="px-2 py-4 text-sm text-[var(--muted)]">
              No feeds yet
            </div>
          )}
        </nav>
      </div>

      {/* Settings */}
      <div className="pt-4 border-t border-[var(--border)]">
        <Link
          href="/settings"
          className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors ${
            isActive("/settings")
              ? "bg-[var(--accent)] text-white font-medium"
              : "text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
          }`}
          onClick={handleNavClick}
        >
          <Cog6ToothIcon className="h-4 w-4" aria-hidden="true" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
