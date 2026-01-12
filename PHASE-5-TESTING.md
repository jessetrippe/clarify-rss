# Phase 5 Testing Guide

## ✅ What's Complete

Phase 5 is now 100% integrated! Here's what works:

- ✅ Real RSS/Atom parsing (rss-parser library)
- ✅ Feed auto-discovery
- ✅ Rate limiting (5-minute minimum)
- ✅ Bidirectional sync (frontend ↔ backend)
- ✅ Automatic sync on app open/focus
- ✅ Conflict resolution (last-write-wins)
- ✅ API endpoints for parsing and discovery

All mocks have been replaced with real functionality!

---

## 🚀 Testing Steps

### 1. Start the Worker (Backend)

```bash
cd /Users/jessetrippe/Sites/clarify-rss
npx wrangler dev --local
```

**Expected output:**
```
⛅️ wrangler 4.58.0
Your Worker has access to the following bindings:
- env.DB (clarify-rss-db)

⎔ Starting local server...
[wrangler:info] Ready on http://localhost:8787
```

**If you see build errors** about "http", "https", etc.:
- The wrangler.toml should already have `compatibility_date = "2024-09-23"`
- Try: `npx wrangler dev --local --compatibility-date=2024-09-23`

**Test the Worker:**
```bash
# In another terminal
curl http://localhost:8787/api/health
```

Should return: `{"status":"ok","timestamp":...}`

---

### 2. Start Next.js (Frontend)

In a **new terminal**:

```bash
cd /Users/jessetrippe/Sites/clarify-rss
npm run dev
```

**Expected output:**
```
▲ Next.js 15.x.x
- Local:        http://localhost:3000

✓ Ready in 1500ms
```

---

### 3. Test Real RSS Parsing

1. Open browser to http://localhost:3000
2. Navigate to "Feeds"
3. Add a real RSS feed URL, for example:
   - **Ars Technica:** `https://feeds.arstechnica.com/arstechnica/index`
   - **TechCrunch:** `https://techcrunch.com/feed/`
   - **Hacker News:** `https://news.ycombinator.com/rss`

**What should happen:**
- "Adding Feed..." spinner appears
- Feed is parsed (takes 1-5 seconds)
- Feed appears in list with **real title** from the RSS feed
- Shows article count (real articles from the feed!)
- Feed has **real articles** with actual content

**Click on the feed:**
- See all articles with real titles and dates
- Click on an article
- See **real article content** (not mock text!)

**Success indicators:**
- ✅ Feed title matches the actual feed name
- ✅ Articles have real titles and dates from the feed
- ✅ Article content is real HTML from the source
- ✅ Images appear (if present in feed)
- ✅ No "mock" or "sample" text

---

### 4. Test Feed Discovery

Try adding a website URL (not a feed URL):

```
https://techcrunch.com
```

**What should happen:**
- Initial parse fails (as expected)
- Message: "Could not parse feed. Found these potential feed URLs - click one to try:"
- Shows discovered feed URLs:
  - `https://techcrunch.com/feed/`
  - etc.
- Click one to add it

---

### 5. Test Sync

**Open browser DevTools (F12) → Console tab**

Check for sync logs:
```
Initial sync failed: Failed to fetch
```

This is **expected** because the frontend tries to sync immediately but Worker needs to be running first.

**With both servers running:**
1. Refresh the page
2. Check console - should see sync activity (or no errors)
3. Add a feed
4. Open a new tab to the app
5. Switch back - sync should trigger (check console)

**Manual sync test:**
```javascript
// In browser console
const { syncService } = await import('/lib/sync-service.ts');
await syncService.sync();
```

Should log sync results or complete without errors.

---

### 6. Test Copy Content (Still Works!)

1. Open any article
2. Click "Copy Content"
3. Paste into text editor
4. Should see:
   ```
   [Real Article Title]

   Source: [Real URL]

   [Real article content as plain text]
   ```

---

## 📊 What Changed From Mocks

### Before (Mocks):
- Feed title: `"example.com Feed"`
- Articles: `"Article 1: Sample Title"`
- Content: `"This is sample content for article 1..."`

### After (Real):
- Feed title: Actual feed name (e.g., "Ars Technica")
- Articles: Real article titles from feed
- Content: Actual article HTML from source
- Dates: Real publication dates
- Authors: Real author names (if in feed)

---

## 🐛 Troubleshooting

### Worker won't start

**Error: "Could not resolve 'http'"**
- Solution: Update `workers/wrangler.toml`:
  ```toml
  compatibility_date = "2024-09-23"
  compatibility_flags = ["nodejs_compat"]
  ```

**Error: "npm ERR! missing script: dev"**
- You're in the wrong directory
- Run: `cd /Users/jessetrippe/Sites/clarify-rss`

### Frontend errors

**"Failed to parse feed"**
- Check that Worker is running (curl http://localhost:8787/api/health)
- Check browser console for network errors
- Try a different feed URL

**"Sync failed"**
- Normal if Worker isn't running
- Once Worker starts, sync should work automatically
- Check CORS isn't blocking (should see proper headers)

### Feed parsing takes too long

- Normal for some feeds (10-second timeout)
- Large feeds with many articles take longer
- Check Worker console for any errors

---

## ✅ Success Checklist

- [ ] Worker starts without errors
- [ ] Health endpoint responds
- [ ] Frontend loads without console errors
- [ ] Can add real RSS feed
- [ ] Feed shows real title (not "example.com Feed")
- [ ] Articles show real content (not "Sample Title")
- [ ] Article detail shows full HTML content
- [ ] Copy Content works with real content
- [ ] Feed discovery finds feeds
- [ ] Sync doesn't show errors (when both servers running)

---

## 🎉 What You Now Have

A **fully functional RSS reader** with:
- ✅ Real RSS/Atom parsing
- ✅ Any public RSS feed works
- ✅ Full article content
- ✅ Sync between frontend and backend
- ✅ Local-first (data in IndexedDB)
- ✅ Conflict resolution
- ✅ Feed auto-discovery
- ✅ Rate limiting
- ✅ Copy Content (the core feature!)

**Still using mocks:** None! Everything is real now.

**What's left:**
- Phase 6: PWA features (offline, install prompt)
- Phase 7: Production deployment

---

## Next Steps

1. **Test thoroughly** using this guide
2. **Report any issues** you find
3. **Ready for Phase 6?** We'll add PWA features next

Or you can use your RSS reader as-is! It's fully functional now, just not deployable to production yet.

---

**Happy Testing!** 🧪

Try these feeds to start:
- https://feeds.arstechnica.com/arstechnica/index
- https://techcrunch.com/feed/
- https://news.ycombinator.com/rss
- https://www.theverge.com/rss/index.xml
