# novelForgePi 代码架构与技术细节

> 面向想理解代码结构、做二次开发或给本仓库贡献代码的读者。本文反映**当前已实现的代码**，不涉及设想与未来计划。

## 1. 概览

novelForgePi 是一个 [Pi Coding Agent](https://pi.dev) 扩展包，把 Pi 改造成中文网文写作辅助工具。它采用 **"薄扩展 + 厚技能"** 架构：扩展层只提供原子文件工具和状态管理，所有写作意图（续写 / 润色 / 审计 / 规划等）由 Agent-Skills 与斜杠命令提示模板承载。

```
                     ┌──────────────────────────────────────────┐
                     │              Pi Coding Agent             │
                     │  (host: ExtensionAPI / hooks / commands) │
                     └───────────────────┬──────────────────────┘
                         pi.extensions   │  jiti 加载 .ts
                         ┌───────────────▼────────────────┐
                         │   extensions/novelforge.ts      │  扩展入口
                         │   - 注册 7 个工具模块 (32 tools) │
                         │   - /status, /new-book 命令     │
                         │   - session_start/shutdown/     │
                         │     tool_execution_end hooks    │
                         └───────────────┬────────────────┘
              ┌──────────────────────────┼──────────────────────────┐
   ┌──────────▼───────────┐   ┌──────────▼───────────┐   ┌──────────▼──────────┐
   │  core/ (纯逻辑)       │   │  core/tools/ (薄封装) │   │  core/state.ts       │
   │  project.ts           │   │  scene / chapter      │   │  focus + autoSync    │
   │  frontmatter.ts       │   │  codex / character    │   │  → .pi/novelforge-   │
   │  wikilinks.ts         │   │  outline / ctx        │   │    state.json        │
   │  context-builder.ts   │   │  stats                │   └──────────────────────┘
   │  types.ts             │   │  (每个工具调 core)     │
   └──────────────────────┘   └───────────────────────┘
                         ▲
                         │  ContextBundle / 文件读写
   ┌─────────────────────┴─────────────────────────────┐
   │  skills/ (8 个 SKILL.md)   ← 厚技能：写作意图      │
   │  prompts/ (19 个 .md)      ← 斜杠命令模板          │
   │  genre-packs/cn-webnovel/  ← 题材规则 + snippets   │
   │  templates/book-skeleton/  ← /new-book 骨架        │
   │  fixtures/sample-novel/    ← 集成测试样本           │
   └────────────────────────────────────────────────────┘
```

**关键数字**

| 项 | 数量 |
| --- | --- |
| 工具（`pi.registerTool`） | 32 |
| Agent-Skills（`skills/*/SKILL.md`） | 8 |
| 斜杠命令模板（`prompts/*.md`） | 19 |
| 题材包（`genre-packs/cn-webnovel`） | 1（含 `pack.json` + 4 个规则 md + 3 个 snippets） |
| 测试用例（`tests/*.test.ts`） | 16（分布在 5 个文件） |

---

## 2. 目录结构

```
extensions/
  novelforge.ts              # 扩展入口：注册工具/命令/hooks/widget
  core/
    types.ts                 # BookMeta/ChapterSummary/SceneSummary 类型
    frontmatter.ts           # YAML frontmatter 解析/序列化/patch（兼容 CRLF）
    wikilinks.ts             # [[wiki-link]] 解析（target/anchor/alias 三形式）
    project.ts               # NovelProject 类：loadProject, readFile, writeBody,
                             #   patch, listChapters, listScenes, reindex, countWords
    context-builder.ts       # ContextBuilder 接口 + StaticGraphContextBuilder 实现
    state.ts                 # focus 状态 + autoSyncSession，持久化到
                             #   .pi/novelforge-state.json
    tools/
      scene.ts    # 7 tools: list/read/create/update_body/patch_frontmatter/split/merge
      chapter.ts  # 5 tools: list/read/read_full/create/reorder
      codex.ts    # 5 tools: list/read/query/create/backlinks
      character.ts# 4 tools: list/read/update_dynamic/backlinks
      outline.ts  # 4 tools: read/get_node/append_chapter/update_node
      ctx.ts      # 3 tools: build_for_scene/build_for_chapter/summarize
      stats.ts    # 4 tools: recount_scene/recount_book/pov_conflict/timeline
skills/            # 8 个 Agent-Skills (SKILL.md)
prompts/           # 19 个斜杠命令模板 (.md)
genre-packs/cn-webnovel/  # 题材包：pack.json + 4 个 md + 3 个 snippets
templates/
  book-skeleton/   # /new-book 用的骨架模板（book.md + 4 个空目录 + outline/main.md）
  pi-settings-example.json
fixtures/sample-novel/  # 集成测试用的小型 webnovel（2 章 5 场景 3 角色 9 codex）
tests/             # 5 个测试文件，16 个用例
```

各部分职责：

- **`extensions/novelforge.ts`** — Pi 扩展工厂入口，注册全部工具、两个命令、三个事件 hook，并维护一个内存中的 `state` 对象。
- **`extensions/core/`** — 纯逻辑层，无 Pi 依赖（除 `context-builder` 引用 `NovelProject` 类型）。可被工具层、测试、外部脚本复用。
- **`extensions/core/tools/`** — 7 个工具模块，每个文件导出一个 `registerXTools(pi, getCwd)` 函数，是 core 与 Pi 工具协议之间的薄封装。
- **`skills/`** — 每个 `SKILL.md` 是一份带 frontmatter 的提示词，描述一种写作意图的执行协议（如续写场景时该调哪些工具、按什么顺序）。由 Pi 的 skill 发现机制加载。
- **`prompts/`** — 斜杠命令模板，文件名即命令名（`/write` ← `prompts/write.md`）。模板用 `${1:-默认值}` 占位，调用对应 skill。
- **`genre-packs/cn-webnovel/`** — 题材规则包：`pack.json` 声明语言与受众，`style-guide.md` / `continuation.md` / `polish.md` / `audit-rules.md` 是 skill 在运行时按需读取的题材指令，`snippets/` 是风格锚点样例。
- **`templates/book-skeleton/`** — `/new-book` 拷贝的初始骨架，逐条目幂等创建。
- **`fixtures/sample-novel/`** — 集成测试用的小型 vault，结构完整可用于 `loadProject` + `StaticGraphContextBuilder` 验证。

---

## 3. 核心抽象

### 3.1 NovelProject（`extensions/core/project.ts`）

项目的中央门面。所有工具最终都通过它读写文件。

**项目根发现** — `findBookRoot(start)` 从 `start` 起逐级向上找 `book.md`，找到后还要校验 frontmatter `type === "book"`，否则继续上溯到根目录返回 `null`：

```ts
export function findBookRoot(start: string): string | null {
  let cur = start;
  for (;;) {
    if (existsSync(join(cur, "book.md"))) {
      const fm = parseFrontmatter(readFileSync(join(cur, "book.md"), "utf8"));
      if (fm.data.type === "book") return cur;
    }
    const parent = dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}
```

**文件读写** — `readFile` 返回 `{ data, body }`；`writeBody` 只替换正文，并自动回写 `word-count` 与 `updated`；`patch` 合并 frontmatter 键。

**结构遍历** — `listChapters()` 扫描 `chapters/` 下的子目录（按目录名排序），每个目录对应一章；`listScenes(chapterId)` 扫描该章目录下除章节元数据文件 `<chapterId>.md` 外的所有 `.md`。

**统计重算** — `reindex()` 从叶到根重算：先对每个场景正文算字数回写 `word-count`，再累加到章节（同时回写 `scene-count` 与 `scenes[]` 列表），最后累加到 `book.md` 的 `current-word-count`。

**字数统计** — `countWords` 同时处理 CJK 与 Latin：

```ts
export function countWords(text: string): number {
  const cjk = (text.match(/[一-鿿]/g) ?? []).length;     // CJK 基本区
  const en = text
    .replace(/[一-鿿]/g, " ")                            // 剔掉 CJK 后按空白分词
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
  return cjk + en;
}
```

`[一-鿿]` 覆盖 U+4E00–U+9FFF（CJK 统一汉字基本区）。混合文本如 `"中文abc 中文"` 计为 4 CJK + 1 Latin = 5。

### 3.2 frontmatter（`extensions/core/frontmatter.ts`）

用 `yaml` 库 parse/stringify。边界正则兼容 LF / CRLF / 混合行尾——这一点对 Windows 上 `core.autocrlf=true` 的检出至关重要：

```ts
const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
```

`\r?\n` 让边界匹配 CRLF，内部 YAML 由 `yaml` 库解析（它本身容忍 CRLF）。`patchFrontmatter` 用浅合并 `{ ...data, ...patch }` **保留未知键**——这意味着 Obsidian 等工具写入的自定义字段不会被工具覆盖丢失。YAML 解析失败时返回 `{}`，不抛异常（容错优先）。

### 3.3 ContextBuilder（`extensions/core/context-builder.ts`）

接口定义：

```ts
export interface ContextBuilder {
  buildForScene(sceneId: string, opts?: BuildOptions): ContextBundle;
  buildForChapter(chapterId: string, opts?: BuildOptions): ContextBundle;
}
```

`ContextBundle` 是写作 skill 的统一上下文契约，字段包括：`bookMeta` / `outlineSlice` / `chapterMeta` / `previousScenes` / `targetScene` / `referencedCharacters` / `referencedCodex` / `styleAnchors` / `estimatedTokens`。

**`StaticGraphContextBuilder`** 是当前唯一实现（`createContextBuilder("rag", ...)` 会抛 "not implemented in v1"）。其 `buildForScene` 流程：

1. `resolveScenePath(sceneId)` — 先试 `chapters/<sceneId>.md`，找不到再遍历所有章节目录试 `chapters/<chapterId>/<sceneId>.md`。
2. 读场景 frontmatter，取 `chapterId = basename(dirname(scenePath))`，读章节元数据。
3. 对 `characters-onstage` 与 `codex-refs` 中每个 `[[target]]`，`resolveLink` 在 `chapters/` / `characters/` / `codex/` 三个根下浅扫 + 一层子目录查找 `<target>.md`，命中则读其正文塞进 bundle。
4. `estTokens = ceil(len * 1.6)` —— 粗略的 token 估算系数。

`buildForChapter` 类似但把整章所有场景正文拼成一个 `body`，不拉角色/codex 引用。

`stripLink` 工具函数兼容 `[[林悦]]` 与裸路径两种输入，取 basename 去扩展名。

### 3.4 wikilinks（`extensions/core/wikilinks.ts`）

单一正则覆盖三种 Obsidian wiki-link 形式：

```ts
const RE = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
```

- `[[target]]` — 基础形式
- `[[target#anchor]]` — 带锚点（指向标题）
- `[[target|alias]]` — 带别名（显示文本）

`parseWikiLinks` 用 `matchAll` 遍历，`JSON.stringify(link)` 作为去重 key。`linkText` 是反函数，把 `WikiLink` 对象重新序列化回 `[[...]]` 字符串。

---

## 4. 扩展生命周期（`extensions/novelforge.ts`）

入口签名是 Pi 扩展工厂：

```ts
export default function (pi: ExtensionAPI) {
  const getCwd = () => process.cwd();
  registerSceneTools(pi, getCwd);
  // ...其余 6 个 register 调用
  // 注册 hook 与命令
}
```

### 三个事件 hook

**`session_start`** — 惰性检查策略。先 `loadProject(getCwd())`，**非项目目录直接 return**，不显示任何 widget、不发通知。只有确认是项目目录才 `loadState` + `setWidget("novelforge", ...)` + notify "已加载"。设计理由：避免用户在非 novelForgePi 目录打开 Pi 时被无关面板打扰。

**`session_shutdown`** — `saveState(getCwd(), state)` 把内存 state 写回 `.pi/novelforge-state.json`。

**`tool_execution_end`** — 只对 `novel_scene_update_body` 一个工具有反应：触发 `p.reindex()` 重算字数、刷新 widget 面板、若 `autoSyncSession` 关闭则提示 "可运行 /character sync 同步角色动态信息"。这是扩展层唯一的自动副作用，把"写完场景"与"统计重算"绑定，避免字数 drift。

### 两个命令

**`/status`** — 检查 `loadProject`，非项目则 `ctx.ui.notify(..., "error")` 并 return；项目则刷新 widget 并 notify "已刷新"。

**`/new-book`** — 初始化新书。**��外**：这是唯一不做项目检查的命令（用途就是初始化非项目目录）。步骤：

1. **幂等骨架**：遍历 `templates/book-skeleton/` 每个条目，目标不存在才 `cpSync`（含 `book.md` 不覆盖）。

### widget 渲染

`renderPanel(root)` 返回 4 行字符串数组：书名 / 进度（当前字数 / 目标字数）/ focus scene / genre-pack。非项目返回空数组。

---

## 5. 工具注册模式

7 个工具模块遵循同一模式。以 `scene.ts` 为例：

```ts
export function registerSceneTools(pi: ExtensionAPI, getCwd: () => string) {
  const proj = () => {
    const p = loadProject(getCwd());
    if (!p) throw new Error("不在 novelForgePi 项目中（找不到 book.md）。");
    return p;
  };

  pi.registerTool({
    name: "novel_scene_read",
    label: "Read scene",
    description: "Read a scene by id (e.g. 001-南下/01-出发). Returns frontmatter + body.",
    parameters: Type.Object({ sceneId: Type.String() }),
    async execute(_id, params, _sig, _upd, _ctx) {
      const p = proj();
      const path = join(p.root, "chapters", `${params.sceneId}.md`);
      const f = p.readFile(path);
      return ok(`---\n${JSON.stringify(f.data, null, 2)}\n---\n\n${f.body}`);
    },
  });
  // ...其余 6 个 scene 工具
}
```

要点：

- **`proj()` 工厂**：每个模块内部定义一个闭包，每次调用都重新 `loadProject(getCwd())`。这保证工具总是基于当前工作目录的最新状态（用户可能 `cd` 过），并在非项目目录抛出统一错误。
- **参数 schema**：用 `typebox` 的 `Type.Object({...})` 定义，Pi 据此做参数校验与（若 UI 支持）表单生成。
- **返回值**：统一通过模块私有的 `ok(text)` helper 返回 `{ content: [{ type: "text" as const, text }], details: {} }`，符合 Pi 工具协议。
- **命名空间**：工具名前缀 `novel_` + 模块名 + 动作，如 `novel_scene_update_body` / `novel_codex_backlinks`，避免与其它扩展冲突。
- **`as const`**：`type: "text" as const` 是为了让 TypeScript 把返回类型收窄成字面量，满足 Pi 工具协议的联合类型要求。

### 各模块工具清单

| 模块 | 工具数 | 工具名 |
| --- | --- | --- |
| `scene.ts` | 7 | `novel_scene_list` / `_read` / `_create` / `_update_body` / `_patch_frontmatter` / `_split` / `_merge` |
| `chapter.ts` | 5 | `novel_chapter_list` / `_read` / `_read_full` / `_create` / `_reorder` |
| `codex.ts` | 5 | `novel_codex_list` / `_read` / `_query` / `_create` / `_backlinks` |
| `character.ts` | 4 | `novel_character_list` / `_read` / `_update_dynamic` / `_backlinks` |
| `outline.ts` | 4 | `novel_outline_read` / `_get_node` / `_append_chapter` / `_update_node` |
| `ctx.ts` | 3 | `novel_ctx_build_for_scene` / `_build_for_chapter` / `_summarize` |
| `stats.ts` | 4 | `novel_stats_recount_scene` / `_recount_book` / `_pov_conflict` / `_timeline` |

`_split` 与 `_merge` 是场景级结构编辑：`split` 在 `splitMarker` 第一次出现处切断，前半段写回原文件，后半段新建 `NN-续.md`；`merge` 把多个场景正文拼接到第一个并删除其余。两者都会触发 `reindex`。

`chapter_reorder` 是最复杂的工具：移动章节后重命名目录与文件（前缀 `NNN-` 重排），并递归遍历整个 vault 把 `[[oldId]]` 替换成 `[[newId]]` 以维护 wiki-link 一致性。

`character_update_dynamic` 只替换 `## 动态信息` 段落正文，保留 `## 恒定设定` 与 `## 声音样本` 等其它段落——这是为了在写作过程中增量更新角色状态而不破坏人设基线。

---

## 6. 技术栈与构建

- **模块系统**：ESM（`package.json` 有 `"type": "module"`）。通过 [jiti](https://github.com/unjs/jiti) 加载，**无编译步骤**——Pi 直接 require/import `.ts` 源文件。
- **TypeScript**：仅作类型门（`tsc --noEmit`），不产出 JS。`tsconfig.json` 配置：
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "Bundler",
      "strict": true,
      "noEmit": true,
      "skipLibCheck": true,
      "types": ["node"]
    },
    "include": ["extensions", "tests"]
  }
  ```
- **运行时依赖**：
  - `yaml@^2.4.0` — frontmatter 解析与序列化。
  - `typebox@^1.3.6` — 工具参数 schema 定义。
- **peerDependencies**（由 Pi host 提供，版本 `*`）：
  - `@earendil-works/pi-coding-agent` — `ExtensionAPI` 类型与工具/命令/hook 协议。
  - `@earendil-works/pi-ai` — AI 模型相关类型。
  - `@earendil-works/pi-tui` — TUI / widget / notify。
- **devDependencies**：
  - `vitest@^2.0.0` — 测试框架。
  - `typescript@^5.5.0` — 类型检查。
- **测试脚本**：`npm test` → `vitest run`（`vitest.config.ts` 配置 `environment: "node"`、`include: ["tests/**/*.test.ts"]`）。
- **Pi 扩展发现**：`package.json` 的 `pi.extensions: ["./extensions/novelforge.ts"]`。Pi 启动时读取该字段，用 jiti 加载入口文件并调用 default export。

---

## 7. 数据模型（存储格式）

Book → Chapter → Scene 三层，全是带 YAML frontmatter 的 markdown 文件，**与 Obsidian vault 兼容**（`[[wiki-links]]` 三形式、YAML frontmatter、全局唯一文件名）。

### 7.1 `book.md`（vault 根）

```yaml
---
type: book
title: 未命名
author:
genre-pack: cn-webnovel
language: zh-CN
status: planning          # planning / drafting / revising / done
created: 2026-07-15
target-word-count: 800000
current-word-count: 0     # 由 reindex 维护
one-liner:
synopsis: |
tags: []
---

