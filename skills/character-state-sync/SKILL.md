---
name: character-state-sync
description: 写完场景后同步角色卡的"动态信息"。当用户运行 /character sync 或系统提示场景已更新时使用。
---

# Character State Sync（角色状态同步）

## 协议
1. 读刚更新的场景正文（从 focus 或参数）。
2. 对其每个 characters-onstage 角色，读角色卡"动态信息"（当前处境/关系/秘密清单）。
3. 判断是否有变化：位置、心境、建立新关系、掌握新信息、秘密暴露。
4. 若有变化：询问用户「更新 / 跳过 / 本次会话都自动更新」。
   - 选"本次会话都自动更新" → 设置会话级豁免（写入 `.pi/novelforge-state.json` 的 autoSyncSession=true），后续不再询问，直接 patch。
5. 更新用 novel_character_update_dynamic，只改"## 动态信息"一节。

注意：角色"自己不知道"的秘密（如身世）不应在动态信息里暴露——只记录角色视角已知的信息。
