// ===== Muse Onboarding Flow =====
const OB_DOMAINS=['AI/大模型','跨境/全球化','SaaS/企业服务','科技/互联网','职场/管理','创业/商业','产品/设计','教育/知识付费','金融/投资','生活方式','电商/零售','内容创作'];
const OB_STYLES=['干货教程','行业分析','个人故事/复盘','观点评论/锐评','案例拆解','趋势预测','实操指南','人物访谈'];
const OB_PLATFORMS=['抖音','小红书','X/Twitter','公众号','YouTube','B站','即刻','LinkedIn','Instagram'];
let obData={domain:'',style:'',platforms:'',link:''};
let obSel={domain:[],style:[],platforms:[]};

async function checkOnboarding(){
  try{const r=await fetch('/api/profile');const p=await r.json();
    if(p.exists && p.dna){renderDna(p);return}
    if(p.exists && !p.dna){showOnboarding(4);return}
    showOnboarding(1);
  }catch(e){}
}

function showOnboarding(step){
  document.getElementById('onboard-overlay').classList.remove('hide');
  renderObStep(step);
}

function renderObStep(s){
  const box=document.getElementById('onboard-box');
  const steps=[
    {title:'嗨！让我了解一下你 👋',sub:'告诉我你的创作方向，我会基于你的DNA帮你选题',body:`<div class="ob-tags" id="ob-domains">${OB_DOMAINS.map(d=>`<div class="ob-tag" onclick="toggleObTag(this,'domain')">${d}</div>`).join('')}</div><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:11px;color:var(--dim)">可多选</span><button class="ob-btn" onclick="nextObStep(2)">继续 →</button></div>`},
    {title:'你的创作风格是？',sub:'你通常怎么写内容？',body:`<div class="ob-tags" id="ob-styles">${OB_STYLES.map(st=>`<div class="ob-tag" onclick="toggleObTag(this,'style')">${st}</div>`).join('')}</div><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:11px;color:var(--dim)">可多选</span><div><button class="ob-btn ob-btn-ghost" onclick="nextObStep(1)">← 上一步</button><button class="ob-btn" onclick="nextObStep(3)">继续 →</button></div></div>`},
    {title:'你在哪些平台创作？',sub:'主力发布平台（可多选）',body:`<div class="ob-tags" id="ob-platforms">${OB_PLATFORMS.map(p=>`<div class="ob-tag" onclick="toggleObTag(this,'platform')">${p}</div>`).join('')}</div><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:11px;color:var(--dim)">可多选</span><div><button class="ob-btn ob-btn-ghost" onclick="nextObStep(2)">← 上一步</button><button class="ob-btn" onclick="nextObStep(4)">继续 →</button></div></div>`},
    {title:'让我看看你的内容 🔍',sub:'丢一个你已有平台的链接，我会用AI分析你的创作DNA',body:`<input class="ob-input" id="ob-link" placeholder="粘贴你的抖音/X/小红书链接..." value="${obData.link}"><div style="margin:8px 0;font-size:11px;color:var(--dim)">或者直接分析你已有的灵感库 → <a href="#" onclick="analyzeDnaNow();return false" style="color:var(--purple-light)">立即分析</a></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px"><div><button class="ob-btn ob-btn-ghost" onclick="nextObStep(3)">← 上一步</button><button class="ob-btn ob-btn-ghost" onclick="skipOb()">稍后再说</button></div><button class="ob-btn" onclick="startDnaAnalysis()">🧬 分析我的DNA</button></div>`},
    {title:'正在了解你... 🧠',sub:'AI 正在读你的内容，提炼创作DNA',body:`<div class="ob-loading"><div class="spinner"></div><div class="status-text active" id="ob-status">正在分析内容关键词...</div><div class="status-text" id="ob-status2" style="margin-top:4px">提取你的语气和表达习惯</div><div class="status-text" id="ob-status3" style="margin-top:2px">识别你的内容舒适区和盲区</div></div>`}
  ];
  box.innerHTML=`<h2>${steps[s-1].title}</h2><div class="ob-sub">${steps[s-1].sub}</div><div class="ob-step active">${steps[s-1].body}</div>`;
  obData._step=s;
}