# 未命名
```

### 7.2 `chapters/<NNN-标题>/<NNN-标题>.md`（章节元数据）

```yaml
---
type: chapter
number: 1
title: 南下
status: outline           # outline / draft / revised / final
word-count: 290           # 由 reindex 维护
scene-count: 3            # 由 reindex 维护
scenes:                   # 由 reindex 维护，二维数组
  - - "001"
  - - "002"
  - - "003"
tags: [章]
---

# 第一章 南下

章摘要正文。
```

`scenes` 字段是 `string[][]`（二维数组），由 `reindex` 从 `listScenes` 结果生成 `sceneIds.push([sc.id])`。

### 7.3 `chapters/<NNN-标题>/<NNN>.md`（场景）

```yaml
---
type: scene
title: 南下列车上的醒来
status: draft             # outline / draft / revised / final
word-count: 100           # 由 reindex / writeBody 维护
timeline: 重生前世终结后第七日
summary: 林悦在列车上醒来，确认重生，决定南下寻找灵脉。
characters-onstage:       # [[wiki-link]] 列表
  - 林悦
codex-refs:               # [[wiki-link]] 列表
  - 重生
  - 南下列车
goal: 让林悦确认重生事实并立下南下目标
conflict: 旧怀表的指针逆流，记忆与现实交错
mood: 迷离而决绝
outcome: 林悦锁定南下方向
---

