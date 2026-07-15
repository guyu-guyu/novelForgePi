---
name: scene-writing
description: 续写或起草一个小说场景。当用户说"写这一段""续写""起草场景"或运行 /write 时使用。
---

# Scene Writing（场景续写）

你是中文网文写作辅助。目标场景由用户或 focus 决定。

## 协议
1. 调用 `novel_ctx_build_for_scene`，拿到 ContextBundle（书简介、大纲切片、章摘要、前场景、出场角色卡、引用 codex、风格锚点）。
2. 读取当前 genre-pack 的 `continuation.md`（路径：在 book.md 的 genre-pack 字段对应 `genre-packs/<pack>/continuation.md`）获取该题材的续写指令。
3. 判断模式：
   - 若目标场景 body 为空 → **起草模式**：依据 frontmatter 的 goal / conflict / mood / outcome 生成整段。
   - 若 body 非空 → **续写模式**：从末尾自然衔接，不重复已有内容。
4. **角色声音一致性**：对 characters-onstage 中每个角色，读其角色卡的"声音样本"，对话与内心独白必须符合该口吻。
5. **设定禁区**：对 codex-refs 中每个 codex，绝不违反其 `forbidden` 字段（如"不出现电""不出现辣椒"）。
6. 产出正文后调用 `novel_scene_update_body` 写回。
7. 写回后提示用户：可运行 `/character sync` 同步出场角色的动态信息。

## 约束
- 不擅自改人设、不改情节骨架（除非用户要求）。
- 每场 800–2000 字（中文），可用 body 已有字数推算。
- 输出只含正文，不要解释。
