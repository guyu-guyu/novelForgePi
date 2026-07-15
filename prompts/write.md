---
description: 续写（或起草）当前 focus 场景
argument-hint: "[scene-id?]"
---
调用 skills 目录下的 scene-writing 技能，对 ${1:-当前 focus 场景} 执行续写：
先 novel_ctx_build_for_scene 拿上下文，再参考 genre-pack/continuation.md 产出正文。
