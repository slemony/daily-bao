# The Daily Bao 报

> Your curated dose of world chaos — no algorithm, no drama, just the goods.

A free, cloud-hosted personal news reader. EN · 繁 · 简 + any custom source. Clean reader mode, no ads. Runs fully on Firebase (free Spark plan) — no servers, no PC uptime needed.

---

## Setup (one-time, ~15 minutes)

### Step 1 — Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it any name (e.g. `daily-bao`)
3. Disable Google Analytics (not needed) → **Create project**

### Step 2 — Enable services

Inside your project:

**Authentication**
- Left menu → Build → **Authentication** → Get started
- Sign-in method tab → Enable **Google**
- Add your domain to "Authorized domains" (do this after deploy)

**Firestore**
- Left menu → Build → **Firestore Database** → Create database
- Choose **Start in production mode** → select any region → Done

**Hosting**
- Left menu → Build → **Hosting** → Get started → follow the steps

### Step 3 — Get your Firebase config

1. Project Overview → click the **`</>`** (Web) icon → Register app
2. Copy the `firebaseConfig` object that appears

### Step 4 — Paste the config into `app.js`

Open `app.js` and replace the `FIREBASE_CONFIG` block at the top:

```js
const FIREBASE_CONFIG = {
  apiKey:            "AIza...",
  authDomain:        "daily-bao.firebaseapp.com",
  projectId:         "daily-bao",
  storageBucket:     "daily-bao.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

Also update `.firebaserc`:
```json
{ "projects": { "default": "daily-bao" } }
```

### Step 5 — Deploy

Install Firebase CLI (once):
```bash
npm install -g firebase-tools
firebase login
```

Deploy:
```bash
cd "C:\Users\shaoyuan\OneDrive - DPDHL\Documents\Claude\News"
firebase deploy
```

Your app is live at `https://YOUR_PROJECT_ID.web.app` 🎉

---

## Add your authorized domain

After first deploy, go to Firebase → Authentication → Settings → Authorized domains → Add `YOUR_PROJECT_ID.web.app`.

---

## Adding news sources

In the app, click ⚙️ → **+ Add Source**. Options:

| What to paste | What it gives you |
|---|---|
| Any news website URL | Auto-detects RSS feed |
| Direct RSS/Atom URL | Added immediately |
| YouTube channel URL (e.g. `youtube.com/@mkbhd`) | Latest videos in Creator Watch |
| XHS profile URL (e.g. `xiaohongshu.com/user/profile/5d...`) | Latest XHS posts |

**Example Malaysian news sources:**
- Malaysiakini: `https://www.malaysiakini.com/rss`
- The Star: `https://www.thestar.com.my/rss/News/Nation`
- FMT: `https://www.freemalaysiatoday.com/feed/`

---

## Features

- **Multi-language**: EN, 繁體中文, 简体中文, and any language you add
- **Sections**: 🔥 What's Burning · 🤓 Nerd Alert · 💸 Money Stuff · 🎬 Creator Watch
- **Reader mode**: Clean article text with no ads, powered by Mozilla Readability
- **YouTube**: Embed and watch videos inline without leaving the app
- **XHS (小红书)**: View creator posts via RSSHub
- **Per-user sources**: Each Google account has its own independent feed list
- **Dark / Light mode**: Toggle between ☀️ Cope and 🌙 Vibe
- **Language filter**: Show All / EN / 繁 / 简 at a glance
- **No PC needed**: Everything runs in the cloud

---

## File structure

```
News/
├── index.html        ← App shell (login + feed UI)
├── style.css         ← Styling (dark/light themes)
├── app.js            ← All logic: auth, RSS, reader, UI
├── firebase.json     ← Hosting + Firestore config
├── firestore.rules   ← Security rules (users own their data)
└── .firebaserc       ← Firebase project reference
```

---

## Costs

Everything runs on Firebase **Spark (free) plan**:
- Hosting: 10 GB/month transfer (more than enough)
- Firestore: 50,000 reads/day, 20,000 writes/day (you'll use <100)
- Auth: Unlimited users
- **Total: $0/month**