场景正文。
```

`goal / conflict / mood / outcome` 是 scene-writing skill 在起草模式时依赖的结构化意图字段。

### 7.4 `characters/<role>/<name>.md`

```yaml
---
type: character
name: 林悦
role: 主角
---

## 恒定设定

重生归来的灵脉感知者。前世死于血色之夜……

## 动态信息

当前正乘南下列车前往灵脉觉醒之地……

## 声音样本

"这回，要赶在玄月宗之前。"
```

正文三个固定二级标题：`## 恒定设定`（人设基线，写作中不改）、`## 动态信息`（随情节推进增量更新，由 `novel_character_update_dynamic` 工具定向替换）、`## 声音样本`（对话口吻锚点，scene-writing skill 会读取并对齐角色声音）。

### 7.5 `codex/<category>/<name>.md`

```yaml
---
type: codex
category: 势力
name: 北极星
forbidden: []             # 禁区列表，skill 不得违反
mentioned-count: 0
tags: []
---

北极星是位于极北的守序联盟……
```

`forbidden` 是设定禁区（如 `["不出现电", "不出现辣椒"]`），scene-writing skill 在续写时会读取所有 `codex-refs` 的 `forbidden` 并避免违反。`category` 是自由字符串（如 `势力` / `地点` / `概念` / `道具` / `事件`），决定文件在 `codex/` 下的子目录。

