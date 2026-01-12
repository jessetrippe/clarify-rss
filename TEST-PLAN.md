# Clarify RSS - Test Plan (Phases 0-4)

**Version:** 1.0
**Date:** 2026-01-12
**Status:** Ready for testing

This test plan covers all features implemented in Phases 0-4. Follow the steps in order for the best testing experience.

---

## Prerequisites

### Setup
```bash
cd /Users/jessetrippe/Sites/clarify-rss
npm run dev
```

The app will be available at: **http://localhost:3000**

### Browser Requirements
- Modern browser (Chrome, Safari, Edge, Firefox)
- HTTPS or localhost (required for Clipboard API)
- IndexedDB support (all modern browsers)

### What to Have Ready
- A text editor (to paste copied content)
- Browser DevTools (optional, for inspecting IndexedDB)

---

## Phase 1: Database Operations

### Test 1.1: Database Test Page

**Goal:** Verify IndexedDB is working correctly

**Steps:**
1. Navigate to http://localhost:3000/test-db
2. Observe the stats panel (should show all zeros)

**Expected:**
- Page loads without errors
- Stats display: 0 Feeds, 0 Articles, 0 Unread, 0 Starred

**Result:** ☐ Pass ☐ Fail

---

### Test 1.2: Add Test Feed

**Goal:** Verify feeds can be added to database

**Steps:**
1. In the "Add Test Feed" form:
   - Feed URL: `https://example.com/feed`
   - Feed Title: `Test Feed 1`
2. Click "Add Feed"

**Expected:**
- Success message appears
- Stats update: 1 Feed, 0 Articles
- Feed appears in "Feeds" list below
- Feed shows ID and timestamp

**Result:** ☐ Pass ☐ Fail

---

### Test 1.3: Add Test Articles

**Goal:** Verify articles can be added to feeds

**Steps:**
1. Click "Add Article" button next to the feed
2. Repeat 2 more times (total 3 articles)

**Expected:**
- Success message for each article
- Stats update: 1 Feed, 3 Articles, 3 Unread, 0 Starred
- Articles appear in "Articles" list
- Each article shows title, summary, date, UNREAD badge

**Result:** ☐ Pass ☐ Fail

---

### Test 1.4: Toggle Read/Unread

**Goal:** Verify read state can be toggled

**Steps:**
1. Click "Read" button on first article

**Expected:**
- UNREAD badge disappears
- Button changes to "Unread"
- Stats update: 2 Unread

**Steps:**
2. Click "Unread" to toggle back

**Expected:**
- UNREAD badge reappears
- Stats update: 3 Unread

**Result:** ☐ Pass ☐ Fail

---

### Test 1.5: Toggle Star/Unstar

**Goal:** Verify starred state can be toggled

**Steps:**
1. Click "Star" button on first article
2. Click "Star" on second article

**Expected:**
- Yellow star (★) appears next to title
- Button changes to "Unstar"
- Stats update: 2 Starred

**Result:** ☐ Pass ☐ Fail

---

### Test 1.6: Data Persistence

**Goal:** Verify data persists across page refresh

**Steps:**
1. Note current stats (should be: 1 Feed, 3 Articles, 3 Unread, 2 Starred)
2. **Refresh the page** (Cmd+R or F5)
3. Wait for page to reload

**Expected:**
- Stats remain the same: 1 Feed, 3 Articles, 3 Unread, 2 Starred
- All feeds and articles still visible
- Read/starred states preserved

**Result:** ☐ Pass ☐ Fail

---

### Test 1.7: Inspect IndexedDB (Optional)

**Goal:** Verify database structure in DevTools

**Steps:**
1. Open DevTools (F12 or Cmd+Option+I)
2. Go to Application tab (Chrome/Edge) or Storage tab (Firefox)
3. Expand IndexedDB → ClarifyRSS
4. Click on "feeds" table
5. Click on "articles" table

**Expected:**
- "feeds" table shows 1 feed with all properties
- "articles" table shows 3 articles with all properties
- Data matches what's displayed on page

**Result:** ☐ Pass ☐ Fail

---

## Phase 2: Feed Management

### Test 2.1: Navigate to Feeds Page

**Goal:** Access the main feeds page

