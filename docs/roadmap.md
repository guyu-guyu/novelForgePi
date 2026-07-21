# 已知局限与 v2 规划

novelForgePi v1 已完成并推送。本文档记录 v1 的已知局限，并给出 v2 的规划方向。
所列局限均从代码中核实，每条附相关文件/函数引用。

---

## 一、v1 已知局限

### 1. 题材包落地缺口

`cn-webnovel` 题材包随包发布在 `genre-packs/cn-webnovel/`（包根目录），但技能里引用的路径是
`genre-packs/<pack>/`，且是**相对于书项目根**解析的。

- `skills/scene-writing/SKILL.md:12` 要求读取 `genre-packs/<pack>/continuation.md`。
- `prompts/new-book.md` 的 `/new-book` 流程只创建书骨架，**没有把题材包复制或
  symlink 到书项目**。
- `prompts/genre-pack.md` 的 `/genre-pack use` 只改 `book.md` 的 `genre-pack` 字段，不复制文件。

**后果**：`scene-writing` 技能在书项目里读不到 `genre-packs/cn-webnovel/continuation.md`，
风格指令失效。

**临时绕过**：用户手动 `cp -r genre-packs/cn-webnovel/ <book>/genre-packs/`。

### 2. ContextBuilder 的局限

`extensions/core/context-builder.ts` 中的 `StaticGraphContextBuilder` 存在多处不完善：

- **`resolveLink` 只走 1 层子目录**（`context-builder.ts:38-50`，`globDir` 在 `:52-60`）。
  `chapters/`、`characters/`、`codex/` 下直接子目录能命中，再深一层就找不到。
- **token 估算粗糙**：`estTokens = Math.ceil(text.length * 1.6)`（`:31-33`）。`buildForScene`
  （`:106`）只把 `body + characters + codex` 纳入估算，未算入 `outlineSlice`、`chapterMeta`、
  `bookMeta` 等 bundled 文本，估值偏低。
- **`previousScenes` / `previousChapterSummary` 定义了但没填充**：`ContextBundle` 接口
  （`:17-18`）声明了这两个字段，但 `buildForScene`（`:101`）和 `buildForChapter`（`:124`）
  都硬编码 `previousScenes: []`，`previousChapterSummary` 从未赋值。跨场景连续性只能靠模型
  自己从 `outlineSlice` 推断。
- **无 RAG 实现**：`createContextBuilder("rag")`（`:164`）直接 `throw new Error("rag
  context builder not implemented in v1")`。

### 3. 工具层小缺陷

- **`novel_chapter_reorder` 不更新章元数据内部引用**（`extensions/core/tools/chapter.ts:22-62`）。
  重排后只重写 `[[oldId]]` 形式的反链（`:52`），但章 frontmatter 里的 `number` 字段不会重新
  编号，裸字符串形式的 id 引用（如 `prev: 001-南下` 不带 wikilink 括号）也不会更新。
- **`novel_scene_merge` 空数组未保护**（`extensions/core/tools/scene.ts:115-130`）。传入空
  `sceneIdsJson` 时 `ids[0]` 为 `undefined`，`join(..., "${ids[0]}.md")` 拼出
  `chapters/undefined.md`，后续 `writeBody` 报错而非优雅返回。
- **frontmatter 写入风格不统一**。`extensions/core/frontmatter.ts:22-25` 提供了基于
  `yamlStringify` 的 `serializeFrontmatter`，`project.ts` 的 `writeBody`/`patch` 也走这条路径。
  但 `chapter.ts:20`、`scene.ts:60`/`:109`、`character.ts:28`、`codex.ts:31` 在**创建**文件时
  都用 `JSON.stringify` 直接拼 frontmatter。YAML 1.2 能解析 JSON 子集，功能上不报错，但风格
  与 `serializeFrontmatter` 产出的纯 YAML 不一致，混在同一 vault 里不整洁。

### 4. 无并发保护

- 多个工具同时写同一文件没加锁。`project.ts` 的 `writeBody`（`:39-43`）和 `patch`（`:45-47`）
  都是 read-modify-write：先 `readFileSync` 读原文，内存里改 frontmatter，再 `writeFileSync`
  整体覆盖。两次调用交错时后写者覆盖前写者，丢更新。
- `reindex`（`project.ts:80-98`）串行 patch 所有场景与章文件：对每个 scene 调 `this.patch`
  （一次 read+write），再对每章调 `this.patch`，最后写 `book.md`。大书（几十章、上百场景）
  意味着几百次同步 IO，可能明显变慢。

### 5. 无 RAG / 向量检索

