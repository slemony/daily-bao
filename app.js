// =====================================================
// THE DAILY BAO 报 — Main Application
// =====================================================
// IMPORTANT: Before deploying, fill in your Firebase config in FIREBASE_CONFIG below.
// See README.md for full setup instructions.
// =====================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// =====================================================
// 🔧 FILL THIS IN — from Firebase Console → Project Settings → Your Apps
// =====================================================
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBf8Poylq_Ifcb4Lk9bhDzT_D_M1XD8tYw",
  authDomain:        "daily-bao.firebaseapp.com",
  projectId:         "daily-bao",
  storageBucket:     "daily-bao.firebasestorage.app",
  messagingSenderId: "789462890967",
  appId:             "1:789462890967:web:a40802ab38959ae5533392",
  measurementId:     "G-RF7C9QC6GR"
};

// =====================================================
// DEFAULT STARTER FEEDS
// =====================================================
const DEFAULT_FEEDS = [
  { id: 'reuters-world',  name: 'Reuters World',   url: 'https://feeds.reuters.com/reuters/topNews',                        lang: 'EN', section: 'World News' },
  { id: 'bbc-world',      name: 'BBC World',        url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                      lang: 'EN', section: 'World News' },
  { id: 'cna-all',        name: 'CNA 中央社',        url: 'https://www.cna.com.tw/rss/aall.aspx',                             lang: '繁', section: 'World News' },
  { id: 'udn-intl',       name: '聯合國際',           url: 'https://udn.com/rssfeed/news/2/6638?ch=news',                     lang: '繁', section: 'World News' },
  { id: 'verge',          name: 'The Verge',        url: 'https://www.theverge.com/rss/index.xml',                           lang: 'EN', section: 'Tech & AI' },
  { id: 'techcrunch',     name: 'TechCrunch',       url: 'https://techcrunch.com/feed/',                                     lang: 'EN', section: 'Tech & AI' },
  { id: 'technews-tw',    name: '科技新報',           url: 'https://technews.tw/feed/',                                        lang: '繁', section: 'Tech & AI' },
  { id: '36kr',           name: '36氪',              url: 'https://36kr.com/feed',                                            lang: '简', section: 'Tech & AI' },
  { id: 'marketwatch',    name: 'MarketWatch',      url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',       lang: 'EN', section: 'Business' },
  { id: 'huxiu',          name: '虎嗅',              url: 'https://www.huxiu.com/rss/0.xml',                                  lang: '简', section: 'Business' },
  { id: 'caixin',         name: '财新',              url: 'https://feedx.net/rss/caixin.xml',                                 lang: '简', section: 'Business' },
];

// =====================================================
// SPLASH MESSAGES (shown during Firebase auth check)
// =====================================================
const SPLASH_MSGS = [
  "Boiling the news...",
  "Untangling the internet...",
  "Bribing the algorithm...",
  "Removing 97% of rage bait...",
  "Fact-checking the fact-checkers...",
  "Translating 'source familiar with the matter'...",
  "Filtering out hot takes... mostly failed...",
  "Skimming so you don't have to...",
  "Deleting the paywalls in our hearts...",
  "Searching for good news... still searching...",
  "Downloading today's anxiety... please wait...",
  "Consulting the vibes...",
  "Calibrating outrage levels...",
  "Checking if the world is still on fire... yes...",
  "Sorting headlines by chaos potential...",
  "Asking 17 experts who disagree...",
  "Converting doom into content...",
  "Buffering your daily crisis...",
  "Aggregating takes you didn't ask for...",
  "Pretending to be unbiased...",
];
document.getElementById('splash-msg').textContent = SPLASH_MSGS[Math.floor(Math.random() * SPLASH_MSGS.length)];

function hideSplash() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.classList.add('fade-out');
  setTimeout(() => splash.remove(), 420);
}

// =====================================================
// LOADING MESSAGES
// =====================================================
const LOADING_MSGS = [
  "Harvesting fresh opinions from the internet...",
  "Convincing 繁體 and 简体 to share a table...",
  "Downloading today's disasters (and breakthroughs)...",
  "Bribing Reuters for their best headlines...",
  "Asking 36氪 what the cool kids are building...",
  "Checking if the world is still standing... (it is, probably)",
  "Scanning 10,000 articles so you don't have to...",
  "Filtering out the clickbait (mostly)...",
  "Fetching your daily brain food...",
  "Making sense of the chaos, one headline at a time...",
];

// =====================================================
// CORS PROXIES (tried in order)
// =====================================================
const CORS_PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  url => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

const feedLogs = [];
function logFeed(name, status, message) {
  const now = new Date();
  const t = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
  feedLogs.push({ name, status, message, time: t });
}

const rssParser = new RSSParser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content',   'mediaContent'],
      ['yt:videoId', 'ytVideoId'],
    ],
  },
});

// =====================================================
// INIT
// =====================================================
const firebaseApp = initializeApp(FIREBASE_CONFIG);
const auth        = getAuth(firebaseApp);
const db          = getFirestore(firebaseApp);
const provider    = new GoogleAuthProvider();

let currentUser     = null;
let userFeeds       = [];
let userCategories  = [];  // user-created section names (includes empty ones)
let allArticles     = [];  // flat array of fetched articles
let activeSection   = 'all';
let activeLang      = 'all';
let activeFeed      = null;
let readerOpen      = false;

// =====================================================
// ARTICLE CACHE (localStorage)
// =====================================================
const CACHE_KEY = 'dailybao_feed_cache';

function isSameDay(ts) {
  const d = new Date(ts), now = new Date();
  return d.getFullYear() === now.getFullYear()
      && d.getMonth()    === now.getMonth()
      && d.getDate()     === now.getDate();
}

function loadCache(uid) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (c.uid !== uid) return null;
    // Re-hydrate date strings → Date objects
    c.articles = c.articles.map(a => ({ ...a, date: a.date ? new Date(a.date) : null }));
    return c;
  } catch { return null; }
}

function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      uid: currentUser.uid,
      cachedAt: Date.now(),
      articles: allArticles,
    }));
  } catch { /* storage full — fail silently */ }
}

// =====================================================
// AUTH
// =====================================================
onAuthStateChanged(auth, async user => {
  hideSplash();
  if (user) {
    currentUser = user;
    showApp(user);
    purgeExpiredProgress();
    await loadUserFeeds();

    const cache = loadCache(user.uid);
    if (cache && isSameDay(cache.cachedAt)) {
      // Fresh cache — show immediately, skip network
      allArticles = cache.articles;
      updateLastUpdated();
      setLoadingState(false);
      renderFeed();
    } else {
      // Stale or no cache — show stale instantly if available, then refresh silently
      if (cache) {
        allArticles = cache.articles;
        renderFeed();
        await fetchAllFeeds({ silent: true });
      } else {
        await fetchAllFeeds({ silent: false });
      }
    }
  } else {
    currentUser = null;
    showLogin();
  }
});

document.getElementById('google-signin-btn').addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error('Sign-in error', e);
  }
});

document.getElementById('view-logs-btn').addEventListener('click', openDebugModal);

document.getElementById('signout-btn').addEventListener('click', async () => {
  await signOut(auth);
});

// =====================================================
// PAGE VISIBILITY
// =====================================================
function showLogin() {
  document.getElementById('login-page').classList.remove('hidden');
  document.getElementById('app-page').classList.add('hidden');
}

function showApp(user) {
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('app-page').classList.remove('hidden');

  const avatar = document.getElementById('user-avatar');
  avatar.src = user.photoURL || '';
  avatar.alt = user.displayName || 'User';

  // Account info in settings
  document.getElementById('account-info').innerHTML = `
    <img src="${user.photoURL || ''}" alt="${user.displayName}" onerror="this.style.display='none'"/>
    <div class="account-info-text">
      <div class="account-name">${user.displayName || 'User'}</div>
      <div class="account-email">${user.email || ''}</div>
    </div>
  `;
}

// =====================================================
// FIRESTORE — USER FEEDS
// =====================================================
async function loadUserFeeds() {
  try {
    const ref = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      userFeeds      = data.feeds || DEFAULT_FEEDS;
      userCategories = Array.isArray(data.categories) ? data.categories : [];
    } else {
      userFeeds = [...DEFAULT_FEEDS];
      userCategories = [];
      await saveUserFeeds();
    }
  } catch (e) {
    console.warn('Firestore unavailable, using defaults:', e.message);
    userFeeds = [...DEFAULT_FEEDS];
    userCategories = [];
    showToast('⚠️ Could not load your feeds from cloud — showing defaults');
  }
  renderFeedList();
  renderTabs();
  updateSectionsDatalist();
  await loadProgressFromFirestore();
  renderContinueReading();
}

async function saveUserFeeds() {
  try {
    const ref = doc(db, 'users', currentUser.uid);
    await setDoc(ref, { feeds: userFeeds, categories: userCategories }, { merge: true });
  } catch (e) {
    console.warn('Could not save feeds:', e.message);
  }
}

// =====================================================
// RSS FETCHING
// =====================================================
async function corsGet(url) {
  const direct = fetch(url, { signal: AbortSignal.timeout(8000) })
    .then(r => r.ok ? r.text() : Promise.reject());
  const proxied = CORS_PROXIES.map(p =>
    fetch(p(url), { signal: AbortSignal.timeout(8000) })
      .then(r => r.ok ? r.text() : Promise.reject(new Error(`${r.status}`)))
  );
  return Promise.any([direct, ...proxied]).catch(() => { throw new Error(`All sources failed for: ${url}`); });
}