**Steps:**
1. Click "Feeds" in the navigation
2. OR navigate to http://localhost:3000/feeds

**Expected:**
- Page loads showing "Feeds" heading
- "Add Feed" form visible at top
- "Import OPML" section visible
- Feed list shows "Test Feed 1" with "3 articles"
- "Export OPML" button visible in header

**Result:** ☐ Pass ☐ Fail

---

### Test 2.2: Add Feed with Mock Parser

**Goal:** Verify feed can be added via URL

**Steps:**
1. In "Add Feed" form, enter URL: `https://techcrunch.com/feed`
2. Click "Add Feed"
3. Wait for loading to complete (~500ms)

**Expected:**
- Loading state: "Adding Feed..."
- Success: Form clears
- New feed appears: "techcrunch.com Feed"
- Feed shows "5 articles" (mock generates 5)
- Total feeds: 2

**Result:** ☐ Pass ☐ Fail

---

### Test 2.3: Add Another Feed

**Goal:** Verify multiple feeds can be added

**Steps:**
1. Add URL: `https://blog.cloudflare.com/rss`
2. Click "Add Feed"

**Expected:**
- New feed appears: "blog.cloudflare.com Feed"
- Feed shows "5 articles"
- Total feeds: 3
- Feeds sorted alphabetically by title

**Result:** ☐ Pass ☐ Fail

---

### Test 2.4: Duplicate Feed Prevention

**Goal:** Verify duplicate URLs are rejected

**Steps:**
1. Try to add the same URL again: `https://techcrunch.com/feed`
2. Click "Add Feed"

**Expected:**
- Error message: "This feed already exists"
- No new feed created
- Total feeds remains: 3

**Result:** ☐ Pass ☐ Fail

---

### Test 2.5: View Feed Detail

**Goal:** Navigate to feed detail page

**Steps:**
1. Click on "techcrunch.com Feed" title
2. OR navigate to the feed's detail page

**Expected:**
- Feed detail page loads
- Shows feed title, URL, article count
- Shows "Articles (5)" heading
- Lists all 5 articles from that feed
- "Delete Feed" button visible

**Result:** ☐ Pass ☐ Fail

---

### Test 2.6: Navigate Back to Feeds

**Goal:** Test navigation

**Steps:**
1. Click "← Back to Feeds" link

**Expected:**
- Returns to feeds list page
- All 3 feeds still visible

**Result:** ☐ Pass ☐ Fail

---

### Test 2.7: Export OPML

**Goal:** Verify OPML export functionality

**Steps:**
1. Click "Export OPML" button in header
2. Check your Downloads folder

**Expected:**
- File downloads: `clarify-rss-feeds-YYYY-MM-DD.opml`
- Open file in text editor
- File contains XML with all 3 feed URLs
- Format is valid OPML 2.0

**Example content:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Clarify RSS Feeds</title>
    ...
  </head>
  <body>
    <outline type="rss" text="Test Feed 1" ... xmlUrl="https://example.com/feed" />
    <outline type="rss" text="techcrunch.com Feed" ... xmlUrl="https://techcrunch.com/feed" />
    ...
  </body>
</opml>
```

**Result:** ☐ Pass ☐ Fail

---

### Test 2.8: Import OPML

**Goal:** Verify OPML import functionality

**Steps:**
1. Use the OPML file you just exported
2. Click "Choose File" under "Import OPML"
3. Select the exported OPML file
4. Wait for import to complete

**Expected:**
- Progress bar appears
- Status message: "Import complete! 0 feeds imported, 3 skipped (already exist), 0 failed."
- No duplicate feeds created
- Total feeds remains: 3

**Result:** ☐ Pass ☐ Fail

---

### Test 2.9: Import New Feeds via OPML

**Goal:** Import feeds that don't exist yet

**Steps:**
1. Create a test OPML file (`test-import.opml`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline type="rss" text="New Feed 1" xmlUrl="https://newsite1.com/feed"/>
    <outline type="rss" text="New Feed 2" xmlUrl="https://newsite2.com/feed"/>
  </body>
</opml>
```
2. Import this file via OPML import

**Expected:**
- Status: "Import complete! 2 feeds imported, 0 skipped, 0 failed."
- Two new feeds appear in list
- Each has 5 mock articles
- Total feeds: 5

