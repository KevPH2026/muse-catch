#!/bin/bash
# ============================================
#  Muse · Catch — 三级选题流水线 Demo
#  ============================================
#  灵感 → 选题生成 → 爆款内容深挖
#  用法: bash demo_pipeline.sh [server_url]
# ============================================

SERVER="${1:-http://localhost:5200}"
PASS=0
FAIL=0

check() {
  local label="$1"
  local code="$2"
  if [ "$code" = "200" ]; then
    echo "  ✅ $label"
    PASS=$((PASS+1))
  else
    echo "  ❌ $label (HTTP $code)"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🌀 Muse · Catch — 三级选题流水线 Demo"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 0: Health check
echo "📡 检查服务状态..."
CODE=$(curl -so /dev/null -w '%{http_code}' "$SERVER")
if [ "$CODE" != "200" ]; then
  echo "  ❌ 服务未启动，请先运行: python3 server.py"
  exit 1
fi
echo "  ✅ 服务在线: $SERVER"
echo ""

# Step 1: Seed demo inspirations
echo "🌱 播种 Demo 灵感..."

inspirations=(
  '{"content":"Paul Graham: The best startup ideas come from solving your own problems. Scratch your own itch first.","source":"web","url":"https://paulgraham.com/startupideas.html"}'
  '{"content":"灵感的半衰期极短。99%的灵感火花在24小时内熄灭，不是因为不重要，是因为没有工具能在那一秒接住它。灵感易逝，行动应当时。","source":"idea"}'
  '{"content":"AI Agent赛道最大的机会不在通用模型，在垂直专业化。医疗·法律·教育——每个垂直领域都是百亿市场。","source":"tg"}'
  '{"content":"One Person Company是未来。AI让一个人能做到以前十人团队的产出。OPC不是关于孤独，是关于自主。个人即公司。","source":"tg"}'
  '{"content":"做产品的底层逻辑被AI彻底改了。发现问题→AI写代码→直接上线→根据反馈迭代。产品开发周期从月缩短到天。","source":"idea"}'
  '{"content":"Chrome插件 + Telegram Bot + REST API —— 三种捕获入口，一个灵感库。不是又一个笔记工具，是灵感库的操作系统。","source":"idea"}'
  '{"content":"Build a tool that catches ideas before they vanish. If your capture mechanism takes more than 3 seconds, inspiration beats you every time.","source":"web"}'
  '{"content":"知识工作者的最大浪费不是时间，是丢失的灵感。截屏→忘记→截屏→忘记，这是一个创造力黑洞。","source":"idea"}'
  '{"content":"Readwise manages your highlights, but Muse captures what inspires you at the moment. 灵感不是高亮——灵感是火花。","source":"web"}'
  '{"content":"垂直SaaS不是死了，是被AI重生了。传统SaaS靠功能壁垒，AI SaaS靠理解壁垒。谁更懂用户领域，谁赢。垂直化就是护城河。","source":"tg"}'
)

for insp in "${inspirations[@]}"; do
  RESP=$(curl -s -X POST "$SERVER/api/ingest" -H 'Content-Type: application/json' -d "$insp")
  ID=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id','?'))" 2>/dev/null)
  TITLE=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('title','?'))" 2>/dev/null)
  if [ "$ID" != "?" ]; then
    echo "  ✅ #$ID: $TITLE"
  else
    echo "  ❌ ingest failed: $RESP"
  fi
done

echo ""
echo "📊 当前统计:"
curl -s "$SERVER/api/stats" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'  总计: {d[\"total\"]} 条灵感, 来源: {d[\"sources\"]}')
"

# Step 2: Topic Generation (Random)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎯 Step 2: 随机选题生成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOPICS=$(curl -s "$SERVER/api/topics?mode=random")
echo "$TOPICS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'  模式: {d[\"method\"]} | 基于 {d[\"source_count\"]} 条灵感')
print()
for i,t in enumerate(d['topics'][:5],1):
    print(f'  📌 {i}. {t[\"topic\"]}')
    print(f'     💡 {t[\"angle\"][:80]}')
    print(f'     📍 来源IDs: {t[\"source_ids\"]}')
    print()
"

# Step 3: Topic Deep Dive
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  💥 Step 3: 选题深挖 (Deep Dive)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get first topic from LLM generation
TOPIC=$(echo "$TOPICS" | python3 -c "
import sys,json,urllib.parse
d=json.load(sys.stdin)
if d.get('topics'):
    t = d['topics'][0]['topic']
    print(urllib.parse.quote(t))
" 2>/dev/null)

if [ -n "$TOPIC" ]; then
  DIVE=$(curl -s "$SERVER/api/topic-deep-dive?topic=$TOPIC")
  echo "$DIVE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'  目标选题: {d[\"topic\"]}')
print(f'  生成模式: {d[\"method\"]}')
print()
print(f'  🔥 爆款标题 ({len(d[\"headlines\"])}):')
for h in d['headlines'][:5]:
    print(f'     ✨ {h}')
print()
print(f'  💡 传播角度 ({len(d[\"viral_angles\"])}):')
for a in d['viral_angles'][:3]:
    print(f'     🔺 {a}')
print()
print(f'  📋 文章结构 ({len(d[\"structure\"])}段):')
for s in d['structure'][:7]:
    print(f'     ▸ {s}')
print()
print(f'  💎 金句 ({len(d[\"quotes\"])}条):')
for q in d['quotes'][:5]:
    print(f'     📝 {q}')
"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Demo 完成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  三级流水线: 灵感碎片 → AI选题 → 爆款内容骨架"
echo "  Dashboard: $SERVER"
echo "  GitHub:   https://github.com/KevPH2026/muse-catch"
echo ""
