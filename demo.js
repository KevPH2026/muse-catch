// ===== Muse Auto-Demo Tour =====
const DEMO_STEPS = [
  {
    title: '欢迎来到 Muse 🌀',
    desc: 'Muse 是你的灵感捕手 — 自动从 Twitter、公众号、微信读书等平台捕获灵感，AI 帮你发散、提炼金句、整合选题。\n\n接下来 60 秒，带你走一遍完整流程。',
    highlight: null,
    position: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
  },
  {
    title: '1. 捕获灵感',
    desc: '从这开始 — 粘贴链接或文字，AI 自动提炼标题、关键词、情绪。也可以装浏览器插件，Twitter 点赞、公众号阅读自动捕获。',
    highlight: '.ingest-bar',
    position: null
  },
  {
    title: '2. 灵感流入 ✨',
    desc: '看 — 4 条真实风格的灵感正在流入你的灵感库，每条都有 AI 提炼的标题和情绪标签。',
    highlight: '#grid',
    position: null,
    autoAdvance: 4000,
    autoAction: 'flowInspirations'
  },
  {
    title: '3. DNA 解锁 🧬',
    desc: '当灵感积累到一定量，Muse 会分析你的创作 DNA — 你的优势维度、核心话题、语气风格、盲区。\n\n这是你的「创作者指纹」。',
    highlight: '#dna-panel',
    position: null,
    autoAction: 'revealDNA'
  },
  {
    title: '4. 灵感发散 🔀',
    desc: '选中几条灵感 → 点「发散」，AI 会从不同角度爆破：爆款角度、标题、文章结构。\n\n一条灵感能裂变出 10 条选题。',
    highlight: '.card',
    position: null,
    autoAction: 'demoExpand'
  },
  {
    title: '5. 金句配图 💎',
    desc: '任何灵感都能一键生成金句 + AI 配图，直接拿去发小红书 / Twitter / 朋友圈。',
    highlight: '.card',
    position: null,
    autoAction: 'demoQuoteCard'
  },
  {
    title: '6. 灵感整合 📝',
    desc: '选中多条灵感 → AI 帮你归纳出选题建议，每个选题带角度、为什么值得写、可拆解结构。\n\n这就是从碎片到系统的过程。',
    highlight: '#tp-list',
    position: null,
    autoAction: 'demoTopics'
  }
];

let demoStep = 0;
let demoRunning = false;
let demoItems = [];

// Mock inspiration data
const MOCK_INSPIRATIONS = [
  {
    title: 'AI Agent 的最后一公里是工作流嵌入',
    summary: 'Not base models, not tool use — it\'s workflow. The winning agents are the ones that fit into how people already work. Claude Code 的成功证明了这一点：它不是最强的模型，但它嵌入了开发者的日常工作流。',
    keywords: ['AI Agent', '工作流', '产品设计'],
    emotion: 'inspired',
    source: 'twitter',
    created_at: new Date().toISOString()
  },
  {
    title: '微信公众号「看一眼就划走」问题本质是信息过载',
    summary: '用户不是不看了，是选择成本太高。标题党透支了信任，真正有价值的内容反而被淹没。解决方向不是更标题党，而是降低读者的筛选成本——摘要、标签、可信度评分。',
    keywords: ['内容生态', '公众号', '信息过载'],
    emotion: 'concerned',
    source: 'wechat',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    title: 'Perplexity 的护城河不在搜索在「答案格式」',
    summary: 'Perplexity 没有发明新搜索引擎，它发明了一种新的答案格式：带引用的结构化回答。这种格式 = 可信度 + 可追溯 + 可深入。对比 Google 的蓝色链接列表，这是代际差异。',
    keywords: ['Perplexity', '搜索', 'AI产品'],
    emotion: 'excited',
    source: 'twitter',
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    title: '从《纳瓦尔宝典》划线：财富 = 你创造的价值 × 杠杆',
    summary: '纳瓦尔说「财富不是靠出卖时间获得的，是靠拥有资产」。代码和内容是普通人能用的最强杠杆——零边际成本、无限复制。创作就是建资产。',
    keywords: ['纳瓦尔', '财富', '创作', '杠杆'],
    emotion: 'inspired',
    source: 'weread',
    created_at: new Date(Date.now() - 10800000).toISOString()
  }
];

const MOCK_DNA = {
  persona: 'AI产品化思考者 · 技术叙事型创作者',
  strengths: [
    {name:'趋势嗅觉', score: 95},
    {name:'跨界整合', score: 90},
    {name:'创造力', score: 92},
    {name:'逻辑力', score: 88},
    {name:'感召力', score: 85},
    {name:'执行力', score: 90}
  ],
  topics: ['AI Agent', '内容创作', 'SaaS产品', '个人品牌', '知识管理'],
  tone: '直接、理性、带思考深度',
  sentence_style: '短句为主，中英混用，自带节奏',
  audience_hook: '让读者觉得"他替我想清楚了"',
  blind_spots: ['过度理性化情感类选题', '忽视执行细节的读者需求'],
  growth_tip: '多写「我犯过的错」类型内容，增加人格真实感'
};