async function parseRSS(xmlText, feed) {
  const result = await rssParser.parseString(xmlText);
  const articles = result.items.slice(0, 15).map(item => {
    const rawSummary = item.contentEncoded || item.content || item.contentSnippet || item.summary || '';
    const summary = decodeEntities(rawSummary.replace(/<[^>]*>/g, '').trim()).slice(0, 200);

    let videoId = item.ytVideoId || '';
    let thumbnail = '';
    if (videoId) thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    // media:thumbnail
    if (item.mediaThumbnail) thumbnail = item.mediaThumbnail['$']?.url || item.mediaThumbnail?.url || thumbnail;
    // media:content (e.g. Ars Technica) — may be object or array
    if (!thumbnail && item.mediaContent) {
      const mc = Array.isArray(item.mediaContent) ? item.mediaContent[0] : item.mediaContent;
      const attrs = mc?.['$'] || mc || {};
      const mcUrl = attrs.url || mc?.url || '';
      if (mcUrl && (!attrs.medium || attrs.medium === 'image')) thumbnail = mcUrl;
    }
    // image enclosure (some feeds serve thumbnail via <enclosure type="image/...">)
    const enc = item.enclosure;
    if (!thumbnail && enc?.url && /^image\//i.test(enc.type || '')) thumbnail = enc.url;
    // fallback: first <img> in content
    if (!thumbnail) {
      const raw = item.contentEncoded || item.content || '';
      const m = raw.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m && !m[1].startsWith('data:')) thumbnail = m[1];
    }

    const link = item.link || item.guid || '';
    const title = decodeEntities(item.title || '');
    if (!title || !link) return null;

    let feedDomain = '';
    try { feedDomain = new URL(feed.url).hostname.replace(/^www\./, ''); } catch {}

    let audio = null;
    if (enc && enc.url && (!enc.type || /^audio\//i.test(enc.type))) {
      audio = { url: enc.url, type: enc.type || 'audio/mpeg', length: enc.length || '' };
    }

    return {
      id:        `${feed.id}-${link}`,
      feedId:    feed.id,
      feedName:  feed.name,
      feedDomain,
      lang:      feed.lang,
      section:   feed.section,
      title,
      summary,
      link,
      author:    decodeEntities(item.creator || item['dc:creator'] || item.author || ''),
      date:      item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : null),
      videoId,
      thumbnail,
      audio,
      isCreator: feed.url.includes('youtube.com/feeds') || feed.url.includes('rsshub.app/xiaohongshu') || feed.url.includes('rsshub.app/xhslink') || feed.section === 'Creators',
    };
  }).filter(Boolean);
  return applyYtFilter(mergeDuplicateTitles(articles), feed);
}

async function parseRss2json(json, feed) {
  let feedDomain = '';
  try { feedDomain = new URL(feed.url).hostname.replace(/^www\./, ''); } catch {}

  const articles = json.items.slice(0, 15).map(item => {
    const rawSummary = item.content || item.description || '';
    const summary = decodeEntities(rawSummary.replace(/<[^>]*>/g, '').trim()).slice(0, 200);
    const link = item.link || item.guid || '';
    const title = decodeEntities(item.title || '');
    if (!title || !link) return null;

    let thumbnail = item.thumbnail || '';
    if (!thumbnail) {
      const raw = item.content || item.description || '';
      const m = raw.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m && !m[1].startsWith('data:')) thumbnail = m[1];
    }

    let videoId = '';
    const vm = link.match(/[?&]v=([\w-]{6,})/);
    if (vm) videoId = vm[1];

    let audio = null;
    const enc = item.enclosure;
    if (enc && enc.link && (!enc.type || /^audio\//i.test(enc.type))) {
      audio = { url: enc.link, type: enc.type || 'audio/mpeg', length: enc.length || '' };
    }

    return {
      id:        `${feed.id}-${link}`,
      feedId:    feed.id,
      feedName:  feed.name,
      feedDomain,
      lang:      feed.lang,
      section:   feed.section,
      title,
      summary,
      link,
      author:    decodeEntities(item.author || ''),
      date:      item.pubDate ? new Date(item.pubDate) : null,
      videoId,
      thumbnail,
      audio,
      isCreator: feed.url.includes('youtube.com/feeds') || feed.url.includes('rsshub.app/xiaohongshu') || feed.url.includes('rsshub.app/xhslink') || feed.section === 'Creators',
    };
  }).filter(Boolean);
  return applyYtFilter(mergeDuplicateTitles(articles), feed);
}