**Result:** ☐ Pass ☐ Fail

---

### Test 2.10: Delete Feed

**Goal:** Verify feed deletion (soft delete)

**Steps:**
1. Find "Test Feed 1" (the first feed we created)
2. Click "Delete" button
3. Confirm deletion in dialog

**Expected:**
- Confirmation dialog appears
- After confirming, feed disappears from list
- Total feeds: 4
- Page updates immediately

**Result:** ☐ Pass ☐ Fail

---

### Test 2.11: Verify Deleted Feed Articles

**Goal:** Confirm articles are deleted with feed

**Steps:**
1. Navigate to "All Items" (home page)
2. Check article count

**Expected:**
- Articles from deleted "Test Feed 1" no longer appear
- Only articles from remaining 4 feeds visible
- Unread count updated accordingly

**Result:** ☐ Pass ☐ Fail

---

## Phase 3: Article Reading & Display

### Test 3.1: View All Items

**Goal:** Verify All Items page displays all articles

**Steps:**
1. Navigate to "All Items" (home page)
2. OR navigate to http://localhost:3000/

**Expected:**
- Page shows "All Items" heading
- Shows unread count: "X unread of Y" in header
- Articles from all feeds displayed
- Most recent articles first (reverse chronological)
- Each article shows:
  - Title (blue if unread)
  - Blue dot if unread
  - Feed name
  - Publication date
  - Summary (truncated)
  - Yellow star if starred

**Result:** ☐ Pass ☐ Fail

---

### Test 3.2: Open Article Detail

**Goal:** View full article content

**Steps:**
1. Click on any article from the list
2. Article detail page opens

**Expected:**
- Full article title at top
- Feed name (clickable link)
- Publication date
- "View original →" link
- Three action buttons:
  - "Copy Content" (blue, primary)
  - "☆ Star" (gray)
  - "Mark Unread" (gray)
- Full article content displays below
- HTML content rendered with formatting
- Images visible (if present in mock content)

**Result:** ☐ Pass ☐ Fail

---

### Test 3.3: Auto-Mark as Read

**Goal:** Verify articles auto-mark as read when opened

**Steps:**
1. Note the unread count before opening article
2. Open an unread article (blue title with blue dot)
3. Return to "All Items"

**Expected:**
- Article no longer has blue title or blue dot
- Unread count decreased by 1
- "Mark Read" button is now "Mark Unread"

**Result:** ☐ Pass ☐ Fail

---

### Test 3.4: Copy Content Feature ⭐ CORE FEATURE

**Goal:** Test the primary feature - copy article content

**Steps:**
1. Open any article detail page
2. Click "Copy Content" button
3. Open a text editor (TextEdit, Notepad, etc.)
4. Paste (Cmd+V or Ctrl+V)

**Expected:**
- Green success message: "✓ Copied to clipboard!"
- Pasted content format:
  ```
  [Article Title]

  Source: [Article URL]

  [Plain text article content without HTML tags]
  ```
- Content is plain text (no HTML tags)
- Content is complete (not truncated)
- Line breaks preserved

**Result:** ☐ Pass ☐ Fail

---

### Test 3.5: Copy Long Article

**Goal:** Verify copy works for very long content

**Steps:**
1. Find an article with substantial content
2. Click "Copy Content"
3. Paste into text editor
4. Scroll through entire pasted content

**Expected:**
- Success message appears
- Entire article content copied
- No truncation
- No errors or warnings

**Result:** ☐ Pass ☐ Fail

---

### Test 3.6: Star Article

**Goal:** Add article to starred collection

**Steps:**
1. On article detail page, click "☆ Star" button

**Expected:**
- Button changes to "★ Starred" with yellow background
- Success feedback (immediate visual change)

**Result:** ☐ Pass ☐ Fail

---

### Test 3.7: View Starred Articles

**Goal:** Verify starred view filters correctly

**Steps:**
1. Navigate to "Starred" page
2. OR click "Starred" in navigation

**Expected:**
- Page shows "Starred" heading
- Shows count: "X starred articles" in header
- Only starred articles display
- Article you just starred appears in list
- Yellow star indicator visible on each article
- Articles sorted by date (newest first)

