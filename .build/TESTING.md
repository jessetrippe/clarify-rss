# Clarify RSS - Testing Guide

**Version:** 2.1 (Phases 0-6 Complete)  
**Last Updated:** 2026-01-13

This comprehensive guide covers testing for all implemented features. Choose your testing approach:

- **Quick Start** - Get up and running in 5 minutes
- **Full Test Suite** - Comprehensive testing of all features
- **Troubleshooting** - Common issues and solutions

---

## 🚀 Quick Start (5 Minutes)

### 1. Start the Servers

**Terminal 1 - Worker (Backend):**
```bash
cd /Users/jessetrippe/Sites/clarify-rss/workers
npx wrangler dev --local
```
Wait for: `Ready on http://localhost:8787`

**Terminal 2 - Frontend:**
```bash
cd /Users/jessetrippe/Sites/clarify-rss
npm run dev
```
Wait for: `Ready on http://localhost:3000`

### 2. Basic Smoke Test

1. Open http://localhost:3000
2. Go to "Settings" page
3. Add a real RSS feed: `https://feeds.arstechnica.com/arstechnica/index`
4. Wait for feed to parse (5-10 seconds)
5. Click on the feed to see articles
6. Click on an article
7. Click "Copy Content" button
8. Paste into a text editor

**Success:** You should see the article title, URL, and full plaintext content.

### 3. Test Offline (Optional)

1. Open Chrome DevTools (F12)
2. Network tab → Change to "Offline"
3. Yellow banner appears at top
4. Navigate around - cached data still works
5. Change back to "No throttling"
6. Banner disappears, sync resumes

**Success:** App works offline with cached data.

---

## 📋 Full Test Suite

Choose which areas to test:

