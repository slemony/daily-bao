# The Daily Bao 报 — Claude Context

## What this is
A personal news reader web app that replaces social media. Free, cloud-hosted on Firebase, accessible on any device. Each user logs in with Google and manages their own RSS feed list.

## Tech stack
- **Frontend**: Vanilla HTML + CSS + JS (no build tools, no framework)
- **Auth**: Firebase Auth — Google Sign-in only
- **Database**: Firestore — stores per-user feed config (`/users/{uid}` → `{ feeds: [...] }`)
- **Hosting**: Firebase Hosting (`firebase deploy`)
- **RSS fetching**: Client-side via CORS proxies (corsproxy.io, allorigins.win)
- **Article reader**: Mozilla Readability.js loaded from jsDelivr CDN

## File structure
```
index.html       — app shell (login page + full SPA in one file)
style.css        — all styling, dark/light theme via [data-theme] on <html>
app.js           — all logic: Firebase, RSS parsing, Readability, UI
firebase.json    — Firebase Hosting + Firestore config
firestore.rules  — security rules (users own only their own doc)
.firebaserc      — Firebase project ID reference
README.md        — setup guide for deploying to Firebase
```

## Key design decisions
- **No build step** — deploy with `firebase deploy`, edit files directly
- **No backend / Cloud Functions** — stays on Firebase free Spark plan
- **CORS proxies** — RSS and article fetching goes through corsproxy.io with allorigins.win as fallback
- **Firestore stores config only** — articles are fetched fresh client-side on each load, not cached
- **Single `app.js`** — all logic in one file intentionally; don't split unless it exceeds ~600 lines

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

## What the user cares about
- No ads, no redirects — article reader must strip to clean text
- Works on mobile and PC without login friction
- Easy to add any news source (paste URL → auto-detect RSS)
- Fun, irreverent UI personality — keep the humor in loading messages and empty states
- Free hosting — do not introduce paid services or Cloud Functions

## What to avoid
- Do not add a build step (Webpack, Vite, etc.) unless user explicitly asks
- Do not split into multiple JS files without asking
- Do not add Cloud Functions — keep everything on the free Spark plan
- Do not store articles in Firestore — only user feed config
- Do not remove the personality copy (loading messages, section names, tagline)