v1 只有静态图上下文构建（`StaticGraphContextBuilder`），没有向量检索。大书（>50 章）的
角色卡、codex、历史场景正文可能超出上下文窗口。`buildForScene`（`context-builder.ts:78-109`）
只能塞进当前场景 frontmatter 里 `characters-onstage` 和 `codex-refs` 显式引用的对象，无法
按语义相关性召回更远的材料——例如第 40 章提到"那把剑"时，无法自动找回第 3 章对这把剑的描写。

### 6. 无 Obsidian 双向同步验证

设计上宣称兼容 Obsidian vault（双链 `[[...]]`、frontmatter、全局唯一文件名），但 `tests/`
下没有用真实 Obsidian vault fixture 做集成验证。双链解析、frontmatter 边界、嵌套目录等边界
情况未经 Obsidian 实际打开/索引验证。

### 7. 无 git 集成

没有任何工具自动 commit 或做版本管理。`extensions/core/tools/` 下无 git 相关工具，
`prompts/` 下无 snapshot 命令。作者要手动 `git add/commit`，误操作风险自担。对于长篇连载
（几十万字），没有自动里程碑意味着回溯某一章的修改历史需要作者自己维护提交习惯。

---

## 二、v2 规划方向

按优先级分级。优先级 1 闭环 v1 遗留，4 为远期探索。

### 优先级 1 — 闭环 v1 遗留

- **题材包落地**：`/new-book` 时 symlink 或 copy 题材包到书项目的 `genre-packs/`；或让
  `/genre-pack use` 在改 `book.md` 字段的同时复制文件。确保 `scene-writing` 技能在书项目
  内读到 `genre-packs/<pack>/continuation.md`。
- **ContextBuilder 完善**：
  - 填充 `previousScenes`（前 N 个场景正文，N 由 `BuildOptions.includePreviousScenes` 控制）；
  - 填充 `previousChapterSummary`（上一章 `chapter.md` 的 `summary` 字段）；
  - `resolveLink` 支持递归子目录（深度优先或限定层数）；
  - `estTokens` 纳入所有 bundled 文本（outlineSlice、chapterMeta、bookMeta 等）。
- **工具层修复**：
  - `novel_chapter_reorder` 重排后重写每章 frontmatter 的 `number` 字段，并处理裸 id 引用；
  - `novel_scene_merge` 对空数组做 guard，返回明确错误而非崩溃；
  - 统一所有创建路径走 `serializeFrontmatter`（yaml stringify），废弃 `JSON.stringify` 拼接。

### 优先级 2 — 能力扩展

- **RAG 上下文构建**：实现 `createContextBuilder("rag")`，用向量检索按场景相关性召回角色卡、
  codex、历史场景片段。候选集成：sqlite-vss / lancedb / 外部 embedding API。需要设计索引更新
  时机（写场景后增量更新 vs 手动 rebuild）。
- **多语种题材包**：除 `cn-webnovel` 外，加英文惊悚/科幻/言情等题材包。`/genre-pack create`
  已有元能力（见 `skills/prompt-pack-generator/SKILL.md`），可批量生成模板。

### 优先级 3 — 体验优化

- **项目树 widget**：v1 只有状态面板（`/status`），v2 加交互式项目树，可浏览章节/场景/角色/
  codex 层级，支持展开收起与跳转。
- **git 集成**：自动 commit（每次 `novel_scene_update_body` 后或按章节里程碑触发）；提供
  `/snapshot` 命令手动打点；`/diff` 查看未提交改动。
- **Obsidian vault 验证**：`tests/` 加真实 Obsidian vault fixture，覆盖双链解析、frontmatter
  边界、全局唯一文件名等场景。
- **并发保护**：文件写加锁，或改用原子写（write-to-temp + rename）避免丢更新。
- **性能**：`reindex` 增量化，只重算变更过的章（基于 mtime 或显式 dirty 标记），避免全量
  扫描。

### 优先级 4 — 远期

- **多书共享 codex**：跨书引用同一 codex（如同一世界观下多本书共享设定），需要设计 codex
  查找路径与命名空间，避免不同书同名条目冲突。
- **协作**：多人同写一本书的冲突解决（基于 git 分支合并或 CRDT），需要章节级锁定与场景级
  合并策略。
- **导出**：导出为 epub / pdf / markdown，支持按章合并、去除 frontmatter、生成目录页与
  版权页。
- **可视化**：人物关系图、时间线图，可能基于 Obsidian 插件或独立 widget，帮助作者把握
  长篇结构。

---

本文档反映 v1 推送时的状态，最新进展以代码为准。