async function fetchFeed(feed) {
  try {
    const xml = await corsGet(feed.url);
    if (/^\s*<!DOCTYPE\s+html/i.test(xml) || /^\s*<html/i.test(xml))
      throw new Error('HTML response — Cloudflare block or wrong URL');
    return await parseRSS(xml, feed);
  } catch (e) {
    console.warn(`[DailyBao] CORS proxies failed for "${feed.name}":`, e?.message);
  }

  try {
    const r = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`,
      { signal: AbortSignal.timeout(12000) }
    );
    const json = await r.json();
    if (json.status === 'ok') return parseRss2json(json, feed);
    console.warn(`[DailyBao] rss2json failed for "${feed.name}":`, json.message || json.status);
    throw new Error(json.message || `rss2json status: ${json.status}`);
  } catch (e) {
    throw new Error(`All sources failed for: ${feed.name} — ${e?.message}`);
  }
}

function sortArticles() {
  allArticles.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date - a.date;
  });
}

async function fetchAllFeeds({ silent = false } = {}) {
  if (!silent) setLoadingState(true);

  // Deduplicate against existing articles
  const seenUrls = new Set(allArticles.map(a => a.link));

  let remaining   = userFeeds.length;
  let anyNew      = false;
  let failedCount = 0;

  const feedPromises = userFeeds.map(feed =>
    fetchFeed(feed)
      .then(articles => {
        const freshLinks = new Set(articles.map(a => a.link));

        // Evict articles from this feed that no longer appear in the RSS
        const before = allArticles.length;
        allArticles = allArticles.filter(a => a.feedId !== feed.id || freshLinks.has(a.link));
        const evicted = before - allArticles.length;

        // Add articles not already present from any feed
        const currentLinks = new Set(allArticles.map(a => a.link));
        const fresh = articles.filter(a => !currentLinks.has(a.link));
        logFeed(feed.name, 'ok', `${fresh.length} new (${articles.length} total)`);

        if (fresh.length || evicted > 0) {
          fresh.forEach(a => seenUrls.add(a.link));
          allArticles = [...fresh, ...allArticles];
          sortArticles();
          anyNew = true;
          renderFeed();
        }
      })
      .catch(e => {
        failedCount++;
        logFeed(feed.name, 'error', e?.message || String(e));
      })
      .finally(() => {
        remaining--;
        if (remaining === 0) {
          updateLastUpdated();
          if (!silent) setLoadingState(false);
          if (anyNew) saveCache();
          updateFeedErrorChip(failedCount);
          updateLogsSummary();
          // Warm up Readability so first article open is instant
          import('https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/+esm').catch(() => {});
        }
      })
  );

  await Promise.allSettled(feedPromises);
}

function updateFeedErrorChip(count) {
  const chip = document.getElementById('feed-error-chip');
  if (!chip) return;
  if (count === 0) {
    chip.classList.add('hidden');
  } else {
    chip.textContent = `⚠ ${count}`;
    chip.classList.remove('hidden');
    chip.onclick = openDebugModal;
  }
}

function updateLogsSummary() {
  const el = document.getElementById('logs-summary');
  if (!el) return;
  const errors = feedLogs.filter(l => l.status === 'error').length;
  const ok     = feedLogs.filter(l => l.status === 'ok').length;
  el.textContent = errors > 0
    ? `${ok} OK, ${errors} failed — click View for details`
    : `All ${ok} feeds loaded OK`;
}

function openDebugModal() {
  const content = document.getElementById('debug-log-content');
  if (feedLogs.length === 0) {
    content.innerHTML = '<p class="debug-empty">No logs yet. Tap the 🍞 to refresh first.</p>';
  } else {
    content.innerHTML = feedLogs.slice().reverse().map(l =>
      `<div class="debug-entry debug-${l.status}">
        <span class="debug-time">${l.time}</span>
        <span class="debug-name">${esc(l.name)}</span>
        <span class="debug-msg">${esc(l.message)}</span>
      </div>`
    ).join('');
  }
  document.getElementById('debug-modal').classList.remove('hidden');
}

// =====================================================
// RENDERING
// =====================================================
function renderFeed() {
  const grid = document.getElementById('feed-grid');
  const empty = document.getElementById('empty-state');
  grid.innerHTML = '';

  let articles = allArticles;
  if (activeSection !== 'all') articles = articles.filter(a => a.section === activeSection);
  if (activeLang !== 'all')    articles = articles.filter(a => a.lang === activeLang);
  if (activeFeed)              articles = articles.filter(a => a.feedId === activeFeed);

  // Update filter chip — shows either the feed filter or the section filter.
  const chip = document.getElementById('feed-filter-chip');
  if (chip) {
    let label = '';
    let clearFn = null;
    if (activeFeed) {
      const feed = userFeeds.find(f => f.id === activeFeed);
      label   = feed?.name || activeFeed;
      clearFn = () => { activeFeed = null; };
    } else if (activeSection && activeSection !== 'all') {
      label   = `# ${activeSection}`;
      clearFn = () => { activeSection = 'all'; renderTabs(); };
    }
    if (label) {
      chip.innerHTML = `<span class="chip-name">${esc(label)}</span><button class="chip-clear" aria-label="Clear filter">✕</button>`;
      chip.classList.remove('hidden');
      chip.querySelector('.chip-clear').addEventListener('click', () => {
        clearFn();
        renderFeedList();
        renderFeed();
        _feedContainer()?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } else {
      chip.classList.add('hidden');
    }
  }

  // Hide the error chip whenever a feed or section filter is active
  const errorChip = document.getElementById('feed-error-chip');
  if (errorChip) {
    if (activeFeed || (activeSection && activeSection !== 'all')) {
      errorChip.classList.add('hidden');
    } else {
      updateFeedErrorChip(feedLogs.filter(l => l.status === 'error').length);
    }
  }

  if (articles.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  articles.forEach((article, i) => {
    const el = article.isCreator || article.videoId
      ? buildCreatorCard(article, i)
      : buildArticleCard(article, i);
    grid.appendChild(el);
  });
}

function buildArticleCard(a, i) {
  const card = document.createElement('div');
  card.className = 'article-card';
  card.style.animationDelay = `${Math.min(i * 30, 400)}ms`;

  const faviconUrl = a.feedDomain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(a.feedDomain)}&sz=64`
    : '';
  const thumbHtml = a.thumbnail
    ? `<img class="card-thumb" src="${esc(a.thumbnail)}" alt="" loading="lazy" onerror="this.remove()">`
    : '';

  card.innerHTML = `
    <div class="card-top">
      ${faviconUrl ? `<img class="card-favicon" src="${esc(faviconUrl)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
      <div class="card-source-block">
        <div class="card-source-row">
          <span class="card-source">${esc(a.feedName)}</span>
          <span class="card-date-top">${a.date ? formatDate(a.date) : ''}</span>
        </div>
        ${(a.author || a.audio) ? `<div class="card-author-row">
          ${a.author ? `<span class="card-author">${esc(a.author)}</span>` : ''}
          ${a.audio  ? `<span class="card-podcast-badge">🎧 Podcast</span>` : ''}
        </div>` : ''}
      </div>
    </div>
    <div class="card-body-row">
      <div class="card-text">
        <div class="card-title">${esc(a.title)}</div>
        ${a.summary ? `<div class="card-summary">${esc(a.summary)}</div>` : ''}
      </div>
      ${thumbHtml}
    </div>
  `;

  card.addEventListener('click', () => openReader(a));
  return card;
}

function buildCreatorCard(a, i) {
  const card = document.createElement('div');
  card.className = 'creator-card';
  card.style.animationDelay = `${Math.min(i * 30, 400)}ms`;

  const thumbHtml = a.thumbnail
    ? `<img class="creator-thumbnail" src="${esc(a.thumbnail)}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'creator-thumb-placeholder\\'>🎬</div>'">`
    : `<div class="creator-thumb-placeholder">${a.videoId ? '▶' : '🌸'}</div>`;

  card.innerHTML = `
    ${thumbHtml}
    <div class="creator-body">
      <div class="card-meta">
        <span class="card-source">${esc(a.feedName)}</span>
        <span class="lang-badge" data-lang="${esc(a.lang)}">${esc(a.lang)}</span>
        ${a.date ? `<span class="card-date">${formatDate(a.date)}</span>` : ''}
      </div>
      <div class="card-title">${esc(a.title)}</div>
      <div class="card-actions">
        ${a.videoId
          ? `<button class="btn-watch" data-article-id="${esc(a.id)}">▶ Watch</button>`
          : `<button class="btn-read" data-article-id="${esc(a.id)}">View Post →</button>`
        }
      </div>
    </div>
  `;

  const btn = card.querySelector('.btn-watch, .btn-read');
  btn.addEventListener('click', () => openReader(a));
  return card;
}

// =====================================================
// READER
// =====================================================

// Strip duplicate bylines at the start and promotional footers at the end
// from Readability output. Only removes leading/trailing matches — never
// touches the middle of the article.
const READER_FOOTER_RE = /^\s*(learn more|read more|continue reading|view (the )?original|originally published|this article (first |originally )?appeared|subscribe( to)?|sign up|follow us( on)?|download( the)? app|click here|get the newsletter|related (stories?|articles?)|more stories|share this|like this story|support our journalism|want more( like this)?)\b/i;

function cleanReaderContent(html, bylineText) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;

  // Readability often wraps everything in a single <div>. Descend into
  // single-child wrappers so later passes operate on real paragraphs,
  // not the whole article wrapper (which would strip the entire body).
  let root = tpl.content;
  while (root.children && root.children.length === 1 &&
         ['DIV', 'ARTICLE', 'SECTION', 'MAIN'].includes(root.firstElementChild.tagName)) {
    root = root.firstElementChild;
  }

  const textOf = el => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();

  // Replace lazy-loaded placeholder images (BBC, NYT, etc.) with their real src.
  tpl.content.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || '';
    const lazy = img.getAttribute('data-src') ||
                 img.getAttribute('data-lazy-src') ||
                 img.getAttribute('data-original') ||
                 img.getAttribute('data-img-src') || '';
    const isPlaceholder = !src ||
                          src.startsWith('data:image/gif;base64,R0lGOD') ||
                          (src.startsWith('data:') && src.length < 200) ||
                          src.includes('grey-placeholder') ||
                          src.includes('placeholder.png') ||
                          /bbci\.co\.uk.*placeholder/i.test(src);
    if (!isPlaceholder) return;
    if (lazy) { img.setAttribute('src', lazy); return; }
    const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
    if (srcset) {
      const firstUrl = srcset.split(',')[0].trim().split(/\s+/)[0];
      if (firstUrl && !firstUrl.startsWith('data:')) {
        img.setAttribute('src', firstUrl);
        return;
      }
    }
    img.remove();
  });

  // Strip inline width/height from images so CSS can control proportions.
  tpl.content.querySelectorAll('img').forEach(img => {
    img.removeAttribute('width');
    img.removeAttribute('height');
    img.style.removeProperty('width');
    img.style.removeProperty('height');
  });

  // Collapse duplicate images. Normalize src by stripping query string,
  // Vox-style "-NNNN" size suffix (e.g. image-1200.jpg → image.jpg), and
  // common /NNNNxNNNN/ resize segments. Keep first occurrence.
  const normalizeImgSrc = (src) => {
    try {
      const u = new URL(src, location.href);
      let p = u.pathname.replace(/-\d{2,4}(?=\.[a-z]{3,4}$)/i, '')
                        .replace(/\/\d{2,4}x\d{2,4}\//g, '/');
      return u.hostname + p;
    } catch { return src; }
  };
  const seenImgs = new Set();
  tpl.content.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || '';
    if (!src) return;
    const key = normalizeImgSrc(src);
    if (seenImgs.has(key)) {
      const fig = img.closest('figure');
      if (fig && fig.querySelectorAll('img').length === 1) fig.remove();
      else img.remove();
    } else {
      seenImgs.add(key);
    }
  });

  // Remove inline SVGs — decorative section icons / UI chrome that leak through
  // Readability (e.g. Ars Technica category icons). Real diagrams use <img src="...svg">.
  tpl.content.querySelectorAll('svg').forEach(svg => {
    const parent = svg.parentElement;
    svg.remove();
    if (parent && !parent.textContent.trim() &&
        ['SPAN', 'DIV', 'P', 'A'].includes(parent.tagName)) {
      parent.remove();
    }
  });

  // Convert orphaned short <span> elements left after SVG removal into styled
  // opener phrases (e.g. Ars Technica's article teaser line).
  const BLOCK_TAGS = new Set(['P','DIV','H1','H2','H3','H4','H5','H6','LI','BLOCKQUOTE','TD','TH','ARTICLE','SECTION']);
  tpl.content.querySelectorAll('span').forEach(span => {
    // Skip spans that are inline children of block text
    if (BLOCK_TAGS.has(span.parentElement?.tagName || '')) return;
    // Skip if it contains block-level children
    if (span.querySelector('p,div,h1,h2,h3,ul,ol,table,figure')) return;
    const text = (span.textContent || '').trim();
    if (!text || text.length > 280) return;
    const opener = document.createElement('p');
    opener.className = 'reader-opener';
    opener.textContent = text;
    span.replaceWith(opener);
  });

  // Drop empty <li> (Verge sprinkles these in) and collapse empty lists.
  tpl.content.querySelectorAll('li').forEach(li => {
    const hasText  = (li.textContent || '').trim().length > 0;
    const hasMedia = li.querySelector('img, picture, video, iframe, svg') !== null;
    if (!hasText && !hasMedia) li.remove();
  });
  tpl.content.querySelectorAll('ul, ol').forEach(list => {
    if (list.children.length === 0) list.remove();
  });

  // Pass A: strip duplicate byline / preamble from the first 3 elements.
  // Length guard prevents matching the whole article wrapper accidentally.
  const byline = norm(bylineText || '');
  let checked = 0;
  while (root.firstElementChild && checked < 3) {
    const el = root.firstElementChild;
    const text = textOf(el);
    const lower = norm(text);
    const looksLikePreamble = /^(by |updated |published |posted |written by )/i.test(text) && text.length < 160;
    const matchesByline = byline && byline.length > 3 && lower.includes(byline) && text.length < 200;
    if (looksLikePreamble || matchesByline) {
      el.remove();
      checked++;
      continue;
    }
    break;
  }

  // Pass B: strip trailing footer promos, empty nodes, trailing <hr>s.
  while (root.lastElementChild) {
    const el = root.lastElementChild;
    const tag = el.tagName;
    const text = textOf(el);
    if (!text && tag !== 'IMG' && tag !== 'FIGURE') { el.remove(); continue; }
    if (tag === 'HR') { el.remove(); continue; }
    if (READER_FOOTER_RE.test(text) && text.length < 200) { el.remove(); continue; }
    const links = el.querySelectorAll ? el.querySelectorAll('a') : [];
    if (links.length === 1 && textOf(links[0]) === text && READER_FOOTER_RE.test(text)) {
      el.remove();
      continue;
    }
    break;
  }

  // Deduplicate identical short text blocks — catches repeated credit / caption
  // lines (e.g. "Credit: Aurich Lawson | Getty Images" appearing twice).
  const seenShortTexts = new Set();
  tpl.content.querySelectorAll('p, div, figcaption, cite, span').forEach(el => {
    const text = (el.textContent || '').trim();
    if (!text || text.length > 220) return; // only short blocks
    const key = text.toLowerCase().replace(/\s+/g, ' ');
    if (seenShortTexts.has(key)) { el.remove(); }
    else { seenShortTexts.add(key); }
  });

  return tpl.innerHTML;
}

