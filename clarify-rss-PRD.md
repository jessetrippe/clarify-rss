# Product Requirements Document (PRD)

## Product Name

**Clarify RSS**
**Short name:** Clarify
**Tagline:** A personal, plaintext RSS reader

## Platforms

- **Progressive Web App (PWA)**
  - iOS (Add to Home Screen)
  - Desktop browsers (responsive layout)

## User

- **Single user only**
- Authenticated access via **Cloudflare Access**
- No multi-user or public accounts

---

## 1. Problem Statement

Many RSS readers (including high-quality native apps) display full feed-provided article text but do not reliably allow users to copy or export that text—especially on mobile. Long-form RSS articles are often difficult or impossible to “Select All,” creating friction for workflows that involve summarization, annotation, or reuse (e.g., pasting into ChatGPT).

Clarify RSS is designed to solve this problem by providing:

- Guaranteed access to full article content
- A deterministic **Copy Content** action
- A local-first, synced experience across iPhone and desktop
- A minimal, durable feature set comparable to the _core_ functionality of Reeder Classic

---

## 2. Goals

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

---

## 3. Non-Goals (MVP)

The following features are explicitly out of scope for the initial release:

- Multi-user support or account management
- Full article extraction from source websites (accept feed-provided content only)
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

---

## 4. Feature Scope (MVP)

### 4.1 Feed Management

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

---

### 4.2 Feed Refresh Behavior

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
  - Cloudflare Workers handle conditional GET requests
- Error handling:
  - Feed fetch failures show error message with last successful fetch time
  - Retry on next manual refresh
  - Invalid feeds show "Unable to parse" error

---

### 4.3 Article Storage & Identity

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

---

### 4.4 Read / Unread State

- Articles default to **Unread**
- Opening an article marks it **Read**
- User can manually toggle Read / Unread
- Read state persists locally and syncs

---

### 4.5 Starred Articles

- User can Star / Unstar an article
- Starred state persists locally and syncs
- A **Starred** view shows only starred items, sorted by date

---

### 4.6 Article Display

- Article detail view displays:
  - Title
  - Feed name
  - Publication date (if available)
  - Article body when provided by the feed
- If no article body exists, show a fallback (summary or title + link)

---

### 4.7 Copy Content (Critical Feature)

- Article detail view includes a **Copy Content** button
- Copy action places the following on the clipboard:
  - Article Title
  - Source URL
  - Plain-text article body
- HTML is converted to plain text deterministically
- Copy works reliably for very long articles
- Copy is always initiated by a direct user gesture (button tap)

---

## 5. Sync Requirements (MVP)

### Sync Model

- Local-first
- Backend stores canonical state
- Client syncs on:
  - App open
  - App focus

### Data to Sync

- Feeds
- Items
- Read/unread state
- Starred state
- Deletions (via tombstones)

### Conflict Resolution

- **Last write wins**, based on `updatedAt` timestamps
- Example: If starred state changes on two devices while offline, the most recent change (by timestamp) takes precedence when both sync
- Tombstone cleanup: Never purge deleted items (kept indefinitely for sync integrity)
- Sync batch size: 100 items per sync request
- No limit on number of synced devices (designed for personal use across 2+ devices)

---

## 6. User Interface Requirements

### Primary Views

1. **All Items**

   - Reverse chronological order
   - Unread indicator
   - Feed name visible

2. **Starred**

   - Only starred items
   - Reverse chronological order

3. **Feeds**
   - Feed list
   - Feed-specific item lists

### Article Detail View

- Header: title, feed name, publication date
- Body: rendered article content
- Actions:
  - Star / Unstar
  - Mark Read / Unread
  - **Copy Content**

---

## 7. Technical Architecture & Stack

### Frontend

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Storage:** IndexedDB (via Dexie.js)
- **Offline support:** Service Worker (app shell + cached data)
- **Clipboard:** Web Clipboard API (user-initiated)

### Backend (Sync)

- **API:** Lightweight REST/JSON
- **Runtime:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Authentication:** **Cloudflare Access**
  - Identity enforced at the edge
  - Only authenticated requests may reach API routes
  - No application-level auth logic required
- **Sync strategy:** Cursor-based pull + push

### Feed Parsing

- **Library:** rss-parser (npm)
- **Location:** Backend (Cloudflare Workers)
- **Formats:** RSS 2.0, Atom 1.0, RSS 1.0
- **Auto-discovery:** Parse HTML for `<link rel="alternate">` tags

### Hosting

- **Frontend:** Cloudflare Pages (static hosting)
- **Backend:** Cloudflare Workers + D1
- **Auth layer:** Cloudflare Access (Zero Trust)
- **Cost target:** $0–minimal ongoing cost

---

## 8. Security & Privacy

- HTTPS only
- All application routes and APIs protected by Cloudflare Access
- No passwords or auth credentials stored in the app or database
- No third-party tracking
- No analytics required for MVP
- All content belongs to the user
- No AI processing or external content analysis

### HTML Content Security

- Article HTML sanitized with **DOMPurify** before rendering
- Strip dangerous tags: `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`
- Allow safe formatting: `<p>`, `<a>`, `<img>`, `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<blockquote>`, `<code>`, `<pre>`, `<h1>`-`<h6>`
- Strict Content Security Policy (CSP) for article rendering
- External links open in new tab with `rel="noopener noreferrer"`

---

## 9. Success Criteria

Clarify RSS is successful if:

- It matches the **core feature set of Reeder Classic**
- Long RSS articles can always be copied in full with one tap
- Read/unread and starred state syncs reliably across devices
- The app is usable offline after initial sync
- Operational cost remains near zero
- Performance meets targets with hundreds to thousands of articles

### Performance Targets

- Feed list renders instantly (<100ms) for up to 1000 feeds
- Article detail opens instantly (<200ms)
- Sync completes in <5s for typical usage (50 feeds, 1000 articles)
- Initial app load <1s on repeat visits (cached)
- Feed refresh completes in <3s for 50 feeds
