# Clarify RSS - Project Implementation Plan

**Project:** Clarify RSS - Personal, plaintext RSS reader
**Created:** 2026-01-12
**Status:** In Development (Phases 0-6, 8 complete; Phase 7 partially complete - pending production deployment)

---

## Progress Update (2026-01-19)

Code review completed. Identified 9 opportunities for improvement (DRY violations, performance optimizations, cost/scale considerations). See `TASKS.md` for actionable items.

---

## Progress Update (2026-01-18)

### Code Review & Security Hardening Complete

A comprehensive code review was performed and all identified issues have been fixed:

#### Critical Security Fixes
- **CORS restriction** - Changed from wildcard `"*"` to environment-based origin restriction via `ALLOWED_ORIGIN` variable
- **Input validation** - Added URL validation and JSON body parsing with proper error handling throughout the worker
- **HTML sanitization** - Fixed XSS vulnerability by re-sanitizing after DOM modifications instead of using regex replacement
- **Rate limiting** - Added per-endpoint rate limiting to worker API

#### Data Integrity Fixes
- **Race condition** - Wrapped `addArticle` in a Dexie transaction to prevent concurrent write issues
- **Timestamp normalization** - Added `normalizeTimestamp()` to handle both seconds and milliseconds from different sources
- **Cursor encoding** - Changed to base64 JSON encoding to safely handle IDs containing special characters
- **Article sorting** - Fixed sorting to properly return newest-first order

#### Performance & Reliability
- **Request timeouts** - Added 30-second timeouts to all API calls
- **Retry logic** - Added exponential backoff for feed fetching with transient error detection
- **Sync batching** - Batched database operations for better performance
- **Cache TTL** - Added time-based cache invalidation

#### Memory & Resource Management
- **Timeout cleanup** - Properly cleanup timeouts on component unmount using refs
- **Hydration fixes** - Fixed SSR hydration mismatches in refresh state hook

#### Code Quality
- **Logger utility** - Replaced `console.log` with environment-aware logging (silent in production)
- **TypeScript types** - Fixed type definitions, removed `any` types where possible
- **Suspense boundaries** - Added Suspense wrappers to pages using `useSearchParams()`
- **Next.js 16 compatibility** - Fixed deprecated config options

### New Utility Files Added
- `lib/logger.ts` - Environment-aware logging utility
- `lib/validation.ts` - URL and string validation functions
- `lib/retry.ts` - Retry with exponential backoff
- `lib/server/rate-limiter.ts` - Rate limiting for API routes

### Deployment Decision (2026-01-18)

- **Hosting:** Netlify (frontend + serverless functions)
- **Database:** Supabase Postgres
- **Auth:** Supabase Auth (Magic Link)

---

## Previous Progress (2026-01-13)

- Two-pane split layout with sidebar navigation and list/detail views
- Settings moved to `/settings` with feeds management inside
- Feed parsing/discovery handled by backend API routes (mock parser removed)
- Per-list Unread/All toggle with persistence
- Feed icons supported (feed-provided icon or favicon fallback)
- Heroicons added for consistent UI icons
- Local DB flags stored as numeric 0/1 with migration
- Next.js 16 and Tailwind CSS 4 upgrades complete

## Product Scope

### Problem Statement

Many RSS readers (including high-quality native apps) display full feed-provided article text but do not reliably allow users to copy or export that text—especially on mobile. Long-form RSS articles are often difficult or impossible to “Select All,” creating friction for workflows that involve summarization, annotation, or reuse (e.g., pasting into ChatGPT).

Clarify RSS is designed to solve this problem by providing:

- Guaranteed access to full article content
- A deterministic **Copy Content** action
- A local-first, synced experience across iPhone and desktop
- A minimal, durable feature set comparable to the _core_ functionality of Reeder Classic

### Goals (MVP)

- Subscribe to RSS/Atom feeds
- Fetch, store, and display feed items
- Persist article content locally
- Track read/unread status
- Support starring articles
- Sync feeds, items, and state across devices
- Provide a one-tap **Copy Content** action
- Work offline after initial sync
- Refresh feeds automatically when the app is opened or focused
- Remain cheap or free to operate

### Non-Goals (MVP)