**Result:** ☐ Pass ☐ Fail

---

### Test 3.8: Unstar Article

**Goal:** Remove article from starred collection

**Steps:**
1. Open a starred article
2. Click "★ Starred" button

**Expected:**
- Button changes back to "☆ Star" with gray background
- Return to "Starred" page
- Article no longer appears in starred list
- Starred count decreased by 1

**Result:** ☐ Pass ☐ Fail

---

### Test 3.9: Toggle Read/Unread

**Goal:** Manually control read state

**Steps:**
1. Open an article that's marked as read
2. Click "Mark Unread" button
3. Return to "All Items"

**Expected:**
- Article now has blue title and blue dot
- Unread count increased by 1

**Steps:**
4. Open the same article again
5. Click "Mark Read" button

**Expected:**
- Button changes back to "Mark Unread"
- Return to list - article no longer has unread indicators

**Result:** ☐ Pass ☐ Fail

---

### Test 3.10: HTML Sanitization

**Goal:** Verify unsafe HTML is stripped

**Steps:**
1. Open article detail page
2. Right-click on article content → Inspect Element
3. Check rendered HTML in DevTools

**Expected:**
- No `<script>` tags present
- No `<iframe>` tags present
- No `<object>` or `<embed>` tags
- Links have `target="_blank"` and `rel="noopener noreferrer"`
- Images have `loading="lazy"`
- Safe tags like `<p>`, `<strong>`, `<a>`, `<img>` are present

**Result:** ☐ Pass ☐ Fail

---

### Test 3.11: External Links

**Goal:** Verify links open safely in new tabs

**Steps:**
1. On article detail page, click "View original →" link
2. Or click any link within article content (if present)

**Expected:**
- Link opens in new browser tab/window
- Original Clarify RSS tab remains open
- Link doesn't navigate away from app

**Result:** ☐ Pass ☐ Fail

---

### Test 3.12: Empty States

**Goal:** Verify helpful messages when no content

**Steps:**
1. Navigate to "Starred" page with no starred articles

**Expected:**
- Shows message: "No starred articles"
- Shows hint: "Star articles to save them for later"

**Steps:**
2. Delete all feeds
3. Navigate to "All Items"

**Expected:**
- Shows message: "No articles yet"
- Shows "Go to Feeds" button
- Clicking button navigates to feeds page

**Result:** ☐ Pass ☐ Fail

---

## Phase 4: Backend API (Cloudflare)

### Test 4.1: Start Wrangler Dev Server

**Goal:** Run Worker API locally

**Steps:**
1. Open a new terminal window
2. Navigate to project directory
```bash
cd /Users/jessetrippe/Sites/clarify-rss
npx wrangler dev --local
```
3. Wait for server to start

**Expected:**
- Output shows: "Your Worker has access to the following bindings"
- Shows: "env.DB (clarify-rss-db) D1 Database local"
- Shows: "Ready on http://localhost:8787"
- No errors in output

**Result:** ☐ Pass ☐ Fail

---

### Test 4.2: Health Check Endpoint

**Goal:** Verify API is responding

**Steps:**
1. Open browser to http://localhost:8787/api/health
2. OR use curl:
```bash
curl http://localhost:8787/api/health
```

**Expected:**
- JSON response:
```json
{
  "status": "ok",
  "timestamp": 1234567890123
}
```
- HTTP status: 200 OK

**Result:** ☐ Pass ☐ Fail

---

### Test 4.3: Root Endpoint

**Goal:** Verify API info endpoint

**Steps:**
1. Open browser to http://localhost:8787/
2. OR use curl:
```bash
curl http://localhost:8787/
```

**Expected:**
- JSON response showing:
```json
{
  "name": "Clarify RSS Sync API",
  "version": "1.0.0",
  "endpoints": [
    "POST /api/sync/pull",
    "POST /api/sync/push",
    "GET /api/health"
  ]
}
```

**Result:** ☐ Pass ☐ Fail

---

### Test 4.4: Sync Pull Endpoint (Empty Database)

**Goal:** Test pulling from empty backend database

**Steps:**
1. Use curl to call sync pull:
```bash
curl -X POST http://localhost:8787/api/sync/pull \
  -H "Content-Type: application/json" \
  -d '{"cursor":"0","limit":100}'
```

