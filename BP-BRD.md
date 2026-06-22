# Muse — AI 灵感捕获智能体

## BP（商业计划书）& BRD（产品需求文档）

> **「灵感本易逝，行动应当时。Muse 替你把易逝的，变成永恒的。」**

---

# 第一部分：BP（商业计划书）

## 一、创始叙事

Naval Ravikant 说过一句击中无数创作者灵魂的话：

> **"Inspiration is perishable — act on it immediately."**
>
> **「灵感本易逝，行动应当时。」**

每一个创作者都懂这种痛：你在洗澡时、散步时、刷推时、听播客时，一个绝妙的想法闪过脑海。你对自己说「等会儿记下来」。然后——它消失了。永远地。

这不是你的错。人类大脑的 working memory 只有 15-30 秒。灵感，从诞生的那一刻起，就在倒计时。

Muse 的使命只有一个：**在灵感消失之前，抓住它。**

---

## 二、问题：99% 的灵感正在流失

### 我们活在一个「内容富矿」时代

| 触达点 | 每日消费量 | 灵感密度 |
|--------|-----------|---------|
| Twitter / X | 50+ 条推文 | 高 |
| 播客 | 1-2 小时 | 极高 |
| 公众号 / 长文 | 5-10 篇 | 高 |
| YouTube / B站 | 1-3 小时 | 中高 |
| 微信聊天 | 全天 | 随机爆发 |

**每天，一个知识工作者接触 100+ 条有价值的信息碎片。但 99% 的灵感火花，在 24 小时内熄灭。**

### 现有工具为什么不行？

- **笔记软件（Notion/Obsidian）**：太「重」——打开、分类、格式化，灵感早跑了
- **书签工具（Raindrop/Pocket）**：只管「存」，不管「提炼」
- **稍后读**：变成了「永不读」
- **截屏相册**：一万张截图，零条可用灵感

**核心矛盾**：捕获灵感的工具越重，灵感逃离得越快。

---

## 三、解决方案：Muse — 你的灵感缪斯

Muse 是一个**无处不在、零摩擦的灵感捕获智能体**。

### 它怎么工作？

```
你：在任何平台看到有价值的内容
  ↓ 一键转发 / 一键保存（< 2 秒）
Muse：AI 自动提取 → 标题、关键词、摘要、情绪标签
  ↓ 存入灵感库
Muse：积累 10+ 条后 → 跨条目分析
  ↓
输出：内容创意 / 产品机会 / 独特洞察
```

### Muse 坐在每一个内容消费的触点上

| 触点 | 接入方式 | 捕获动作 |
|------|---------|---------|
| Telegram | Bot | 转发消息给 Muse |
| 浏览器 | Chrome 插件 | 一键保存当前页面 |
| Web | 网页端 | 粘贴链接 / 文本 |
| 微信 | 公众号 Bot | 转发文章 |
| 邮箱 | Email Bot | 转发邮件 |

**无论你在哪消费内容，Muse 都在旁边，等着一键捕获。**

---

## 四、架构设计：一个核心 + N 个薄适配器

```
                      ┌─────────────────┐
                      │   Web Dashboard  │  ← 唯一界面
                      │  (灵感库 · 洞察) │
                      └────────┬────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         ┌────▼────┐    ┌─────▼─────┐    ┌────▼────┐
         │Telegram │    │  Chrome   │    │ WeChat  │  ← 薄适配层
         │  Bot    │    │ Extension │    │   Bot   │
         └────┬────┘    └─────┬─────┘    └────┬────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────▼─────────┐
                    │    Core REST API  │  ← 唯一后端
                    │   (Flask 单体)     │
                    │                   │
                    │  ┌─────────────┐  │
                    │  │  SQLite DB  │  │
                    │  └─────────────┘  │
                    │  ┌─────────────┐  │
                    │  │ DeepSeek API│  │
                    │  └─────────────┘  │
                    └───────────────────┘
```

### 设计原则

1. **Core REST API 是唯一的后端**。所有平台适配器只是薄薄的转发层（~200 行代码/平台）
2. **Web Dashboard 是唯一的界面**。不做 Native App，不维护多端 UI
3. **一个代码库，一个部署，零运维**

---

## 五、为什么 OPC（一人公司）能做成？

### 极简技术栈

