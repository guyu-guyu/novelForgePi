#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(pwd)"
# PI_CODING_AGENT_DIR 指向的是 pi 的 *agent* 目录（等价于 ~/.pi/agent），
# 不是 .pi 根目录。因此配置文件要直接放到这个目录下。
ISOLATED_DIR="$PROJECT_ROOT/.pi-isolated"

# 真实的全局 agent 目录，模型/API 相关的基础配置从这里复制。
GLOBAL_AGENT_DIR="${HOME}/.pi/agent"

mkdir -p "$ISOLATED_DIR"

# 生成 .gitignore，防止 auth.json 中的 API key 等敏感信息被提交到远程仓库。
# `*` 忽略目录内全部内容，`!.gitignore` 例外保留自身（避免每次运行都被判为改动）。
cat > "$ISOLATED_DIR/.gitignore" <<'EOF'
*
!.gitignore
EOF

# 只复制模型/Provider 接入所必需的文件：
#   - auth.json     ：API key 和 OAuth 凭证
#   - settings.json ：defaultProvider / defaultModel / httpProxy 等
#   - models.json   ：自定义 provider/model（可选）
# 其余（extensions、skills、sessions、trust、mcp 缓存、tools.json、
# packages/skills 列表等）一律不复制，保持项目运行时的隔离状态。
#
# 注意：settings.json 不做整体复制，因为其中的 packages/skills 路径会把
# 全局资源重新引进来。下面只挑出模型相关的字段。

# 1) auth.json —— 整体复制（内容仅为 API 凭证）。
if [[ -f "$GLOBAL_AGENT_DIR/auth.json" ]]; then
    cp "$GLOBAL_AGENT_DIR/auth.json" "$ISOLATED_DIR/auth.json"
    chmod 600 "$ISOLATED_DIR/auth.json" 2>/dev/null || true
fi

# 2) models.json —— 整体复制（仅为自定义 provider/model 定义）。
if [[ -f "$GLOBAL_AGENT_DIR/models.json" ]]; then
    cp "$GLOBAL_AGENT_DIR/models.json" "$ISOLATED_DIR/models.json"
fi

# 3) settings.json —— 只提取模型相关字段，避免把全局的
#    packages/skills/extensions 引用一起带进来。
if [[ -f "$GLOBAL_AGENT_DIR/settings.json" ]]; then
    node -e '
        const fs = require("fs");
        const src = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        const keep = [
            "defaultProvider",
            "defaultModel",
            "defaultThinkingLevel",
            "thinkingBudgets",
            "enabledModels",
            "httpProxy",
            "retry",
            "warnings",
        ];
        const out = {};
        for (const k of keep) if (k in src) out[k] = src[k];
        fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 2));
    ' "$GLOBAL_AGENT_DIR/settings.json" "$ISOLATED_DIR/settings.json"
fi

export PI_CODING_AGENT_DIR="$ISOLATED_DIR"

exec pi --approve "$@"
