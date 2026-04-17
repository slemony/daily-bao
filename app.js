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
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

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
// AUTH
// =====================================================
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    showApp(user);
    await loadUserFeeds();
    await fetchAllFeeds();
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
  for (const proxy of CORS_PROXIES) {
    try {
      const resp = await fetch(proxy(url), { signal: AbortSignal.timeout(12000) });
      if (resp.ok) return await resp.text();
    } catch { /* try next proxy */ }
  }
  throw new Error(`All proxies failed for: ${url}`);
}

function parseRSS(xmlText, feed) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const isAtom = !!doc.querySelector('feed');
  const items = isAtom ? doc.querySelectorAll('entry') : doc.querySelectorAll('item');
  const articles = [];

  items.forEach(item => {
    const getText = tag => item.querySelector(tag)?.textContent?.trim() || '';
    const getAttr = (tag, attr) => item.querySelector(tag)?.getAttribute(attr) || '';

    let link = '';
    if (isAtom) {
      link = getAttr('link[rel="alternate"]', 'href') || getAttr('link', 'href') || getText('link');
    } else {
      link = getText('link') || getText('guid');
    }

    const title   = getText('title');
    const summary = getText(isAtom ? 'summary' : 'description').replace(/<[^>]*>/g, '').slice(0, 200);
    const dateStr = getText(isAtom ? 'updated' : 'pubDate');
    const date    = dateStr ? new Date(dateStr) : null;

    // YouTube: extract video ID and thumbnail
    let videoId   = '';
    let thumbnail = '';
    const ytId = item.querySelector('videoId');
    if (ytId) {
      videoId   = ytId.textContent.trim();
      thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
    const mediaThumbnail = item.querySelector('thumbnail');
    if (mediaThumbnail) thumbnail = mediaThumbnail.getAttribute('url') || thumbnail;

    if (!title || !link) return;

    articles.push({
      id:        `${feed.id}-${link}`,
      feedId:    feed.id,
      feedName:  feed.name,
      lang:      feed.lang,
      section:   feed.section,
      title,
      summary,
      link,
      date,
      videoId,
      thumbnail,
      isCreator: feed.section === 'Creators',
    });
  });

  return articles.slice(0, 8);
}

async function fetchFeed(feed) {
  try {
    const xml = await corsGet(feed.url);
    return parseRSS(xml, feed);
  } catch (e) {
    console.warn(`Failed to fetch ${feed.name}:`, e.message);
    return [];
  }
}

async function fetchAllFeeds() {
  setLoadingState(true);
  allArticles = [];

  const results = await Promise.allSettled(userFeeds.map(fetchFeed));
  results.forEach(r => {
    if (r.status === 'fulfilled') allArticles.push(...r.value);
  });

  // Sort newest first
  allArticles.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date - a.date;
  });

  updateLastUpdated();
  setLoadingState(false);
  renderFeed();
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

  userFeeds.forEach(feed => {
    const el = document.createElement('div');
    el.className = 'feed-item';
    el.innerHTML = `
      <div class="feed-item-info">
        <div class="feed-item-name">${esc(feed.name)}</div>
        <div class="feed-item-section">
          <span class="lang-badge" data-lang="${esc(feed.lang)}" style="font-size:0.6rem;padding:0.1rem 0.35rem">${esc(feed.lang)}</span>
          ${esc(sectionLabel(feed.section))}
        </div>
      </div>
      <button class="btn-remove" data-feed-id="${esc(feed.id)}" title="Remove">✕</button>
    `;
    el.querySelector('.btn-remove').addEventListener('click', () => removeFeed(feed.id));
    list.appendChild(el);
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

async function detectFeedUrl(inputUrl) {
  const url = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`;

  // Check if it's a YouTube channel URL
  const ytMatch = url.match(/youtube\.com\/@([\w-]+)|youtube\.com\/channel\/([\w-]+)|youtube\.com\/c\/([\w-]+)/);
  if (ytMatch) {
    const channelId = await resolveYouTubeChannelId(url);
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  }

  // Check if it's an XHS URL
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) {
    const xhsMatch = url.match(/profile\/([\w]+)/);
    if (xhsMatch) return `https://rsshub.app/xiaohongshu/user/${xhsMatch[1]}`;
    throw new Error('Could not extract XHS user ID');
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

  // Fetch the new feed
  setLoadingState(true);
  const newArticles = await fetchFeed(newFeed);
  allArticles.push(...newArticles);
  allArticles.sort((a, b) => (b.date || 0) - (a.date || 0));
  setLoadingState(false);
  renderFeed();
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

document.getElementById('settings-btn').addEventListener('click', () => openPanel('settings-panel'));
document.getElementById('reader-back-btn').addEventListener('click', () => closePanel('reader-panel'));

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
  await fetchAllFeeds();
  btn.classList.remove('spinning');
});

// =====================================================
// THEME TOGGLE
// =====================================================
const themeBtn = document.getElementById('theme-toggle');
let isDark = true;
themeBtn.addEventListener('click', () => {
  isDark = !isDark;
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  themeBtn.textContent = isDark ? '☀️ Cope' : '🌙 Vibe';
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
  el.textContent = `Updated ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
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
