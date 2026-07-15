import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findBookRoot, loadProject, countWords } from "../extensions/core/project";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nf-"));
  mkdirSync(join(dir, "chapters", "001-南下"), { recursive: true });
  writeFileSync(join(dir, "book.md"), "---\ntype: book\ntitle: 北境\ngenre-pack: cn-webnovel\n---\n");
  writeFileSync(join(dir, "chapters", "001-南下", "001-南下.md"), "---\ntype: chapter\nnumber: 1\ntitle: 南下\nscenes: []\nword-count: 0\n---\n# 第一章\n");
  writeFileSync(join(dir, "chapters", "001-南下", "01-出发.md"), "---\ntype: scene\nword-count: 0\n---\n正文一二三abc");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("project", () => {
  it("finds book root from nested cwd", () => {
    expect(findBookRoot(join(dir, "chapters", "001-南下"))).toBe(dir);
    expect(findBookRoot("/nonexistent")).toBeNull();
  });
  it("lists chapters and scenes", () => {
    const p = loadProject(dir)!;
    expect(p.listChapters()).toHaveLength(1);
    expect(p.listScenes("001-南下")).toHaveLength(1);
  });
  it("reindex updates word-count and scenes list", () => {
    const p = loadProject(dir)!;
    p.reindex();
    const chap = p.readFile(join(dir, "chapters", "001-南下", "001-南下.md"));
    expect(chap.data["word-count"]).toBe(6); // 正文一二三abc = 5 CJK + 1 EN word
    expect(chap.data.scenes).toEqual([["01-出发"]]);
  });
  it("counts mixed words", () => {
    expect(countWords("中文abc 中文")).toBe(5); // 4 CJK + 1 EN word
  });
});