### 7.6 `outline/main.md`

```yaml
---
type: outline
title: 大纲
---

## 第一卷

### 章名 [[001-南下]]

### 章名 [[002-破庙]]
```

`## ` 二级标题分卷，`### ` 三级标题分章并带 `[[chapterId]]` wiki-link 指向章节元数据文件。`novel_outline_get_node` / `_update_node` / `_append_chapter` 三个工具基于行首 `## ` / `### ` 前缀做朴素的文本切片操作。

---

## 8. 测试策略

测试分两层：**单元测试**覆盖 core 纯函数，**集成测试**用真实 fixture 跑端到端路径。无工具层测试——工具是薄封装，逻辑都在 core，测 core 即可。

### 8.1 单元测试（4 个文件，13 个用例）

| 文件 | 用例数 | 覆盖点 |
| --- | --- | --- |
| `frontmatter.test.ts` | 4 | parse yaml+body、patch 保留未知键、serialize 往返、**CRLF 兼容** |
| `wikilinks.test.ts` | 3 | 三种 link 形式解析、忽略 markdown 链接与散落括号、`linkText` 往返 |
| `project.test.ts` | 4 | `findBookRoot` 从嵌套目录上溯、listChapters/listScenes、`reindex` 回写 word-count + scenes、`countWords` 混合 CJK+Latin |
| `context-builder.test.ts` | 2 | bundle 组装正确性、`createContextBuilder("rag")` 抛错 |

