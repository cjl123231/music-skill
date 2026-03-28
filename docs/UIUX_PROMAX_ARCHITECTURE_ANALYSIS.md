# UI UX Pro Max 架构精妙分析 & Music Skill 借鉴方案

> 分析日期：2026-03-27

---

## 目录

1. [UI UX Pro Max 架构全景](#1-架构全景)
2. [七处精妙设计](#2-七处精妙设计)
3. [Music Skill 现状对照](#3-music-skill-现状对照)
4. [可借鉴的具体方案](#4-可借鉴的具体方案)
5. [不可/不必借鉴的部分](#5-不可不必借鉴的部分)
6. [实施路线图](#6-实施路线图)

---

## 1. 架构全景

UI UX Pro Max（以下简称 UUPM）是一个**纯知识驱动**的 AI 设计技能。它没有运行时服务、没有状态、没有 API，却能在 15 个 AI 平台上提供一致的设计智能。其架构的核心思想是：

> **把专家知识结构化为数据 → 用轻量检索引擎提供给 AI → 让 AI 成为设计专家。**

```
知识资产（CSV 数据库）
    │
    ├── 67 种 UI 风格
    ├── 161 种行业推理规则
    ├── 161 个配色方案
    ├── 57 组字体搭配
    ├── 99 条 UX 准则
    ├── 25 种图表类型
    └── 13 种技术栈指南
    │
    ▼
BM25 混合搜索引擎（Python，零依赖）
    │
    ├── 单域搜索：style / color / typography / chart / ux / landing / product
    ├── 多域聚合：design-system 模式（5 域并行搜索 + 推理规则叠加）
    └── 栈特化搜索：react-native / react / nextjs / ...
    │
    ▼
SKILL.md 模板引擎
    │
    ├── 基础模板：skill-content.md + quick-reference.md
    └── 15 个平台配置 JSON → 生成各平台专属 SKILL.md
    │
    ▼
CLI 分发器（uipro-cli，npm 包）
    │
    └── uipro init --ai claude / cursor / windsurf / ...
        → 生成目标平台的文件结构
```

---

## 2. 七处精妙设计

### 精妙 1：CSV 即知识库——「穷人的向量数据库」

UUPM 没有用 Embedding、向量数据库或 LLM 来存储知识。它用**普通的 CSV 文件**：

```
styles.csv      → 67 行，每行一个 UI 风格的完整属性
colors.csv      → 161 行，每行一个行业的完整配色方案
ui-reasoning.csv → 161 行，每行一套行业推理规则
```

**精妙在哪？**

- **零依赖**：Python 标准库就能读 CSV，不需要 SQLite、Redis、向量数据库
- **人类可编辑**：用 Excel/Numbers 打开就能增删改查知识
- **Git 友好**：CSV 的 diff 清晰可读，适合版本管理
- **Token 高效**：只返回命中的行，不会把整个知识库塞进 LLM 上下文

**对比 Music Skill**：Music Skill 用 TypeScript 代码（正则规则数组）来存储"什么输入对应什么意图"。这意味着每次修改意图规则都要改代码、重新编译。

---

### 精妙 2：BM25 混合搜索——比关键词匹配强，比向量搜索轻

```python
class BM25:
    def __init__(self, k1=1.5, b=0.75):
        ...

    def fit(self, documents):
        # 构建倒排索引 + IDF
        ...

    def score(self, query):
        # TF * IDF * 长度归一化
        ...
```

UUPM 实现了一个**完整的 BM25 排名算法**（信息检索的经典算法），加上**正则域自动检测**：

```python
def detect_domain(query):
    domain_keywords = {
        "color": ["color", "palette", "hex", ...],
        "chart": ["chart", "graph", ...],
        "product": ["saas", "ecommerce", "fintech", ...],
        ...
    }
    # 按关键词命中数打分，自动选择最相关的域
```

**精妙在哪？**

- 比简单的 `includes` 子串匹配**强太多**——BM25 理解词频、文档频率和长度归一化
- 比向量搜索**轻太多**——纯 Python 标准库，无需 GPU、无需 Embedding 模型
- **域自动检测**让用户不需要指定搜索哪个数据库，系统自动路由

**对比 Music Skill**：Music Skill 的意图路由用的是 `find(rule => rule.pattern.test(input))`——第一个正则命中就返回。没有排名、没有打分、没有模糊匹配。用户说"放一下那首歌"如果没有精确命中正则，就直接失败。

---

### 精妙 3：推理规则引擎——CSV 行变成决策树

`ui-reasoning.csv` 的每一行包含：

| 字段 | 示例（Beauty/Spa） |
|---|---|
| UI_Category | Beauty/Spa |
| Recommended_Pattern | Hero-Centric + Social Proof |
| Style_Priority | Soft UI Evolution + Organic Biophilic |
| Color_Mood | Calming, warm, organic |
| Typography_Mood | Elegant, calming, sophisticated |
| Key_Effects | Soft shadows + Smooth transitions |
| Anti_Patterns | Bright neon colors + Harsh animations |
| Decision_Rules | `{"has_booking": "Add booking section"}` |

然后 `DesignSystemGenerator` 执行的不是简单搜索，而是一个**四步推理管线**：

```python
def generate(self, query, project_name):
    # Step 1: 搜索产品类型 → 定位行业
    category = search("product", query)  # → "Beauty/Spa"

    # Step 2: 从推理规则中找到该行业的决策规则
    reasoning = self._apply_reasoning(category)
    # → { pattern: "Hero-Centric", style_priority: ["Soft UI", "Organic"], ... }

    # Step 3: 用推理规则的 style_priority 作为偏好，去搜索具体风格
    search_results = self._multi_domain_search(query, reasoning.style_priority)
    # → 5 个域的搜索结果，style 域用了 priority 加权

    # Step 4: 从搜索结果中用 priority 匹配选择最佳
    best_style = self._select_best_match(style_results, reasoning.style_priority)
```

**精妙在哪？**

这是一个**双层搜索 + 规则推理**的架构：
1. 第一层搜索**定位行业**
2. 推理规则**提供领域专家知识**（什么风格适合什么行业）
3. 第二层搜索**用专家知识作为偏好权重**去检索具体方案
4. 最终输出是**搜索结果 + 推理规则的融合**，而不是纯搜索

这种"搜索→推理→再搜索→融合"的模式，让 161 行 CSV 产生了远超 161 条规则的组合空间。

---

### 精妙 4：Master + Overrides 分层持久化

```
design-system/
├── my-project/
│   ├── MASTER.md           ← 全局设计系统（Source of Truth）
│   └── pages/
│       ├── dashboard.md    ← 仅记录与 Master 不同的部分
│       └── checkout.md     ← 仅记录与 Master 不同的部分
```

**精妙在哪？**

- 这是**CSS 级联思想**在设计系统上的应用：全局规则 + 局部覆盖
- **跨会话持久化**：AI 助手在新对话中可以通过读取 `MASTER.md` 恢复完整的设计上下文
- **Token 高效**：页面文件只包含差异，不重复 Master 的内容
- **人类可读**：Markdown 格式，设计师可以直接审阅和修改

这解决了 AI 工具的一个核心痛点：**会话间的上下文丢失**。

---

### 精妙 5：模板引擎——一套内容，15 个平台

```
templates/
├── base/
│   ├── skill-content.md        ← 通用内容（搜索指南、workflow、checklist）
│   └── quick-reference.md      ← 速查表
└── platforms/
    ├── claude.json             ← Claude Code 的文件结构和 frontmatter
    ├── cursor.json             ← Cursor 的文件结构和 frontmatter
    ├── windsurf.json           ← Windsurf
    ├── copilot.json            ← GitHub Copilot
    └── ... (15 个平台)
```

每个平台 JSON 定义：
```json
{
  "platform": "claude",
  "folderStructure": { "root": ".claude", "skillPath": "skills/ui-ux-pro-max", "filename": "SKILL.md" },
  "scriptPath": "skills/ui-ux-pro-max/scripts/search.py",
  "frontmatter": { "name": "ui-ux-pro-max", "description": "..." },
  "sections": { "quickReference": true }
}
```

CLI 根据模板 + 平台配置，**动态生成**目标平台的 SKILL.md。

**精妙在哪？**

- **单一维护点**：修改 `skill-content.md` 一次，15 个平台同时更新
- **差异化配置**：每个平台有不同的文件路径、frontmatter 格式、功能开关
- **分发自动化**：`uipro init --ai cursor` 一行命令搞定安装

---

### 精妙 6：Scenario-Trigger 矩阵——精确控制 AI 何时启动技能

SKILL.md 中最精妙的部分之一：

```markdown
| Scenario | Trigger Examples | Start From |
|----------|-----------------|------------|
| New project / page | "Build a dashboard" | Step 1 → Step 2 (design system) |
| New component | "Create a pricing card" | Step 3 (domain search) |
| Choose style / color | "What style fits fintech?" | Step 2 (design system) |
| Review existing UI | "Review this page for UX" | Quick Reference checklist |
| Fix a UI bug | "Button hover is broken" | Quick Reference → section |
| Improve / optimize | "Make this faster" | Step 3 (domain: ux, react) |
```

**精妙在哪？**

不同于 Music Skill 简单的"当用户说音乐相关的话时调用 music_control"，UUPM 为每种场景指定了**不同的入口点**和**不同的搜索策略**。这让 AI 不仅知道"何时"使用技能，还知道"如何"使用。

---

### 精妙 7：Pre-Delivery Checklist——质量闸门内置

SKILL.md 的末尾硬编码了一个详尽的检查清单：

```markdown
### Visual Quality
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon family

### Interaction
- [ ] Touch targets >=44x44pt
- [ ] Micro-interaction timing 150-300ms

### Light/Dark Mode
- [ ] Primary text contrast >=4.5:1
- [ ] Both themes tested before delivery
```

**精妙在哪？**

这把**质量标准直接写进了 AI 的工作流程**。AI 不仅生成设计，还会在交付前自动检查这些规则。等于把一个资深设计评审内化成了技能的一部分。

---

## 3. Music Skill 现状对照

| 维度 | UUPM | Music Skill | 差距 |
|---|---|---|---|
| **知识存储** | CSV 数据库（人类可编辑，Git 友好） | TypeScript 代码中的正则数组 | 知识和代码强耦合 |
| **检索引擎** | BM25 排名 + 域自动检测 | `Array.find` 首命中正则 | 无排名、无模糊匹配 |
| **推理能力** | 双层搜索 + 推理规则 CSV | 无推理层 | 无法做组合决策 |
| **上下文持久化** | Master + Overrides 文件系统 | SQLite SessionContext | UUPM 跨会话，Music Skill 仅会话内 |
| **多平台分发** | 模板引擎 + CLI，15 个平台 | 仅 OpenClaw | 单平台绑定 |
| **SKILL.md 质量** | 场景矩阵 + 分步指南 + 检查清单 | 简单的 action-mapping 表 | SKILL.md 太薄，AI 缺乏指导 |
| **数据扩展性** | 加一行 CSV = 新知识 | 加一条规则 = 改代码 + 重编译 | 扩展成本差异巨大 |

---

## 4. 可借鉴的具体方案

### 4.1 意图识别：从硬编码正则 → CSV + BM25

**现状：**
```typescript
// intent-router.ts 中硬编码的规则
const rules = [
  { pattern: /^(播放|放一首|来一首|play\b)/i, intent: "music.play" },
  { pattern: /^(暂停|停一下|pause\b)/i, intent: "music.pause" },
];
```

**借鉴方案：** 将意图规则外部化为 CSV：

```csv
Intent,Keywords_ZH,Keywords_EN,Priority,Slots
music.play,"播放,放一首,来一首,给我播放,放","play,start,listen to",1,"keyword,artistName"
music.pause,"暂停,停一下,先停,停下","pause,stop playing",2,""
music.resume,"继续播放,接着放,继续,恢复","resume,continue,keep playing",3,""
music.next,"下一首,切歌,跳过,换一首","next,skip,next track",4,""
music.volume.set,"音量调到,音量设为,声音大小","volume,set volume to",5,"volumePercent"
music.favorite.add,"收藏这首歌,加到我喜欢,标记收藏","favorite this,save this song",6,""
music.playlist.add_track,"加入(.+)歌单,添加到(.+)播放列表","add to (.+) playlist",7,"playlistName"
```

**收益：**
- 新增口语表达 = 加一行 CSV，不需要改代码
- 可以用 BM25 做模糊匹配，"来点音乐"也能命中 `music.play`
- 中英文关键词分列，维护清晰

---

### 4.2 SKILL.md 增强：从 action-mapping 到 Scenario-Trigger 矩阵

**现状（84 行简单映射表）：**
```markdown
- Play requests: action="play", text=用户原话
- Pause requests: action="pause"
```

**借鉴方案：** 增加场景矩阵和分步指导：

```markdown
## When To Use

| Scenario | Trigger Examples | Action |
|----------|-----------------|--------|
| 播放歌曲 | "播放晴天"、"放一首周杰伦的歌" | action="play", text=原话 |
| 模糊播放 | "来点音乐"、"随便放首歌" | action="play", text=原话 |
| 暂停/继续 | "暂停"、"继续" | action="pause"/"resume" |
| 查询状态 | "现在放的是什么"、"在听什么" | action="now_playing" |
| 收藏管理 | "收藏这首"、"我收藏了什么" | action="favorite_current"/"list_favorites" |
| 歌单管理 | "加入学习歌单"、"播放我的学习歌单" | action="add_current_to_playlist" |
| 下载管理 | "下载这首歌"、"下载好了没" | action="download_current"/"download_status" |
| 无法识别 | 不确定是否是音乐请求 | 不调用 music_control，正常回复 |

## Behavior Rules

1. **优先保留原话**：play 请求中务必将用户原话传入 text，不要自行翻译或简化
2. **单步操作**：每次只调用一次 music_control
3. **不确定时不调用**：如果用户的话可能不是音乐请求，宁可不调用也不误触发
4. **结果即回复**：直接使用 tool 返回的 replyText，不要额外润色

## Error Recovery

| 错误码 | 含义 | 建议回复 |
|--------|------|----------|
| MUSIC_NOT_FOUND | 搜不到歌 | 告诉用户没找到，建议换关键词 |
| MUSIC_NOT_PLAYING | 没在播放 | 告诉用户当前没有播放中的歌曲 |
| INTENT_NOT_SUPPORTED | 指令不支持 | 列出支持的操作让用户选择 |
```

**收益：**
- LLM 更精确地判断何时调用/不调用工具
- 错误恢复指南减少用户困惑
- 场景矩阵覆盖边缘场景（模糊请求、混合意图）

---

### 4.3 音乐推荐推理引擎：借鉴 ui-reasoning.csv

UUPM 用 `ui-reasoning.csv` 的 161 条规则把"行业 → 设计方案"的专家知识编码为数据。Music Skill 的 Agent 层已有 `PreferenceMemory` / `BehaviorMemory` / `SceneMemory`，但缺少一个**场景推理规则库**。

**借鉴方案：** 创建 `music-reasoning.csv`：

```csv
Scene,Time_Range,Mood,Recommended_Genre,Recommended_Tempo,Anti_Patterns
工作专注,09:00-17:00,专注,轻音乐+古典+Lo-fi,60-90BPM,重金属+嘈杂EDM
早晨起床,06:00-09:00,清醒,流行+轻快民谣,90-120BPM,慢节奏哀伤曲
运动健身,any,激励,电子+嘻哈+摇滚,120-160BPM,慢节奏+轻音乐
晚间放松,20:00-23:00,放松,爵士+民谣+纯音乐,50-80BPM,重低音+快节奏
学习阅读,any,安静,白噪音+钢琴曲+古典,40-70BPM,有歌词的歌曲
```

配合 Agent 的 `SceneMemory`，可以实现：
- 用户说"来点适合工作的音乐" → 场景推理 → 推荐 Lo-fi
- 结合当前时间自动推断场景（晚上 10 点 → 晚间放松模式）

---

### 4.4 Pre-Delivery Checklist：内置质量闸门

UUPM 的检查清单确保 AI 生成的 UI 符合质量标准。Music Skill 可以借鉴这个思路，在 SKILL.md 中加入**回复质量检查**：

```markdown
## Response Checklist

Before replying to the user, verify:
- [ ] 如果是播放操作，回复中包含歌曲名和歌手名
- [ ] 如果搜不到歌，建议了替代关键词
- [ ] 不暴露内部错误码给用户
- [ ] 不重复调用相同的 action
- [ ] 回复简洁（不超过 2 句话，除非用户要求详情）
```

---

### 4.5 面板 UI 设计系统：利用 UUPM 生成

Music Skill 的面板（`panel.html`）目前使用手写 CSS。可以直接用 UUPM 的设计系统生成器为面板生成专属的设计规范：

```bash
python3 search.py "music streaming player dark mode" --design-system -p "Music Skill Panel"
```

这会输出：
- 推荐的 UI 风格（可能是 Vaporwave 或 Dark Mode OLED）
- 配色方案（专为音乐类产品优化）
- 字体搭配
- 组件规范（按钮、卡片的 CSS 变量）
- 反模式清单

---

### 4.6 数据外部化模式

将以下 Music Skill 的硬编码数据迁移为 CSV/JSON 外部文件：

| 当前硬编码位置 | 外部化为 | 收益 |
|---|---|---|
| `intent-router.ts` 中的正则规则 | `data/intents.csv` | 加口语表达不改代码 |
| `slot-extractor.ts` 中的提取模式 | `data/slot-patterns.csv` | 新增槽位模式不改代码 |
| `response-builder.ts` 中的回复模板 | `data/responses.csv` | 回复文案可独立维护 |
| `error-codes.ts` 中的错误码描述 | `data/errors.csv` | 错误描述可本地化 |

---

## 5. 不可/不必借鉴的部分

| UUPM 特性 | 不借鉴的原因 |
|---|---|
| **15 平台分发** | Music Skill 依赖 OpenClaw 的 Tool 注册机制和 PowerShell 播放宿主，无法脱离 OpenClaw 运行。多平台模板引擎对它价值不大 |
| **Python 搜索脚本** | Music Skill 是 TypeScript 项目，应该用 TypeScript 实现 BM25（或更简单的 TF-IDF），不应引入 Python 依赖 |
| **无状态设计** | UUPM 是纯知识检索，不需要状态。Music Skill 必须维护播放状态、上下文、收藏等有状态数据 |
| **CSS 组件规范输出** | UUPM 输出 CSS 代码是因为它的用户是前端开发者。Music Skill 的输出是播放控制结果，不需要生成 CSS |
| **Master + Overrides 持久化** | Music Skill 已有 SQLite 持久化，比文件系统更适合结构化数据的 CRUD |

---

## 6. 实施路线图

### Phase 1：低成本高收益（1-2 天）

| 任务 | 借鉴点 | 预期收益 |
|---|---|---|
| 增强 SKILL.md | Scenario-Trigger 矩阵 + Error Recovery + Response Checklist | LLM 调用准确率显著提升 |
| 用 UUPM 生成面板设计系统 | 直接调用 `search.py --design-system` | 面板 UI 质量从"能用"升级到"专业" |

### Phase 2：中等投入（3-5 天）

| 任务 | 借鉴点 | 预期收益 |
|---|---|---|
| 意图规则外部化为 CSV | CSV 知识库模式 | 扩展口语覆盖率降到零代码成本 |
| 实现 TypeScript 版 BM25 | BM25 搜索引擎 | 意图识别从"精确命中"升级为"模糊排名" |
| 回复模板外部化 | 数据外部化模式 | 多语言回复、文案调整不改代码 |

### Phase 3：长期演进（1-2 周）

| 任务 | 借鉴点 | 预期收益 |
|---|---|---|
| 音乐推荐推理引擎 | ui-reasoning.csv 推理规则 | 场景化智能推荐（工作/运动/放松） |
| 槽位提取规则外部化 | 数据外部化模式 | 新增实体类型不改代码 |

---

## 总结

UUPM 的架构精髓可以用一句话概括：

> **把专家知识从代码中解放出来，变成可搜索、可推理、可演化的数据资产。**

它的每一个精妙设计都围绕这个核心：CSV 让知识可编辑，BM25 让知识可检索，推理引擎让知识可组合，模板引擎让知识可分发，Master+Overrides 让知识可持久化。

Music Skill 最值得借鉴的前三项是：

1. **SKILL.md 增强**（成本最低、收益最快）——改一个文件就能显著改善 LLM 的调用准确率
2. **意图规则 CSV 外部化 + BM25**（中等成本、根本性收益）——彻底解决"口语覆盖率需要改代码"的瓶颈
3. **场景推理规则引擎**（长期投入、差异化收益）——从"播放控制工具"升级为"音乐智能助手"