- Multi-user support or account management
- Background/scheduled feed refresh (only on app open/focus)
- Feed folders or hierarchical organization
- Feed tags or categories
- Article time-based retention limits (keep indefinitely)
- Search functionality
- Article filtering or sorting options beyond chronological
- Social features or sharing capabilities
- Feed recommendations or discovery features
- Analytics or usage tracking
- Image proxying or caching
- Custom themes or appearance settings

> **Note:** Full article extraction from source websites was originally a non-goal but was implemented to handle feeds that only provide summaries.

### Feature Scope (MVP)

#### Feed Management

- User can add a feed by entering a feed URL
- Feed auto-discovery:
  - When adding a feed, attempt to parse HTML for `<link rel="alternate">`
  - If multiple feeds found, prompt user to choose
  - Support common feed URL patterns (/feed, /rss, /atom.xml)
- User can import feeds via OPML
- User can export all feeds as OPML file
- Feeds are persisted locally and synced
- Feed metadata stored:
  - URL
  - Title
  - Last fetched timestamp
  - Last error (if any)

#### Feed Refresh Behavior

- Feeds refresh automatically:
  - On app open
  - When app regains focus
- Refreshing a feed:
  - Inserts new items
  - Updates existing items
  - Never overwrites user state (read/starred)
- Rate limiting:
  - Respect feed-level cache headers (ETag, Last-Modified)
  - Minimum 5-minute interval between refreshes per feed
  - API routes handle conditional GET requests
- Error handling:
  - Feed fetch failures show error message with last successful fetch time
  - Retry on next manual refresh
  - Invalid feeds show "Unable to parse" error

#### Article Storage & Identity

- All fetched articles are stored locally
- Article identity resolution:
  1. GUID (preferred)
  2. Link URL
  3. Hash of (feedId + title + publishedAt)
- Duplicate articles are not created across refreshes
- Article content handling:
  - Articles store whatever content the RSS/Atom feed provides
  - No additional web scraping or content extraction
  - If a feed only provides summaries, that's what gets stored
  - HTML content is persisted locally when provided by the feed
- Image handling:
  - Images use original URLs from feeds (not proxied or cached)
  - Images render with `loading="lazy"` for performance
  - No retention limit on articles (stored indefinitely)

#### Read / Unread State

- Articles default to **Unread**
- Opening an article marks it **Read**
- User can manually toggle Read / Unread
- Read state persists locally and syncs

#### Starred Articles

- User can Star / Unstar an article
- Starred state persists locally and syncs
- A **Starred** view shows only starred items, sorted by date

#### Article Display

- Article detail view displays:
  - Title
  - Feed name
  - Publication date (if available)
  - Article body when provided by the feed
- If no article body exists, show a fallback (summary or title + link)

#### Copy Content (Critical Feature)

- Article detail view includes a **Copy Content** button
- Copy action places the following on the clipboard:
  - Article Title
  - Source URL
  - Plain-text article body
- HTML is converted to plain text deterministically
- Copy works reliably for very long articles
- Copy is always initiated by a direct user gesture (button tap)

#### Sync Requirements (MVP)

- Local-first
- Backend stores canonical state
- Client syncs on app open and app focus

Data to sync:
- Feeds
- Items
- Read/unread state
- Starred state
- Deletions (via tombstones)

Conflict resolution:
- **Last write wins**, based on `updatedAt` timestamps
- Example: If starred state changes on two devices while offline, the most recent change (by timestamp) takes precedence when both sync
- Tombstone cleanup: Never purge deleted items (kept indefinitely for sync integrity)
- Sync batch size: 100 items per sync request
- No limit on number of synced devices (designed for personal use across 2+ devices)

## Overview

This document outlines the implementation plan for Clarify RSS, a local-first PWA RSS reader with sync capabilities. The project is broken into 7 phases, each designed to be completable in 1-4 coding sessions.

### Key Principles

- **Local-first:** Build and test local functionality before adding sync
- **Incremental:** Each phase delivers working, testable functionality
- **Checkpoint commits:** Commit at the end of each phase
- **Test as you build:** Manual testing after each feature

---

## Phase 0: Project Setup & Foundation ✅ COMPLETE

**Goal:** Initialize the project with all tooling and basic structure
**Estimated Sessions:** 1
**Dependencies:** None

### Tasks