async function openReader(article) {
  endReadSession({ silent: true });
  const panel = document.getElementById('reader-panel');
  const readerContent  = document.getElementById('reader-content');
  const readerLoading  = document.getElementById('reader-loading');
  const readerError    = document.getElementById('reader-error');
  const readerYoutube  = document.getElementById('reader-youtube');

  // Reset
  readerContent.classList.add('hidden');
  readerError.classList.add('hidden');
  readerYoutube.classList.add('hidden');
  readerLoading.classList.remove('hidden');

  document.getElementById('reader-source').textContent = article.feedName;
  document.getElementById('reader-lang').textContent   = article.lang;
  document.getElementById('reader-lang').dataset.lang  = article.lang;
  document.getElementById('reader-date').textContent   = article.date ? formatDateFull(article.date) : '';
  document.getElementById('reader-original-link').href = article.link;
  document.getElementById('reader-time').textContent   = '';

  openPanel('reader-panel');
  document.getElementById('reader-body').scrollTop = 0;

  // Podcast: auto-start the sticky player so audio survives reader dismiss
  if (article.audio?.url) playPodcast(article);

  // YouTube
  if (article.videoId) {
    readerLoading.classList.add('hidden');
    readerYoutube.classList.remove('hidden');
    document.getElementById('youtube-embed-container').innerHTML = `
      <div class="yt-video-title">${esc(article.title)}</div>
      <iframe
        src="https://www.youtube.com/embed/${esc(article.videoId)}?autoplay=0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy"
      ></iframe>
      <div class="yt-channel-name">📺 ${esc(article.feedName)}</div>
    `;
    return;
  }

  // Article fetch + Readability
  try {
    const html = await corsGet(article.link);
    const domParser = new DOMParser();
    const htmlDoc = domParser.parseFromString(html, 'text/html');

    // Fix relative URLs
    const base = htmlDoc.createElement('base');
    base.href = article.link;
    htmlDoc.head.appendChild(base);

    const pageTitle = htmlDoc.title || '';
    if (/security checkpoint|just a moment|attention required|ddos|vercel security/i.test(pageTitle))
      throw new Error(`Security checkpoint: "${pageTitle}"`);

    // Use Readability
    const { Readability } = await import('https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/+esm');
    const reader = new Readability(htmlDoc);
    const parsed = reader.parse();

    if (!parsed || !parsed.content) throw new Error('Readability returned nothing');

    const wordCount = (parsed.textContent || '').split(/\s+/).filter(Boolean).length;
    const readMins  = Math.max(1, Math.round(wordCount / 220));

    document.getElementById('reader-time').textContent = `· ~${readMins} min read`;

    const sample = (parsed.textContent || '').slice(0, 200);
    const isCJK = /[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/.test(sample);
    const proseClass = isCJK ? 'reader-prose is-cjk' : 'reader-prose';
    const cleanedContent = cleanReaderContent(parsed.content, parsed.byline || '');

    readerContent.innerHTML = `
      <h1>${esc(parsed.title || article.title)}</h1>
      ${parsed.byline ? `<p class="reader-byline">${esc(parsed.byline)}</p>` : ''}
      ${article.audio?.url ? `<button class="reader-play-inline" type="button">🎧 Play podcast</button>` : ''}
      <hr class="reader-rule">
      <div class="${proseClass}">${cleanedContent}</div>
    `;
    if (article.audio?.url) {
      readerContent.querySelector('.reader-play-inline')?.addEventListener('click', () => playPodcast(article));
    }

    readerLoading.classList.add('hidden');
    readerContent.classList.remove('hidden');
    document.getElementById('reader-body').scrollTop = 0;

    startReadSession(article);
    restoreProgressScroll(article);

  } catch (e) {
    console.warn('Reader failed:', e.message);
    readerLoading.classList.add('hidden');
    readerError.classList.remove('hidden');
    document.getElementById('reader-fallback-link').href = article.link;
  }
}

const _feedContainer = () => document.getElementById('feed-container');

// =====================================================
// READ PROGRESS (Continue Reading)
// =====================================================
// Stored as { [link]: { pct, scrollTop, scrollHeight, elapsedMs, lastAt,
//   title, feedName, feedId, feedDomain, lang, section, thumbnail,
//   videoId, audio, author, summary, date, isCreator } }
// TTL 42h, deleted when pct >= PROGRESS_DONE_THRESHOLD, only saved when
// the reader has been active for >= PROGRESS_MIN_MS.
const PROGRESS_KEY = 'dailybao_read_progress';
const PROGRESS_TTL_MS = 42 * 60 * 60 * 1000;
const PROGRESS_MIN_MS = 60 * 1000;
const PROGRESS_DONE_THRESHOLD = 0.95;

let readSession = null; // { article, openedAt, elapsedMs, visibleAt, raf }

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProgressMap(map) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(map)); } catch {}
  debouncedSyncProgress(map);
}

function purgeExpiredProgress() {
  const map = loadProgress();
  const now = Date.now();
  let changed = false;
  for (const [k, v] of Object.entries(map)) {
    if (!v?.lastAt || now - v.lastAt > PROGRESS_TTL_MS) {
      delete map[k];
      changed = true;
    }
  }
  if (changed) saveProgressMap(map);
}

function getProgress(link) {
  const map = loadProgress();
  const entry = map[link];
  if (!entry) return null;
  if (Date.now() - (entry.lastAt || 0) > PROGRESS_TTL_MS) return null;
  if ((entry.pct || 0) >= PROGRESS_DONE_THRESHOLD) return null;
  return entry;
}

function removeProgress(link) {
  const map = loadProgress();
  if (!map[link]) return;
  delete map[link];
  saveProgressMap(map);
}

function persistProgress({ finalize = false } = {}) {
  if (!readSession) return;
  const { article } = readSession;
  if (!article?.link) return;

  const body = document.getElementById('reader-body');
  if (!body) return;
  const scrollTop    = body.scrollTop;
  const scrollHeight = body.scrollHeight - body.clientHeight;
  const pct = scrollHeight > 0 ? Math.max(0, Math.min(1, scrollTop / scrollHeight)) : 0;

  // Accumulate elapsed time while the tab is visible and reader is open
  if (readSession.visibleAt) {
    readSession.elapsedMs += Date.now() - readSession.visibleAt;
    readSession.visibleAt = Date.now();
  }

  // Once completed, don't re-add to progress
  if (readSession._wasCompleted) return;

  if (pct >= PROGRESS_DONE_THRESHOLD) {
    // Only notify if the article was actually tracked in Continue Reading
    const map = loadProgress();
    if (map[article.link]) {
      delete map[article.link];
      saveProgressMap(map);
      readSession._wasCompleted = true;
    }
    return;
  }

  // New articles: must read ≥ 1 min before tracking starts
  // Re-opened "continue read" articles: save immediately
  if (!readSession.isContinueRead && readSession.elapsedMs < PROGRESS_MIN_MS) return;

  const map = loadProgress();
  map[article.link] = {
    pct,
    scrollTop,
    scrollHeight,
    elapsedMs: readSession.elapsedMs,
    lastAt:   Date.now(),
    title:    article.title,
    feedId:   article.feedId,
    feedName: article.feedName,
    feedDomain: article.feedDomain,
    lang:     article.lang,
    section:  article.section,
    thumbnail: article.thumbnail || '',
    videoId:  article.videoId || '',
    audio:    article.audio || null,
    author:   article.author || '',
    summary:  article.summary || '',
    date:     article.date ? (article.date instanceof Date ? article.date.toISOString() : article.date) : null,
    link:     article.link,
    isCreator: !!article.isCreator,
  };
  saveProgressMap(map);
}

function startReadSession(article) {
  endReadSession({ silent: true });
  readSession = {
    article,
    openedAt:     Date.now(),
    elapsedMs:    0,
    visibleAt:    document.visibilityState === 'visible' ? Date.now() : null,
    isContinueRead: !!getProgress(article.link), // re-read: skip 1-min gate
  };

  const body = document.getElementById('reader-body');
  if (!body) return;
  const onScroll = () => persistProgress();
  body.addEventListener('scroll', onScroll, { passive: true });
  readSession.cleanup = () => body.removeEventListener('scroll', onScroll);

  // Tick every 5s so time-spent persists even without scrolling
  readSession.timer = setInterval(() => persistProgress(), 5000);
}

function endReadSession(opts = {}) {
  if (!readSession) return;
  if (!opts.silent) persistProgress({ finalize: true });
  if (readSession.cleanup) readSession.cleanup();
  if (readSession.timer) clearInterval(readSession.timer);
  const wasCompleted = readSession._wasCompleted;
  readSession = null;
  if (!opts.silent) syncProgressToFirestore(loadProgress());
  if (!opts.silent && wasCompleted) showToast('Finished — removed from Continue Reading ✓');
}

document.addEventListener('visibilitychange', () => {
  if (!readSession) return;
  if (document.visibilityState === 'visible') {
    readSession.visibleAt = Date.now();
  } else {
    if (readSession.visibleAt) {
      readSession.elapsedMs += Date.now() - readSession.visibleAt;
      readSession.visibleAt = null;
    }
    persistProgress();
  }
});

window.addEventListener('pagehide', () => persistProgress({ finalize: true }));

function renderContinueReading() {
  purgeExpiredProgress();
  const block = document.getElementById('continue-reading-block');
  const list  = document.getElementById('continue-list');
  const count = document.getElementById('continue-count');
  if (!block || !list) return;

  const map = loadProgress();
  const entries = Object.values(map)
    .filter(e => (e.pct || 0) < PROGRESS_DONE_THRESHOLD)
    .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));

  if (entries.length === 0) {
    block.hidden = true;
    return;
  }

  block.hidden = false;
  count.textContent = entries.length;
  block.open = true;
  list.innerHTML = '';

  entries.forEach(e => {
    const item = document.createElement('div');
    item.className = 'continue-item';
    const pct = Math.round((e.pct || 0) * 100);
    const ago = e.lastAt ? formatDate(new Date(e.lastAt)) : '';
    item.innerHTML = `
      <div class="continue-body">
        <div class="continue-title">${esc(e.title || e.link)}</div>
        <div class="continue-meta">
          <span>${esc(e.feedName || '')}</span>
          ${ago ? `<span>· ${esc(ago)}</span>` : ''}
          <span>· ${pct}%</span>
        </div>
        <div class="continue-progress"><div class="continue-progress-bar" style="width:${pct}%"></div></div>
      </div>
      <button class="btn-continue-remove" title="Remove from list">✕</button>
    `;
    item.addEventListener('click', ev => {
      if (ev.target.closest('.btn-continue-remove')) return;
      closePanel('settings-panel');
      const article = {
        id:         `continue-${e.link}`,
        feedId:     e.feedId,
        feedName:   e.feedName || '',
        feedDomain: e.feedDomain || '',
        lang:       e.lang || '',
        section:    e.section || '',
        title:      e.title || '',
        summary:    e.summary || '',
        link:       e.link,
        author:     e.author || '',
        date:       e.date ? new Date(e.date) : null,
        videoId:    e.videoId || '',
        thumbnail:  e.thumbnail || '',
        audio:      e.audio || null,
        isCreator:  !!e.isCreator,
      };
      openReader(article);
    });
    item.querySelector('.btn-continue-remove').addEventListener('click', ev => {
      ev.stopPropagation();
      removeProgress(e.link);
      renderContinueReading();
    });
    list.appendChild(item);
  });
}

// =====================================================
// READ PROGRESS — FIRESTORE CROSS-DEVICE SYNC
// =====================================================
const PROGRESS_FIRESTORE_CAP = 30;

function capProgressMap(map) {
  const entries = Object.entries(map);
  if (entries.length <= PROGRESS_FIRESTORE_CAP) return map;
  entries.sort((a, b) => (b[1].lastAt || 0) - (a[1].lastAt || 0));
  return Object.fromEntries(entries.slice(0, PROGRESS_FIRESTORE_CAP));
}

let _progressSyncTimer = null;
function debouncedSyncProgress(map) {
  clearTimeout(_progressSyncTimer);
  _progressSyncTimer = setTimeout(() => syncProgressToFirestore(map), 2000);
}

async function syncProgressToFirestore(map) {
  if (!currentUser) return;
  try {
    const ref = doc(db, 'users', currentUser.uid);
    await setDoc(ref, { readProgress: capProgressMap(map) }, { merge: true });
  } catch {}
}

async function loadProgressFromFirestore() {
  if (!currentUser) return;
  try {
    const ref = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(ref);
    const remote = snap.exists() ? (snap.data().readProgress || {}) : {};
    if (!Object.keys(remote).length) return;
    const local = loadProgress();
    let changed = false;
    for (const [link, entry] of Object.entries(remote)) {
      if (!local[link] || (entry.lastAt || 0) > (local[link].lastAt || 0)) {
        local[link] = entry;
        changed = true;
      }
    }
    if (changed) saveProgressMap(local);
  } catch {}
}