```
后端:    Flask (Python)
数据库:  SQLite (零运维)
AI 引擎: DeepSeek API (按量付费)
前端:    Vanilla HTML + JS (零构建)
部署:    Vercel (零服务器)
```

### 为什么大公司做不了这个？

| 维度 | 大公司 | OPC (Muse) |
|------|--------|------------|
| 关注点 | 日活、留存、变现 | 解决一个人的真实痛点 |
| 开发周期 | 6 个月 | 1 周 |
| 团队 | 20+ 人 | 1 人 |
| 技术栈 | 微服务、K8s | Flask + SQLite |
| 用户获取 | 投放、SEO | 产品即营销 |

**这是 OPC 的天然领地**：足够简单到一个人能 build，足够个性化到大团队做不好。

---

## 六、市场与用户

### 目标用户

- **内容创作者**：写文章、做视频、录播客的人——他们每天都在找灵感
- **独立开发者 / Indie Hacker**：需要持续产出产品和内容
- **OPC 创始人**：和 Muse 的创造者一样的人——一个人就是一支队伍
- **知识工作者**：研究员、产品经理、策略师——思考是他们的生产资料

### 市场规模

- 全球独立开发者：~500 万
- 中文内容创作者：~300 万
- 知识工作者（中国）：~5000 万
- 初期可触达市场：10 万用户（通过 Twitter/X + 即刻 + 少数派）

### 竞争格局

| 产品 | 定位 | 和 Muse 的区别 |
|------|------|---------------|
| Notion | 全能工作区 | 太重，灵感捕获摩擦大 |
| Pocket | 稍后读 | 只存不处理 |
| Readwise | 高亮管理 | 只管阅读，不管灵感 |
| MyMind | AI 记忆 | 没有跨条目分析 |
| **Muse** | **灵感捕获 + 智能提炼** | **零摩擦 + AI 洞察** |

---

## 七、Slogan

> ## 「灵感本易逝，行动应当时。Muse 替你把易逝的，变成永恒的。」

---

# 第二部分：BRD（产品需求文档）

## 一、核心用户流程

### 1. 捕获阶段（< 2 秒）

```
用户在任何平台看到有价值的内容
              ↓
    一键转发 / 一键保存
              ↓
       Muse REST API 接收
              ↓
   DeepSeek LLM 自动提取：
   ├── 标题
   ├── 关键词 (3-5 个)
   ├── 一句话摘要
   └── 情绪标签 (兴奋/好奇/共鸣/反思/行动)
              ↓
      存入灵感数据库 (SQLite)
```

### 2. 积累阶段（10+ 条目触发）

```
灵感库条目 ≥ 10
              ↓
   DeepSeek 跨条目分析：
   ├── 主题聚类
   ├── 关联发现
   └── 空白识别
```

### 3. 输出阶段

Muse 生成三类洞察：

| 输出类型 | 说明 | 示例 |
|---------|------|------|
| **内容创意** | 基于你的灵感模式，推荐可写的文章/视频主题 | 「你最近对 AI Agent 很兴奋，这 5 个角度没人写过」 |
| **产品机会** | 识别灵感中的需求空白 | 「你保存了 7 条关于'碎片化阅读'的吐槽——这是个产品机会」 |
| **独特洞察** | 连接看似无关的灵感 | 「你对 Stoicism 和 AI Alignment 的关注可能指向同一个问题」 |

### 4. 回顾与复盘

- 每日 / 每周灵感摘要（邮件或 Telegram 推送）
- 「灵感热力图」：哪些主题在升温，哪些在冷却
- 「灵感输出比」：捕获了多少，转化了多少

---

## 二、平台无关设计

### 核心原则

**一切平台都是 API 的 client。Web Dashboard 是唯一的 UI。**

```
REST API Endpoints:

POST /api/capture      ← 所有平台共享的统一入口
GET  /api/items        ← 灵感列表
GET  /api/items/:id    ← 单条详情
GET  /api/insights     ← AI 生成的洞察
GET  /api/stats        ← 统计数据
```

### 平台适配器规范

任意平台只需实现：

1. **接收用户输入**（消息 / 链接 / 文本）
2. **调用 POST /api/capture**
3. **返回确认消息**