- [Phase 1: Database & Local Storage](#phase-1-database--local-storage)
- [Phase 2: Feed Management](#phase-2-feed-management)
- [Phase 3: Article Reading & Copy Content](#phase-3-article-reading--copy-content)
- [Phase 4: Backend Sync](#phase-4-backend-sync)
- [Phase 5: Real RSS Parsing](#phase-5-real-rss-parsing)
- [Phase 6: PWA & Offline](#phase-6-pwa--offline)

---

## Phase 1: Database & Local Storage

**Goal:** Verify IndexedDB persistence

### Test Database Page

1. Navigate to http://localhost:3000/test-db
2. Click "Add Feed" - Stats should update
3. Click "Add Article" 3 times
4. Click "Read" on first article - Stats update
5. Click "Star" on second article - Stats update
6. Refresh page - All data persists

**Success Criteria:**
- ✅ Stats update in real-time
- ✅ Data persists across refresh
- ✅ Can add/remove feeds and articles
- ✅ Read/starred states toggle correctly

### Check IndexedDB

1. Open DevTools → Application tab
2. IndexedDB → ClarifyRSS
3. Inspect feeds, articles, syncState tables

**Success:** Data visible in IndexedDB browser tools.

---

## Phase 2: Feed Management

**Goal:** Verify feed CRUD operations

### Add Feed (Real Data)

1. Go to "Settings" page
2. Enter URL: `https://example.com/feed`
3. Click "Add Feed"

**Success:** Feed appears with real title.

### View Feed

1. Click on the feed
2. Should see real articles

**Success:** Feed detail page shows articles list.

### Delete Feed

1. On Settings page, click "Delete" for the feed
2. Feed disappears from the list
3. Feed no longer in list

**Success:** Feed removed from database.

### OPML Import

1. Create test OPML file with 2-3 feed URLs
2. Go to "Settings" page
3. Click "Import OPML"
4. Select file
5. Progress shows for each feed

**Success:** All feeds imported successfully.

### OPML Export

1. Add a few feeds
2. Click "Export OPML"
3. File downloads: `clarify-rss-feeds-YYYY-MM-DD.opml`

**Success:** OPML file contains all feeds.

---

## Phase 3: Article Reading & Copy Content

**Goal:** Verify article display and THE CORE FEATURE (Copy Content)

### View All Articles

1. Go to home page (All Items)
2. Should see articles from all feeds
3. Unread articles have blue dot and blue title

**Success:** Articles display with correct read/unread states.

### Mark as Read

1. Click on an article
2. Article detail page opens
3. Blue dot disappears (auto-marked as read)
4. Return to All Items - article title no longer blue

**Success:** Read state updates automatically.

### Star Article

1. On article detail page, click star icon
2. Star turns yellow/filled
3. Go to "Starred" page
4. Article appears in starred list

**Success:** Star state persists across pages.

### Copy Content (CORE FEATURE)

1. Open any article with substantial content
2. Click "Copy Content" button
3. Button shows "✓ Copied to clipboard!"
4. Paste into text editor

**Expected Format:**
```
[Article Title]

Source: [Article URL]

[Full article content as plain text, no HTML]
```

**Success Criteria:**
- ✅ Title copied correctly
- ✅ URL included
- ✅ HTML converted to plain text
- ✅ No HTML tags in output
- ✅ Line breaks preserved
- ✅ Links converted to plain URLs

### HTML Sanitization

1. Inspect article content HTML (DevTools)
2. Verify no `<script>` tags
3. Verify no dangerous attributes (onclick, etc.)

**Success:** Only safe HTML tags present.

---

## Phase 4: Backend Sync

**Goal:** Verify sync between frontend (IndexedDB) and backend (D1)

**Prerequisites:** Both servers running (Worker + Next.js)

### Initial Sync

1. Open browser console (F12)
2. Refresh page
3. Look for sync logs

**Expected:** Sync completes without errors.

### Manual Sync Test

1. Open console
2. Run:
   ```javascript
   const { syncService } = await import('/lib/sync-service.ts');
   await syncService.sync();
   ```

**Success:** Sync completes, data exchanged.

### Multi-Device Sync

1. Add a feed in Browser Tab 1
2. Star an article
3. Open new tab (Tab 2) to http://localhost:3000
4. Check if feed and star appear

**Note:** This tests local sync. For real multi-device sync, would need production deployment.

**Success:** Data syncs between tabs.

---

## Phase 5: Real RSS Parsing

**Goal:** Verify real RSS/Atom parsing (no more mocks!)

**Prerequisites:** Worker must be running on port 8787

### Test Worker Health

```bash
curl http://localhost:8787/api/health
```

**Expected:** `{"status":"ok","timestamp":...}`

### Add Real RSS Feed

1. Go to "Settings" page
2. Enter: `https://feeds.arstechnica.com/arstechnica/index`
3. Click "Add Feed"
4. Loading spinner appears
5. Wait 5-10 seconds

**Success Criteria:**
- ✅ Feed appears with **real title** (e.g., "Ars Technica")
- ✅ Shows real article count (not "10 items")
- ✅ No "example.com" or mock text

### View Real Articles

1. Click on the feed
2. Articles have real titles and dates
3. Click on an article
4. Full HTML content displays
5. Images appear (if present in feed)

**Success Criteria:**
- ✅ Real article titles (not "Article 1: Sample Title")
- ✅ Real publication dates
- ✅ Real content (not "This is sample content...")
- ✅ Images load
- ✅ Links work

### Test More Feeds

Try these:
- **TechCrunch:** `https://techcrunch.com/feed/`
- **Hacker News:** `https://news.ycombinator.com/rss`
- **The Verge:** `https://www.theverge.com/rss/index.xml`

**Success:** All feeds parse correctly with real content.

### Test Feed Discovery

1. Enter website URL (not feed URL): `https://techcrunch.com`
2. Click "Add Feed"
3. Error message: "Could not parse feed"
4. Shows discovered feed URLs
5. Click a discovered URL

**Success:** Discovers feeds, allows selection.

### Test Rate Limiting

1. Add a feed
2. Try to refresh it immediately (would need refresh button)
3. Should be blocked (5-minute minimum)

**Success:** Can't refresh feed within 5 minutes.

### Test Copy Content with Real Feed

1. Open article from real feed
2. Click "Copy Content"
3. Paste into text editor
4. Verify real content (not mock data)

**Success:** Real article content copied correctly.

---

## Phase 6: PWA & Offline

**Goal:** Verify PWA installation and offline functionality

### Test PWA Installation (Desktop)

**Chrome/Edge:**

1. Open http://localhost:3000
2. Look for blue install prompt (bottom-right)
   OR look for install icon in address bar (⊕)
3. Click "Install"
4. App opens in standalone window
5. No browser UI (address bar, tabs)
6. App icon in dock/taskbar

**Success Criteria:**
- ✅ Install prompt appears
- ✅ Can install via browser or prompt
- ✅ Opens in standalone window
- ✅ No browser chrome visible
- ✅ App in dock/taskbar

### Test PWA Installation (iOS)

**Safari:**

1. Open http://localhost:3000
2. Tap Share button (📤)
3. Scroll to "Add to Home Screen"
4. Tap "Add"
5. Icon appears on home screen
6. Tap icon to launch
7. Opens fullscreen (no Safari UI)
8. Blue status bar (matches theme)

**Note:** iOS doesn't support install prompt API. Manual only.

**Success:** App feels native on iOS.

### Test PWA Installation (Android)

**Chrome:**

1. Open http://localhost:3000
2. Bottom sheet appears: "Install app?"
   OR tap menu → "Install app"
3. Tap Install
4. App opens fullscreen
5. Splash screen shows
6. Icon in app drawer

**Success:** Installs and launches like native app.

### Test Offline Mode

**Enable Offline:**

1. Open DevTools (F12) → Network tab
2. Change "No throttling" to "Offline"
3. Yellow banner appears: "You are offline. Showing cached data."

**Test Offline Functionality:**

1. Navigate to different pages
2. View cached feeds and articles
3. Star/unstar articles (works locally)
4. Mark articles as read
5. Try to add new feed (should fail gracefully)

**Console should show:**
- "Skipping sync: offline"
- No sync errors

**Success Criteria:**
- ✅ Yellow offline banner visible
- ✅ Can navigate all pages
- ✅ Cached data loads
- ✅ Can toggle read/star (saves locally)
- ✅ No error dialogs
- ✅ Sync disabled (not attempted)

### Test Loading States

These components are available for use but need to be wired into pages:
- `SkeletonArticleList`
- `SkeletonFeedList`
- `SkeletonArticleDetail`
- `LoadingSpinner`

**Manual check (if integrated):**
1. Trigger a slow load (throttle network or add artificial delay)
2. Verify skeletons/spinner appear during load
3. Verify skeletons are replaced by real content

**Success Criteria:**
- ✅ Loading UI appears for slow queries
- ✅ No layout jumps when content renders

### Test Reconnection

1. While offline, star an article
2. Go back online (Network → No throttling)
3. Yellow banner disappears
4. Console shows: "Back online, syncing..."
5. Open new tab - starred article appears

**Success:** Auto-sync on reconnection.

### Test Service Worker Caching

1. DevTools → Application tab
2. Service Workers section
3. Status: "activated and running"
4. Cache Storage section
5. Multiple caches visible:
   - `next-data`
   - `static-js-assets`
   - `static-image-assets`
   - `api-cache`

**Success:** Service Worker registered and caching.

### Test Error Boundary

1. Open DevTools → Console
2. Run: `throw new Error("Test error");`
3. Error UI displays (not white screen)
4. Red warning icon
5. Clear error message
6. "Reload Page" and "Try Again" buttons work

**Success:** Errors caught gracefully.

### Test Manifest

1. DevTools → Application → Manifest
2. Verify:
   - Name: "Clarify RSS"
   - Short name: "Clarify"
   - Theme: #3b82f6
   - Display: standalone
   - Icons: 192x192, 512x512
   - Shortcuts: All Items, Starred, Settings

**Success:** Manifest configured correctly.

---

## 🐛 Troubleshooting

### Worker won't start

**Error: "Could not resolve 'http'"**

Already fixed! Verify `workers/wrangler.toml` has:
```toml
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
```

**Error: "npm ERR! missing script: dev"**

Wrong directory. Run:
```bash
cd /Users/jessetrippe/Sites/clarify-rss/workers
npx wrangler dev --local
```

### Frontend won't start

**Error: "Module not found"**

```bash
cd /Users/jessetrippe/Sites/clarify-rss
npm install
npm run dev
```

### Feed parsing fails

**"Failed to parse feed"**

- Check Worker is running: `curl http://localhost:8787/api/health`
- Try a different feed URL
- Check browser console for network errors
- Verify CORS headers (should be set)

**"Sync failed"**

- Normal if Worker isn't running
- Start Worker first, then refresh frontend

### Offline mode not working

**Banner doesn't appear**

- Service Worker might not be registered
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Check DevTools → Application → Service Workers

**Cached data not loading**

- Visit pages while online first (to cache them)
- Clear cache: DevTools → Application → Clear storage
- Refresh to recache

### Service Worker issues

**Not registering**

- Only works on localhost or HTTPS
- Check console for errors
- Clear site data: DevTools → Application → Clear storage

**Old SW cached**

- DevTools → Application → Service Workers
- Click "Unregister"
- Hard refresh

### Install prompt not appearing

**Desktop:**

- Already installed? Check chrome://apps/
- Use Incognito window
- Manifest errors? Check DevTools → Application → Manifest

**iOS:**

- iOS doesn't support install prompt API
- Must use Share → Add to Home Screen manually

### Copy Content not working

**"Failed to copy"**

- Must be on localhost or HTTPS
- Browser doesn't support Clipboard API (unlikely)
- Try in Chrome/Edge

**HTML still in output**

- Check `lib/sanitize.ts` is being used
- Check `lib/copy-content.ts` htmlToPlainText function

### Sync issues

**Changes not syncing**

- Check both servers running
- Check browser console for errors
- Check Worker console (Terminal 1)
- Verify CORS headers

**Sync taking too long**

- Normal for large feeds
- 10-second timeout for parsing
- Check network throttling (DevTools)

---

## ✅ Complete Test Checklist

### Phase 1: Database ✓
- [ ] Database test page works
- [ ] Can add/delete feeds
- [ ] Can add/delete articles
- [ ] Read/starred states toggle
- [ ] Data persists across refresh
- [ ] Visible in IndexedDB DevTools

### Phase 2: Feed Management ✓
- [ ] Can add feed (real parse)
- [ ] Can view feed detail
- [ ] Can delete feed
- [ ] OPML import works
- [ ] OPML export works
- [ ] Feed list updates correctly

### Phase 3: Article Reading ✓
- [ ] All Items page shows articles
- [ ] Starred page shows starred articles
- [ ] Auto-mark as read on open
- [ ] Can toggle star
- [ ] **Copy Content works (CORE FEATURE)**
- [ ] HTML sanitized correctly
- [ ] No dangerous tags in content

### Phase 4: Backend Sync ✓
- [ ] Worker health endpoint responds
- [ ] Initial sync completes
- [ ] Manual sync works
- [ ] Data syncs between tabs
- [ ] Conflicts resolved (last-write-wins)

### Phase 5: Real RSS Parsing ✓
- [ ] Can add real RSS feed
- [ ] Feed shows real title
- [ ] Articles have real content
- [ ] Real publication dates
- [ ] Images load
- [ ] Feed discovery works
- [ ] Rate limiting enforced
- [ ] Copy Content works with real feeds

### Phase 6: PWA & Offline ✓
- [ ] Install prompt appears (desktop/Android)
- [ ] Can install on desktop
- [ ] Can add to home screen (iOS)
- [ ] App opens standalone
- [ ] Offline banner appears when offline
- [ ] Can navigate offline
- [ ] Cached data loads
- [ ] Sync pauses when offline
- [ ] Auto-sync on reconnection
- [ ] Service Worker registered
- [ ] Assets cached correctly
- [ ] Error boundary catches errors
- [ ] Manifest configured correctly

---

## 📱 Device Testing

**Recommended Test Devices:**

- **Desktop:** Chrome or Edge (best PWA support)
- **iPhone:** Safari (iOS 12+)
- **Android:** Chrome (Android 5+)

**What to Test:**

1. Installation process on each platform
2. Offline functionality
3. Performance
4. Touch interactions (mobile)
5. Responsive design
6. Copy Content on mobile
7. Sync across devices (requires production deployment)

---

## 🎉 What's Implemented

### ✅ Complete Features (Phases 0-6):

- Local-first architecture (IndexedDB)
- Real RSS/Atom parsing
- Feed management (add, delete, OPML import/export)
- Article reading with read/starred states
- **Copy Content feature (THE CORE FEATURE)**
- Backend sync (Cloudflare Workers + D1)
- Conflict resolution (last-write-wins)
- Rate limiting (5-minute minimum)
- Feed auto-discovery
- Progressive Web App
- Offline support
- Install prompts
- Service Worker caching
- Error boundaries
- Loading states (skeleton screens)

### 🚧 Not Yet Implemented (Phase 7):

- Content Security Policy headers
- Production deployment
- Cloudflare Access authentication
- UI polish and animations
- Performance optimization
- Final security audit

---

## 📝 Notes

### PWA Limitations:

- **iOS:** No install prompt API, limited Service Worker
- **General:** Requires localhost or HTTPS
- **Offline:** Syncs when back online (eventual consistency)

### Browser Support:

- **Chrome/Edge:** ✅ Full support
- **Safari:** ✅ Good support (limited PWA)
- **Firefox:** ✅ Good support
- **Mobile browsers:** ✅ Varies by platform

### Production Considerations:

When deploying to production (Phase 7):
- Update manifest URLs
- Configure proper HTTPS
- Test on real devices
- Test real multi-device sync
- Monitor performance
- Set up error logging

---

## 🆘 Getting Help

If tests fail:

1. Check troubleshooting section above
2. Check browser console for errors
3. Check Worker terminal for errors
4. Verify both servers are running
5. Try hard refresh (Ctrl+Shift+R)
6. Clear site data and start fresh

---

**Testing Complete? Ready for Phase 7!**

Phase 7 will add security hardening, UI polish, and production deployment.
