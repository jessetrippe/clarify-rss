"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import ListPane from "@/components/ListPane";
import ArticleDetail from "@/components/ArticleDetail";

interface ContentAreaProps {
  variant: "all" | "starred" | "feed";
  feedId?: string;
}

export default function ContentArea({ variant, feedId }: ContentAreaProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const articleId = searchParams.get("article");

  const handleBack = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  return (
    <div className="xl:flex h-screen">
      {/* List pane - fixed width on desktop, hidden on mobile when article is selected */}
      <div className={`xl:w-80 xl:shrink-0 xl:h-full xl:overflow-hidden ${articleId ? "hidden xl:block" : ""}`}>
        <ListPane variant={variant} feedId={feedId} />
      </div>

      {/* Article detail or placeholder */}
      {articleId ? (
        <div className="flex-1 xl:border-l xl:border-gray-200 xl:dark:border-gray-800 xl:pl-6 xl:overflow-y-auto">
          <ArticleDetail articleId={articleId} onBack={handleBack} />
        </div>
      ) : (
        <div className="hidden xl:flex flex-1 border-l border-gray-200 dark:border-gray-800 pl-6 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          Select an article to read
        </div>
      )}
    </div>
  );
}