1. **Initialize Next.js project**
   - `npx create-next-app@latest clarify-rss`
   - TypeScript, App Router, Tailwind CSS
   - No src/ directory (keep flat structure)

2. **Install core dependencies**
   ```bash
   npm install dexie dexie-react-hooks
   npm install rss-parser
   npm install dompurify
   npm install @types/dompurify
   npm install date-fns
   ```

3. **Configure PWA basics**
   - Install `next-pwa`
   - Create `public/manifest.json`
   - Add icons (placeholder icons OK for now)
   - Configure `next.config.js` for PWA

4. **Project structure**
   ```
   /app
     /layout.tsx
     /page.tsx
     /settings
     /feeds
     /articles
   /lib
     /db.ts              # Dexie setup
     /types.ts           # TypeScript types
   /components
     /ui                 # Reusable UI components
   /public
     /manifest.json
     /icons
   ```

5. **Basic layout**
   - App shell with navigation
   - Mobile-first responsive layout
   - Tailwind configuration

### Deliverables

- ✅ Next.js app running on `localhost:3000`
- ✅ Tailwind styles working
- ✅ Basic navigation structure
- ✅ TypeScript configured with no errors

### Checkpoint

- Commit: `"feat: initial project setup with Next.js, Tailwind, and PWA config"`

---

## Phase 1: Local Database & Data Models ✅ COMPLETE

**Goal:** Set up IndexedDB with Dexie.js and define all data models
**Estimated Sessions:** 2-3
**Dependencies:** Phase 0

### Tasks

1. **Define TypeScript types** (`lib/types.ts`)
   ```typescript
   interface Feed {
     id: string           // UUID
     url: string
     title: string
     iconUrl?: string
     lastFetchedAt?: Date
     lastError?: string
     createdAt: Date
     updatedAt: Date
     isDeleted: number    // 0 or 1
   }

   interface Article {
     id: string           // Derived from GUID or URL
     feedId: string
     guid?: string
     url?: string
     title: string
     content?: string     // HTML
     summary?: string
     publishedAt?: Date
     isRead: number       // 0 or 1
     isStarred: number    // 0 or 1
     createdAt: Date
     updatedAt: Date
     isDeleted: number    // 0 or 1
   }

   interface SyncState {
     id: string
     lastSyncAt?: Date
     cursor?: string
   }
   ```

2. **Set up Dexie database** (`lib/db.ts`)
   - Define schema with indexes
   - Feeds table: index on `id`, `url`, `isDeleted`
   - Articles table: index on `id`, `feedId`, `isRead`, `isStarred`, `publishedAt`, `isDeleted`
   - SyncState table: single row for sync cursor

3. **Create database operations** (`lib/db-operations.ts`)
   - CRUD operations for feeds
   - CRUD operations for articles
   - Query helpers:
     - `getAllFeeds()`
     - `getAllArticles()`
     - `getArticlesByFeed(feedId)`
     - `getStarredArticles()`
     - `getUnreadArticles()`
     - `markArticleRead(id)`
     - `toggleStarred(id)`

4. **Article ID generation utility**
   - Function to generate stable article IDs
   - Priority: GUID > URL > hash(feedId + title + publishedAt)

5. **Basic testing**
   - Create test page to add/list/delete feeds
   - Verify data persists across page refresh
   - Test in IndexedDB DevTools

### Deliverables

- ✅ Dexie database configured and working
- ✅ TypeScript types for all entities
- ✅ CRUD operations for feeds and articles
- ✅ Data persists in IndexedDB

### Checkpoint

- Commit: `"feat: set up IndexedDB with Dexie and data models"`

---

## Phase 2: Feed Management UI ✅ COMPLETE

**Goal:** Build UI to add, list, and manage feeds
**Estimated Sessions:** 2-3
**Dependencies:** Phase 1

### Tasks

1. **Settings page** (`app/settings/page.tsx`)
   - Display all feeds
   - Show feed title, last fetched time
   - Show error state if last fetch failed
   - Empty state with "Add Feed" prompt

2. **Add feed form** (`components/AddFeedForm.tsx`)
   - Input for feed URL
   - Basic URL validation
   - Submit handler (backend RSS parse + discovery)
   - Success/error feedback