function restoreProgressScroll(article) {
  const entry = getProgress(article.link);
  if (!entry) return;
  const body = document.getElementById('reader-body');
  if (!body) return;
  // Defer until content is laid out; use current scrollHeight, fall back to saved ratio
  requestAnimationFrame(() => {
    const curMax = body.scrollHeight - body.clientHeight;
    const target = entry.scrollHeight > 0
      ? entry.pct * curMax
      : entry.scrollTop;
    body.scrollTop = Math.max(0, target);
  });
}

// =====================================================
// AUDIO PLAYER (podcast)
// =====================================================
// Persistent sticky player with MediaSession API for lock-screen controls.
// Survives reader dismissal — audio keeps playing in the background.
const RATE_STEPS = [1, 1.25, 1.5, 2, 0.75];
const AUDIO_STATE_KEY = 'dailybao_audio_state';

let currentAudioArticle = null;

function formatTime(s) {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${ss}` : `${m}:${ss}`;
}

function saveAudioState() {
  if (!currentAudioArticle) return;
  const el = document.getElementById('audio-el');
  try {
    localStorage.setItem(AUDIO_STATE_KEY, JSON.stringify({
      articleLink: currentAudioArticle.link,
      position: el.currentTime || 0,
      rate: el.playbackRate || 1,
      savedAt: Date.now(),
    }));
  } catch {}
}

function playPodcast(article) {
  if (!article.audio?.url) return;
  const player = document.getElementById('audio-player');
  const el = document.getElementById('audio-el');
  const thumb = document.getElementById('ap-thumb');

  if (currentAudioArticle?.link !== article.link) {
    currentAudioArticle = article;
    el.src = article.audio.url;
    document.getElementById('ap-title').textContent = article.title || '';
    document.getElementById('ap-source').textContent = article.feedName || '';
    thumb.src = article.thumbnail || '';
    thumb.onerror = () => { thumb.src = ''; };

    // Visual cue: flash the player bar so the user sees the track swap
    player.classList.remove('track-change');
    // force reflow so the animation restarts on consecutive track changes
    void player.offsetWidth;
    player.classList.add('track-change');

    // MediaSession metadata (lock screen / notification / bluetooth controls)
    if ('mediaSession' in navigator) {
      const artwork = article.thumbnail
        ? [{ src: article.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
        : [];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: article.title || 'Podcast',
        artist: article.feedName || 'The Daily Bao',
        album: article.section || 'Podcast',
        artwork,
      });
    }
  }

  player.classList.remove('hidden');
  document.body.classList.add('audio-active');
  el.play().catch(e => console.warn('Audio play failed:', e?.message));
}

function togglePodcast() {
  const el = document.getElementById('audio-el');
  if (!el.src) return;
  if (el.paused) el.play().catch(() => {});
  else el.pause();
}

function closePodcast() {
  const el = document.getElementById('audio-el');
  el.pause();
  el.removeAttribute('src');
  el.load();
  currentAudioArticle = null;
  document.getElementById('audio-player').classList.add('hidden');
  document.body.classList.remove('audio-active');
  try { localStorage.removeItem(AUDIO_STATE_KEY); } catch {}
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
}

(function initAudioPlayer() {
  const el = document.getElementById('audio-el');
  const playBtn = document.getElementById('ap-play');
  const back15 = document.getElementById('ap-back15');
  const fwd30 = document.getElementById('ap-fwd30');
  const rateBtn = document.getElementById('ap-rate');
  const closeBtn = document.getElementById('ap-close');
  const seek = document.getElementById('ap-seek');
  const timeCur = document.getElementById('ap-time-cur');
  const timeDur = document.getElementById('ap-time-dur');

  playBtn.addEventListener('click', togglePodcast);
  back15.addEventListener('click', () => { el.currentTime = Math.max(0, el.currentTime - 15); });
  fwd30.addEventListener('click', () => { el.currentTime = Math.min(el.duration || 0, el.currentTime + 30); });
  closeBtn.addEventListener('click', closePodcast);

  rateBtn.addEventListener('click', () => {
    const idx = RATE_STEPS.indexOf(el.playbackRate);
    const next = RATE_STEPS[(idx + 1) % RATE_STEPS.length];
    el.playbackRate = next;
    rateBtn.textContent = `${next}×`;
    saveAudioState();
  });

  el.addEventListener('play',  () => { playBtn.textContent = '❚❚'; });
  el.addEventListener('pause', () => { playBtn.textContent = '▶'; });
  el.addEventListener('ended', () => { playBtn.textContent = '▶'; });

  el.addEventListener('loadedmetadata', () => {
    seek.max = el.duration || 100;
    timeDur.textContent = formatTime(el.duration);
  });

  let seeking = false;
  el.addEventListener('timeupdate', () => {
    if (seeking) return;
    seek.value = el.currentTime;
    timeCur.textContent = formatTime(el.currentTime);
  });
  seek.addEventListener('input', () => { seeking = true; timeCur.textContent = formatTime(+seek.value); });
  seek.addEventListener('change', () => { el.currentTime = +seek.value; seeking = false; });

  // Persist playback position every few seconds
  let lastSave = 0;
  el.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastSave > 3000) { lastSave = now; saveAudioState(); }
  });
  window.addEventListener('beforeunload', saveAudioState);

  // MediaSession action handlers (lock screen controls)
  if ('mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    try { ms.setActionHandler('play',  () => el.play().catch(() => {})); } catch {}
    try { ms.setActionHandler('pause', () => el.pause()); } catch {}
    try { ms.setActionHandler('seekbackward', (d) => { el.currentTime = Math.max(0, el.currentTime - (d.seekOffset || 15)); }); } catch {}
    try { ms.setActionHandler('seekforward',  (d) => { el.currentTime = Math.min(el.duration || 0, el.currentTime + (d.seekOffset || 30)); }); } catch {}
    try { ms.setActionHandler('seekto', (d) => { if (d.fastSeek && 'fastSeek' in el) el.fastSeek(d.seekTime); else el.currentTime = d.seekTime; }); } catch {}
    try { ms.setActionHandler('stop', closePodcast); } catch {}
  }
})();

// =====================================================
// SETTINGS PANEL
// =====================================================
function renderFeedList() {
  const list = document.getElementById('feed-list');
  const count = document.getElementById('feed-count');
  count.textContent = userFeeds.length;
  list.innerHTML = '';

  // Group feeds by section, preserving insertion order.
  // Also include user-created empty categories so they show up even without feeds.
  const groups = new Map();
  userCategories.forEach(sec => { if (sec) groups.set(sec, []); });
  userFeeds.forEach(feed => {
    const sec = feed.section || 'Other';
    if (!groups.has(sec)) groups.set(sec, []);
    groups.get(sec).push(feed);
  });

  groups.forEach((feeds, secName) => {
    const details = document.createElement('details');
    details.className = 'feed-section-group';
    if (activeSection === secName) details.classList.add('section-active');
    details.open = true;

    const summary = document.createElement('summary');
    const labelSpan = document.createElement('span');
    labelSpan.className = 'feed-section-label';
    labelSpan.textContent = sectionLabel(secName);
    labelSpan.title = 'Click to filter by this category';
    const filterBySection = () => {
      activeFeed = null;
      activeSection = activeSection === secName ? 'all' : secName;
      renderTabs();
      renderFeedList();
      renderFeed();
      closePanel('settings-panel');
      _feedContainer()?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const countSpan = document.createElement('span');
    countSpan.className = 'feed-section-count';
    countSpan.textContent = feeds.length;
    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn-rename-section';
    renameBtn.title = 'Rename section';
    renameBtn.textContent = '✎';
    renameBtn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const input = document.createElement('input');
      input.type = 'text';
      input.value = secName;
      input.className = 'section-rename-input';
      labelSpan.replaceWith(input);
      input.focus(); input.select();
      const commit = async () => {
        const newName = input.value.trim();
        if (newName && newName !== secName) {
          if (activeSection === secName) activeSection = newName;
          userFeeds = userFeeds.map(f => f.section === secName ? { ...f, section: newName } : f);
          userCategories = userCategories.map(c => c === secName ? newName : c);
          await saveUserFeeds();
          renderFeedList();
          renderTabs();
          updateSectionsDatalist();
          renderFeed();
        } else {
          input.replaceWith(labelSpan);
        }
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
        if (ev.key === 'Escape') { ev.preventDefault(); input.replaceWith(labelSpan); }
      });
    });

    // Delete-category button — only safe when empty
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-rename-section';
    deleteBtn.title = 'Remove category';
    deleteBtn.textContent = '🗑';
    deleteBtn.style.marginLeft = '0.1rem';
    deleteBtn.addEventListener('click', async e => {
      e.preventDefault(); e.stopPropagation();
      if (feeds.length > 0) {
        showToast('Move or remove the sources in this category first.');
        return;
      }
      if (!confirm(`Remove empty category "${secName}"?`)) return;
      userCategories = userCategories.filter(c => c !== secName);
      if (activeSection === secName) activeSection = 'all';
      await saveUserFeeds();
      renderFeedList();
      renderTabs();
      updateSectionsDatalist();
      renderFeed();
    });

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'feed-section-toggle';
    toggleBtn.title = 'Expand / collapse';
    toggleBtn.setAttribute('aria-label', 'Expand / collapse');
    toggleBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    summary.appendChild(labelSpan);
    summary.appendChild(renameBtn);
    if (feeds.length === 0) summary.appendChild(deleteBtn);
    summary.appendChild(countSpan);
    summary.appendChild(toggleBtn);

    // summary click routing: toggleBtn → collapse/expand; rename/delete → their handlers; else → filter
    summary.addEventListener('click', e => {
      e.preventDefault(); // always block native <details> toggle
      if (e.target.closest('.feed-section-toggle')) { details.classList.toggle('collapsed'); return; }
      if (e.target.closest('.btn-rename-section')) return;
      filterBySection();
    });
    summary.addEventListener('touchend', e => {
      if (e.target.closest('.btn-rename-section')) return;
      e.preventDefault();
      if (e.target.closest('.feed-section-toggle')) { details.classList.toggle('collapsed'); return; }
      filterBySection();
    }, { passive: false });

    details.appendChild(summary);

    const contentInner = document.createElement('div');
    contentInner.className = 'feed-section-content-inner';

    if (feeds.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'continue-empty';
      hint.style.padding = '0.4rem 0.9rem';
      hint.textContent = 'No sources yet — use "+ Add" to add one here.';
      contentInner.appendChild(hint);
    }

    feeds.forEach(feed => {
      const el = document.createElement('div');
      el.className = 'feed-item' + (activeFeed === feed.id ? ' feed-item-active' : '');
      el.dataset.feedId = feed.id;
      el.dataset.section = secName;
      el.draggable = true;
      el.innerHTML = `
        <span class="feed-drag-handle" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
        <div class="feed-item-info">
          <div class="feed-item-name">${esc(feed.name)}</div>
          <div class="feed-item-section">
            <span class="lang-badge" data-lang="${esc(feed.lang)}" style="font-size:0.6rem;padding:0.1rem 0.35rem">${esc(feed.lang)}</span>
          </div>
        </div>
        <div class="feed-item-actions">
          <button class="btn-edit" title="Edit & test">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-remove" title="Remove">✕</button>
        </div>
      `;

      // Click the info area to filter by this feed
      const filterByFeed = e => {
        if (el.classList.contains('actions-visible')) return;
        e.preventDefault();
        activeFeed = activeFeed === feed.id ? null : feed.id;
        activeSection = 'all';
        renderFeed();
        renderFeedList();
        closePanel('settings-panel');
        _feedContainer()?.scrollTo({ top: 0, behavior: 'smooth' });
      };
      el.querySelector('.feed-item-info').addEventListener('click', filterByFeed);
      el.querySelector('.feed-item-info').addEventListener('touchend', filterByFeed, { passive: false });

      // Long-press on mobile to reveal edit/delete
      let lpTimer = null;
      el.addEventListener('touchstart', () => {
        lpTimer = setTimeout(() => el.classList.add('actions-visible'), 600);
      }, { passive: true });
      el.addEventListener('touchend',  () => clearTimeout(lpTimer));
      el.addEventListener('touchmove', () => clearTimeout(lpTimer));

      // Drag-and-drop to reorder within a category (and move across categories)
      el.addEventListener('dragstart', ev => {
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', feed.id);
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        document.querySelectorAll('.feed-item.drop-above, .feed-item.drop-below')
          .forEach(x => x.classList.remove('drop-above', 'drop-below'));
      });
      el.addEventListener('dragover', ev => {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
        const rect = el.getBoundingClientRect();
        const above = (ev.clientY - rect.top) < rect.height / 2;
        el.classList.toggle('drop-above', above);
        el.classList.toggle('drop-below', !above);
      });
      el.addEventListener('dragleave', () => {
        el.classList.remove('drop-above', 'drop-below');
      });
      el.addEventListener('drop', async ev => {
        ev.preventDefault();
        const srcId = ev.dataTransfer.getData('text/plain');
        const above = el.classList.contains('drop-above');
        el.classList.remove('drop-above', 'drop-below');
        if (!srcId || srcId === feed.id) return;
        await reorderFeeds(srcId, feed.id, secName, above);
      });

      el.querySelector('.btn-edit').addEventListener('click', (e) => { e.stopPropagation(); openEditFeed(feed.id); });
      el.querySelector('.btn-remove').addEventListener('click', (e) => { e.stopPropagation(); removeFeed(feed.id); });
      contentInner.appendChild(el);
    });

    const contentDiv = document.createElement('div');
    contentDiv.className = 'feed-section-content';
    contentDiv.appendChild(contentInner);
    details.appendChild(contentDiv);

    list.appendChild(details);
  });

  // Expand / collapse all toggle on the "Your feeds" header
  const toggle = document.getElementById('feed-list-toggle');
  const chevron = document.getElementById('feed-list-chevron');
  toggle.onclick = () => {
    const allDetails = list.querySelectorAll('details');
    const anyExpanded = [...allDetails].some(d => !d.classList.contains('collapsed'));
    allDetails.forEach(d => d.classList.toggle('collapsed', anyExpanded));
    chevron.classList.toggle('collapsed', anyExpanded);
  };
}

async function reorderFeeds(srcId, targetId, targetSection, above) {
  const src = userFeeds.find(f => f.id === srcId);
  if (!src) return;
  // Pull src out, mutate its section to match the drop target, then insert
  // above or below the target in userFeeds order.
  const without = userFeeds.filter(f => f.id !== srcId);
  const moved = { ...src, section: targetSection };
  const idx = without.findIndex(f => f.id === targetId);
  if (idx === -1) return;
  const insertAt = above ? idx : idx + 1;
  without.splice(insertAt, 0, moved);
  userFeeds = without;
  await saveUserFeeds();
  renderFeedList();
  renderTabs();
  updateSectionsDatalist();
  renderFeed();
}

async function removeFeed(feedId) {
  const feed = userFeeds.find(f => f.id === feedId);
  if (!feed) return;
  if (!confirm(`Yeet "${feed.name}" from your sources?`)) return;
  userFeeds = userFeeds.filter(f => f.id !== feedId);
  await saveUserFeeds();
  renderFeedList();
  renderTabs();
  updateSectionsDatalist();
  allArticles = allArticles.filter(a => a.feedId !== feedId);
  renderFeed();
}

// =====================================================
// EDIT FEED
// =====================================================
let editingFeedId = null;

async function openEditFeed(feedId) {
  const feed = userFeeds.find(f => f.id === feedId);
  if (!feed) return;
  editingFeedId = feedId;

  document.getElementById('edit-feed-url').value     = feed.url;
  document.getElementById('edit-feed-name').value    = feed.name;
  document.getElementById('edit-feed-section').value = feed.section;
  document.getElementById('edit-feed-lang').value    = feed.lang;

  const ytGroup = document.getElementById('edit-yt-filter-group');
  if (feed.url.includes('youtube.com/feeds')) {
    ytGroup.classList.remove('hidden');
    const current = feed.ytFilter || 'all';
    document.querySelectorAll('input[name="edit-yt-filter"]').forEach(r => {
      r.checked = (r.value === current);
    });
  } else {
    ytGroup.classList.add('hidden');
  }

  const results = document.getElementById('edit-test-results');
  const status  = document.getElementById('edit-test-status');
  results.innerHTML    = '<div class="test-loading">Fetching feed...</div>';
  status.textContent   = '';
  status.className     = 'detect-status';

  openModal('edit-feed-modal');

  try {
    const articles = await fetchFeed(feed);
    if (articles.length === 0) throw new Error('empty');

    status.textContent = `✓ ${articles.length} articles found`;
    status.className   = 'detect-status success';
    results.innerHTML  = articles.slice(0, 3).map(a => `
      <div class="test-article">
        <div class="test-article-title">${esc(a.title)}</div>
        ${a.date ? `<div class="test-article-date">${formatDate(a.date)}</div>` : ''}
      </div>
    `).join('');
  } catch {
    status.textContent = '✗ Could not fetch feed';
    status.className   = 'detect-status error';
    results.innerHTML  = '<div class="test-error">Feed may be unavailable or blocked by the CORS proxy.</div>';
  }
}

document.getElementById('save-edit-btn').addEventListener('click', async () => {
  if (!editingFeedId) return;
  const idx = userFeeds.findIndex(f => f.id === editingFeedId);
  if (idx === -1) return;

  const newName = document.getElementById('edit-feed-name').value.trim();
  const updated = {
    ...userFeeds[idx],
    name:    newName || userFeeds[idx].name,
    section: document.getElementById('edit-feed-section').value,
    lang:    document.getElementById('edit-feed-lang').value,
  };
  if (updated.url.includes('youtube.com/feeds')) {
    const sel = document.querySelector('input[name="edit-yt-filter"]:checked');
    updated.ytFilter = sel ? sel.value : (updated.ytFilter || 'all');
  }
  userFeeds[idx] = updated;
  allArticles = allArticles.map(a =>
    a.feedId === editingFeedId ? { ...a, section: updated.section } : a
  );

  await saveUserFeeds();
  renderFeedList();
  renderTabs();
  updateSectionsDatalist();
  renderFeed();
  closeModal('edit-feed-modal');
});

document.getElementById('edit-feed-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('edit-feed-modal')) closeModal('edit-feed-modal');
});

// =====================================================
// ADD FEED
// =====================================================
document.getElementById('add-feed-btn').addEventListener('click', () => {
  closePanel('settings-panel');
  openModal('add-feed-modal');
});
document.getElementById('empty-settings-btn').addEventListener('click', () => {
  openPanel('settings-panel');
});

document.getElementById('detect-feed-btn').addEventListener('click', async () => {
  const url = document.getElementById('feed-url-input').value.trim();
  if (!url) return;
  const status = document.getElementById('detect-status');
  status.textContent = 'Detecting RSS feed...';
  status.className   = 'detect-status';

  try {
    // Try URL directly as RSS first
    const feedUrl = await detectFeedUrl(url);
    document.getElementById('feed-url-input').value = feedUrl;

    if (feedUrl.includes('youtube.com/feeds')) {
      document.getElementById('youtube-helper').classList.remove('hidden');
    }

    // Auto-fill name from feed title
    const xml = await corsGet(feedUrl);
    const xmlDoc = new DOMParser().parseFromString(xml, 'application/xml');
    const title = xmlDoc.querySelector('channel > title, feed > title')?.textContent?.trim();
    if (title && !document.getElementById('feed-name-input').value) {
      document.getElementById('feed-name-input').value = title.slice(0, 40);
    }

    status.textContent = '✓ RSS feed found!';
    status.className   = 'detect-status success';
  } catch (e) {
    if (looksLikeRssUrl(url)) {
      const normalized = url.startsWith('http') ? url : `https://${url}`;
      document.getElementById('feed-url-input').value = normalized;
      status.textContent = '⚠ Can\u2019t verify (might be a private/tokenized feed). Click Add Source to save it anyway.';
      status.className   = 'detect-status warn';
    } else {
      status.textContent = '✗ Could not detect RSS. Try pasting the direct RSS URL.';
      status.className   = 'detect-status error';
    }
  }
});

