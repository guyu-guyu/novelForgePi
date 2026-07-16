# novelForgePi 使用指南

novelForgePi 把 [Pi Coding Agent](https://pi.dev) 改造成中文网文写作辅助工具。这份指南面向**想用这个工具写小说的作者**，不需要你有编程基础。

## 1. 安装

```bash
pi install git:github.com/guyu-guyu/novelForgePi
```

这会把 novelForgePi 作为 Pi 包安装到全局目录 `~/.pi/agent/git/github.com/guyu-guyu/novelForgePi/`。之后在任何地方启动 pi 都能用到它。

> Windows 用户：`~` 指的是你的用户目录，例如 `C:\Users\你的名字`。

## 2. 开新书

开新书有两种方式：**非隔离模式**（简单）和**隔离模式**（推荐）。

### 方式 A：非隔离模式（简单，共享全局配置）

```bash
mkdir my-novel && cd my-novel
pi
> /new-book
```

`/new-book` 会帮你做好这些事：

- 建好书的骨架目录：`book.md`（书元数据）、`outline/`（大纲）、`chapters/`（章节）、`characters/`（角色）、`codex/`（世界观）
- 建一个 `.pi-isolated/` 目录，准备隔离模式要用到的配置
- 把全局的 novelForgePi 包以 symlink 方式链进来
- 拷贝一份 `isolatePi.sh` 脚本到当前目录，方便之后切换到隔离模式

这种方式直接用你全局的 pi 配置，所有已安装的包都会一起加载。**适合快速试用**。

### 方式 B：隔离模式（推荐：配置隔离 + 安全）

两步：

1. 先按方式 A 跑一次 `/new-book`：
   ```bash
   mkdir my-novel && cd my-novel
   pi
   > /new-book
   ```

2. 退出 pi（按 `Ctrl-C` 或输入 `/quit`），然后运行：
   ```bash
   ./isolatePi.sh
   ```

这会以**隔离模式**重新启动 pi。推荐用这种方式，原因如下：

- **配置隔离**：只加载 novelForgePi 这一个包，不带全局里其他包，避免互相干扰。
- **安全**：
  - `auth.json`、`models.json` 是 symlink（软链接），即使你不小心把它们提交到 git，也只是一个指针，不会泄露真实的 API key。
  - `settings.json` 是一份过滤后的真实文件，只保留模型相关字段，不含任何密钥。
  - `.pi-isolated/` 目录里还有 `.gitignore` 双保险，默认忽略全部内容。
- **天然同步**：novelForgePi 包是 symlink 指向全局克隆，全局 `pi install` 更新后，项目里自动拿到最新版。

> 隔离模式下，每次启动都用 `./isolatePi.sh` 代替直接 `pi`。

## 3. 写作工作流

下面按"从大纲到成稿"的顺序，介绍常用的命令。所有命令都在 pi 的对话框里输入，以 `/` 开头。

### 规划大纲

```
> /outline
```

调用 outline-planning 技能，用改进的 Snowflake 法帮你从一句话扩展到卷梗概、章梗概、场景梗概。可以从任意一层切入。

### 新建章

```
> /new-chapter 初雪
```

会建好章目录 `chapters/003-初雪/`、章元数据文件 `003-初雪.md`，并自动更新 `book.md` 的当前章字段、补上前后章的双链，同时在大纲里追加一个章节点。

### 新建场景

```
> /new-scene 初见雪
```

在当前 focus 章里建一个新场景文件 `01-初见雪.md`，并把它设为 focus 场景（后续命令默认作用于它）。

### 续写

```
> /write
```

调用 scene-writing 技能。它会先调 `ctx.build-for-scene` 把上下文组装好（书简介、大纲切片、前场景、出场角色卡、引用的世界观条目、风格样例），再产出正文写回。

- 场景正文为空 → **起草模式**：依据 frontmatter 的 goal/conflict/mood/outcome 生成整段。
- 场景已有正文 → **续写模式**：从末尾自然衔接，不重复已有内容。
- 自动遵守角色"声音样本"和 codex 的"设定禁区"。

### 润色

```
> /polish                  # 默认 standard
> /polish light            # 只调节奏、去冗余、修语病
> /polish standard         # 语言美化 + 对话优化 + 情绪强化
> /polish heavy            # 重写但保留情节骨架
```

读取当前题材包的 `polish.md` 作为风格指引。

### 扩写 / 精简

```
> /expand                  # 拉长场景，保留情节节点
> /condense                # 压缩冗余，保留情节节点
```

### 一致性检查

```
> /audit                          # 默认扫当前章，跑全部四遍
> /audit --pass=1,3               # 只跑第 1、3 遍
> /audit --scope=book             # 扫全书
```

四遍扫描：

1. **人设一致性**：能力越界、性格反常、外貌矛盾、口吻不符。
2. **时间线**：场景 timeline + 正文时间词，按章节顺序排，标矛盾。
3. **codex 引用**：引用目标是否存在；正文是否违反该 codex 的 `forbidden` 设定禁区。
4. **命名/称谓**：地名/道具/职务前后一致；别名混用是否合理。

输出按严重程度排序（error > warning > info），每条带具体位置和修改建议。

### 章末钩子

```
> /hook
```

为当前场景生成 3 个章末钩子候选（悬念/反转/新谜），你挑一个或自己改。

### 总结

```
> /summarize
```

为章或场景生成总结，写回 frontmatter 的 summary 字段，供后续 ContextBuilder 快速取用。

### 角色管理

```
> /character create 林悦      # 对话式新建角色卡
> /character edit 林悦        # 编辑角色（自然语言描述改动）
> /character sync             # 写完场景后同步角色"动态信息"
```

角色卡分三层：**恒定设定**（外貌/性格/能力/秘密）、**动态信息**（当前处境/关系/秘密清单）、**声音样本**（代表性台词，续写时对口吻）。

写完场景后系统会提示你跑 `/character sync`，它会读场景正文，判断出场角色的位置/心境/关系/信息/秘密有无变化，问你"更新 / 跳过 / 本次会话都自动更新"。

### 世界观

```
> /codex create 凛冬城        # 新建 codex 条目
> /codex read 凛冬城          # 读条目
> /codex query 北境           # 关键词检索
```

新建条目时**强制**让你填 `forbidden`（设定禁区），例如"不出现电""不出现辣椒"。这是续写和 audit 的硬约束，防止 AI 跑偏设定。

支持"从场景反向抽取"：读一段场景，列出应当录入 codex 的设定，逐条确认后建条目。

### 查看进度

```
> /status
```

刷新右下角的状态面板（书名、字数进度、focus 场景、题材包）。

### 重算字数

```
> /reindex
```

如果你��� Obsidian 或别的编辑器里手动改了正文，跑一次 `/reindex` 重算全书字数、场景数、章字数等统计字段。

## 4. 数据文件结构

novelForgePi 把一本书组织成三层：**Book → Chapter → Scene**。所有文件都是 markdown，可以用 Obsidian 直接当 vault 打开浏览编辑。

```
我的书/
├── book.md                    书的根元数据
├── outline/
│   └── main.md                大纲（单文件，多层级 markdown）
├── chapters/
│   └── 003-初雪/              一章一个目录
│       ├── 003-初雪.md        章元数据（与目录同名）
│       ├── 01-初见雪.md       场景 1
│       ├── 02-城门交锋.md     场景 2
│       └── 03-夜谈.md         场景 3
├── characters/
│   ├── 主角/
│   │   └── 林悦.md
│   ├── 配角/
│   └── 反派/
└── codex/
    ├── 势力/
    ├── 地点/
    │   └── 凛冬城.md
    ├── 概念/
    ├── 道具/
    └── 事件/
```

**关键文件说明**：

- **`book.md`**：书的元数据。frontmatter 里写 `type: book`、书名、作者、目标字数、当前字数（自动）、题材包等。正文区可以写全书简介。
- **`chapters/001-章名/001-章名.md`**：章元数据。frontmatter 含章号、POV、时间线、地点、summary、章末钩子、场景列表（自动）等。
- **`chapters/001-章名/01-场景.md`**：场景文件。frontmatter 含 goal/conflict/mood/outcome、出场角色、引用 codex、字数（自动）等。**正文就是你写的小说文字**。
- **`characters/<分类>/<角色名>.md`**：角色卡。分"恒定设定""动态信息""声音样本"三段。恒定设定是角色的硬约束（能力/性格/外貌），动态信息随剧情推进更新，声音样本是几段代表性台词。
- **`codex/<分类>/<条目名>.md`**：世界观条目。frontmatter 的 `forbidden` 字段是设定禁区，续写和 audit 都会强制遵守。
- **`outline/main.md`**：大纲。用 `##` 表卷、`###` 表章、`####` 表场景（可选）；`>` 引用块写意图/钩子。章节点末尾带 `[[章id]]` 双链，落章时自动补上。

**命名约定**：

- 章目录/章文件：`NNN-中文名`（3 位数字前缀，如 `003-初雪`）
- 场景文件：`MM-中文名`（2 位数字前缀，如 `01-初见雪`）
- 角色/codex：直接用名称，无前缀

**双链**：用 `[[目标名]]` 跨文件引用，三种形式：

- `[[林悦]]` — 简单引用
- `[[003-初雪#章末钩子]]` — 带标题锚点
- `[[003-初雪|第三章]]` — 带显示别名

frontmatter 里的双链是**权威引用**（用于 audit 和上下文组装），正文里的双链是**顺手引用**（用于 Obsidian 图谱浏览）。两者可以双写。

## 5. 题材包

题材包（genre pack）是可插拔的"写作口味"集合，决定续写、润色、audit 的风格指引。

### 内置题材包

当前内置 `cn-webnovel`（中文网文），包含：

- `style-guide.md`：风格总纲（节奏、爽点、视角、对话、禁忌、称谓）
- `continuation.md`：续写指令模板
- `polish.md`：润色指令（light/standard/heavy 三档）
- `audit-rules.md`：本题材特有的一致性规则（如金手指一致性、现代词禁区）
- `snippets/01.md`、`02.md`、`03.md`：3 段示例片段，作为风格锚点

### 命令

```
> /genre-pack list                  # 列出可用题材包
> /genre-pack use sci-fi            # 切换当前书的题材包（改 book.md 的 genre-pack 字段）
> /genre-pack create                # 对话式生成新题材包
> /genre-pack create --local        # 生成到项目本地（不共享）
```

`/genre-pack create` 调用 prompt-pack-generator 技能，会问你：

1. 新题材的名字（slug，如 `xianxia`）、语种、目标读者
2. 3–5 部代表作
3. 一段"理想续写样例"

然后基于你的输入 + 参考 cn-webnovel 包，生成完整目录（pack.json / style-guide.md / continuation.md / polish.md / audit-rules.md / snippets/）。

- **默认**写到 `~/.pi/agent/genre-packs/<slug>/`（用户级，多本书可复用）
- 加 `--local` 写到项目内 `genre-packs/<slug>/`（仅当前书可用）

生成后用 `/genre-pack use <slug>` 切换。

## 6. 状态面板

在 novelForgePi 项目目录下启动 pi，右下角会显示状态面板：

```
novelForgePi · 北境孤星
进度 12580 / 800000
focus: 003-初雪/01-初见雪
genre: cn-webnovel
```

- 显示书名、字数进度（当前/目标）、当前 focus 场景、当前题材包。
- 写完场景（`/write`、`/polish` 等）后面板会自动刷新。
- 手动刷新用 `/status`。

**惰性加载**：在**非项目目录**下启动 pi，不会显示任何 novelForgePi 内容，不会打扰你做别的事。只有当当前目录有 `book.md`（且 frontmatter 是 `type: book`）时才激活。

## 7. 常见问题

### "当前目录不是 novelForgePi 项目"

检查当前目录或上层目录里有没有 `book.md`，并且它的 frontmatter 里是 `type: book`。如果没有，用 `/new-book` 初始化。

### CRLF 行尾问题（Windows）

Windows 下 git 默认 `core.autocrlf=true`，会把模板文件转成 CRLF 行尾。novelForgePi 的 frontmatter 解析已兼容 CRLF，不影响使用。如果你在 Obsidian 里手动建文件遇到解析问题，确认一下文件是不是 UTF-8 编码。

### 隔离模式启动失败

检查全局目录 `~/.pi/agent/git/github.com/guyu-guyu/novelForgePi/` 是否存在。如果不存在，说明还没安装包，先跑：

```bash
pi install git:github.com/guyu-guyu/novelForgePi
```

### 改了全局配置后，隔离模式没更新

- `auth.json`、`models.json` 是 symlink，全局改了立刻生效，不用重跑。
- `settings.json` 是过滤后的真实文件，全局改了不会自动同步。重跑一次 `./isolatePi.sh` 即可重新生成。

### 在 Obsidian 里改了正文，字数对不上

跑 `/reindex` 重算全书统计字段（字数、场景数、章字数等）。

### 续写时角色口吻不对

检查该角色的角色卡里"声音样本"有没有写够（至少 2 句代表性台词）。`/character edit <名字>` 补上。

### 续写时世界观跑偏

检查相关 codex 条目的 `forbidden` 字段有没有写清楚。`/codex edit <名字>` 补上设定禁区。

---

更多设计细节，参见 `docs/architecture.md`（开发者文档）。
