// Muse · Catch — Content Script v3
// Twitter/X 点赞/收藏自动捕获 + 微信公众号阅读自动捕获 + 手动捕获

const DEFAULT_API = 'http://localhost:5200/api/ingest';
const CAPTURED_URLS = new Set(); // URL dedup for session

// ============ 通用 — Toast 视觉反馈 ============
function showToast(msg, ok = true) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:2147483647;
    background:${ok?'#1d1d2e':'#4a1528'}; color:#e0e0e0;
    padding:10px 18px; border-radius:10px; font-size:13px;
    font-family:system-ui,sans-serif; box-shadow:0 4px 18px rgba(0,0,0,.5);
    border:1px solid ${ok?'#6366f1':'#ef4444'};
    pointer-events:none; opacity:0; transform:translateY(12px);
    transition:opacity .25s,transform .25s;
  `;
  el.textContent = (ok ? '🌀 ' : '⚠️ ') + msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(12px)'; }, 2800);
  setTimeout(() => el.remove(), 3100);
}

// ============ 通用 — 消息处理 ============
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_SELECTED_TEXT') {
    sendResponse({ text: window.getSelection()?.toString()?.trim() || '' });
  }
  if (msg.type === 'GET_PAGE_CONTENT') {
    sendResponse({ content: extractPage(), meta: getMeta() });
  }
  return true;
});

// ============ 通用 — 页面提取 ============
function extractPage() {
  const article = document.querySelector('article');
  const main = document.querySelector('main');
  const source = article || main || document.body;
  if (!source) return '';
  const clone = source.cloneNode(true);
  clone.querySelectorAll('script, style, nav, footer, header, aside, noscript, iframe, svg')
    .forEach(el => el.remove());
  return (clone.innerText || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 3000);
}
function getMeta() {
  return {
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || ''
  };
}

// ============ 通用 — 发送到 Muse ============
async function sendToMuse(payload) {
  try {
    // Read the user-configured API URL from storage (same key popup/background
    // use) so a custom endpoint set in Settings applies here too. Falls back to
    // DEFAULT_API when unset. Previously this was a hardcoded const, which meant
    // the Twitter/WeChat/WeRead auto-capture ignored the configured URL.
    const stored = await chrome.storage.local.get('apiUrl');
    const apiUrl = stored.apiUrl || DEFAULT_API;
    const r = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (r.ok) {
      const d = await r.json();
      console.log('[Muse] ✅', d.title?.slice(0, 30) || 'captured');
      return { ok: true, title: d.title };
    }
    return { ok: false, error: `HTTP ${r.status}` };
  } catch (e) {
    console.log('[Muse] ⚠️ API unreachable — is Muse server running?');
    return { ok: false, error: 'API unreachable' };
  }
}

// ============ Twitter/X — 监听点赞/收藏/书签 ============
const host = location.hostname;
if (host.includes('twitter.com') || host.includes('x.com')) {
  const capturedTweetIds = new Set();
  const captureCooldown = new Map(); // tweetId → timestamp

  function findTweetArticle(el) {
    // Try multiple ways to find the tweet container
    return el.closest('article[data-testid="tweet"]')
      || el.closest('[data-testid="tweet"]')
      || el.closest('article');
  }

  function extractTweet(el) {
    const tweet = findTweetArticle(el);
    if (!tweet) return null;

    // Try multiple text selectors (X changes these sometimes)
    const textEl = tweet.querySelector('[data-testid="tweetText"]')
      || tweet.querySelector('[lang]');
    const text = textEl?.innerText?.trim() || '';
    if (!text || text.length < 3) return null;

    // Author — multiple fallback selectors
    const authorEl = tweet.querySelector('[data-testid="User-Name"]')
      || tweet.querySelector('a[role="link"][href*="/"][tabindex="-1"]');
    const authorText = authorEl?.innerText || '';
    const author = authorText.split('\n')[0]?.replace(/@/, '')?.trim() || '';

    // Tweet URL — find status link
    const timeLink = tweet.querySelector('a[href*="/status/"] time')
      || tweet.querySelector('a[href*="/status/"]');
    const linkEl = timeLink?.closest('a[href*="/status/"]')
      || tweet.querySelector('a[href*="/status/"]');
    const href = linkEl?.getAttribute('href') || '';
    const url = href.startsWith('http') ? href : `https://x.com${href}`;
    const tweetId = href.match(/\/status\/(\d+)/)?.[1] || '';

    return { text, author, url, tweetId };
  }

  // Click-based detection (like / bookmark buttons)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest([
      '[data-testid="like"]', '[data-testid="unlike"]',
      '[data-testid="bookmark"]', '[data-testid="removeBookmark"]',
      '[aria-label*="Like"]', '[aria-label*="Bookmark"]',
      '[aria-label*="like"]', '[aria-label*="bookmark"]',
      '[aria-label*="赞"]', '[aria-label*="收藏"]',
      '[d*="M17.863"]',  // heart SVG path (liked state)
    ].join(','));
    if (!btn) return;

    const tweet = extractTweet(btn);
    if (!tweet || !tweet.tweetId) return;

    // Dedup: never capture same tweet twice in this session
    if (capturedTweetIds.has(tweet.tweetId)) return;

    // Cooldown: prevent double-fire from duplicate button clicks
    const last = captureCooldown.get(tweet.tweetId);
    if (last && Date.now() - last < 5000) return;

    capturedTweetIds.add(tweet.tweetId);
    captureCooldown.set(tweet.tweetId, Date.now());

    sendToMuse({
      source: 'twitter',
      content: tweet.text,
      title: tweet.text.slice(0, 80),
      url: tweet.url,
      note: `🐦 @${tweet.author} · ${tweet.tweetId}`,
      tags: ['Twitter', '推文']
    }).then((res) => {
      if (res.ok) showToast(`已捕获推文 @${tweet.author || '...'}`);
      else showToast('Muse API 未连接，请启动本地服务', false);
    });
  }, true);

  // Also watch for keyboard shortcuts (L for like)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'l' && !e.target.closest('input,textarea,[contenteditable]')) {
      // L key pressed on Twitter = like. Wait for DOM update then try to capture.
      setTimeout(() => {
        const focused = document.activeElement;
        if (!focused) return;
        const tweet = extractTweet(focused);
        if (!tweet || !tweet.tweetId || capturedTweetIds.has(tweet.tweetId)) return;
        capturedTweetIds.add(tweet.tweetId);
        captureCooldown.set(tweet.tweetId, Date.now());
        sendToMuse({
          source: 'twitter',
          content: tweet.text,
          title: tweet.text.slice(0, 80),
          url: tweet.url,
          note: `🐦 @${tweet.author} · ${tweet.tweetId}`,
          tags: ['Twitter', '推文']
        }).then((res) => {
          if (res.ok) showToast(`已捕获推文 @${tweet.author || '...'}`);
        });
      }, 600);
    }
  }, true);
}