3. **Feed parsing**
   - Use backend Worker endpoints for parsing and discovery

4. **OPML import** (`components/OPMLImport.tsx`)
   - File input for OPML file
   - Parse OPML XML (use DOMParser)
   - Extract feed URLs
   - Bulk insert feeds into database using backend parse/discovery

5. **OPML export** (`lib/opml-export.ts`)
   - Generate OPML XML from feeds
   - Download as file
   - Include feed title and URL

6. **Feed detail view** (`app/feeds/[id]/page.tsx`)
   - List articles from this feed

### Deliverables

- ✅ Can add feeds by URL
- ✅ Feed list displays all feeds
- ✅ OPML import working
- ✅ OPML export working
- ✅ Feeds persist in IndexedDB

### Checkpoint

- Commit: `"feat: feed management UI with OPML import/export"`

---

## Phase 3: Article Display & Reading Experience ✅ COMPLETE

**Goal:** Build the core reading experience with article lists and detail views
**Estimated Sessions:** 2-3
**Dependencies:** Phase 2

### Tasks

1. **Article list component** (`components/ArticleList.tsx`)
   - Display article title, feed name, date
   - Show unread indicator (bold or dot)
   - Show starred indicator (star icon)
   - Tap to open article detail
   - Reverse chronological sort

2. **All Items view** (`app/page.tsx`)
   - Use ArticleList component
   - Show all articles across all feeds
   - Filter out deleted articles

3. **Starred view** (`app/starred/page.tsx`)
   - Use ArticleList component
   - Show only starred articles
   - Same reverse chronological sort

4. **Article detail view** (`components/ArticleDetail.tsx`)
   - Display article title
   - Display feed name (link to feed)
   - Display publication date (formatted with date-fns)
   - Display article content (sanitized HTML)
   - Auto-mark as read on open
   - Auto-extract full content when feed provides only summary

5. **HTML sanitization** (`lib/sanitize.ts`)
   - Use DOMPurify
   - Strip dangerous tags: script, iframe, object, embed, form
   - Allow safe tags: p, a, img, strong, em, ul, ol, li, blockquote, code, pre, h1-h6
   - Add `loading="lazy"` to images
   - Add `rel="noopener noreferrer"` to links

6. **Article actions** (integrated in detail view)
   - Star/Unstar button
   - Mark Read/Unread button
   - Copy Content button (see next section)
   - Visual feedback on state changes

7. **Copy Content feature** (`lib/copy-content.ts`)
   - Convert HTML to plain text
   - Format as: Title + URL + Plain text body
   - Use Clipboard API
   - Show success toast
   - Handle permission errors

8. **Empty states**
   - No articles in All Items
   - No starred articles
   - Article has no content (show summary or link)

### Deliverables

- ✅ Can view all articles in reverse chronological order
- ✅ Can view starred articles
- ✅ Can view articles by feed
- ✅ Article detail renders sanitized HTML
- ✅ Can mark read/unread
- ✅ Can star/unstar
- ✅ Copy Content button works reliably
- ✅ Article opens = auto-marked read

### Checkpoint

- Commit: `"feat: article display and reading experience with copy content"`

---

## Phase 4: Backend Infrastructure (Supabase) ✅ COMPLETE

**Goal:** Set up Supabase Postgres and Next.js API routes for sync and feed parsing
**Estimated Sessions:** 3-4
**Dependencies:** Phase 3 (local app working)

### Tasks

1. **Create Supabase project**
   - Enable Magic Link auth
   - Set redirect URLs for local + production

2. **Database schema** (`supabase/schema.sql`)
   - Create feeds and articles tables
   - Add indexes for sync performance

3. **Row Level Security** (`supabase/rls.sql`)
   - Enable RLS on feeds and articles
   - Policies scoped to `user_id`

4. **API routes** (`app/api/*`)
   - `POST /api/sync/pull` - Pull changes from server
   - `POST /api/sync/push` - Push changes to server
   - `POST /api/feeds/parse` - Parse RSS/Atom feed
   - `POST /api/feeds/discover` - Discover feeds from URL
   - `POST /api/articles/extract` - Extract full content
   - `GET /api/health` - Health check

5. **Server helpers** (`lib/server/*`)
   - Sync logic and cursor handling
   - Rate limiting
   - Feed parsing + extraction

