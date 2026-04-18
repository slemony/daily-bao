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

let currentUser  = null;
let userFeeds    = [];
let allArticles  = [];    // flat array of fetched articles
let activeSection = 'all';
let activeLang    = 'all';
let readerOpen    = false;

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
      userFeeds = snap.data().feeds || DEFAULT_FEEDS;
    } else {
      userFeeds = [...DEFAULT_FEEDS];
      await saveUserFeeds();
    }
  } catch (e) {
    console.warn('Firestore unavailable, using defaults:', e.message);
    userFeeds = [...DEFAULT_FEEDS];
    showToast('⚠️ Could not load your feeds from cloud — showing defaults');
  }
  renderFeedList();
}

async function saveUserFeeds() {
  try {
    const ref = doc(db, 'users', currentUser.uid);
    await setDoc(ref, { feeds: userFeeds }, { merge: true });
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
  return result.items.slice(0, 15).map(item => {
    const rawSummary = item.contentEncoded || item.content || item.contentSnippet || item.summary || '';
    const summary = rawSummary.replace(/<[^>]*>/g, '').trim().slice(0, 200);

    let videoId = item.ytVideoId || '';
    let thumbnail = '';
    if (videoId) thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    if (item.mediaThumbnail) thumbnail = item.mediaThumbnail['$']?.url || thumbnail;

    const link = item.link || item.guid || '';
    const title = item.title || '';
    if (!title || !link) return null;

    return {
      id:        `${feed.id}-${link}`,
      feedId:    feed.id,
      feedName:  feed.name,
      lang:      feed.lang,
      section:   feed.section,
      title,
      summary,
      link,
      date:      item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : null),
      videoId,
      thumbnail,
      isCreator: feed.section === 'Creators',
    };
  }).filter(Boolean);
}

function parseRss2json(json, feed) {
  return json.items.slice(0, 15).map(item => {
    const rawSummary = item.content || item.description || '';
    const summary = rawSummary.replace(/<[^>]*>/g, '').trim().slice(0, 200);
    const link = item.link || item.guid || '';
    const title = item.title || '';
    if (!title || !link) return null;
    return {
      id:        `${feed.id}-${link}`,
      feedId:    feed.id,
      feedName:  feed.name,
      lang:      feed.lang,
      section:   feed.section,
      title,
      summary,
      link,
      date:      item.pubDate ? new Date(item.pubDate) : null,
      videoId:   '',
      thumbnail: item.thumbnail || '',
      isCreator: feed.section === 'Creators',
    };
  }).filter(Boolean);
}

async function fetchFeed(feed) {
  try {
    const xml = await corsGet(feed.url);
    return await parseRSS(xml, feed);
  } catch { /* all XML proxies failed, try rss2json */ }

  const r = await fetch(
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`,
    { signal: AbortSignal.timeout(12000) }
  );
  const json = await r.json();
  if (json.status === 'ok') return parseRss2json(json, feed);
  throw new Error(`All sources failed for: ${feed.name}`);
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
        const fresh = articles.filter(a => !seenUrls.has(a.link));
        logFeed(feed.name, 'ok', `${fresh.length} new (${articles.length} total)`);
        if (fresh.length) {
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
    chip.textContent = `⚠ ${count} feed${count > 1 ? 's' : ''} failed`;
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

  card.innerHTML = `
    <div class="card-meta">
      <span class="section-dot" data-section="${esc(a.section)}"></span>
      <span class="card-source">${esc(a.feedName)}</span>
      <span class="lang-badge" data-lang="${esc(a.lang)}">${esc(a.lang)}</span>
      ${a.date ? `<span class="card-date">${formatDate(a.date)}</span>` : ''}
    </div>
    <div class="card-title">${esc(a.title)}</div>
    ${a.summary ? `<div class="card-summary">${esc(a.summary)}</div>` : ''}
    <div class="card-actions">
      <button class="btn-read" data-article-id="${esc(a.id)}">Read →</button>
    </div>
  `;

  card.querySelector('.btn-read').addEventListener('click', () => openReader(a));
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
async function openReader(article) {
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

    // Use Readability
    const { Readability } = await import('https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/+esm');
    const reader = new Readability(htmlDoc);
    const parsed = reader.parse();

    if (!parsed || !parsed.content) throw new Error('Readability returned nothing');

    const wordCount = (parsed.textContent || '').split(/\s+/).filter(Boolean).length;
    const readMins  = Math.max(1, Math.round(wordCount / 220));

    document.getElementById('reader-time').textContent = `· ~${readMins} min read`;

    readerContent.innerHTML = `
      <h1>${esc(parsed.title || article.title)}</h1>
      ${parsed.byline ? `<p style="font-size:0.8rem;color:var(--text-dim);margin-bottom:1.25rem">${esc(parsed.byline)}</p>` : ''}
      <div>${parsed.content}</div>
    `;

    readerLoading.classList.add('hidden');
    readerContent.classList.remove('hidden');
    document.getElementById('reader-body').scrollTop = 0;

  } catch (e) {
    console.warn('Reader failed:', e.message);
    readerLoading.classList.add('hidden');
    readerError.classList.remove('hidden');
    document.getElementById('reader-fallback-link').href = article.link;
  }
}

// =====================================================
// SETTINGS PANEL
// =====================================================
function renderFeedList() {
  const list = document.getElementById('feed-list');
  const count = document.getElementById('feed-count');
  count.textContent = userFeeds.length;
  list.innerHTML = '';

  // Group feeds by section, preserving insertion order
  const groups = new Map();
  userFeeds.forEach(feed => {
    const sec = feed.section || 'Other';
    if (!groups.has(sec)) groups.set(sec, []);
    groups.get(sec).push(feed);
  });

  groups.forEach((feeds, secName) => {
    const details = document.createElement('details');
    details.className = 'feed-section-group';
    details.open = true;

    const summary = document.createElement('summary');
    summary.innerHTML = `<span>${esc(sectionLabel(secName))}</span><span class="feed-section-count">${feeds.length}</span>`;
    details.appendChild(summary);

    feeds.forEach(feed => {
      const el = document.createElement('div');
      el.className = 'feed-item';
      el.innerHTML = `
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
      el.querySelector('.btn-edit').addEventListener('click', () => openEditFeed(feed.id));
      el.querySelector('.btn-remove').addEventListener('click', () => removeFeed(feed.id));
      details.appendChild(el);
    });

    list.appendChild(details);
  });
}