const MOCK_EXPANSION = {
  method: 'AI 多维发散',
  expansions: [
    { angle: '产品设计视角', content: '为什么 AI Agent 产品应该从「替代人」转向「增强工作流」——以 Notion AI 和 Cursor 为例的对比分析' },
    { angle: '创业者视角', content: 'AI Agent 创业的 3 个陷阱：功能堆砌、忽视 onboarding、定价策略错误。附真实案例' },
    { angle: '投资视角', content: '为什么 a16z 重注 Agent 赛道？从企业软件 30 年历史看 Agent 是下一个 Salesforce 还是下一个 chatbot' },
    { angle: '创作者视角', content: '用 Agent 搭建个人内容工厂：从灵感捕获 → AI 发散 → 金句生成 → 多平台分发，全流程拆解' }
  ]
};

const MOCK_TOPICS = {
  source_count: 4,
  method: 'AI 深度分析',
  mode: 'auto',
  topics: [
    { topic: 'AI Agent 从工具到工作流的范式转移', angle: '为什么「嵌入现有流程」比「创造新工具」更重要', why: '4条灵感中有3条涉及 Agent 落地问题,读者对此有强烈困惑但缺少系统梳理', source_ids: '' },
    { topic: '内容创作者的第二大脑搭建指南', angle: '从碎片灵感到系统输出：一个 AI-native 的内容工作流', why: '灵感库数据反映了典型的创作者痛点：信息过载、碎片化、缺少整合工具', source_ids: '' },
    { topic: '2026下半年 AI 产品趋势预判', angle: '模型能力趋同后，产品差异化的 5 个方向', why: '多平台来源信号高度收敛于同一判断窗口期', source_ids: '' }
  ]
};

// ============ DEMO ENGINE ============
function startAutoDemo() {
  if (demoRunning) return;
  demoRunning = true;
  demoStep = 0;

  // Hide onboarding if visible
  document.getElementById('onboard-overlay')?.classList.add('hide');

  // Reset state
  items = [];
  selected = new Set();
  demoItems = [];
  document.getElementById('empty').style.display = 'none';

  // Show demo overlay
  document.getElementById('demo-overlay').classList.add('show');
  document.getElementById('demo-bubble').style.display = 'block';

  // Render progress dots
  updateProgressDots();

  showDemoStep(0);
}

function showDemoStep(idx) {
  demoStep = idx;
  const step = DEMO_STEPS[idx];
  const total = DEMO_STEPS.length;

  document.getElementById('demo-step-label').textContent = `Step ${idx + 1}/${total}`;
  document.getElementById('demo-title').textContent = step.title;
  document.getElementById('demo-desc').textContent = step.desc;

  // Position bubble
  const bubble = document.getElementById('demo-bubble');
  const highlight = document.getElementById('demo-highlight');

  // Default center position
  if (step.position) {
    Object.assign(bubble.style, step.position);
  } else {
    bubble.style.cssText = 'position:fixed;z-index:302;background:var(--card);border:1px solid var(--border);border-radius:18px;padding:24px;max-width:380px;animation:scaleIn .35s;display:block;box-shadow:0 12px 48px rgba(0,0,0,.6);top:50%;left:50%;transform:translate(-50%,-50%)';
  }

  // Highlight target element
  if (step.highlight) {
    const target = document.querySelector(step.highlight);
    if (target) {
      const rect = target.getBoundingClientRect();
      highlight.style.display = 'block';
      highlight.style.top = (rect.top - 6) + 'px';
      highlight.style.left = (rect.left - 6) + 'px';
      highlight.style.width = (rect.width + 12) + 'px';
      highlight.style.height = (rect.height + 12) + 'px';
    } else {
      highlight.style.display = 'none';
    }
  } else {
    highlight.style.display = 'none';
  }

  // Update next button
  const nextBtn = document.getElementById('demo-next-btn');
  if (idx >= total - 1) {
    nextBtn.textContent = '🎉 完成';
    nextBtn.onclick = completeDemo;
  } else {
    nextBtn.textContent = '继续 →';
    nextBtn.onclick = advanceDemo;
  }

  updateProgressDots();

  // Auto-action for certain steps
  if (step.autoAction) {
    setTimeout(() => window[step.autoAction](), 600);
  }

  // Auto-advance for certain steps
  if (step.autoAdvance) {
    setTimeout(() => {
      if (demoRunning && demoStep === idx) advanceDemo();
    }, step.autoAdvance);
  }
}

