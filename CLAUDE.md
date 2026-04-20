# The Daily Bao 报 — Claude Context

## What this is
A personal news reader web app that replaces social media. Free, cloud-hosted on Firebase, accessible on any device. Each user logs in with Google and manages their own RSS feed list.

## Tech stack
- **Frontend**: Vanilla HTML + CSS + JS (no build tools, no framework)
- **Auth**: Firebase Auth — Google Sign-in only
- **Database**: Firestore — stores per-user feed config (`/users/{uid}` → `{ feeds: [...] }`)
- **Hosting**: Firebase Hosting (`firebase deploy`)
- **RSS fetching**: Client-side — direct fetch + 3 CORS proxies (allorigins, codetabs, cors.lol) raced with `Promise.any`, 8s timeout; rss2json.com as final fallback if all fail
- **RSS parsing**: `rss-parser@3` loaded from jsDelivr CDN (global `RSSParser`); handles `content:encoded`, Atom `<content>`, CDATA, Media RSS
- **Article reader**: Mozilla Readability.js loaded from jsDelivr CDN (preloaded silently after first feed fetch)
- **Article cache**: `localStorage` key `dailybao_feed_cache` — same-day cache, stale-while-revalidate on new day
- **YouTube shorts cache**: `localStorage` key `dailybao_yt_short_cache` — maps `videoId` → `isShort` boolean, populated via YouTube oEmbed thumbnail aspect ratio, capped at 2000 entries (FIFO trim)

## File structure
```
index.html       — app shell (login page + full SPA in one file)
style.css        — all styling, dark/light theme via [data-theme] on <html>
app.js           — all logic: Firebase, RSS parsing, Readability, UI
manifest.json    — PWA manifest (app icon, theme colour, standalone mode)
firebase.json    — Firebase Hosting + Firestore config
firestore.rules  — security rules (users own only their own doc)
.firebaserc      — Firebase Project ID reference
README.md        — setup guide for deploying to Firebase
```

## Key design decisions
- **No build step** — deploy with `firebase deploy`, edit files directly
- **CI/CD** — pushing to `main` on GitHub auto-deploys to Firebase Hosting via GitHub Actions
- **No backend / Cloud Functions** — stays on Firebase free Spark plan
- **CORS proxies raced in parallel** — all three proxies fire simultaneously; fastest response wins
- **localStorage article cache** — same-day loads skip network entirely; stale cache shows instantly then refreshes in background
- **Progressive feed rendering** — articles appear in UI as each feed resolves, not after all finish
- **Incremental refresh** — manual refresh and background refresh merge new articles by URL dedup; nothing is flushed
- **Firestore stores config only** — articles are never written to Firestore
- **Single `app.js`** — all logic in one file intentionally; don't split unless it exceeds ~800 lines
- **Theme persists via localStorage** — default is light (warm newspaper palette); user preference remembered across sessions
- **Whole card is clickable** — article cards have no "Read →" button; clicking anywhere on the card opens the reader

## Article card design (Reeder-style)
Each `.article-card` shows:
- Top row: circular favicon (Google favicon API `?domain=…&sz=64`), feed name, author (`item.creator` / `dc:creator`), date
- Body row: title + summary (left, flex), thumbnail (right, 76×76px, `object-fit: cover`)
- Thumbnail sourced from: YouTube thumbnail > media:thumbnail > first `<img src>` in content
- `feedDomain` and `author` are extracted at parse time in `parseRSS()` / `parseRss2json()` and stored on each article object

## Feed source filter
- `activeFeed` global (null = show all) — set by clicking a feed's name in the settings panel
- Clicking closes the panel, filters `renderFeed()` to that feed's articles, and smooth-scrolls the page to the top
- When active, `#feed-filter-chip` appears inline in the header next to "The Daily Bao" — shows `· [name] ✕`; clicking ✕ clears the filter and scrolls to top
- Active feed item is highlighted with `.feed-item-active` class
- Scroll-to-top is only wired to filter clicks, NOT inside `renderFeed()` — background refresh must not disrupt scroll position

## Section / tag system
- Each feed has a `section` field — a free-form string (e.g. "World News", "Tech & AI", anything user types)
- Sections are user-defined: the section input in add/edit modals is a text field with `<datalist id="sections-datalist">` showing existing section names as suggestions
- `renderTabs()` builds nav tabs dynamically from unique sections in `userFeeds`; `updateSectionsDatalist()` keeps the datalist in sync — both called after any feed add/edit/delete/load
- Section tabs (`#section-tabs`) and language filter (`#lang-filter`) are currently hidden (`class="hidden"`) — sections are managed via settings panel only
- Each section header in settings has a `✎` rename button (hover to reveal) — renames all feeds in that section in bulk
- `sectionLabel(s)` is a pass-through (`return s`) — no emoji mapping
- `isCreator` is URL-based: YouTube (`youtube.com/feeds`) or XHS (`rsshub.app/xiaohongshu`, `rsshub.app/xhslink`) or legacy `feed.section === 'Creators'`