async function removeFeed(feedId) {
  userFeeds = userFeeds.filter(f => f.id !== feedId);
  await saveUserFeeds();
  renderFeedList();
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

  const results = document.getElementById('edit-test-results');
  const status  = document.getElementById('edit-test-status');
  results.innerHTML    = '<div class="test-loading">Fetching feed...</div>';
  status.textContent   = '';
  status.className     = 'detect-status';

  openModal('edit-feed-modal');

  try {
    const xml      = await corsGet(feed.url);
    const articles = parseRSS(xml, feed);
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
  userFeeds[idx] = {
    ...userFeeds[idx],
    name:    newName || userFeeds[idx].name,
    section: document.getElementById('edit-feed-section').value,
    lang:    document.getElementById('edit-feed-lang').value,
  };

  await saveUserFeeds();
  renderFeedList();
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
    status.textContent = '✗ Could not detect RSS. Try pasting the direct RSS URL.';
    status.className   = 'detect-status error';
  }
});

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

  // Check if it's a YouTube channel URL
  const ytMatch = url.match(/youtube\.com\/@([\w-]+)|youtube\.com\/channel\/([\w-]+)|youtube\.com\/c\/([\w-]+)/);
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

async function resolveYouTubeChannelId(channelUrl) {
  // Try to scrape channel page for canonical channel ID
  const html = await corsGet(channelUrl);
  const match = html.match(/"channelId":"(UC[\w-]+)"/);
  if (match) return match[1];
  // Fallback: extract from URL if it's already a /channel/ URL
  const idMatch = channelUrl.match(/channel\/(UC[\w-]+)/);
  if (idMatch) return idMatch[1];
  throw new Error('Could not resolve YouTube channel ID');
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

  userFeeds.push(newFeed);
  await saveUserFeeds();
  renderFeedList();
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
}
function closePanel(id) {
  document.getElementById(id).classList.remove('open');
  hidePanelBackdrop();
}
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  // Reset form
  document.getElementById('feed-url-input').value     = '';
  document.getElementById('feed-name-input').value    = '';
  document.getElementById('detect-status').textContent = '';
  document.querySelectorAll('.quick-pill').forEach(b => b.classList.remove('active'));
  document.getElementById('youtube-helper').classList.add('hidden');
  document.getElementById('xhs-helper').classList.add('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function hidePanelBackdrop() {
  const openPanels = document.querySelectorAll('.side-panel.open, .reader-panel.open');
  if (openPanels.length === 0) document.getElementById('panel-backdrop').classList.add('hidden');
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
  document.querySelectorAll('.side-panel.open').forEach(p => p.classList.remove('open'));
  hidePanelBackdrop();
});

document.getElementById('user-btn').addEventListener('click', () => openPanel('settings-panel'));
document.getElementById('reader-back-btn').addEventListener('click', () => closePanel('reader-panel'));

// Swipe-to-dismiss reader panel (left-edge swipe)
(function () {
  const panel = document.getElementById('reader-panel');
  let startX = 0, startY = 0, dragging = false;

  panel.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dragging = startX < 40;
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
    if (!dragging) return;
    dragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    if (dx >= 80) {
      panel.style.transition = 'transform 0.25s ease';
      panel.style.transform = 'translateX(100%)';
      panel.addEventListener('transitionend', () => {
        panel.style.transition = '';
        panel.style.transform = '';
        panel.classList.remove('open');
        hidePanelBackdrop();
      }, { once: true });
    } else {
      panel.style.transition = '';
      panel.style.transform = '';
    }
  }, { passive: true });
})();

// Close modal on backdrop click
document.getElementById('add-feed-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('add-feed-modal')) closeModal('add-feed-modal');
});

// =====================================================
// TABS & FILTERS
// =====================================================
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeSection = tab.dataset.section;
    renderFeed();
  });
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

function sectionLabel(s) {
  const map = {
    'World News': '🔥 What\'s Burning',
    'Tech & AI':  '🤓 Nerd Alert',
    'Business':   '💸 Money Stuff',
    'Creators':   '🎬 Creator Watch',
  };
  return map[s] || s;
}

// =====================================================
// PULL-TO-REFRESH
// =====================================================
(function () {
  const ptrEl = document.getElementById('ptr-indicator');
  const refreshBtn = document.getElementById('refresh-btn');
  let ptrStartY = 0, ptrActive = false, ptrTriggered = false;
  const PTR_THRESHOLD = 70;

  document.addEventListener('touchstart', e => {
    if (window.scrollY === 0 && !refreshBtn.classList.contains('spinning')) {
      ptrStartY = e.touches[0].clientY;
      ptrActive = true;
      ptrTriggered = false;
    }
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!ptrActive) return;
    const dy = e.touches[0].clientY - ptrStartY;
    if (dy > 5) {
      ptrEl.classList.add('pulling');
      ptrEl.classList.toggle('ready', dy >= PTR_THRESHOLD);
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