// ============ 微信公众号 — 阅读3秒自动捕获 ============
if (host.includes('mp.weixin.qq.com')) {
  let captureTimer = null;
  let activeMs = 0;
  let captured = false;

  function extractWechatArticle() {
    const title = document.querySelector('#activity-name')?.innerText?.trim()
      || document.querySelector('.rich_media_title')?.innerText?.trim()
      || document.title;
    const author = document.querySelector('#js_name')?.innerText?.trim()
      || document.querySelector('.rich_media_meta_text')?.innerText?.trim()
      || document.querySelector('#js_author_name')?.innerText?.trim()
      || '';
    const content = document.querySelector('#js_content')?.innerText?.trim()
      || document.querySelector('.rich_media_content')?.innerText?.trim()
      || '';
    return { title, author, content };
  }

  function tryCapture() {
    if (captured) return;

    // Dedup by URL
    const dedupKey = 'wx:' + location.pathname;
    if (CAPTURED_URLS.has(dedupKey)) {
      captured = true;
      return;
    }

    const { title, author, content } = extractWechatArticle();
    if (!title) return;

    captured = true;
    CAPTURED_URLS.add(dedupKey);

    sendToMuse({
      source: 'wechat',
      content: content.slice(0, 3000),
      title: title.slice(0, 80),
      url: location.href,
      note: `📱 公众号 · ${author}`,
      tags: ['公众号', '微信']
    }).then((res) => {
      if (res.ok) showToast(`已捕获: ${title.slice(0, 25)}`);
      else showToast('Muse API 未连接', false);
    });
  }

  // Start timer only when page is visible
  function startTimer() {
    if (captureTimer) clearInterval(captureTimer);
    captureTimer = setInterval(() => {
      activeMs += 200;
      if (activeMs >= 3000) {
        clearInterval(captureTimer);
        captureTimer = null;
        tryCapture();
      }
    }, 200);
  }

  function stopTimer() {
    if (captureTimer) {
      clearInterval(captureTimer);
      captureTimer = null;
    }
  }

  // Only count time when tab is visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTimer();
    } else if (!captured) {
      startTimer();
    }
  });

  // Start counting if visible
  if (!document.hidden) startTimer();

  // Also handle SPA navigation (WeChat articles sometimes load via pushState)
  let lastPath = location.pathname;
  const navObserver = new MutationObserver(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      captured = false;
      activeMs = 0;
      stopTimer();
      if (!document.hidden) startTimer();
    }
  });
  navObserver.observe(document.body, { childList: true, subtree: true });
}