Telegram Bot 示例代码量：~150 行 Python
Chrome Extension 示例代码量：~200 行 JS
每个适配器独立部署、独立维护，互不影响。

---

## 三、MVP 范围

### V1.0 — Hackathon 交付（本周）

```
✅ Telegram Bot         ← 主捕获渠道
✅ Web Dashboard        ← 灵感库 + 洞察展示
✅ Chrome Extension     ← 浏览器一键保存
✅ Core REST API        ← 统一后端
✅ DeepSeek 集成        ← AI 提取 + 跨条目分析
```

### 不包括（明确砍掉）

| 砍掉的功能 | 理由 |
|-----------|------|
| 用户注册/登录系统 | MVP 用 Telegram ID 作为用户标识 |
| 多语言支持 | 先做好中文 |
| 协作功能 | OPC 自己先用 |
| 移动 App | Web 响应式够用 |
| 付费系统 | 先验证价值再考虑变现 |

### 用户故事（MVP）

1. **作为内容创作者**：我在 Twitter 上看到一条好推文 → 转发给 Muse Bot → 自动提取摘要和关键词 → 本周灵感汇总时发现 3 个可写的文章选题
2. **作为独立开发者**：我一键保存了 12 篇关于 AI 工具的文章 → Muse 告诉我「你关心的是'AI 降低创作门槛'这个主题，这里有 5 个产品缺口」
3. **作为知识工作者**：我每天存 5-10 条灵感 → 周日收到 Muse 的周报 → 发现我这周最兴奋的主题是「去中心化社交」

---

## 四、技术栈详情

```
┌──────────────────────────────────────────┐
│                  技术选型                   │
├──────────────┬───────────────────────────┤
│ 后端框架      │ Flask 3.x (Python)         │
│ 数据库        │ SQLite (单文件、零运维)      │
│ AI 引擎       │ DeepSeek API (deepseek-chat)│
│ 前端          │ Vanilla HTML + CSS + JS    │
│ CSS 框架      │ Pico.css / 无框架           │
│ 部署          │ Vercel (Flask as Serverless)│
│ Bot 框架      │ python-telegram-bot        │
│ Chrome 插件   │ Manifest V3 + Vanilla JS   │
│ 版本管理      │ Git + GitHub               │
└──────────────┴───────────────────────────┘
```

### 为什么这样选？

- **Flask**：足够轻，足够快，一个文件就能跑
- **SQLite**：不需要 Postgres，不需要 Docker，数据和代码在一起
- **DeepSeek**：中文能力强，价格便宜，API 兼容 OpenAI
- **Vanilla HTML**：不引入 React/Vue 的构建链，直接写直接部署
- **Vercel**：免费额度够用，自动 HTTPS，Git push 即部署

---

## 五、数据库 Schema（MVP）

```sql
-- 用户表（以 Telegram ID 为主标识）
CREATE TABLE users (
    id TEXT PRIMARY KEY,          -- telegram_user_id
    username TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 灵感条目
CREATE TABLE inspirations (
    id TEXT PRIMARY KEY,          -- UUID
    user_id TEXT NOT NULL,
    source_url TEXT,              -- 原始链接（可选）
    source_platform TEXT,         -- telegram/chrome/web/wechat/email
    raw_content TEXT NOT NULL,    -- 用户输入的原始内容
    ai_title TEXT,                -- AI 提取的标题
    ai_keywords TEXT,             -- JSON array: ["AI", "创作", "工具"]
    ai_summary TEXT,              -- 一句话摘要
    ai_emotion TEXT,              -- 兴奋/好奇/共鸣/反思/行动
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- AI 洞察（跨条目分析结果）
CREATE TABLE insights (
    id TEXT PRIMARY KEY,          -- UUID
    user_id TEXT NOT NULL,
    insight_type TEXT,            -- content_idea / product_opportunity / unique_insight
    title TEXT,
    body TEXT,
    source_item_ids TEXT,         -- JSON array of inspiration IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 六、API 设计

### `POST /api/capture`

```json
// Request
{
  "user_id": "telegram_123456",
  "source_platform": "telegram",
  "source_url": "https://twitter.com/...",
  "raw_content": "这条推文关于 AI Agent 的未来..."
}