function looksLikeRssUrl(url) {
  return /\/feed(\/|$|\.)|\/rss(\/|$|\.)|\.xml(\?|$)|\/atom(\/|$|\.)/i.test(url);
}

async function resolveXhsShortLink(shortUrl) {
  // allorigins /get returns JSON with finalUrl (the URL after all redirects)
  try {
    const r = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(shortUrl)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await r.json();
    if (data.finalUrl?.includes('/profile/')) return data.finalUrl;
    const m = (data.contents || '').match(/\/user\/profile\/([\w]+)/);
    if (m) return `https://www.xiaohongshu.com/user/profile/${m[1]}`;
  } catch { /* fall through */ }
  // Last resort: fetch raw and scan HTML
  const html = await corsGet(shortUrl);
  const m = html.match(/\/user\/profile\/([\w]+)/);
  if (m) return `https://www.xiaohongshu.com/user/profile/${m[1]}`;
  throw new Error('Could not resolve xhslink short URL');
}

async function detectFeedUrl(inputUrl) {
  const url = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`;

  // Already a YouTube feed URL — pass through
  if (/youtube\.com\/feeds\/videos\.xml\?channel_id=UC[\w-]+/i.test(url)) return url;

  // Already has a raw channel ID — UCxxx
  const rawChannelMatch = url.match(/(UC[\w-]{20,})/);
  if (rawChannelMatch && /youtube\.com|youtu\.be/i.test(url)) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${rawChannelMatch[1]}`;
  }

  // YouTube channel/handle/custom URL — scrape for channel ID
  const ytMatch = url.match(/youtube\.com\/(?:@[\w.-]+|channel\/[\w-]+|c\/[\w.-]+|user\/[\w.-]+)/i);
  if (ytMatch) {
    const channelId = await resolveYouTubeChannelId(url);
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  }

  // Check if it's an XHS/Rednote URL (pc share)
  if (url.includes('xiaohongshu.com') || url.includes('rednote.com')) {
    const xhsMatch = url.match(/profile\/([\w]+)/);
    if (xhsMatch) return `https://rsshub.app/xiaohongshu/user/${xhsMatch[1]}`;
    throw new Error('Could not extract XHS user ID');
  }

  // Check if it's an xhslink.com short URL (phone share)
  if (url.includes('xhslink.com')) {
    const resolved = await resolveXhsShortLink(url);
    const xhsMatch = resolved.match(/profile\/([\w]+)/);
    if (xhsMatch) return `https://rsshub.app/xiaohongshu/user/${xhsMatch[1]}`;
    throw new Error('Could not extract XHS user ID from short link');
  }

  // Try direct URL as RSS
  try {
    const xml = await corsGet(url);
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('rss, feed, channel')) return url;
  } catch { /* not an RSS URL */ }

  // Fetch page and look for RSS link
  const html = await corsGet(url);
  const htmlDoc = new DOMParser().parseFromString(html, 'text/html');
  const rssLink = htmlDoc.querySelector('link[type="application/rss+xml"], link[type="application/atom+xml"]');
  if (rssLink) {
    const href = rssLink.getAttribute('href');
    return href.startsWith('http') ? href : new URL(href, url).toString();
  }

  throw new Error('No RSS feed detected');
}