function updateProgressDots() {
  const total = DEMO_STEPS.length;
  document.getElementById('demo-progress').innerHTML = Array.from({length: total}, (_, i) => {
    let cls = 'demo-dot';
    if (i < demoStep) cls += ' done';
    else if (i === demoStep) cls += ' active';
    return `<div class="${cls}"></div>`;
  }).join('');
}

function advanceDemo() {
  if (demoStep < DEMO_STEPS.length - 1) {
    showDemoStep(demoStep + 1);
  } else {
    completeDemo();
  }
}

function skipDemo() {
  demoRunning = false;
  document.getElementById('demo-overlay').classList.remove('show');
  document.getElementById('demo-bubble').style.display = 'none';
  document.getElementById('demo-highlight').style.display = 'none';
  // Reload real data
  load();
}

function completeDemo() {
  document.getElementById('demo-bubble').style.display = 'none';
  document.getElementById('demo-highlight').style.display = 'none';
  document.getElementById('demo-complete').style.display = 'block';
}

function finishDemo() {
  demoRunning = false;
  document.getElementById('demo-overlay').classList.remove('show');
  document.getElementById('demo-complete').style.display = 'none';
  document.getElementById('demo-highlight').style.display = 'none';
  // Leave demo data visible
}

// ============ AUTO ACTIONS ============
function flowInspirations() {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  empty.style.display = 'none';

  // First item
  demoItems = [MOCK_INSPIRATIONS[0]];
  items = demoItems;
  updateStats();
  renderDemoCards();
  scrollToGrid();

  // Subsequent items with delays
  [1, 2, 3].forEach((i, delayIdx) => {
    setTimeout(() => {
      if (!demoRunning) return;
      demoItems.push(MOCK_INSPIRATIONS[i]);
      items = demoItems;
      updateStats();
      renderDemoCards();
      scrollToGrid();
    }, (delayIdx + 1) * 1000);
  });
}

function revealDNA() {
  // Hide real DNA badge if exists
  const badge = document.getElementById('dna-badge');
  badge.style.display = 'flex';
  badge.querySelector('#dna-persona').textContent = MOCK_DNA.persona;
  badge.querySelector('#dna-stats').textContent = `${MOCK_DNA.strengths.length}维 · 综合${Math.round(MOCK_DNA.strengths.reduce((s,x)=>s+x.score,0)/MOCK_DNA.strengths.length)}分 · ${MOCK_DNA.topics.length}个核心话题`;

  // Ensure panel is visible
  const panel = document.getElementById('dna-panel');
  panel.classList.add('show');

  // Render detail
  renderDemoDNA();

  // Draw radar
  setTimeout(() => drawRadar(MOCK_DNA.strengths), 300);
  panel.scrollIntoView({behavior:'smooth'});
}