// Response
{
  "id": "uuid",
  "ai_title": "AI Agent 的三种未来形态",
  "ai_keywords": ["AI Agent", "未来趋势", "自动化"],
  "ai_summary": "作者认为 AI Agent 将沿着工具型、协作型、自主型三条路径演化",
  "ai_emotion": "兴奋"
}
```

### `GET /api/insights?user_id=xxx`

```json
// Response
{
  "insights": [
    {
      "type": "content_idea",
      "title": "你最近 7 天保存了 5 条关于'写作工具'的灵感",
      "body": "你可以写一篇'2025 年独立写作者的工具栈对比'..."
    }
  ],
  "stats": {
    "total_items": 47,
    "this_week": 12,
    "top_keywords": ["AI", "创作", "独立开发"]
  }
}
```

---

## 七、成功指标

### 北极星指标

**灵感捕获率（Inspiration Capture Rate）**：用户实际保存的灵感 / 用户声称「想记下来」的次数

### 关键指标（MVP 阶段）

| 指标 | 目标（月） | 测量方式 |
|------|-----------|---------|
| 灵感捕获条数 | 1000+ | DB count |
| 周活跃用户 (WAU) | 50+ | 唯一 user_id |
| 单用户月均捕获 | 20+ | AVG(count) |
| 内容输出生成数 | 30+ insights | DB count |
| Bot 响应时间 | < 3s | API log |
| 7 日留存 | > 40% | 回访率 |

### 验证假设

> **如果人们真的需要「灵感捕获」，他们会持续使用并从中产出实际内容。**
>
> 验证方式：用户访谈 + 产出物追踪

---

## 八、路线图

```
Week 1 (Hackathon)
├── Flask REST API + SQLite
├── DeepSeek 集成（提取 + 摘要）
├── Telegram Bot
├── Web Dashboard（灵感列表 + 洞察页）
└── Chrome Extension（最小可用）

Week 2-3
├── 跨条目分析触发（≥10 条）
├── 周报邮件推送
├── 微信 Bot 适配器
└── 灵感热力图

Month 2+
├── 公开注册
├── 灵感输出转化追踪
├── 社区分享功能
└── 付费计划（Pro 洞察）
```

---

## 九、风险与应对

| 风险 | 概率 | 应对 |
|------|------|------|
| DeepSeek API 不稳定 | 中 | 缓存机制 + 降级为纯文本存储 |
| 用户不习惯转发 | 高 | Chrome 插件降低摩擦 + 引导教程 |
| 灵感库「吃灰」 | 高 | 周报推送 + 洞察主动触达 |
| 竞品快速跟进 | 中 | OPC 速度快 + 聚焦中文市场 |

---

## 十、为什么是现在？

1. **AI 推理成本降到冰点**：DeepSeek API 让个人开发者也能批量处理文本
2. **信息过载前所未有**：人均信息消费量是 10 年前的 5 倍
3. **OPC 运动兴起**：一个人 + AI = 一支团队的时代来了
4. **「稍后读」市场需要升级**：从「存起来」到「提炼出来」

---

> ## 「灵感本易逝，行动应当时。Muse 替你把易逝的，变成永恒的。」
>
> 2025.06 — 献给每一个不想让灵感溜走的创作者。

---

# 第三部分：当前实现现状（2026-06-21）

## 已完成

| 模块 | 状态 | 位置 |
|---|---|---|
| Flask API | ✅ 运行中 `:5200` | `server.py` |
| Web Dashboard | ✅ 8条灵感在库 | `index.html` |
| Chrome 插件 | ✅ 9文件完整 | `extension/` |
| Telegram Bot | ✅ 脚本就绪 | `bot.py` |
| Landing Page | ✅ 设计完成 | `landing.html` |
| BP+BRD | ✅ 477行中文 | `BP-BRD.md` |
| Skill 文档 | ✅ | `~/.hermes/skills/muse/SKILL.md` |

## 用户流程

```
📱 Telegram         → 转发消息/链接给 Bot → API → Dashboard
🖥️ Chrome 插件       → 快捷键/右键/面板 → API → Dashboard
⌨️ Dashboard 输入框  → 直接粘贴 → API → Dashboard
```

## 待部署

- [ ] Landing Page → Vercel
- [ ] Telegram Bot 实际运行（需 TOKEN）
- [ ] API 公网暴露（localtunnel 或长期方案）
