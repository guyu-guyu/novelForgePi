---
name: prompt-pack-generator
description: 对话式生成新的题材包（genre pack）。当用户运行 /genre-pack create 或说"做一个英文惊悚题材包"时使用。
---

# Prompt Pack Generator（元能力：生成题材包）

你正在为 novelForgePi 生成一份新的、可插拔的题材包。参考现有 `genre-packs/cn-webnovel/` 的结构与写法。

## 协议
1. 询问：新 genre 名字（slug）、语种、目标读者、3–5 部代表作、一段"理想续写样例"。
2. 基于输入 + 参考 cn-webnovel 包，生成完整目录，写到：
   - 默认：`~/.pi/agent/genre-packs/<slug>/`（用户级，多书复用）
   - 若 `--local`：`<项目>/genre-packs/<slug>/`（项目级）
3. 目录内容：
   - `pack.json`：`{ name, language, audience, basedOn: [...] }`
   - `style-guide.md`：风格总纲（节奏、句式、禁忌）
   - `continuation.md`：续写指令模板（角色声音、钩子、爽点）
   - `polish.md`：润色指令
   - `audit-rules.md`：本 genre 特有的一致性规则（如穿越流禁现代词）
   - `snippets/01.md..03.md`：3–5 段 few-shot 语料（来自用户样例或你生成）
4. 完成后提示：用 `/genre-pack use <slug>` 切换当前书的 genre-pack（改 book.md 的 genre-pack 字段）。
