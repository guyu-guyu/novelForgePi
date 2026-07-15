---
description: 一致性检查
argument-hint: "[--pass=N,M] [--scope=scene|chapter|book]"
---
调用 consistency-audit 技能，scope=${2:-chapter}，passes=${1:-all}。四遍扫描：人设/时间线/codex引用/命名。
