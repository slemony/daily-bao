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

## File structure
```
index.html       — app shell (login page + full SPA in one file)
style.css        — all styling, dark/light theme via [data-theme] on <html>
app.js           — all logic: Firebase, RSS parsing, Readability, UI
manifest.json    — PWA manifest (app icon, theme colour, standalone mode)
firebase.json    — Firebase Hosting + Firestore config
firestore.rules  — security rules (users own only their own doc)
.firebaserc      — Firebase project ID reference
README.md        — setup guide for deploying to Firebase
```

## Key design decisions
- **No build step** — deploy with `firebase deploy`, edit files directly
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
- Clicking closes the panel and filters `renderFeed()` to that feed's articles only
- A `#feed-filter-chip` below the lang-filter shows "Showing: [name] ✕"; clicking ✕ clears the filter
- Active feed item is highlighted with `.feed-item-active` class

## Settings panel — feed item actions
- Edit and Delete buttons are hidden by default (`opacity: 0; pointer-events: none`)
- **Desktop**: buttons fade in on `.feed-item:hover`
- **Mobile**: long-press (600ms touchstart timer) adds `.actions-visible` class; tapping outside clears it
- Clicking the feed name area filters by that feed (separate from the action buttons)

## Reader image handling
- `.reader-prose img` has `height: auto; width: auto` — prevents stretching from explicit HTML attributes
- `cleanReaderContent()` strips inline `width`/`height` attributes and styles from all `<img>` tags after the lazy-load replacement pass

## Firebase config
The `FIREBASE_CONFIG` object at the top of `app.js` is a placeholder. User fills it in from Firebase Console → Project Settings → Your Apps. Do not commit real API keys.

## Sections / feed categories
- `World News` → 🔥 What's Burning
- `Tech & AI`  → 🤓 Nerd Alert
- `Business`   → 💸 Money Stuff
- `Creators`   → 🎬 Creator Watch (YouTube RSS + XHS via RSSHub)

## Language tags in use
`EN` `繁` (Traditional Chinese) `简` (Simplified Chinese) `MY` (Malaysian) — plus any user-defined tags

## YouTube & XHS support
- YouTube: standard Atom feed `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`
- XHS: via RSSHub public instance `https://rsshub.app/xiaohongshu/user/{userid}`
- XHS URL auto-detection handles: `xiaohongshu.com/user/profile/{id}`, `rednote.com/user/profile/{id}`, `xhslink.com/m/{short}` (phone share — resolved via allorigins redirect)

## Feed debug log
- `feedLogs` array in `app.js` records per-feed OK/error with timestamp on every fetch
- Accessible via Settings → Feed Logs → View, or by clicking the `⚠ N feeds failed` chip in the header
- `openDebugModal()` renders the log; `updateLogsSummary()` updates the settings hint text

## UI personality / copy to preserve
- Splash screen silly one-liners (`SPLASH_MSGS` array in app.js) — add more, never remove
- Loading overlay messages (`LOADING_MSGS` array) — same rule
- Section emoji names (🔥 What's Burning, 🤓 Nerd Alert, etc.) — keep as-is
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
- Do not remove the personality copy (loading messages, section names, tagline)
