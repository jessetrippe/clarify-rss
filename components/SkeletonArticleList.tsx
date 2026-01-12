export default function SkeletonArticleList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-700 rounded-full flex-shrink-0 mt-1" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