function renderDemoDNA() {
  const det = document.getElementById('dna-detail');
  if (!det) return;
  const s = MOCK_DNA.strengths.map(x =>
    `<div style="display:flex;justify-content:space-between;margin:2px 0"><span>✅ ${x.name}</span><span style="color:var(--purple-light);font-weight:700">${x.score}</span></div>`
  ).join('');
  const topics = MOCK_DNA.topics.map(t =>
    `<span class="tag" style="background:rgba(99,102,241,.12);color:var(--purple-light)">${t}</span>`
  ).join(' ');
  det.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div><strong>语气:</strong> ${MOCK_DNA.tone}</div>
      <div><strong>句式:</strong> ${MOCK_DNA.sentence_style}</div>
      <div><strong>受众钩子:</strong> ${MOCK_DNA.audience_hook}</div>
      <div><strong>突破建议:</strong> ${MOCK_DNA.growth_tip}</div>
    </div>
    <div style="margin-top:12px"><strong>核心话题:</strong> ${topics}</div>
    ${MOCK_DNA.blind_spots.length ? `<div style="margin-top:8px"><strong>盲区:</strong> ${MOCK_DNA.blind_spots.join('、')}</div>` : ''}
  `;
}

function demoExpand() {
  // Select first 2 items visually
  const cards = document.querySelectorAll('#grid .card');
  if (cards.length >= 2) {
    cards[0].classList.add('selected');
    cards[1].classList.add('selected');
    cards[0].querySelector('.cb').textContent = '✓';
    cards[1].querySelector('.cb').textContent = '✓';
  }

  // Show expansion panel with mock data
  const panel = document.getElementById('dive-panel');
  document.getElementById('dive-title').textContent = '🔀 灵感发散';
  document.getElementById('dive-meta').textContent = `分析方法: ${MOCK_EXPANSION.method}`;
  document.getElementById('dive-angles').innerHTML = MOCK_EXPANSION.expansions.map(e =>
    `<li>🎯 <strong>${esc(e.angle)}</strong><br><span style="color:var(--dim);font-size:11px">${esc(e.content).slice(0,200)}</span></li>`
  ).join('');
  document.getElementById('dive-headlines').innerHTML = '';
  document.getElementById('dive-structure').innerHTML = '';
  document.getElementById('dive-quotes').innerHTML = '';
  panel.classList.add('show');
  panel.scrollIntoView({behavior:'smooth'});
}

function demoQuoteCard() {
  // Show quote card panel with mock data
  const panel = document.getElementById('dive-panel');
  document.getElementById('dive-title').textContent = '💎 金句配图';
  document.getElementById('dive-meta').textContent = '生成 3 条金句 · 1 张配图';
  document.getElementById('dive-angles').innerHTML = '';
  document.getElementById('dive-headlines').innerHTML = '';
  document.getElementById('dive-structure').innerHTML = '';
  document.getElementById('dive-quotes').innerHTML = [
    '✨ <em>"不是模型不够强，是工作流没跟上"</em>',
    '✨ <em>"AI 时代的护城河不是技术，是用户习惯"</em>',
    '✨ <em>"最好的 AI 产品是让用户感觉不到 AI 的存在"</em>',
    '🖼️ <div style="margin-top:8px;padding:20px;background:linear-gradient(135deg,#1a1a3e,#2d1b4e);border-radius:12px;text-align:center;color:#e8e8f0;font-size:14px;line-height:2">"AI 时代的护城河<br>不是技术，是用户习惯"<br><span style="font-size:10px;color:#8888b0">— Muse AI 生成</span></div>'
  ].join('');
  panel.classList.add('show');
  panel.scrollIntoView({behavior:'smooth'});
}

function demoTopics() {
  // Show topics panel with mock data
  const panel = document.getElementById('topics-panel');
  panel.classList.add('show');
  document.getElementById('tp-meta').textContent = `基于 ${MOCK_TOPICS.source_count} 条灵感 · ${MOCK_TOPICS.method} · 自动聚合`;
  document.getElementById('tp-list').innerHTML = MOCK_TOPICS.topics.map((t, i) => `
    <div class="topic-card">
      <div class="tc-num">${String(i+1).padStart(2,'0')}</div>
      <div class="tc-title">${esc(t.topic)}</div>
      <div class="tc-angle">💡 ${esc(t.angle)}</div>
      <div class="tc-why">📊 ${esc(t.why)}</div>
      <div class="tc-action">👆 深度拆解 →</div>
    </div>
  `).join('');
  panel.scrollIntoView({behavior:'smooth'});
}

// ============ HELPERS ============
function updateStats() {
  document.getElementById('stat-total').textContent = items.length;
  document.getElementById('stat-week').textContent = items.length;
  const sources = {};
  items.forEach(i => { sources[i.source] = (sources[i.source] || 0) + 1; });
  document.getElementById('stat-sources').textContent = Object.keys(sources).length;
  document.getElementById('source-list').innerHTML = Object.entries(sources).map(([k, v]) =>
    `<div class="source-item"><span class="sdot" style="background:${k==='twitter'?'#1d9bf0':k==='wechat'?'#10b981':k==='weread'?'#f59e0b':'#888'}"></span>${SOURCE_NAMES[k]||k}<span class="scount">${v}</span></div>`
  ).join('');
}

function renderDemoCards() {
  if (!items.length) return;
  document.getElementById('empty').style.display = 'none';
  const g = document.getElementById('grid');
  g.innerHTML = items.map((i, idx) => {
    const cls = EMOTION_CLASS[i.emotion] || 'neutral';
    return `<div class="card ${cls}" id="card-demo-${idx}">
      <div class="emotion-strip"></div>
      <div class="cb"></div>
      <div class="card-top">
        <span class="source-chip ${i.source}">${SOURCE_NAMES[i.source] || i.source}</span>
        <span style="font-size:18px">${EMOJI[i.emotion] || '📌'}</span>
        <span class="card-time-chip">刚刚</span>
      </div>
      <div class="card-title">${esc(i.title)}</div>
      <div class="card-summary">${esc(i.summary).slice(0,140)}</div>
      <div class="card-keywords">${(i.keywords||[]).slice(0,3).map(k=>`<span class="kw">${esc(k)}</span>`).join('')}</div>
      <div class="card-footer">
        <span>📎 ${SOURCE_NAMES[i.source]||i.source}</span>
        <div class="card-actions">
          <button class="card-act">🔀 发散</button>
          <button class="card-act">💎 金句</button>
        </div>
      </div>
    </div>`;
  }).join('');

  // Animate cards in
  g.querySelectorAll('.card').forEach((card, i) => {
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = `slideUp .4s ${i * 0.1}s both`;
  });
}

function scrollToGrid() {
  document.getElementById('grid').scrollIntoView({behavior:'smooth', block:'center'});
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