6. **Testing**
   - `npm run dev`
   - `curl http://localhost:3000/api/health`
   - Verify sync and feed parsing

### Deliverables

- ✅ Supabase schema created
- ✅ RLS policies enabled
- ✅ API routes responding
- ✅ Sync push/pull operational

### Checkpoint

- Commit: `"feat: Supabase backend with Next.js API routes"`

---

## Phase 5: Feed Refresh & Sync Integration ✅ COMPLETE

**Goal:** Implement RSS feed parsing and integrate sync with frontend
**Estimated Sessions:** 3-4
**Dependencies:** Phase 4

### Tasks

1. **RSS parsing in API routes** (`lib/server/feed-fetcher.ts`)
   - Use rss-parser server-side
   - Fetch feed URL
   - Parse RSS/Atom with rss-parser
   - Extract articles (guid, url, title, content, summary, publishedAt)
   - Handle parsing errors gracefully

2. **Feed auto-discovery** (`lib/server/feed-fetcher.ts`)
   - When feed URL fails to parse, fetch as HTML
   - Parse HTML for `<link rel="alternate" type="application/rss+xml">`
   - Return discovered feed URLs
   - Support common patterns (/feed, /rss, /atom.xml)

3. **Rate limiting** (`lib/server/rate-limiter.ts`)
   - Track last fetch time per feed
   - Enforce 5-minute minimum between fetches
   - Respect ETag and Last-Modified headers
   - Use conditional GET requests (If-None-Match, If-Modified-Since)

4. **Feed refresh endpoint** (`POST /api/feeds/refresh`)
   - Accept feed ID or "all"
   - Fetch and parse feed
   - Insert new articles
   - Update existing articles (preserve user state)
   - Return new articles count
   - Handle fetch errors (404, timeout, malformed XML)

5. **Frontend sync service** (`lib/sync-service.ts`)
   - `syncPull()` - Pull changes from server, merge into IndexedDB
   - `syncPush()` - Push local changes to server
   - `syncAll()` - Push then pull
   - Handle conflicts (last write wins based on updatedAt)
   - Track sync state (last sync time, cursor)
   - Error handling and retry logic

6. **Trigger sync on app lifecycle**
   - Sync on app mount (in root layout)
   - Sync on window focus event
   - Show sync indicator during sync
   - Show last sync time

7. **Refresh feeds on sync**
   - When frontend syncs, trigger backend feed refresh
   - Or: call refresh endpoint separately after sync
   - Show "Refreshing feeds..." indicator

8. **Frontend parsing integration**
   - Add Feed form and OPML import call backend parse/discovery
   - Handle feed discovery (if multiple feeds found, let user choose)
   - Show validation errors

### Deliverables

- ✅ Backend can fetch and parse RSS feeds
- ✅ Feed auto-discovery working
- ✅ Rate limiting enforced
- ✅ Frontend syncs with backend on app open/focus
- ✅ New articles appear after sync
- ✅ Read/starred state syncs across devices
- ✅ Conflict resolution working (test on two devices)

### Checkpoint

- Commit: `"feat: RSS feed parsing and sync integration"`

---

## Phase 6: PWA & Offline Support ✅ COMPLETE

**Goal:** Full PWA functionality with offline support
**Estimated Sessions:** 2-3
**Dependencies:** Phase 5

### Tasks

1. **Service Worker configuration**
   - Configure next-pwa in `next.config.js`
   - Cache strategy: NetworkFirst for API, CacheFirst for static assets
   - Precache app shell
   - Rely on standard HTTP caching for feed images (no explicit caching)

2. **Web App Manifest** (`public/manifest.json`)
   - App name: "Clarify RSS"
   - Short name: "Clarify"
   - Theme color, background color
   - Icons: 192x192, 512x512 (generate with real icon)
   - Display: "standalone"
   - Start URL: "/"

3. **App icons**
   - Design simple icon (or use placeholder)
   - Generate all sizes: 192, 512, apple-touch-icon
   - Add to manifest and HTML meta tags

4. **Install prompt**
   - Detect if app is installable
   - Show "Install App" prompt (dismissible)
   - Hide prompt if already installed

