---
name: consistency-audit
description: 对书/章/场景做一致性检查。当用户运行 /audit 或说"检查前后矛盾""有没有 bug"时使用。
---

# Consistency Audit（充分一致性检查）

scope 来自 /audit 的 --scope（默认 chapter）；passes 来自 --pass（默认 all，可 1,3）。

四遍扫描，每遍产出结构化条目 `{severity, location, kind, evidence, suggestion}`：

**Pass 1 — 人设一致性**：对 scope 内每个场景，展开 characters-onstage，对照角色卡"恒定设定"（能力/性格/外貌/称呼）。检查：能力越界、性格反常、外貌矛盾、口吻不符。

**Pass 2 — 时间线**：抓所有场景 `timeline` 字段 + 正文时间词（"三日后""入夜"），按章节顺序排，标矛盾。

**Pass 3 — codex 引用**：扫正文 `[[...]]` 与 frontmatter `codex-refs`。(a) 引用目标是否存在（novel_codex_read 失败即缺失）；(b) 正文描述是否违反该 codex 的 `forbidden`。

**Pass 4 — 命名/称谓**：地名/道具/职务前后一致；别名混用是否合理（依 POV 决定该用本名还是别名）。

最后汇总报告，按 severity 排序（error > warning > info）。对每条给出具体 location 与可操作 suggestion。
