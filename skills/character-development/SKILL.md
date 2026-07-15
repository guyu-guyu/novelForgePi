---
name: character-development
description: 创建或编辑角色卡。当用户运行 /character create|edit 或说"新建角色""改一下林悦"时使用。
---

# Character Development（角色卡）

## 新建
对话式引导，逐一收集：role、姓名、age、gender、faction、外貌、性格（反应模式/语言风格/底线）、能力（含"不会X"等硬约束）、出身秘密、关系。
落地为一个角色卡 md：`characters/<role>/<name>.md`，结构见设计规格 §3.5（恒定设定 / 动态信息 / 声音样本）。
首次创建时`声音样本`至少给 2 句代表性台词。

## 编辑
用户自然语言描述改动 → 你转换为对 frontmatter 或正文章节的 patch → novel_character_read + novel_character_update_dynamic（仅动态部分）或直接重写文件。
