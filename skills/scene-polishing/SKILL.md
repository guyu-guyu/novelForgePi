---
name: scene-polishing
description: 润色/扩写/精简一个场景。当用户说"润色""改顺一点""拉长""精简"或运行 /polish /expand /condense 时使用。
---

# Scene Polishing（场景润色）

读取 genre-pack 的 `polish.md` 作为润色风格指引。三种模式：

- **light**：只调节奏、去冗余、修语病。情节与字数基本不变。
- **standard**：语言美化 + 对话优化 + 情绪强化。字数 ±20%。
- **heavy / expand**：重写但保留情节骨架，目标更长。
- **condense**：压缩冗余，保留所有情节节点，目标更短。

## 协议
1. `novel_scene_read` 读取原文。
2. 按模式改写（同样遵守角色声音与 codex 禁区）。
3. `novel_scene_update_body` 写回。
4. 报告改了什么（一句话）。