## Settings panel — feed item actions
- **"+ Add" button** is in the panel header (compact pill, not full-width row)
- Edit and Delete buttons are hidden by default (`opacity: 0; pointer-events: none`)
- **Desktop**: buttons fade in on `.feed-item:hover`
- **Mobile**: long-press (600ms touchstart timer) adds `.actions-visible` class; tapping outside clears it
- Clicking the feed name area filters by that feed (separate from the action buttons)
- **Mobile swipe**: swipe from the right edge of the screen (within 30px) leftward 60px+ opens settings panel

## Mobile UX
- Swipe right-edge → open settings: touch starts at `startX > window.innerWidth - 30`, drag left ≥ 60px
- Swipe left-edge of open panel → dismiss: existing `addSwipeToDismiss()` on `#settings-panel`
- Modals (`#add-feed-modal`, `#edit-feed-modal`) are `max-height: 90vh` with scrollable `.modal-body` — header and footer stay pinned

## Panel & reader dismissal
- `#panel-backdrop` click closes both `.side-panel.open` AND `.reader-panel.open` — on desktop the reader is a 60vw right slide-over, so clicking the dimmed left area dismisses it
- `hidePanelBackdrop()` checks for any remaining open panel/reader before hiding the backdrop

## Reader image handling
- `.reader-prose img` has `height: auto; width: auto` — prevents stretching from explicit HTML attributes
- `cleanReaderContent()` strips inline `width`/`height` attributes and styles from all `<img>` tags after the lazy-load replacement pass
- Also dedupes images by normalized src (strips query string, Vox-style `-NNNN` size suffixes, `/WxH/` resize segments) — fixes Verge articles that render the hero image twice; removes the parent `<figure>` if it becomes empty
- Strips empty `<li>` elements (no text, no media) and any `<ul>`/`<ol>` that end up empty — fixes stray bullet dots in Verge articles

## Firebase config
The `FIREBASE_CONFIG` object at the top of `app.js` is a placeholder. User fills it in from Firebase Console → Project Settings → Your Apps. Do not commit real API keys.

## YouTube & XHS support
- YouTube: standard Atom feed `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`
- XHS: via RSSHub public instance `https://rsshub.app/xiaohongshu/user/{userid}`
- XHS URL auto-detection handles: `xiaohongshu.com/user/profile/{id}`, `rednote.com/user/profile/{id}`, `xhslink.com/m/{short}` (phone share — resolved via allorigins redirect)
- **YouTube shorts filter**: each YouTube feed has a `ytFilter` field on its feed object — `'all' | 'long' | 'shorts'` (default `'all'`). Set via radio group inside `#youtube-helper` (add modal) and `#edit-yt-filter-group` (edit modal); only visible when the URL includes `youtube.com/feeds`
- Shorts are detected by `getYtIsShort(videoId)` — calls YouTube oEmbed (`https://www.youtube.com/oembed?url=…&format=json`) and checks `thumbnail_height > thumbnail_width`. Results cached in localStorage (see Tech stack). `null` return means unknown → kept when filtering long-form (so detection misses don't vanish) but dropped when filtering shorts-only
- `applyYtFilter(articles, feed)` runs at the end of `parseRSS()` and `parseRss2json()` — no-op unless the feed is a YouTube feed with `ytFilter !== 'all'`

## Feed debug log
- `feedLogs` array in `app.js` records per-feed OK/error with timestamp on every fetch
- Accessible via Settings → Feed Logs → View, or by clicking the `⚠ N feeds failed` chip in the header
- `openDebugModal()` renders the log; `updateLogsSummary()` updates the settings hint text

## UI personality / copy to preserve
- Splash screen silly one-liners (`SPLASH_MSGS` array in app.js) — add more, never remove
- Loading overlay messages (`LOADING_MSGS` array) — same rule
- Theme toggle labels: "☀️ Cope" (dark mode button) · "🌙 Vibe" (light mode button)
- App logo: 🍞 emoji, "The Daily Bao" in DM Serif Display font

## What the user cares about
- No ads, no redirects — article reader must strip to clean text
- Works on mobile and PC without login friction
- Easy to add any news source (paste URL → auto-detect RSS); edit existing sources with live RSS test
- Fun, irreverent UI personality — keep the humor in loading messages and empty states
- Free hosting — do not introduce paid services or Cloud Functions

## What to avoid
- Do not add a build step (Webpack, Vite, etc.) unless user explicitly asks
- Do not split into multiple JS files without asking
- Do not add Cloud Functions — keep everything on the free Spark plan
- Do not store articles in Firestore — only user feed config
- Do not remove the personality copy (loading messages, tagline)