`frontmatter.test.ts` 的 CRLF 用例有一条重要注释：

```ts
// Windows 默认 core.autocrlf=true 会把 checkout 的 LF 模板转成 CRLF。
// frontmatter 正则必须同时认 LF 和 CRLF，否则 data 返回空 → findBookRoot 失败。
```

这条用例是为了防止 Windows 用户检出模板后 `findBookRoot` 失败的回归。

`project.test.ts` 用 `mkdtempSync` 在 `os.tmpdir()` 下建临时 vault，每个 `it` 前重建、后删除。`countWords("中文abc 中文")` 期望 `5`（4 CJK + 1 Latin）。

### 8.2 集成测试（`integration.test.ts`，3 个用例）

用 `fixtures/sample-novel/`（2 章 5 场景 3 角色 9 codex）跑：

1. `loadProject` + `listChapters` / `listScenes` 结构校验。
2. `StaticGraphContextBuilder.buildForScene` 拉取 `codex-refs` 对应 codex 正文（断言 `referencedCodex.length > 0`）。
3. `parseWikiLinks` 对真实场景正文解析（断言 `length >= 0`，即不抛错）。

fixture 是一个完整的微型 webnovel（书名《南下：重生之灵脉》），结构真实可读，也方便人工调试。

### 8.3 类型门

`tsc --noEmit` 作为类型检查门，CI 应在测试前运行。由于无编译步骤，类型错误不会阻断 jiti 加载，但会在 `tsc` 阶段暴露。

### 8.4 fixture 结构

`fixtures/sample-novel/` 的完整结构：

```
book.md
outline/main.md
chapters/
  001-南下/
    001-南下.md          # 章节元数据
    001.md               # 场景：南下列车上的醒来
    002.md
    003.md
  002-破庙/
    002-破庙.md
    001.md
    002.md
characters/
  主角/林悦.md
  配角/顾长风.md
  反派/苏明月.md
codex/
  事件/血色之夜.md
  势力/北极星.md
  势力/玄月宗.md
  地点/南下列车.md
  地点/破庙.md
  概念/灵脉.md
  概念/重生.md
  道具/旧怀表.md
  道具/青铜铃.md
```

2 章 5 场景 3 角色 9 codex——足够覆盖 `StaticGraphContextBuilder` 的链接解析与 `loadProject` 的结构遍历，又足够小到测试毫秒级完成。
