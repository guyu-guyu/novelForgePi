# novelForgePi

把 [Pi Coding Agent](https://pi.dev) 改造为中文网文写作辅助工具。

## 安装

```bash
pi install git:github.com/guyu-guyu/novelForgePi
```

## 快速开始

```bash
mkdir my-novel && cd my-novel
pi
> /new-book          # 初始化骨架
> /outline           # 规划大纲
> /new-chapter       # 新建章
> /new-scene         # 新建场景
> /write             # 续写
```

## 文档

- [使用指南](docs/usage.md) — 安装、开新书、写作工作流、题材包、常见问题
- [代码架构](docs/architecture.md) — 目录结构、核心抽象、扩展生命周期、技术栈
- [v2 路线图](docs/roadmap.md) — 已知局限、规划方向
- [v1 设计规格（归档）](docs/archive/v1-design-spec.md) — v1 的设计决策记录
- [v1 实现计划（归档）](docs/archive/v1-implementation-plan.md) — SDD 过程产物

## 概览

- **32 个原子文件工具**（scene/chapter/codex/character/outline/ctx/stats）
- **8 个写作技能**（scene-writing/polishing, consistency-audit, outline-planning, character-*, codex-management, prompt-pack-generator）
- **19 个斜杠命令**模板
- **内置 cn-webnovel 题材包**（风格总纲 + 续写/润色指令 + 一致性规则 + 示例片段）
- **Obsidian 兼容**：YAML frontmatter + `[[wiki-links]]` + 全局唯一文件名
- **16 个测试**（单元 + 集成）通过

## 许可

MIT