**Expected:**
- JSON response:
```json
{
  "feeds": [],
  "articles": [],
  "cursor": "0",
  "hasMore": false
}
```
- Empty arrays (backend database is empty)
- HTTP status: 200 OK

**Result:** ☐ Pass ☐ Fail

---

### Test 4.5: Sync Push Endpoint (Add Test Data)

**Goal:** Push data to backend database

**Steps:**
1. Create test data file `test-sync-push.json`:
```json
{
  "feeds": [
    {
      "id": "test-feed-1",
      "url": "https://test.com/feed",
      "title": "Test Feed from API",
      "created_at": 1704067200000,
      "updated_at": 1704067200000,
      "is_deleted": 0
    }
  ],
  "articles": []
}
```
2. Push to API:
```bash
curl -X POST http://localhost:8787/api/sync/push \
  -H "Content-Type: application/json" \
  -d @test-sync-push.json
```

**Expected:**
- JSON response:
```json
{
  "success": true,
  "feedsProcessed": 1,
  "articlesProcessed": 0,
  "conflicts": 0
}
```
- HTTP status: 200 OK

**Result:** ☐ Pass ☐ Fail

---

### Test 4.6: Sync Pull Endpoint (With Data)

**Goal:** Pull data back from backend

**Steps:**
1. Pull from API:
```bash
curl -X POST http://localhost:8787/api/sync/pull \
  -H "Content-Type: application/json" \
  -d '{"cursor":"0","limit":100}'
```

**Expected:**
- JSON response includes the feed we just pushed:
```json
{
  "feeds": [
    {
      "id": "test-feed-1",
      "url": "https://test.com/feed",
      "title": "Test Feed from API",
      ...
    }
  ],
  "articles": [],
  "cursor": "1704067200000",
  "hasMore": false
}
```
- Feed data matches what we pushed

**Result:** ☐ Pass ☐ Fail

---

### Test 4.7: Conflict Resolution

**Goal:** Verify last-write-wins conflict resolution

**Steps:**
1. Push same feed with older timestamp:
```json
{
  "feeds": [
    {
      "id": "test-feed-1",
      "url": "https://test.com/feed",
      "title": "Updated Title (older)",
      "created_at": 1704067200000,
      "updated_at": 1704060000000,
      "is_deleted": 0
    }
  ],
  "articles": []
}
```
2. Push to API

**Expected:**
- Response shows conflict:
```json
{
  "success": true,
  "feedsProcessed": 0,
  "articlesProcessed": 0,
  "conflicts": 1
}
```
- Server version (newer) wins
- Title remains unchanged

**Steps:**
3. Pull data to verify:
```bash
curl -X POST http://localhost:8787/api/sync/pull \
  -H "Content-Type: application/json" \
  -d '{"cursor":"0"}'
```

**Expected:**
- Feed title is still "Test Feed from API" (not updated)

**Result:** ☐ Pass ☐ Fail

---

### Test 4.8: CORS Headers

**Goal:** Verify CORS is configured for browser access

**Steps:**
1. Check CORS headers:
```bash
curl -I http://localhost:8787/api/health
```

**Expected:**
- Response headers include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

**Result:** ☐ Pass ☐ Fail

---

### Test 4.9: Stop Wrangler Dev Server

**Goal:** Clean up test environment

**Steps:**
1. In the terminal running Wrangler, press Ctrl+C
2. Confirm server stopped

**Expected:**
- Server process terminates
- No more output
- http://localhost:8787 no longer responds

**Result:** ☐ Pass ☐ Fail

---

## Cross-Feature Integration Tests

### Test 5.1: End-to-End Workflow

**Goal:** Complete typical user workflow

**Steps:**
1. Start with clean state (or clear all data from test-db page)
2. Add 2 feeds via Feeds page
3. Navigate to All Items
4. Open an article
5. Star the article
6. Copy content to clipboard
7. Navigate to Starred page
8. Verify article appears
9. Navigate back and mark article as read
10. Refresh browser
11. Verify all state persisted

**Expected:**
- All operations complete successfully
- Data persists across page refresh
- Navigation works smoothly
- No console errors

**Result:** ☐ Pass ☐ Fail

---

