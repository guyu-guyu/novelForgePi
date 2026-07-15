import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StaticGraphContextBuilder, createContextBuilder } from "../extensions/core/context-builder";
import { loadProject } from "../extensions/core/project";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nfc-"));
  mkdirSync(join(dir, "chapters", "001-南下"), { recursive: true });
  mkdirSync(join(dir, "characters", "主角"), { recursive: true });
  mkdirSync(join(dir, "codex", "道具"), { recursive: true });
  writeFileSync(join(dir, "book.md"), "---\ntype: book\ntitle: T\ngenre-pack: cn-webnovel\nsynopsis: 简介\n---\n");
  // outline dir does not exist; create it explicitly BEFORE writing main.md
  mkdirSync(join(dir, "outline"), { recursive: true });
  writeFileSync(join(dir, "outline", "main.md"), "---\ntype: outline\n---\n# 大纲\n## 卷\n### 第一章 南下 [[001-南下]]\n- 起因");
  writeFileSync(join(dir, "chapters", "001-南下", "001-南下.md"), "---\ntype: chapter\ntitle: 南下\nsummary: 章节总结\nhooks: 钩子\n---\n# 第一章");
  writeFileSync(join(dir, "chapters", "001-南下", "01-出发.md"), "---\ntype: scene\ntitle: 出发\ncharacters-onstage: [\"[[林悦]]\"]\ncodex-refs: [\"[[令牌-北极星]]\"]\n---\n她握紧[[令牌-北极星]]出发");
  writeFileSync(join(dir, "characters", "主角", "林悦.md"), "---\ntype: character\n---\n# 林悦\n## 声音样本\n> 走。");
  writeFileSync(join(dir, "codex", "道具", "令牌-北极星.md"), "---\ntype: codex\ncategory: 道具\nforbidden: [电]\n---\n# 令牌");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("context-builder", () => {
  it("bundles book, chapter, scene, characters, codex", () => {
    const p = loadProject(dir)!;
    const cb = new StaticGraphContextBuilder(p, { genrePacksDir: join(dir) });
    const bundle = cb.buildForScene("001-南下/01-出发", { budgetTokens: 100000 });
    expect(bundle.bookMeta.title).toBe("T");
    expect(bundle.chapterMeta.title).toBe("南下");
    expect(bundle.referencedCharacters[0]).toContain("林悦");
    expect(bundle.referencedCodex[0]).toContain("令牌");
    expect(bundle.estimatedTokens).toBeGreaterThan(0);
  });
  it("createContextBuilder throws for rag", () => {
    expect(() => createContextBuilder("rag")).toThrow();
  });
});
