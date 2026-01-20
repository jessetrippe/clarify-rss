# Clarify RSS - Code Review TODOs

Code review completed 2026-01-19. Items organized by priority.

---

## High Priority (DRY Violations)

### [x] 1. Extract duplicate `decodeHtmlEntities()` to shared utility
- **Files:**
  - `lib/server/article-extractor.ts:230-249`
  - `lib/server/feed-fetcher.ts:25-61`
- **Action:** Create `lib/html-utils.ts` with a single `decodeHtmlEntities()` function and import in both files
- **Impact:** Reduces duplication, ensures consistent HTML entity handling

### [x] 2. Extract duplicate `fetchWithTimeout()` to shared utility
- **Files:**
  - `lib/feed-api.ts:32-48`
  - `lib/sync-service.ts:35-48`
- **Action:** Create `lib/fetch-utils.ts` with reusable `fetchWithTimeout()` function; unify timeout constants
- **Impact:** Reduces duplication, easier to maintain timeout logic

### [x] 3. Move article sorting to database layer
- **File:** `lib/db-operations.ts:105-153`
- **Action:** Use Dexie's `.reverse()` method instead of fetching all articles into memory and sorting in JavaScript
- **Example:**
  ```typescript
  return db.articles
    .where("[feedId+isDeleted]")
    .equals([feedId, 0])
    .reverse()
    .toArray();
  ```
- **Impact:** Significantly improves performance for users with 1000+ articles

---

## Medium Priority (Performance & Cost)

### [x] 4. Batch article inserts during feed refresh
- **File:** `lib/feed-refresh-service.ts:83-97`
- **Action:** Instead of `Promise.all()` on all articles at once, batch in groups of 50
- **Example:**
  ```typescript
  const BATCH_SIZE = 50;
  for (let i = 0; i < feedData.articles.length; i += BATCH_SIZE) {
    const batch = feedData.articles.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(article => addArticle({...})));
  }
  ```
- **Impact:** Smoother UX when adding feeds with many articles

### [x] 5. Add cache invalidation after sync
- **Files:**
  - `components/ArticleDetail.tsx:36-47`
  - `lib/sync-service.ts`
- **Action:** After sync pulls and merges articles, invalidate the article cache for those IDs
- **Example:**
  ```typescript
  import { articleCache } from "@/lib/article-cache";
  for (const article of articles) {
    articleCache.invalidate(article.id);
  }
  ```
- **Impact:** Prevents stale cached data after background sync

### [x] 6. Add content-size limit to article extraction
- **File:** `lib/server/article-extractor.ts:309-457`
- **Action:** Add a 2MB limit on HTML content size before processing
- **Example:**
  ```typescript
  const MAX_CONTENT_LENGTH = 2 * 1024 * 1024; // 2MB
  if (html.length > MAX_CONTENT_LENGTH) {
    return { success: false, error: "Page content too large" };
  }
  ```
- **Impact:** Prevents abuse, reduces storage costs

### [x] 7. Extract duplicate network error checking to shared utility
- **Files:**
  - `lib/sync-service.ts:176-182, 276-281`
  - `components/SyncProvider.tsx:74-77`
- **Action:** Create `lib/network-utils.ts` with `isNetworkError(error)` helper function
- **Impact:** Reduces duplication, consistent error handling

---

## Lower Priority (Scale Considerations)

### [x] 8. Document or improve rate limiter for production
- **File:** `lib/server/rate-limiter.ts`
- **Issue:** In-memory storage resets per serverless function instance
- **Options:**
  1. Document that current implementation is sufficient for low-traffic/single-user
  2. Use Supabase to store rate limit state (persists across instances)
  3. Use Redis if available
- **Impact:** Required for production scale with >100 requests/minute

### [ ] 9. Add virtualization to ArticleList for large lists
- **File:** `components/ArticleList.tsx`
- **Action:** Implement virtualization using `react-window` or `@tanstack/react-virtual`
- **Impact:** Enables smooth 60fps scrolling with 10,000+ articles; reduces memory usage