### Test 5.2: Multiple Feeds with Articles

**Goal:** Verify app handles multiple feeds correctly

**Steps:**
1. Add 5 different feeds
2. Navigate to All Items
3. Verify articles from all 5 feeds appear
4. Check each feed's detail page
5. Star 3 articles from different feeds
6. Navigate to Starred - verify all 3 appear

**Expected:**
- Articles properly attributed to correct feeds
- Feed names display correctly
- Starred articles from different feeds shown together
- No duplicate articles
- Performance remains good

**Result:** ☐ Pass ☐ Fail

---

### Test 5.3: Browser Refresh Persistence

**Goal:** Comprehensive persistence test

**Steps:**
1. Perform multiple operations:
   - Add 3 feeds
   - Star 2 articles
   - Mark 5 articles as read
   - Leave 3 articles unread
2. Note exact counts
3. **Hard refresh** (Cmd+Shift+R or Ctrl+Shift+R)
4. Verify all counts and states

**Expected:**
- All counts identical after refresh
- All starred states preserved
- All read states preserved
- Feed list unchanged
- No data loss

**Result:** ☐ Pass ☐ Fail

---

### Test 5.4: Browser DevTools Console

**Goal:** Check for JavaScript errors

**Steps:**
1. Open DevTools Console (F12 → Console tab)
2. Clear console
3. Navigate through app:
   - All Items
   - Feeds
   - Starred
   - Open articles
   - Perform actions (star, read, copy)
4. Monitor console for errors

**Expected:**
- No red error messages
- No uncaught exceptions
- Only informational logs (if any)
- Clean console output

**Result:** ☐ Pass ☐ Fail

---

## Known Limitations (As Expected)

These are expected behaviors in the current phase:

- ✅ **Mock Feed Data:** Feeds don't fetch real RSS content yet (Phase 5)
- ✅ **Mock Articles:** Generated sample articles (Phase 5 will add real parsing)
- ✅ **No Sync:** Frontend doesn't sync with backend yet (Phase 5)
- ✅ **No Auto-Refresh:** Feeds don't refresh automatically (Phase 5)
- ✅ **PWA Not Complete:** Can't install as app yet (Phase 6)
- ✅ **Local Only:** Backend API exists but frontend doesn't use it yet (Phase 5)

---

## Summary Checklist

### Phase 1: Database ☐
- [ ] Test page loads
- [ ] Can add feeds
- [ ] Can add articles
- [ ] Can toggle read/starred
- [ ] Data persists
- [ ] IndexedDB structure correct

### Phase 2: Feed Management ☐
- [ ] Can add feeds
- [ ] Can view feed list
- [ ] Can view feed details
- [ ] Can delete feeds
- [ ] Can import OPML
- [ ] Can export OPML
- [ ] Duplicate prevention works

### Phase 3: Article Reading ☐
- [ ] All Items view works
- [ ] Starred view works
- [ ] Article detail displays
- [ ] **Copy Content works** ⭐
- [ ] Star/unstar works
- [ ] Read/unread works
- [ ] Auto-mark read works
- [ ] HTML sanitization works
- [ ] Links open safely

### Phase 4: Backend API ☐
- [ ] Wrangler dev starts
- [ ] Health endpoint works
- [ ] Sync pull works
- [ ] Sync push works
- [ ] Conflict resolution works
- [ ] CORS configured

### Integration ☐
- [ ] End-to-end workflow
- [ ] Multiple feeds
- [ ] Persistence across refresh
- [ ] No console errors

---

## Test Results Summary

**Date Tested:** ___________
**Browser:** ___________
**OS:** ___________

**Total Tests:** 60+
**Passed:** ___
**Failed:** ___
**Skipped:** ___

**Critical Issues Found:**
-

**Notes:**
-

---

## Next Steps After Testing

Once testing is complete:

1. **Report any issues** you found
2. **Note any unexpected behavior**
3. **Ready for Phase 5:** Feed Refresh & Sync Integration

Phase 5 will:
- Replace mock parser with real RSS parsing
- Connect frontend to backend API
- Implement actual sync between devices
- Add feed auto-refresh

---

**Happy Testing!** 🧪

Take your time and test thoroughly. The more issues we catch now, the smoother Phase 5 will be!
