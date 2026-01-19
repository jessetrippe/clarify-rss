"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import type { Feed } from "@/lib/types";
import { getFeedIconCandidates } from "@/lib/feed-icon";
import { getAllFeeds } from "@/lib/db-operations";
import { StarIcon, Cog6ToothIcon, InboxIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useMobileMenu } from "@/components/MobileMenuProvider";

export default function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { isOpen, closeMenu } = useMobileMenu();
  const feeds = useLiveQuery(async () => getAllFeeds(), []) as Feed[] | undefined;

  const navLinkClass = (href: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
      pathname === href
        ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
        : "hover:bg-gray-100 dark:hover:bg-gray-800"
    }`;

  const feedLinkClass = (feedId: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm truncate ${
      pathname === `/feeds/${feedId}`
        ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
        : "hover:bg-gray-100 dark:hover:bg-gray-800"
    }`;

  const handleNavClick = () => {
    if (isOpen) closeMenu();
  };

  return (
    <aside className={`
      w-80 shrink-0 bg-white dark:bg-gray-900
      border-r border-gray-200 dark:border-gray-800
      h-screen overflow-y-auto px-4 py-5 flex flex-col
      ${className}
    `}>
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-xl font-bold">
            Clarify RSS
          </Link>
          {isOpen && (
            <button
              type="button"
              onClick={closeMenu}
              className="xl:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors duration-200"
              aria-label="Close menu"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="space-y-2">
          <Link href="/" className={navLinkClass("/")} onClick={handleNavClick}>
            <InboxIcon className="h-4 w-4" aria-hidden="true" />
            All Items
          </Link>
        </div>

        <div className="mt-6">
          <div className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Feeds
          </div>
          <div className="space-y-1">
            {feeds?.length ? (
              feeds.map((feed) => {
                const iconCandidates = getFeedIconCandidates(feed);
                return (
                <Link key={feed.id} href={`/feeds/${feed.id}`} className={feedLinkClass(feed.id)} onClick={handleNavClick}>
                  {iconCandidates.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={iconCandidates[0]}
                        alt={`${feed.title} icon`}
                        data-fallback-index="0"
                        className="h-5 w-5 rounded-md object-contain bg-white p-0.5"
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
                      <span className="h-5 w-5 rounded-md bg-white text-[10px] font-semibold flex items-center justify-center text-gray-600">
                        {feed.title?.slice(0, 1).toUpperCase() || "?"}
                      </span>
                    )}
                  <span className="truncate">{feed.title}</span>
                </Link>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No feeds yet
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Link href="/starred" className={navLinkClass("/starred")} onClick={handleNavClick}>
            <StarIcon className="h-4 w-4" aria-hidden="true" />
            Starred
          </Link>
        </div>

        <div className="mt-auto pt-6">
          <Link href="/settings" className={navLinkClass("/settings")} onClick={handleNavClick}>
            <Cog6ToothIcon className="h-4 w-4" aria-hidden="true" />
            Settings
          </Link>
        </div>
    </aside>
  );
}
