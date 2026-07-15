---
description: 初始化一本新书：书名、题材包、大纲骨架
---
使用 novelforge 技能中的 book-initialization 流程：
1. 询问书名、作者、目标字数、默认 genre-pack（默认 cn-webnovel）。
2. 运行 /new-book 创建骨架与隔离目录。
3. 引导用户用一句话描述故事，然后展开为大纲前 3 章节点。
4. 在 book.md 写入 one-liner 与 synopsis。
完成后告诉用户：运行 /new-chapter 开始写第一章。