const YT_SHORT_CACHE_KEY = 'dailybao_yt_short_cache';
const YT_SHORT_CACHE_MAX = 2000;
let ytShortCache = null;
function loadYtShortCache() {
  if (ytShortCache) return ytShortCache;
  try { ytShortCache = JSON.parse(localStorage.getItem(YT_SHORT_CACHE_KEY) || '{}'); }
  catch { ytShortCache = {}; }
  return ytShortCache;
}
function saveYtShortCache() {
  const keys = Object.keys(ytShortCache);
  if (keys.length > YT_SHORT_CACHE_MAX) {
    const trimmed = {};
    keys.slice(-YT_SHORT_CACHE_MAX).forEach(k => { trimmed[k] = ytShortCache[k]; });
    ytShortCache = trimmed;
  }
  try { localStorage.setItem(YT_SHORT_CACHE_KEY, JSON.stringify(ytShortCache)); } catch {}
}
async function getYtIsShort(videoId) {
  if (!videoId) return null;
  const cache = loadYtShortCache();
  if (videoId in cache) return cache[videoId];
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const j = await res.json();
    const w = j.thumbnail_width || 0;
    const h = j.thumbnail_height || 0;
    if (!w || !h) return null;
    const isShort = h > w;
    cache[videoId] = isShort;
    saveYtShortCache();
    return isShort;
  } catch { return null; }
}

async function applyYtFilter(articles, feed) {
  if (!feed.url.includes('youtube.com/feeds')) return articles;
  const filter = feed.ytFilter || 'all';
  if (filter === 'all') return articles;
  await Promise.all(articles.map(async a => {
    if (a.videoId) a.ytIsShort = await getYtIsShort(a.videoId);
  }));
  if (filter === 'long')   return articles.filter(a => a.ytIsShort !== true);
  if (filter === 'shorts') return articles.filter(a => a.ytIsShort === true);
  return articles;
}

async function resolveYouTubeChannelId(channelUrl) {
  // Fast path: already a /channel/UC... URL
  const idMatch = channelUrl.match(/channel\/(UC[\w-]{20,})/);
  if (idMatch) return idMatch[1];

  // Scrape the channel page — try multiple patterns. YouTube embeds the
  // channel ID under several keys depending on the page variant.
  const html = await corsGet(channelUrl);
  const patterns = [
    /"channelId":"(UC[\w-]{20,})"/,
    /"externalId":"(UC[\w-]{20,})"/,
    /"externalChannelId":"(UC[\w-]{20,})"/,
    /"browseId":"(UC[\w-]{20,})"/,
    /<link\s+rel="canonical"\s+href="https?:\/\/www\.youtube\.com\/channel\/(UC[\w-]{20,})"/i,
    /<meta\s+itemprop="channelId"\s+content="(UC[\w-]{20,})"/i,
    /youtube\.com\/channel\/(UC[\w-]{20,})/,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  throw new Error('Could not resolve YouTube channel ID — try pasting the /channel/UC... URL directly');
}

document.getElementById('save-feed-btn').addEventListener('click', async () => {
  const url     = document.getElementById('feed-url-input').value.trim();
  const name    = document.getElementById('feed-name-input').value.trim();
  const section = document.getElementById('feed-section-input').value;
  const lang    = document.getElementById('feed-lang-input').value;

  if (!url || !name) {
    alert('Please fill in the URL and name.');
    return;
  }

  const newFeed = {
    id:      `custom-${Date.now()}`,
    name,
    url,
    lang,
    section,
  };

  if (url.includes('youtube.com/feeds')) {
    const sel = document.querySelector('input[name="feed-yt-filter"]:checked');
    newFeed.ytFilter = sel ? sel.value : 'all';
  }

  const btn = document.getElementById('save-feed-btn');
  const origLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    userFeeds.push(newFeed);
    await saveUserFeeds();
  } catch (e) {
    userFeeds = userFeeds.filter(f => f.id !== newFeed.id);
    btn.disabled = false;
    btn.textContent = origLabel;
    alert('Could not save — check your connection and try again.');
    return;
  }

  btn.disabled = false;
  btn.textContent = origLabel;
  renderFeedList();
  renderTabs();
  updateSectionsDatalist();
  closeModal('add-feed-modal');
  openPanel('settings-panel');

  // Silently fetch the new feed in the background — no overlay
  fetchFeed(newFeed)
    .then(newArticles => {
      const seenUrls = new Set(allArticles.map(a => a.link));
      const fresh = newArticles.filter(a => !seenUrls.has(a.link));
      if (fresh.length) {
        allArticles = [...fresh, ...allArticles];
        sortArticles();
        saveCache();
        renderFeed();
      }
    })
    .catch(e => logFeed(newFeed.name, 'error', e?.message || String(e)));
});

// Quick-add YouTube/XHS helpers
document.querySelectorAll('.quick-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    document.querySelectorAll('.quick-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.getElementById('youtube-helper').classList.toggle('hidden', type !== 'youtube');
    document.getElementById('xhs-helper').classList.toggle('hidden', type !== 'xhs');

    if (type === 'youtube') {
      document.getElementById('feed-section-input').value = 'Creators';
      document.getElementById('feed-lang-input').value    = 'EN';
    }
    if (type === 'xhs') {
      document.getElementById('feed-section-input').value = 'Creators';
      document.getElementById('feed-lang-input').value    = '繁';
    }
  });
});

// =====================================================
// PANEL / MODAL CONTROLS
// =====================================================
function openPanel(id) {
  document.getElementById(id).classList.remove('hidden');
  requestAnimationFrame(() => document.getElementById(id).classList.add('open'));
  document.getElementById('panel-backdrop').classList.remove('hidden');
  document.body.classList.add('body-locked');
}
function closePanel(id) {
  document.getElementById(id).classList.remove('open');
  hidePanelBackdrop();
  updateBodyLock();
}
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.classList.add('body-locked');
  // Reset form
  document.getElementById('feed-url-input').value     = '';
  document.getElementById('feed-name-input').value    = '';
  document.getElementById('detect-status').textContent = '';
  document.querySelectorAll('.quick-pill').forEach(b => b.classList.remove('active'));
  document.getElementById('youtube-helper').classList.add('hidden');
  document.getElementById('xhs-helper').classList.add('hidden');
  const ytAll = document.querySelector('input[name="feed-yt-filter"][value="all"]');
  if (ytAll) ytAll.checked = true;
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  updateBodyLock();
}

function hidePanelBackdrop() {
  const openPanels = document.querySelectorAll('.side-panel.open, .reader-panel.open');
  if (openPanels.length === 0) document.getElementById('panel-backdrop').classList.add('hidden');
}

function updateBodyLock() {
  const anyOpen =
    document.querySelectorAll('.side-panel.open, .reader-panel.open').length > 0 ||
    document.querySelectorAll('.modal-overlay:not(.hidden)').length > 0;
  if (anyOpen) {
    document.body.classList.add('body-locked');
  } else {
    document.body.classList.remove('body-locked');
  }
}

// Close buttons (data-close attribute)
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.close;
    if (document.getElementById(target).classList.contains('modal-overlay')) {
      closeModal(target);
    } else {
      closePanel(target);
    }
  });
});

document.getElementById('panel-backdrop').addEventListener('click', () => {
  const readerOpenNow = document.querySelector('.reader-panel.open');
  document.querySelectorAll('.side-panel.open, .reader-panel.open').forEach(p => p.classList.remove('open'));
  if (readerOpenNow) endReadSession();
  hidePanelBackdrop();
  updateBodyLock();
});

document.getElementById('user-btn').addEventListener('click', () => {
  renderFeedList();
  renderContinueReading();
  openPanel('settings-panel');
});
document.getElementById('reader-back-btn').addEventListener('click', () => {
  endReadSession();
  closePanel('reader-panel');
});