5. **Offline indicator**
   - Detect online/offline status
   - Show banner when offline
   - Disable sync when offline
   - Show cached data with "offline" indicator

6. **Loading states**
   - Loading spinner during sync
   - Skeleton screens for article lists
   - Loading indicator during feed refresh
   - Optimistic updates for read/starred state

7. **Error boundaries**
   - Catch and display React errors gracefully
   - Provide "Reload" button
   - Log errors to console (no external logging for MVP)

8. **Test PWA**
   - Test on iOS Safari (Add to Home Screen)
   - Test on desktop Chrome (Install App)
   - Test offline mode
   - Test across Mac and iPhone

### Deliverables

- ✅ App installable as PWA on iOS and desktop
- ✅ App works offline (cached data)
- ✅ Service Worker caching assets
- ✅ Install prompt shows when appropriate
- ✅ Loading states for all async operations
- ✅ Offline indicator when network unavailable

### Checkpoint

- Commit: `"feat: PWA support with offline functionality"`

---

## Phase 7: Security, Polish & Deployment ⏳ IN PROGRESS

**Goal:** Final security hardening, polish, and deploy to production
**Estimated Sessions:** 2-3
**Dependencies:** Phase 6
**Status:** Security hardening complete; pending production deployment and final testing

### Tasks

1. **Content Security Policy**
   - Add CSP headers to Next.js config
   - Strict policy for article content
   - Allow images from any domain (for feed images)
   - Block inline scripts
   - Test that articles render correctly

2. **Final security audit**
   - Verify DOMPurify is sanitizing all HTML
   - Test with malicious feed content (XSS attempts)
   - Verify external links have `rel="noopener noreferrer"`
   - Check for any exposed secrets or API keys
   - Ensure HTTPS only

3. **Deploy to Netlify**
   - Connect GitHub repo to Netlify
   - Configure build: `npm run build -- --webpack`
   - Configure environment variables (Supabase keys)
   - Deploy to production
   - Custom domain with HTTPS

4. **Configure Supabase Auth**
   - Set Site URL and redirect URLs
   - Disable open signups (single-user mode)
   - Verify magic link login flow

6. **UI Polish**
   - Consistent spacing and typography
   - Smooth transitions for state changes
   - Touch-friendly tap targets (min 44x44px)
   - Favicon and app icon finalized

7. **Error messages**
   - User-friendly error messages for all failure cases
   - "Feed not found" when feed URL is invalid
   - "Sync failed" with retry button
   - "Unable to load article" fallback

8. **Performance optimization**
   - Lazy load article content
   - Virtual scrolling for long article lists (if needed)
   - Optimize images (next/image component)
   - Test performance against targets:
     - Feed list <100ms
     - Article open <200ms
     - Sync <5s

9. **Final testing**
   - Test all features on Mac and iPhone
   - Test sync across both devices
   - Test offline mode
   - Test with real RSS feeds (various formats)
   - Test OPML import/export with real data
   - Test Copy Content with very long articles

10. **Documentation**
    - Update README with:
      - Project description
      - Setup instructions
      - Development workflow
      - Deployment instructions
    - Document known limitations
    - Document future enhancements (post-MVP)

### Deliverables

- ✅ App deployed to production
- ✅ Supabase Auth protecting all routes
- ✅ All security measures implemented
- ✅ App tested on Mac and iPhone
- ✅ Performance targets met
- ✅ README documentation complete

### Checkpoint

- Commit: `"chore: production deployment and final polish"`
- Tag: `v1.0.0`

---

## Phase 8: Dark Mode & Theming ✅ COMPLETE

**Goal:** Add dark mode after core functionality is stable
**Estimated Sessions:** 1-2
**Dependencies:** Phase 7
**Status:** Complete - Dark mode implemented via CSS custom properties and system preference detection

### Tasks

1. **Theme tokens** ✅
   - Define light/dark CSS variables in `globals.css`
   - Contrast meets accessibility targets

2. **Theme selection** ✅
   - Defaults to system preference via `prefers-color-scheme`
   - Manual override not implemented (using system preference only)

3. **UI validation** ✅
   - All screens support dark mode via `dark:` Tailwind classes
   - Article content readable in both modes
   - Icons render correctly

### Deliverables

- ✅ Dark mode available across the app
- ✅ Theme follows system preference
- ✅ Accessibility contrast targets met

