"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Feed } from "@/lib/types";

export default function Sidebar() {
  const pathname = usePathname();
  const feeds = useLiveQuery(async () => {
    const allFeeds = await db.feeds.toArray();
    return allFeeds
      .filter((feed) => !feed.isDeleted)
      .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }, []) as Feed[] | undefined;

  const navLinkClass = (href: string) =>
    `block px-3 py-2 rounded-md text-sm ${
      pathname === href
        ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
        : "hover:bg-gray-100 dark:hover:bg-gray-800"
    }`;

  const feedLinkClass = (feedId: string) =>
    `block px-3 py-2 rounded-md text-sm truncate ${
      pathname === `/feeds/${feedId}`
        ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
        : "hover:bg-gray-100 dark:hover:bg-gray-800"
    }`;

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 h-[calc(100vh-1px)] sticky top-0 overflow-y-auto">
      <div className="px-4 py-5">
        <Link href="/" className="text-xl font-bold block mb-4">
          Clarify
        </Link>

        <div className="space-y-2">
          <Link href="/" className={navLinkClass("/")}>
            All Items
          </Link>
        </div>

        <div className="mt-6">
          <div className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Feeds
          </div>
          <div className="space-y-1">
            {feeds?.length ? (
              feeds.map((feed) => (
                <Link key={feed.id} href={`/feeds/${feed.id}`} className={feedLinkClass(feed.id)}>
                  {feed.title}
                </Link>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No feeds yet
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Link href="/feeds" className={navLinkClass("/feeds")}>
            Feeds (Add)
          </Link>
          <Link href="/starred" className={navLinkClass("/starred")}>
            Starred
          </Link>
        </div>
      </div>
    </aside>
  );
}