// Swipe-to-dismiss for slide-in panels (left-edge swipe)
function addSwipeToDismiss(panel) {
  let startX = 0, startY = 0, dragging = false, initiated = false;

  panel.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    initiated = dragging = startX < 40;
  }, { passive: true });

  panel.addEventListener('touchmove', e => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - startX;
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (dx < 0 || dy > dx) { dragging = false; return; }
    panel.style.transition = 'none';
    panel.style.transform = `translateX(${dx}px)`;
  }, { passive: true });

  panel.addEventListener('touchend', e => {
    if (!initiated) return;
    initiated = false;
    const wasDragging = dragging;
    dragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    if (wasDragging && dx >= 80) {
      panel.style.transition = 'transform 0.25s ease';
      panel.style.transform = 'translateX(100%)';
      panel.addEventListener('transitionend', () => {
        panel.style.transition = '';
        panel.style.transform = '';
        panel.classList.remove('open');
        if (panel.id === 'reader-panel') endReadSession();
        hidePanelBackdrop();
        updateBodyLock();
      }, { once: true });
    } else {
      panel.style.transition = '';
      panel.style.transform = '';
    }
  }, { passive: true });
}

addSwipeToDismiss(document.getElementById('reader-panel'));
addSwipeToDismiss(document.getElementById('settings-panel'));

// Swipe from right edge of screen → open settings panel
(function addSwipeToOpen() {
  let startX = 0, startY = 0, armed = false;
  document.body.addEventListener('touchstart', e => {
    const panel = document.getElementById('settings-panel');
    if (panel.classList.contains('open')) { armed = false; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    armed = startX > window.innerWidth - 30;
  }, { passive: true });
  document.body.addEventListener('touchmove', e => {
    if (!armed) return;
    const dy = Math.abs(e.touches[0].clientY - startY);
    const dx = e.touches[0].clientX - startX;
    if (dy > Math.abs(dx)) armed = false;
  }, { passive: true });
  document.body.addEventListener('touchend', e => {
    if (!armed) return;
    armed = false;
    const dx = e.changedTouches[0].clientX - startX;
    if (dx < -60) { renderFeedList(); renderContinueReading(); openPanel('settings-panel'); }
  }, { passive: true });
})();

// Close modal on backdrop click
document.getElementById('add-feed-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('add-feed-modal')) closeModal('add-feed-modal');
});

// Clear long-press action reveal when tapping outside any feed item
document.addEventListener('touchstart', e => {
  if (!e.target.closest('.feed-item')) {
    document.querySelectorAll('.feed-item.actions-visible').forEach(el => el.classList.remove('actions-visible'));
  }
}, { passive: true });

// =====================================================
// TABS & FILTERS
// =====================================================
function handleTabClick(e) {
  document.querySelectorAll('#section-tabs .tab').forEach(t => t.classList.remove('active'));
  e.currentTarget.classList.add('active');
  activeSection = e.currentTarget.dataset.section;
  renderFeed();
}

function renderTabs() {
  const nav = document.getElementById('section-tabs');
  nav.querySelectorAll('.tab:not([data-section="all"])').forEach(t => t.remove());

  const seen = new Set();
  userFeeds.forEach(f => {
    const sec = f.section || 'Other';
    if (!seen.has(sec)) {
      seen.add(sec);
      const btn = document.createElement('button');
      btn.className = 'tab';
      btn.dataset.section = sec;
      btn.textContent = sectionLabel(sec);
      btn.addEventListener('click', handleTabClick);
      nav.appendChild(btn);
    }
  });

  // Wire up the static "All" tab (may not exist if nav is hidden)
  const allTab = nav.querySelector('.tab[data-section="all"]');
  if (allTab) allTab.onclick = handleTabClick;

  // Restore active state
  let restored = false;
  nav.querySelectorAll('.tab').forEach(t => {
    if (t.dataset.section === activeSection) { t.classList.add('active'); restored = true; }
    else t.classList.remove('active');
  });
  if (!restored) {
    activeSection = 'all';
    if (allTab) allTab.classList.add('active');
  }
}

function updateSectionsDatalist() {
  const dl = document.getElementById('sections-datalist');
  if (!dl) return;
  dl.innerHTML = '';
  const seen = new Set();
  const addOpt = sec => {
    if (!sec || seen.has(sec)) return;
    seen.add(sec);
    const opt = document.createElement('option');
    opt.value = sec;
    dl.appendChild(opt);
  };
  userCategories.forEach(addOpt);
  userFeeds.forEach(f => addOpt(f.section || 'Other'));
}

document.getElementById('add-category-btn')?.addEventListener('click', async () => {
  const name = prompt('New category name (e.g. Sports, Gaming):');
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  const already = userCategories.includes(trimmed) ||
                  userFeeds.some(f => f.section === trimmed);
  if (already) {
    showToast(`"${trimmed}" already exists.`);
    return;
  }
  userCategories.push(trimmed);
  await saveUserFeeds();
  renderFeedList();
  renderTabs();
  updateSectionsDatalist();
});

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeLang = btn.dataset.lang;
    renderFeed();
  });
});

// =====================================================
// REFRESH
// =====================================================
document.getElementById('refresh-btn').addEventListener('click', async () => {
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('spinning');
  await fetchAllFeeds({ silent: true });
  btn.classList.remove('spinning');
});

// =====================================================
// THEME TOGGLE
// =====================================================
const themeBtn = document.getElementById('theme-toggle');
let isDark = (localStorage.getItem('theme') ?? 'light') === 'dark';
document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
themeBtn.textContent = isDark ? '☀️ Cope' : '🌙 Vibe';
themeBtn.addEventListener('click', () => {
  isDark = !isDark;
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  themeBtn.textContent = isDark ? '☀️ Cope' : '🌙 Vibe';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// =====================================================
// LOADING STATE
// =====================================================
function setLoadingState(loading) {
  const overlay = document.getElementById('loading-overlay');
  if (loading) {
    overlay.classList.remove('hidden');
    document.getElementById('loading-msg').textContent = LOADING_MSGS[Math.floor(Math.random() * LOADING_MSGS.length)];
  } else {
    overlay.classList.add('hidden');
  }
}

function updateLastUpdated() {
  const el = document.getElementById('last-updated');
  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const hh = now.getHours().toString().padStart(2,'0');
  const mm = now.getMinutes().toString().padStart(2,'0');
  el.textContent = `Updated ${now.getDate()} ${months[now.getMonth()]}, ${hh}:${mm}`;
}

// =====================================================
// HELPERS
// =====================================================
function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Decode HTML entities (e.g. &#39; → ', &amp; → &). Some feeds double-encode
// titles / summaries — this unwraps them once before we hand off to esc().
function decodeEntities(s) {
  if (!s) return '';
  const ta = document.createElement('textarea');
  ta.innerHTML = s;
  return ta.value;
}

// Normalize a title for dedup: lowercase, collapse whitespace, strip common
// trailing "(podcast)" / "[audio]" markers that Stratechery-style feeds use
// to differentiate the audio variant from the written one.
function normalizeTitle(t) {
  return (t || '')
    .toLowerCase()
    .replace(/\s*[\[\(][^\]\)]*(podcast|audio|interview|listen)[^\]\)]*[\]\)]\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Merge articles that are the same story published twice (written + podcast).
// Keep the first occurrence but steal audio / thumbnail / richer summary from
// the sibling so the surviving card has all the signals.
function mergeDuplicateTitles(articles) {
  const byTitle = new Map();
  const out = [];
  for (const a of articles) {
    const key = normalizeTitle(a.title);
    if (!key) { out.push(a); continue; }
    const existing = byTitle.get(key);
    if (!existing) {
      byTitle.set(key, a);
      out.push(a);
    } else {
      if (!existing.audio && a.audio) existing.audio = a.audio;
      if (!existing.thumbnail && a.thumbnail) existing.thumbnail = a.thumbnail;
      if ((a.summary?.length || 0) > (existing.summary?.length || 0)) existing.summary = a.summary;
      if (!existing.videoId && a.videoId) existing.videoId = a.videoId;
    }
  }
  return out;
}

function formatDate(date) {
  if (!date) return '';
  const now  = new Date();
  const diff = (now - date) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateFull(date) {
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function sectionLabel(s) { return s; }

// =====================================================
// PULL-TO-REFRESH
// =====================================================
const PTR_PULL_MSGS = [
  "Keep going... the news won't refresh itself...",
  "Almost... just a little more suffering...",
  "The bao is watching. Pull harder.",
  "Are you sure about this? No going back.",
  "This is your last chance to live in ignorance.",
  "One more tug and chaos is yours.",
  "Pulling fresh anxiety from the cloud...",
  "The algorithm fears you.",
  "Every headline you're about to read is someone's bad day.",
  "Bracing for impact...",
];
const PTR_READY_MSGS = [
  "Release for fresh chaos 🍞",
  "Let go, coward. Do it. 🍞",
  "Yes! YES! Release! 🍞",
  "The bao is ready. Are you? 🍞",
  "Drop it like it's hot news 🍞",
  "Moment of truth. Release. 🍞",
];

(function () {
  const ptrEl = document.getElementById('ptr-indicator');
  const ptrText = document.getElementById('ptr-text');
  const refreshBtn = document.getElementById('refresh-btn');
  let ptrStartY = 0, ptrActive = false, wasReady = false;
  const PTR_THRESHOLD = 70;

  document.addEventListener('touchstart', e => {
    if ((_feedContainer()?.scrollTop ?? 0) === 0 && !refreshBtn.classList.contains('spinning')) {
      ptrStartY = e.touches[0].clientY;
      ptrActive = true;
      wasReady = false;
      ptrText.textContent = PTR_PULL_MSGS[Math.floor(Math.random() * PTR_PULL_MSGS.length)];
    }
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!ptrActive) return;
    const dy = e.touches[0].clientY - ptrStartY;
    if (dy > 5) {
      ptrEl.classList.add('pulling');
      const ready = dy >= PTR_THRESHOLD;
      ptrEl.classList.toggle('ready', ready);
      if (ready && !wasReady) {
        wasReady = true;
        ptrText.textContent = PTR_READY_MSGS[Math.floor(Math.random() * PTR_READY_MSGS.length)];
      } else if (!ready && wasReady) {
        wasReady = false;
        ptrText.textContent = PTR_PULL_MSGS[Math.floor(Math.random() * PTR_PULL_MSGS.length)];
      }
    } else {
      ptrEl.classList.remove('pulling', 'ready');
    }
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!ptrActive) return;
    ptrActive = false;
    const dy = e.changedTouches[0].clientY - ptrStartY;
    ptrEl.classList.remove('pulling', 'ready');
    if (dy >= PTR_THRESHOLD && !refreshBtn.classList.contains('spinning')) {
      refreshBtn.classList.add('spinning');
      fetchAllFeeds({ silent: true }).then(() => refreshBtn.classList.remove('spinning'));
    }
    ptrText.textContent = 'Pull to refresh';
  }, { passive: true });
})();

// =====================================================
// TOAST
// =====================================================
function showToast(msg, duration = 4000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);
}
