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

# 只处理模型/Provider 接入所必需的文件：
#   - auth.json     ：API key 和 OAuth 凭证
#   - settings.json ：defaultProvider / defaultModel / httpProxy 等
#   - models.json   ：自定义 provider/model（可选）
# 其余（extensions、skills、sessions、trust、mcp 缓存、tools.json 等）一律
# 不处理，保持项目运行时的隔离状态。
#
# 安全设计：auth.json / models.json 用 symlink 而非 cp —— 即使误操作将
# .pi-isolated/ 上传提交，symlink 也只是指针，不含真实数据，不会泄露凭证。
#
# 隔离设计：settings.json 仍过滤为真实文件（无密钥，可安全提交），且
# packages 字段只保留 novelForgePi —— 避免把全局的 9 个包全部带进来，破坏
# 项目级隔离。

# 1) auth.json —— symlink（不再 cp，误提交也不泄露凭证）。
#    注意：Git Bash 的 `ln -s` 在 Windows 上会创建副本而非真 symlink，
#    所以这里用 node 的 fs.symlinkSync（本机开发者模式已开，可用）。
if [[ -f "$GLOBAL_AGENT_DIR/auth.json" ]]; then
    rm -f "$ISOLATED_DIR/auth.json"
    node -e 'const fs=require("fs");fs.symlinkSync(process.argv[1],process.argv[2],"file")' \
        "$GLOBAL_AGENT_DIR/auth.json" "$ISOLATED_DIR/auth.json"
    chmod 600 "$ISOLATED_DIR/auth.json" 2>/dev/null || true
fi

# 2) models.json —— symlink。
if [[ -f "$GLOBAL_AGENT_DIR/models.json" ]]; then
    rm -f "$ISOLATED_DIR/models.json"
    node -e 'const fs=require("fs");fs.symlinkSync(process.argv[1],process.argv[2],"file")' \
        "$GLOBAL_AGENT_DIR/models.json" "$ISOLATED_DIR/models.json"
fi

# 3) settings.json —— 首次初始化：若 .pi-isolated/settings.json 已存在则跳过，
#    不覆盖（保留用户在隔离模式下用 pi config 等方式做的修改）。
#    不存在时从全局过滤复制，只保留 provider/model 等基础字段；
#    不注入 packages（包加载交给 /new-book 的 novelForgePi 包 symlink，
#    或用户自行配置）。
if [[ ! -f "$ISOLATED_DIR/settings.json" && -f "$GLOBAL_AGENT_DIR/settings.json" ]]; then
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