function toggleObTag(el,cat){
  el.classList.toggle('sel');
  const val=el.textContent;
  if(el.classList.contains('sel')){if(!obSel[cat].includes(val))obSel[cat].push(val)}
  else{obSel[cat]=obSel[cat].filter(v=>v!==val)}
}

function nextObStep(step){
  if(step===2)obData.domain=obSel.domain.join(',');
  if(step===3)obData.style=obSel.style.join(',');
  if(step===4)obData.platforms=obSel.platforms.join(',');
  if(step===4){saveProfile();obData.link=document.getElementById('ob-link')?.value||''}
  renderObStep(step);
}

function skipOb(){saveProfile();document.getElementById('onboard-overlay').classList.add('hide')}

async function saveProfile(){
  try{await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain:obData.domain,style:obData.style,platforms:obData.platforms,profile_links:obData.link})})}catch(e){}
}

async function analyzeDnaNow(){await saveProfile();await startDnaAnalysis()}

async function startDnaAnalysis(){
  const link=document.getElementById('ob-link')?.value||'';
  if(link)obData.link=link;await saveProfile();renderObStep(5);
  const upd=s=>{const e=document.getElementById(s);if(e){e.classList.add('active');e.textContent='✅ '+e.textContent.replace('✅ ','')}};
  setTimeout(()=>upd('ob-status'),1200);setTimeout(()=>upd('ob-status2'),2500);setTimeout(()=>upd('ob-status3'),3800);
  try{
    const r=await fetch('/api/profile/dna',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(link?{url:link}:{})});
    const d=await r.json();
    if(d.ok&&d.dna){document.getElementById('onboard-overlay').classList.add('hide');renderDna({dna:d.dna,exists:true});showToast('🧬 我已经了解你了！')}
    else{document.getElementById('onboard-overlay').classList.add('hide');showToast('⚠️ DNA分析失败')}
  }catch(e){document.getElementById('onboard-overlay').classList.add('hide')}
}

function renderDna(p){
  if(!p.dna)return;
  document.getElementById('dna-badge').style.display='flex';
  document.getElementById('dna-persona').textContent=p.dna.persona||'创作者DNA画像';
  document.getElementById('dna-stats').textContent=(p.dna.topics||[]).map(t=>'#'+t).join(' ');
  document.getElementById('dna-detail').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px;line-height:1.8">
      <div><strong style="color:var(--purple-light)">🎭 画像</strong><br>${esc(p.dna.persona||'-')}</div>
      <div><strong style="color:var(--purple-light)">🗣️ 语气</strong><br>${esc(p.dna.tone||'-')} · ${esc(p.dna.sentence_style||'')}</div>
      <div><strong style="color:var(--purple-light)">🏗️ 结构偏好</strong><br>${esc(p.dna.structure||'-')}</div>
      <div><strong style="color:var(--purple-light)">🎣 受众钩子</strong><br>${esc(p.dna.audience_hook||'-')}</div>
      <div><strong style="color:var(--purple-light)">💪 优势</strong><br>${(p.dna.strengths||[]).map(s=>'✅ '+esc(s)).join('<br>')}</div>
      <div><strong style="color:var(--purple-light)">🔍 盲区</strong><br>${(p.dna.blind_spots||[]).map(s=>'⚠️ '+esc(s)).join('<br>')}</div>
      <div style="grid-column:1/-1"><strong style="color:var(--purple-light)">💡 突破建议</strong><br>${esc(p.dna.growth_tip||'-')}</div>
    </div>`;
  document.getElementById('dna-panel').classList.add('show');
}

function toggleDnaPanel(){document.getElementById('dna-panel').classList.toggle('show')}

function resetOnboarding(){
  obSel={domain:[],style:[],platforms:[]};obData={domain:'',style:'',platforms:'',link:''};
  document.getElementById('dna-badge').style.display='none';
  document.getElementById('dna-panel').classList.remove('show');
  showOnboarding(1);
}
