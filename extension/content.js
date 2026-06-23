// Muse · Catch — Content Script v2
// 获取选中文字 + 全页内容 + Twitter/X + 微信公众号自动捕获

const API = 'http://localhost:5200/api/ingest';

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
  clone.querySelectorAll('script, style, nav, footer, header, aside, noscript, iframe, svg').forEach(el => el.remove());
  const text = (clone.innerText || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 3000);
  return text;
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
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (r.ok) {
      const d = await r.json();
      console.log('[Muse] ✅', d.title?.slice(0, 30));
    }
  } catch (e) { /* silent */ }
}

// ============ Twitter/X — 监听点赞/收藏 ============
const host = location.hostname;
if (host.includes('twitter.com') || host.includes('x.com')) {
  let lastCaptured = '';
  let debounceTimer = null;

  function extractTweet(el) {
    // Walk up to find the tweet article
    const tweet = el.closest('article[data-testid="tweet"]');
    if (!tweet) return null;
    
    // Get tweet text
    const textEl = tweet.querySelector('[data-testid="tweetText"]');
    const text = textEl?.innerText?.trim() || '';
    if (!text || text.length < 5) return null;
    
    // Get author
    const authorEl = tweet.querySelector('[data-testid="User-Name"]');
    const author = authorEl?.innerText?.split('\n')[0]?.trim() || '';
    
    // Get tweet link
    const linkEl = tweet.querySelector('a[href*="/status/"]');
    const href = linkEl?.getAttribute('href') || '';
    const url = href.startsWith('http') ? href : `https://x.com${href}`;
    
    return { text, author, url, id: href.match(/\/status\/(\d+)/)?.[1] || '' };
  }

  document.addEventListener('click', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Check if click was on a like or bookmark button
      const btn = e.target.closest('[data-testid="like"], [data-testid="bookmark"], [data-testid="unlike"], [data-testid="removeBookmark"]');
      if (!btn) return;
      
      const tweet = extractTweet(btn);
      if (!tweet) return;
      
      // Dedup within 5 seconds
      if (tweet.text === lastCaptured) return;
      lastCaptured = tweet.text;
      
      sendToMuse({
        source: 'twitter',
        content: tweet.text,
        title: tweet.text.slice(0, 80),
        url: tweet.url,
        note: `🐦 @${tweet.author}`,
        tags: ['Twitter', '推文']
      });
    }, 500);
  }, true);
}

// ============ 微信公众号 — 停留3秒自动捕获 ============
if (host.includes('mp.weixin.qq.com')) {
  let captured = false;
  
  setTimeout(() => {
    if (captured) return;
    
    const title = document.querySelector('#activity-name')?.innerText?.trim()
      || document.querySelector('.rich_media_title')?.innerText?.trim()
      || document.title;
    const author = document.querySelector('#js_name')?.innerText?.trim()
      || document.querySelector('.rich_media_meta_text')?.innerText?.trim()
      || '';
    const content = document.querySelector('#js_content')?.innerText?.trim()
      || document.querySelector('.rich_media_content')?.innerText?.trim()
      || '';
    
    if (title) {
      captured = true;
      sendToMuse({
        source: 'wechat',
        content: content.slice(0, 3000),
        title: title.slice(0, 80),
        url: location.href,
        note: `📱 公众号 · ${author}`,
        tags: ['公众号', '微信']
      });
    }
  }, 3000);
}

// ============ 通用 — 选中文字追踪 ============
let lastSelection = '';
document.addEventListener('selectionchange', () => {
  const text = window.getSelection()?.toString()?.trim() || '';
  lastSelection = text;
  try { sessionStorage.setItem('muse_selected_text', text.slice(0, 5000)); } catch (_) {}
});