// ============ 微信读书 — 划线/笔记自动捕获 ============
if (host.includes('weread.qq.com')) {
  const capturedWeread = new Set(); // dedup by text hash
  let lastHighlight = '';

  function getBookContext() {
    // Try multiple selectors for book info (WeRead UI changes)
    const title = document.querySelector('.readerTopBar_title_link')?.innerText?.trim()
      || document.querySelector('.readerBookInfo .bookTitle')?.innerText?.trim()
      || document.querySelector('[class*="bookTitle"]')?.innerText?.trim()
      || document.title?.replace(' - 微信读书', '')?.trim()
      || '';
    const author = document.querySelector('.readerBookInfo .bookAuthor')?.innerText?.trim()
      || document.querySelector('[class*="bookAuthor"]')?.innerText?.trim()
      || '';
    const chapter = document.querySelector('.readerTopBar_chapter')?.innerText?.trim()
      || document.querySelector('[class*="chapter"]')?.innerText?.trim()
      || '';
    return { title, author, chapter };
  }

  // Method 1: Monitor DOM for highlight popup (WeRead shows a toolbar when text is selected)
  const highlightObserver = new MutationObserver(() => {
    // Check for highlight action buttons
    const highlightBtn = document.querySelector('.readerNoteDialog, [class*="highlight"], [class*="underline"]');
    if (!highlightBtn) return;

    const selection = window.getSelection()?.toString()?.trim();
    if (!selection || selection.length < 3 || selection === lastHighlight) return;
    lastHighlight = selection;

    const hash = selection.slice(0, 50);
    if (capturedWeread.has(hash)) return;

    // Wait a moment for the user to confirm the highlight (or add note)
    setTimeout(() => {
      const noteText = document.querySelector('.readerNoteDialog textarea, [class*="ideaInput"]')?.value?.trim() || '';
      const ctx = getBookContext();
      const finalText = noteText ? `💡 ${noteText}\n\n📖 ${selection}` : `📖 ${selection}`;

      capturedWeread.add(hash);
      sendToMuse({
        source: 'weread',
        content: finalText,
        title: ctx.title ? `《${ctx.title}》${ctx.chapter ? ' · ' + ctx.chapter : ''}` : selection.slice(0, 60),
        url: location.href,
        note: `📚 微信读书 · ${ctx.author || ''}`,
        tags: ['微信读书', '划线']
      }).then((res) => {
        if (res.ok) showToast(`已捕获: ${ctx.title ? '《'+ctx.title.slice(0,15)+'》' : '划线'}`);
        else showToast('Muse API 未连接', false);
      });
    }, 800);
  });
  highlightObserver.observe(document.body, { childList: true, subtree: false });

  // Method 2: Listen for Ctrl+C / Cmd+C after selection (fallback)
  document.addEventListener('copy', () => {
    const selection = window.getSelection()?.toString()?.trim();
    if (!selection || selection.length < 10) return;
    const hash = selection.slice(0, 50);
    if (capturedWeread.has(hash)) return;

    // Check if copy happened on weread (not an input field)
    if (document.activeElement?.closest('input, textarea, [contenteditable]')) return;

    const ctx = getBookContext();
    if (!ctx.title) return; // not on a book page

    capturedWeread.add(hash);
    sendToMuse({
      source: 'weread',
      content: `📖 ${selection}`,
      title: `《${ctx.title}》${ctx.chapter ? ' · ' + ctx.chapter : ''}`,
      url: location.href,
      note: `📚 微信读书 · ${ctx.author || ''}`,
      tags: ['微信读书', '划线']
    }).then((res) => {
      if (res.ok) showToast(`已捕获: 《${ctx.title.slice(0, 12)}》划线`);
    });
  });
}

// ============ 通用 — 选中文字追踪 ============
let lastSelection = '';
document.addEventListener('selectionchange', () => {
  const text = window.getSelection()?.toString()?.trim() || '';
  lastSelection = text;
  try { sessionStorage.setItem('muse_selected_text', text.slice(0, 5000)); } catch (_) {}
});
