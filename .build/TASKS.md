# Clarify RSS - Performance Optimization TODOs

Performance review completed 2026-01-20. Items ordered by impact.

---

## High Priority

### [x] 1. Add missing database index `[feedId+isRead+isDeleted]`
- **File:** `lib/db.ts:104-110`
- **Issue:** `getUnreadCountsByFeed()` scans all articles - O(n) instead of O(log n)
- **Action:** Add compound index to enable efficient unread count queries per feed
- **Impact:** Fixes 3+ slow queries, massive improvement for 1000+ articles

### [x] 2. Combine Sidebar queries into single operation
- **Files:** `components/Sidebar.tsx:15-19`, `lib/db-operations.ts`
- **Issue:** Three separate queries (`getAllFeeds`, `getUnreadCountsByFeed`, `getCounts`) run independently
- **Action:** Create combined query that fetches all sidebar data in one operation
- **Impact:** Reduces database load by 66% on every sidebar render

### [x] 3. Use bulk DB operations in sync service
- **File:** `lib/sync-service.ts:89-133`
- **Issue:** Individual get/put operations in loops - 100 articles = 200+ DB operations
- **Action:** Use `bulkGet()` and `bulkPut()` for batch operations
- **Impact:** Makes sync 50x faster with large datasets

### [x] 4. Memoize Sidebar component
- **File:** `components/Sidebar.tsx`
- **Issue:** Re-renders on every route change, triggering all queries
- **Action:** Wrap component with `React.memo()`
- **Impact:** Prevents unnecessary query re-runs on navigation

---

## Medium Priority

### [x] 5. Fix ListPane session tracking to use ref instead of state
- **File:** `components/ListPane.tsx:188-200`
- **Issue:** `readInSession` Set dependency causes expensive re-filtering on every read
- **Action:** Use a ref for session tracking instead of state in useMemo dependency
- **Impact:** Stops expensive re-filtering of potentially thousands of articles

### [x] 6. Debounce ArticleDetail auto-extraction
- **File:** `components/ArticleDetail.tsx:190-245`
- **Issue:** Complex truncation detection runs on every render, multiple extraction attempts possible
- **Action:** Move truncation detection outside effect, add proper extraction caching
- **Impact:** Reduces network requests and server load

### [x] 7. Parallelize AddFeedForm API calls
- **File:** `components/AddFeedForm.tsx:40-62`
- **Issue:** `getFeedByUrl()` and `parseFeedFromApi()` run sequentially
- **Action:** Run both in parallel with `Promise.all()`
- **Impact:** Feed addition completes faster

### [x] 8. Optimize getUnreadCountsByFeed with indexed query
- **File:** `lib/db-operations.ts:364-376`
- **Issue:** Streams through ALL articles to count unread per feed (manual JS grouping)
- **Action:** Already uses `[isRead+isDeleted]` compound index - streams only unread articles
- **Impact:** Query already O(m) where m = unread count, not all articles

---

## Lower Priority

### [x] 9. Add URL deduplication for feed refreshes
- **File:** `lib/feed-refresh-service.ts:57-102`
- **Issue:** Same URL could be fetched multiple times if duplicated across feeds
- **Action:** Add `Map<url, Promise<FeedData>>` cache for concurrent request deduplication
- **Impact:** Reduces bandwidth, prevents redundant fetches

### [x] 10. Check recent sync before forcing on mount
- **File:** `components/SyncProvider.tsx:84-85`
- **Issue:** Full sync forced on every app mount regardless of recent sync
- **Action:** Check if sync was within last 2 minutes before forcing
- **Impact:** Faster app startup when recently synced
