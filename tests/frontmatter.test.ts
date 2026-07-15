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
});
