---
name: codex-management
description: 世界观参考库（codex）的增删查改。当用户运行 /codex 或说"加个设定""这个概念还没建"时使用。
---

# Codex Management（世界观参考库）

## 新建 entry
1. 确定 category（势力/地点/概念/道具/事件）。
2. **强制**让用户填写 `forbidden` 设定禁区（至少留空数组 `[]`）。
3. novel_codex_create 落地；首次创建给一段基础设定正文。

## 查/改
- novel_codex_read / novel_codex_query 检索。
- 检测：场景正文出现 `[[某词]]` 但 codex 无对应 entry → 提示用户补齐（询问是否 novel_codex_create）。
- 支持"从场景反向抽取"：读一段场景，列出应当录入 codex 的设定，逐条确认后创建。