### Checkpoint

- Commit: `"feat: dark mode theme support"`

---

## Architecture Decisions Log

Use this section to document key decisions made during implementation.

### Decision 1: [Title]
- **Date:** YYYY-MM-DD
- **Context:** What problem were we solving?
- **Decision:** What did we decide?
- **Rationale:** Why this approach?
- **Alternatives:** What else did we consider?

---

## Testing Checklist

Use this checklist to verify functionality at the end of the project.

### Feed Management
- [x] Can add feed by URL
- [x] Feed auto-discovery finds feeds
- [x] Can import OPML
- [x] Can export OPML
- [x] Can view feed list
- [x] Can view articles by feed
- [x] Can delete feed

### Article Reading
- [x] Can view all articles
- [x] Can view starred articles
- [x] Can open article detail
- [x] Article HTML renders safely
- [x] Images load with lazy loading
- [x] Can mark read/unread
- [x] Can star/unstar
- [x] Opening article auto-marks read
- [x] Copy Content works for long articles

### Sync
- [x] Sync works on app open
- [x] Sync works on app focus
- [ ] Changes sync across devices (test on Mac + iPhone - requires production)
- [x] Conflict resolution works (test simultaneous edits)
- [x] Sync indicator shows during sync
- [ ] Last sync time displayed

### Feed Refresh
- [x] Feeds refresh on sync
- [x] New articles appear
- [x] Existing articles update
- [x] User state preserved (read/starred)
- [x] Rate limiting enforced (5-minute minimum)
- [x] Error handling for failed feeds (with retry logic)

### PWA & Offline
- [x] App installable on iOS
- [x] App installable on desktop
- [x] App works offline (cached data)
- [x] Offline indicator shows when offline
- [x] Service Worker caches assets
- [x] Icons display correctly

### Security
- [ ] Supabase Auth protects all routes
- [x] DOMPurify sanitizes all HTML (re-sanitizes after DOM modifications)
- [x] CSP policy enforced (configured in next.config.ts)
- [x] External links have noopener/noreferrer
- [x] No XSS vulnerabilities (fixed sanitization security issue)
- [ ] HTTPS only (requires production deployment)
- [x] CORS restricted to specific origin (not wildcard)
- [x] Input validation on all API endpoints
- [x] Rate limiting on worker endpoints

### Performance
- [ ] Feed list renders <100ms
- [ ] Article opens <200ms
- [ ] Sync completes <5s (with retry logic and timeouts)
- [ ] App loads <1s on repeat visits

### Code Quality (Phase 7 Partial)
- [x] Environment-aware logging (no console.log in production)
- [x] TypeScript strict mode, no `any` types where possible
- [x] Request timeouts on all API calls
- [x] Exponential backoff retry for transient errors
- [x] Race condition prevention with transactions
- [x] Memory leak prevention (timeout cleanup)
- [x] Hydration-safe state management

---

## Notes & Discoveries

Use this section to log important findings, gotchas, or lessons learned during development.

### Note 1: [Title]
- **Date:** YYYY-MM-DD
- **Issue:** What did we discover?
- **Solution:** How did we solve it?
- **Reference:** Link to commit or relevant documentation

---

## Future Enhancements (Post-MVP)

Features to consider after MVP is complete:

- [ ] Search functionality (full-text search across articles)
- [ ] Feed folders/organization
- [ ] Feed tags
- [ ] Article filters (by date, by source, etc.)
- [ ] Manual theme toggle (currently system-preference only)
- [ ] Custom feed refresh intervals
- [ ] Article retention policies (auto-delete old articles)
- [ ] Feed statistics (articles per day, etc.)
- [ ] Share article (native share API)
- [ ] Reader mode toggle (serif vs sans-serif fonts)
- [ ] Font size adjustment
- [ ] Background sync (Periodic Background Sync API)
- [ ] Web Share Target API (add feeds from other apps)
- [ ] Badging API (unread count on app icon)
- [ ] Display last sync time in UI

---

## Session Log

Track progress across coding sessions.

### Session 1 - YYYY-MM-DD
- **Phase:** Phase 0
- **Work completed:**
  -
- **Blockers:**
  -
- **Next session:**
  -

---

**End of Project Plan**
