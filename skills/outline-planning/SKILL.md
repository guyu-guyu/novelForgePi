---
name: outline-planning
description: 规划或编辑小说大纲。当用户运行 /outline 或说"帮我规划大纲""扩展第X章"时使用。
---

# Outline Planning（大纲规划）

采用改进 Snowflake 法，可从任一层切入：
1. 一句话 → 2. 一段话 → 3. 卷梗概 → 4. 章梗概 → 5. 场景梗概。

## 协议
- 读 `outline/main.md` 现状（novel_outline_read）。
- 用户要扩展某节时，用 novel_outline_append_chapter / novel_outline_update_node 落地。
- 每个章节点带 `[[章id]]` 双链；新章先 novel_chapter_create 再补双链。
- 卷用 `##`，章用 `###`，场景可选 `####`；`>` 引用块写意图/钩子。

保持大纲与已写章节不冲突：若某章已写，节点描述应与之吻合。
