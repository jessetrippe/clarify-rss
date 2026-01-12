export default function SkeletonArticleDetail() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
        <div className="flex gap-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-4/5" />
      </div>
    </div>
  );
}
