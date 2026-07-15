# novelForgePi — 设计规格 v1

- **日期**：2026-07-15
- **作者**：@user + CodeBuddy (Claude Opus 4.7)
- **状态**：草稿（待用户 review）
- **仓库**：`f:/Projects/novelForgePi`

---

## 1. 目标与非目标

### 1.1 目标

把 [Pi Coding Agent](https://pi.dev)（`@earendil-works/pi-coding-agent`）改造为一款面向**中文网文作者**的 AI 写作辅助工具，产品定位对标 Novelcrafter 的"作者主导 + AI 辅助"模式。v1 一次性交付以下 8 大能力：

1. 项目初始化 + 骨架（书/章/场景/大纲/角色/codex）
2. 世界观参考库（Codex）管理
3. 角色卡（Characters）管理，含"恒定/动态"分层
4. 大纲（Outline）分层规划
5. 场景续写（scene-writing，核心）
6. 场景润色（scene-polishing）
7. 充分一致性检查（人设 / 时间线 / codex 引用 / 命名，四 pass）
8. 元能力：对话式生成新 genre pack（`prompt-pack-generator`）

同时保持 Pi 的核心极简哲学：**能力分层放到 skills 与 prompt templates，extension 只做框架级重活**。

### 1.2 非目标（v1 不做）

- **一键成书流水线**（推到 v2）
- **RAG 检索**（v1 用静态双链图；接口化预留 v2 迁移）
- **自定义项目树 TUI**（v1 只做右下状态面板；项目树推到 v2）
- **多语种题材硬编码**（v1 默认中文网文；其他题材靠 `prompt-pack-generator` 生成）
- **Web/VSCode/Obsidian 插件形态**（v1 只做 Pi extension；跨端 UI 推到未来）
- **性能优化**（v1 单本书假设 <100 章、<200 万字，够用即可）

### 1.3 成功标准

- 用 novelForgePi 完成一本网文的前 3 章（≥ 15 场景，≥ 15,000 字）
- 至少 3 个场景由 `/write` 起草并保留 ≥ 60% 内容
- `/audit --pass=1,3` 能在一章内检出至少 1 个真实的人设或 codex 问题
- 一次成功用 `/genre-pack create` 生成一个可用的新题材包

---

## 2. 顶层架构

### 2.1 双仓库拆分

**Repo A — novelForgePi**（引擎，即本仓库）
- Pi Package 源码，发布为 npm 或 git 引用
- 包含：extension（TS）、skills（md）、prompts（md）、genre-packs（md 数据）、templates、docs

**Repo B — 每本书**（数据，用户创建）
- 独立的 markdown 文件树，同时是 Obsidian vault + git repo
- `.pi/settings.json` 中引用 `npm:@you/novelforge-pi`
- 内建自动项目隔离：`.pi/isolated-agent-dir/`

### 2.2 分层架构

```
┌──────────────────────────────────────────────────────────────┐
│  用户入口层 (slash commands + skill:name)                     │
│  /write /polish /audit /new-scene /character ...              │
└────────────────────┬─────────────────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  Skills 层 (业务逻辑，md 驱动 LLM)                            │
│  scene-writing/  scene-polishing/  consistency-audit/         │
│  outline-planning/  character-development/  codex-management/ │
│  character-state-sync/  prompt-pack-generator/                │
└────────────────────┬─────────────────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  Extension Tools 层 (TypeScript 原子能力，无 LLM)             │
│  scene.*  chapter.*  codex.*  character.*  outline.*          │
│  ctx.*  stats.*                                               │
└──────────────────────────────────────────────────────────────┘
```

**核心哲学（方案 B：薄 Extension + 厚 Skills）**：
- Extension 只做框架级重活（文件读写、双链解析、frontmatter 处理、ContextBuilder、hook、状态面板）
- 所有"写作口味"和"业务逻辑"放 skills，可无发版修改
- Slash command 是薄壳入口

### 2.3 Repo A 目录结构

```
novelForgePi/
├── package.json               (pi manifest, keywords: pi-package)
├── extensions/
│   ├── novelforge.ts          入口 extension
│   ├── core/
│   │   ├── project.ts         NovelProject 类
│   │   ├── wikilinks.ts       [[双链]] 解析器
│   │   ├── frontmatter.ts     YAML 属性读写
│   │   └── context-builder.ts ContextBuilder 接口 + Static 实现
│   ├── tools/                 LLM 可调用原子 tools
│   │   ├── scene.ts
│   │   ├── chapter.ts
│   │   ├── codex.ts
│   │   ├── character.ts
│   │   ├── outline.ts
│   │   ├── ctx.ts
│   │   └── stats.ts
│   ├── commands/              slash 命令入口
│   └── ui/
│       └── status-panel.tsx   右下角状态面板
├── skills/
│   ├── scene-writing/
│   ├── scene-polishing/
│   ├── consistency-audit/
│   ├── outline-planning/
│   ├── character-development/
│   ├── codex-management/
│   ├── character-state-sync/
│   └── prompt-pack-generator/
├── prompts/                   斜杠命令 markdown
├── genre-packs/
│   └── cn-webnovel/           v1 默认自带
│       ├── pack.json
│       ├── style-guide.md
│       ├── continuation.md
│       ├── polish.md
│       ├── audit-rules.md
│       └── snippets/
├── templates/
│   └── book-skeleton/         /new-book 复制的骨架
├── fixtures/
│   └── sample-novel/          测试用示例小说 + 用户参考样本
└── docs/
    └── superpowers/specs/
```

### 2.4 每本书目录结构（Repo B 模板）

```
北境孤星/
├── .pi/
│   ├── settings.json           packages 引用 novelforge-pi
│   ├── trust                   项目信任标记
│   ├── isolated-agent-dir/     内建自动生成
│   └── novelforge-state.json   focus / session 豁免等
├── book.md                     根元数据 (type: book)
├── outline/
│   └── main.md                 大纲（多层级 markdown）
├── chapters/
│   └── 003-初雪/
│       ├── 003-初雪.md         章元数据（与目录同名）
│       ├── 01-初见雪.md        场景 1
│       ├── 02-城门交锋.md      场景 2
│       └── 03-夜谈.md          场景 3
├── codex/
│   ├── 势力/
│   ├── 地点/
│   ├── 概念/
│   ├── 道具/
│   └── 事件/
└── characters/
    ├── 主角/
    ├── 配角/
    └── 反派/
```

---

## 3. 数据模型（frontmatter 契约）

### 3.1 通用约定

- YAML frontmatter 严格遵循 Obsidian 属性风格
- 双链 `[[目标]]` 用于跨文件引用；vault 内**文件名全局唯一**保证无歧义
- 时间字段用 ISO 8601（真实时间）；作品内时间自定义字符串
- `word-count` / `scene-count` / `scenes[]` / `mentioned-count` / `onstage-count` / `prev-chapter` / `next-chapter` 等**由 extension 自动维护**，用户不应手写
- **双写引用**：frontmatter 显式声明 = 权威（用于 audit / ContextBuilder）；正文双链 = 顺手引用（用于 Obsidian 图谱）

### 3.2 `book.md`（项目根）

```yaml
---
type: book
title: 北境孤星
author: 张三
genre-pack: cn-webnovel
language: zh-CN
status: writing               # planning | writing | revising | done | hiatus
created: 2026-07-15
target-word-count: 800000
current-word-count: 12580     # 【自动】
current-chapter: "[[003-初雪]]"  # 【自动】
one-liner: 一个失去记忆的少女在覆雪的北境王朝重建家园
synopsis: |
  多行简介……
tags: [女主视角, 权谋, 慢热]
aliases: [北星]
---
```

### 3.3 章 `chapters/NNN-name/NNN-name.md`

```yaml
---
type: chapter
number: 3
title: 初雪
status: draft                 # outline | draft | polished | done
pov: "[[林悦]]"
timeline: 2026-建元3年-冬-初
location: "[[凛冬城]]"
summary: |
  林悦初到凛冬城，见识北境的寒冬，与守将赵霖第一次交锋。
outline-refs:
  - "[[outline/main#第一卷/雪落章]]"
word-count: 3240              # 【自动】
scene-count: 3                # 【自动】
scenes:                       # 【自动】
  - "[[01-初见雪]]"
  - "[[02-城门交锋]]"
  - "[[03-夜谈]]"
prev-chapter: "[[002-南下]]"  # 【自动】
next-chapter: "[[004-暗流]]"  # 【自动】
created: 2026-07-15
updated: 2026-07-15T14:22:00
tags: [章]
---

# 第三章 初雪

## 章节总结
（作者摘要，供 LLM 快速理解章脉络）

## 剧情伏笔
- 伏笔 1（呼应 [[044-身世之谜]]）

## 章末钩子
（钩子文字）
```

### 3.4 场景 `chapters/NNN-chap/MM-scene.md`

```yaml
---
type: scene
chapter: "[[003-初雪]]"
number: 1
title: 初见雪
status: draft
pov: "[[林悦]]"
timeline: 2026-建元3年-冬-初-申时
location: "[[凛冬城/北门]]"
characters-onstage:
  - "[[林悦]]"
  - "[[赵霖]]"
  - "[[老仆-王七]]"
codex-refs:
  - "[[令牌-北极星]]"
  - "[[北境-守城制]]"
mood: 阴冷、警惕
goal: 建立林悦对北境的第一印象；埋赵霖辨认的伏笔
conflict: 城门守卫盘问身份 vs 林悦不愿透露
outcome: 惊险入城
word-count: 1240              # 【自动】
target-word-count: 1500
created: 2026-07-15
updated: 2026-07-15T14:22:00
tags: [场景, 入城戏]
---

# 初见雪

雪是从辰时开始下的……
```

### 3.5 角色 `characters/*/name.md`

```yaml
---
type: character
role: 主角                    # 主角 | 配角 | 反派 | 龙套 | 势力代表
status: alive                 # alive | dead | missing | unknown
age: 17
gender: 女
first-appearance: "[[001-南下]]"
last-appearance: "[[003-初雪]]"      # 【自动】
onstage-count: 5              # 【自动】
faction: "[[北境王朝-旧党]]"
relations:
  - who: "[[赵霖]]"
    kind: 未知血缘
    note: 两人令牌纹样一致
aliases: [林小七, 阿悦]
tags: [女主, 失忆, 权谋线]
---

# 林悦

## 恒定设定
### 外貌
（描述）

### 性格
- 反应模式：受威胁时先示弱后反击
- 语言风格：书面语较多
- 底线：不欺弱、不受嗟来之食

### 能力
（列表；含"不会武功"等硬约束）

### 出身秘密
（角色本人不知道，但作者/LLM 需要知道）

## 动态信息
### 当前处境（更新到 [[003-初雪]]）
- 位置：凛冬城内、临江客栈
- 心境：警惕、迷茫
- 掌握的信息：……
- 身上物品：令牌（贴身藏）、药方、少量银钱

### 已建立的关系
- [[赵霖]]：城门交锋一次，无深交
- [[老仆-王七]]：以为是仆人，实为敌线

### 秘密清单
| 秘密 | 谁知道 | 何时揭示 |
|---|---|---|
| 令牌真意 | 无人 | 第五卷 |

## 声音样本
> "劳烦军爷通融，妾身自江南来寻亲，凭据都在此处。"

> "既知我来路不明，将军为何还要放我入城？"
```

### 3.6 Codex `codex/<category>/name.md`

```yaml
---
type: codex
category: 地点                # 势力 | 地点 | 概念 | 道具 | 事件
parent: "[[北境王朝]]"
aliases: [凛都, 北都]
first-appearance: "[[003-初雪]]"
mentioned-count: 8            # 【自动】
tags: [城市, 北境]
forbidden:                    # 【必填】设定禁区
  - 电力照明
  - 辣椒（架空物产表内没有）
---

# 凛冬城

## 地理
（描述）

## 政治
（描述）

## 关键子地点
- [[凛冬城/北门]]
- [[凛冬城/临江客栈]]

## 出场记录
- [[003-初雪]]：林悦初到，北门盘问
```

### 3.7 大纲 `outline/main.md`

```markdown
---
type: outline
book: "[[book]]"
status: draft
last-planned-chapter: 5
---

# 大纲

## 第一卷 · 雪落
> 主线：林悦南下寻亲反被驱逐，北上落脚凛冬城。
> 卷末钩子：赵霖识破身份。

### 第一章 南下 [[001-南下]]
- 起因：养父病危遗言
- 发展：马车队伍遇伏
- 结果：孤身徒步向北

### 第三章 初雪 [[003-初雪]]  ← 当前写作
...
```

层级约定：`##` 卷，`###` 章，`####` 场景（可选）。`> ...` 引用块 = 意图/钩子；普通条目 = 剧情要点。

**大纲双链维护**：章标题末尾的 `[[003-初雪]]` 双链，在 `chapter.create` / `chapter.reorder` 时由 extension **自动追加/更新**；卷/场景层的双链由作者手动维护。作者可以自己在大纲里预先规划未来章节（不带双链），落章时 extension 补上双链。

### 3.8 `.pi/settings.json`

```json
{
  "packages": ["npm:@you/novelforge-pi"],
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-5",
  "genrePack": "cn-webnovel",
  "novelforge": {
    "autoUpdateWordCount": true,
    "autoResolveBacklinks": true,
    "contextBuilder": "static-graph",
    "contextBudgetTokens": 16000
  }
}
```

---

## 4. Extension Tools（LLM 原子能力）

**scene.\***
- `scene.list({chapter?})` — 列场景
- `scene.read({sceneId})` — 读完整场景
- `scene.create({chapterId, title, insertAt?})` — 建新场景，自动填基础 frontmatter
- `scene.update-body({sceneId, newBody})` — 替换正文（原子写入）
- `scene.patch-frontmatter({sceneId, patch})` — 局部改元数据，保留未知字段
- `scene.split({sceneId, splitAt})` — 拆场景
- `scene.merge({sceneIds})` — 合并场景

**chapter.\***
- `chapter.list()` / `chapter.read({id})` / `chapter.read-full({id})` — 读章
- `chapter.create({title, insertAt?})` — 建新章目录 + 同名章文件
- `chapter.reorder({from, to})` — 重排（自动重命名 + 更新反链）

**codex.\***
- `codex.list({category?})` / `codex.read({id})` / `codex.query({keyword})` / `codex.create({category, name})` / `codex.backlinks({id})`

**character.\***
- `character.list({role?})` / `character.read({id})`
- `character.update-dynamic({id, patch})` — 只改"## 动态信息"部分
- `character.backlinks({id})` — 哪些场景 onstage 了该角色

**outline.\***
- `outline.read()` / `outline.get-node({path})` / `outline.append-chapter({...})` / `outline.update-node({path, content})`

**ctx.\***
- `ctx.build-for-scene({sceneId, budget})` — 组装 ContextBundle
- `ctx.build-for-chapter({chapterId, budget})` — 章级
- `ctx.summarize({target})` — LLM 生成总结，缓存到 frontmatter

**stats.\***
- `stats.recount-scene({sceneId})` / `stats.recount-book()` — 字数重算
- `stats.pov-conflict()` — 扫 POV 冲突
- `stats.timeline()` — 输出全书时间线

---

## 5. Slash Commands（用户入口）

| 命令 | 参数 | 效果 |
|---|---|---|
| `/new-book` | (交互) | 初始化项目骨架 |
| `/new-chapter` | `[章名]` | 建新章，更新大纲与前后链接 |
| `/new-scene` | `[场景名]` | 在当前 focus 章内建新场景 |
| `/write` | `[scene-id?]` | 续写（默认当前 focus）|
| `/polish` | `[scene-id?] [level]` | 润色：light/standard/heavy |
| `/expand` / `/condense` | `[scene-id]` | 扩写/精简 |
| `/audit` | `[--pass=N,M] [--scope=scene\|chapter\|book]` | 一致性检查 |
| `/character` | `<action> <name>` | create/edit/sync |
| `/codex` | `<action> <name>` | 增删查改 |
| `/outline` | `[section?]` | 大纲操作 |
| `/hook` | `[scene-id]` | 生成 3 个章末钩子候选 |
| `/summarize` | `[scope]` | 章/场景总结，写回 frontmatter |
| `/status` | — | 展示项目状态面板 |
| `/find` | `<query>` | 全 vault 搜索 |
| `/where-used` | `<name>` | 反向引用查询 |
| `/genre-pack` | `<action> [--local]` | list/use/create |
| `/preview-context` | `[scene-id]` | 调试用：预览 ContextBundle |
| `/reindex` | — | 全书统计重算 |

**Focus 会话状态**：extension 维护当前 focus 场景，多数命令的 scene 参数可省略。focus 持久化到 `.pi/novelforge-state.json`。

---

## 6. Skills（业务能力）

### 6.1 `scene-writing`（核心）

SKILL.md 引导 LLM 按协议执行：
1. `ctx.build-for-scene {sceneId, budget}` 拿到 ContextBundle
2. 读 `genre-pack/continuation.md` 拿写作指令
3. body 为空 → 起草模式（用 goal/conflict/mood 生成）
4. body 非空 → 续写模式（从末尾自然衔接）
5. 生成时严格遵循 `characters-onstage` 角色的**声音样本**
6. 遵循 `codex-refs` 中每个 codex 的**设定禁区**
7. `scene.update-body` 写回
8. 触发 `character-state-sync`

### 6.2 `scene-polishing`

同上但读 `polish.md`；三档：`light`（节奏/去冗余）/ `standard`（语言美化+对话优化）/ `heavy`（重写保情节）。

### 6.3 `consistency-audit`

四 pass，可通过 `--pass=1,3` 只跑选定 pass：

- **Pass 1 — 人设一致性**：展开 characters-onstage，对照角色卡"恒定设定"扫描能力越界、性格反常、外貌矛盾、称呼口吻。
- **Pass 2 — 时间线**：抓所有场景 `timeline` + 正文时间描述，扫矛盾。
- **Pass 3 — codex 引用**：正文双链 + `codex-refs` → 引用存在性 + 是否违反**设定禁区**。
- **Pass 4 — 命名/称谓**：地名/道具/职务前后一致；别名混用是否合理（看 POV）。

输出结构化报告：`{severity, location, kind, evidence, suggestion}`。

### 6.4 `outline-planning`

改进的 Snowflake 方法：一句话 → 一段话 → 卷梗概 → 章梗概 → 场景梗概。可从任一层切入或只扩展某节。

### 6.5 `character-development`

对话式引导新建/编辑角色，落地为角色卡。

### 6.6 `character-state-sync`

写完场景后自动触发。协议：
1. 读该场景正文
2. 对照每个 onstage 角色的"当前处境/关系"字段
3. 判断有无变化（位置/心境/关系/信息/秘密）
4. 有变化 → 询问"更新 / 跳过 / 本次会话都自动更新"
5. 若选"本次都自动更新" → session 内跳过询问，直接 patch

会话级豁免存 `.pi/novelforge-state.json`，Pi 退出即失效。

### 6.7 `codex-management`

- 新建 entry 强制交互填 `forbidden`（设定禁区）
- 检测正文双链引用了未建的 codex 并提示补齐
- 支持"从场景反向抽取"：读一段场景问 LLM"应当录入哪些设定"

### 6.8 `prompt-pack-generator`（元能力）

1. 问新 genre 名字、语种、目标读者
2. 让用户描述 3-5 部代表作 + 一段"理想续写样例"
3. LLM 基于输入 + 参考现有 cn-webnovel 包，生成完整目录：
   - `pack.json` / `style-guide.md` / `continuation.md` / `polish.md` / `audit-rules.md` / `snippets/`
4. 默认输出到 `~/.pi/agent/genre-packs/<name>/`；`--local` 输出到项目本地 `genre-packs/<name>/`
5. `/genre-pack use <name>` 切换当前书

---

## 7. ContextBuilder

### 7.1 接口

```typescript
interface ContextBuilder {
  buildForScene(sceneId: string, opts: BuildOptions): Promise<ContextBundle>;
  buildForChapter(chapterId: string, opts: BuildOptions): Promise<ContextBundle>;
}

interface BuildOptions {
  budgetTokens: number;
  includePreviousScenes?: number;         // 默认 1
  includePreviousChapterSummary?: boolean;// 默认 true
  includeAllCodex?: boolean;              // 默认 false
}

interface ContextBundle {
  bookMeta: { title; synopsis; genrePack };
  outlineSlice: string;
  chapterMeta: { number; title; summary; hooks };
  previousScenes: Scene[];
  previousChapterSummary?: string;
  targetScene: Scene;
  referencedCharacters: Character[];
  referencedCodex: CodexEntry[];
  styleAnchors: string[];
  estimatedTokens: number;
}
```

### 7.2 v1 StaticGraphContextBuilder 组装

1. 读 target scene frontmatter
2. book.md 拿 synopsis + genre pack
3. outline 提取对应节点及前后节点
4. chapter.md 拿 summary/hooks
5. 章内顺序拉前 N 场景全文（若章首 → 拉前章末尾场景 + 前章 summary）
6. 从 characters-onstage 读角色卡（恒定 + 动态 + 声音样本）
7. 从 codex-refs 读 codex（含 forbidden 字段）
8. 从 genre-pack/snippets/ 挑 1-2 段风格锚点
9. token 估算（`~字数 × 1.6`）
10. 超预算时按优先级降级：砍风格锚点 → 前场景全文换 summary → 砍低频 codex

### 7.3 v2 迁移

- 新增 `RagContextBuilder implements ContextBuilder`
- 用 `sqlite-vss` 或 `lancedb` 存 embeddings
- setting `contextBuilder: "rag"` 一键切换
- v1 双链遍历保留为兜底 + 补充

---

## 8. Hooks 与生命周期

| Hook | 时机 | 动作 |
|---|---|---|
| `after-tool:scene.update-body` | 场景正文写入后 | 重算字数 → patch frontmatter → 更新章 word-count → 排入 `character-state-sync` |
| `after-tool:scene.create` | 场景创建后 | 更新章 `scenes[]` / `scene-count` |
| `after-tool:chapter.create` | 章创建后 | 更新 book.md `current-chapter`；更新前章 `next-chapter` |
| `on-startup` | Pi 启动 | 加载 focus 状态；显示状态面板 |
| `on-shutdown` | Pi 退出 | 持久化 focus + session 豁免 |

所有 hook 同步、无 LLM 参与、只做文件读写。character-state-sync 的"询问"部分靠 skill 完成，hook 只入队。

---

## 9. TUI

**v1 只做右下状态面板**（Pi TUI 组件实现）：

```
当前 focus: 003-初雪 / 01-初见雪
─────────────────────────────
字数 12,580 / 800,000 (1.6%)
本章  3,240   本场  1,240 / 1,500
POV   林悦    时间   建元3年·冬·初
上场角色 林悦 · 赵霖 · 王七
Genre pack: cn-webnovel
```

- 数据来自 focus 场景与所属章/书的 frontmatter
- `Ctrl+B` 隐藏/显示
- **项目树面板推 v2**

---

## 10. 项目隔离

`/new-book` 自动执行：
1. 创建 `.pi/isolated-agent-dir/`（继承自你现有 `isolatePi.sh` 的策略）
2. 拷贝全局 `auth.json` / `models.json`
3. 从全局 `settings.json` 只挑选模型相关字段
4. 在 `.pi/settings.json` 中设置 `packages: [novelforge-pi]`
5. 提供项目根 `pi.sh` wrapper：`export PI_CODING_AGENT_DIR=.pi/isolated-agent-dir && exec pi "$@"`

保留旧 `isolatePi.sh` 在 `templates/` 中作为参考文件。

---

## 11. 错误处理与边界

| 情况 | 处理 |
|---|---|
| 双链指向不存在文件 | audit 报警告；ContextBuilder 跳过并记 warning log |
| Frontmatter YAML 错误 | 降级为空对象，不崩溃，提示修 |
| Obsidian 与 Pi 并发写场景 | Pi 写入前对比 mtime，冲突则中止让用户合并 |
| context budget 不够即使降级 | 报错让用户缩范围 |
| genre-pack 缺文件 | 回退到内置默认包，warning |
| 手工在 Obsidian 大量增删 | `/reindex` 一键重算全书统计 |
| 项目根不是 novelforge 项目 | extension 不激活面板；命令报错提示 |

---

## 12. 命名与文件规范

- 章目录/章文件：`NNN-中文名`（3 位数字前缀）
- 场景文件：`MM-中文名`（2 位数字前缀）
- 角色/codex：直接用名称，无前缀
- **vault 内文件名全局唯一**
- 双链三种形式：
  1. `[[林悦]]` 简单
  2. `[[003-初雪#章末钩子]]` 带 heading 锚点
  3. `[[003-初雪|第三章]]` 带显示别名

---

## 13. 字数与 Tokenizer

- 中文：正则 `[\u4e00-\u9fff]` 计数（不含标点）
- 英文：`text.split(/\s+/).filter(Boolean).length`
- 混合：分别统计合计到 `word-count`
- Token 估算：`~字数 × 1.6`（中文经验值），够 v1 用；精确 tokenization 推 v2

---

## 14. 测试策略

### 14.1 单元测试（vitest）

- `wikilinks.parse()` — 各种双链格式与边界
- `frontmatter.patch()` — 保留未知字段、类型不变
- `NovelProject.reindex()` — 增删改后 frontmatter 一致
- `StaticGraphContextBuilder.buildForScene()` — 各种降级路径

### 14.2 集成测试

用 `fixtures/sample-novel/`（2 章 5 场景 3 角色 8 codex）跑：
- 全书 `/audit` 报告符合期望
- `/write` 组装 prompt 正确（mock LLM 返回固定值）
- hook 链路完整

### 14.3 手动 QA

至少用 novelForgePi 自己写完一章（~5 场景 8000 字）。

### 14.4 不做的测试

- Obsidian 兼容性（信任 md + YAML 标准）
- Pi TUI 组件（信任 Pi 官方）
- 端到端性能

---

## 15. 里程碑与工作量估算

v1 Big Bang 交付。粗略估算（不给具体时间，只给相对量）：

| 模块 | 相对工作量 |
|---|---|
| extension core + tools（scene/chapter/codex/character/outline/ctx/stats） | ★★★★ |
| ContextBuilder v1 + 降级策略 | ★★★ |
| 8 个 skills（含 SKILL.md 与协议） | ★★★★ |
| slash commands + focus 状态 | ★★ |
| 状态面板 TUI | ★ |
| genre-pack cn-webnovel 完整内容 | ★★★ |
| 项目隔离内建 + `/new-book` 骨架生成 | ★ |
| fixture sample-novel | ★ |
| 单元 + 集成测试 | ★★ |

建议实现顺序：core & tools → ContextBuilder → 简单 skills（scene-writing / polishing）→ 复杂 skills（audit / sync / meta）→ commands & UI → genre-pack → fixture & 测试。

---

## 16. Out of Scope（明确不做的清单）

- 一键成书自动流水线（v2）
- RAG 上下文（v2）
- 项目树 TUI（v2）
- Web / VSCode / Obsidian 插件形态（未来）
- 图片/音频/视频等富媒体
- 多作者协作（git 层面能协作，工具不做冲突可视化）
- 出版格式导出（epub/docx/pdf）——v2 用独立 skill 加
- AI 生成插图/封面（未来）

---

## 17. 术语表

- **book**：一部完整小说（一个书目录 = 一个 Obsidian vault = 一个 git repo）
- **chapter / 章**：小说结构第二级，一个目录 + 同名章元数据文件
- **scene / 场景**：**最小写作单元**，一次续写/润色/一致性检查的作用域
- **codex**：世界观参考库，包含势力/地点/概念/道具/事件
- **character**：角色卡，分恒定/动态两部分
- **outline / 大纲**：单文件多层级 markdown，标题层级即大纲层级
- **genre pack / 题材包**：可插拔的 prompt 集合，决定"写作口味"
- **focus 场景**：当前会话操作的默认场景，由 extension 维护
- **ContextBundle**：ContextBuilder 组装给 LLM 的上下文数据结构
- **设定禁区 / forbidden**：codex 条目里的硬约束清单
- **双写引用**：frontmatter 声明为权威 + 正文双链为顺手引用
