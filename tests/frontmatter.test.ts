import { describe, it, expect } from "vitest";
import { parseFrontmatter, serializeFrontmatter, patchFrontmatter } from "../extensions/core/frontmatter";

describe("frontmatter", () => {
  it("parses yaml + body", () => {
    const raw = "---\ntitle: 初雪\nword-count: 3240\n---\n# 第三章\n正文";
    const { data, body } = parseFrontmatter(raw);
    expect(data.title).toBe("初雪");
    expect(data["word-count"]).toBe(3240);
    expect(body.trim()).toBe("# 第三章\n正文");
  });

  it("preserves unknown keys when patching", () => {
    const raw = "---\ntitle: 初雪\nobsidianExtra: keep\n---\nbody";
    const out = patchFrontmatter(raw, { title: "初见" });
    const { data } = parseFrontmatter(out);
    expect(data.title).toBe("初见");
    expect(data.obsidianExtra).toBe("keep");
  });

  it("round-trips serialize", () => {
    const s = serializeFrontmatter({ type: "scene", word: 10 }, "hi");
    expect(s).toContain("type: scene");
    expect(parseFrontmatter(s).body.trim()).toBe("hi");
  });

  it("parses CRLF line endings (Windows autocrlf)", () => {
    // Windows 默认 core.autocrlf=true 会把 checkout 的 LF 模板转成 CRLF。
    // frontmatter 正则必须同时认 LF 和 CRLF，否则 data 返回空 → findBookRoot 失败。
    const raw = "---\r\ntype: book\r\ntitle: 未命名\r\ngenre-pack: cn-webnovel\r\n---\r\n# 未命名\r\n";
    const { data, body } = parseFrontmatter(raw);
    expect(data.type).toBe("book");
    expect(data.title).toBe("未命名");
    expect(data["genre-pack"]).toBe("cn-webnovel");
    expect(body.trim()).toBe("# 未命名");
  });
});
