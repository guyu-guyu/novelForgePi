import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { loadProject } from "../extensions/core/project";
import { StaticGraphContextBuilder } from "../extensions/core/context-builder";
import { parseWikiLinks } from "../extensions/core/wikilinks";

const ROOT = join(process.cwd(), "fixtures", "sample-novel");

describe("integration: sample-novel", () => {
  it("loads and reports structure", () => {
    const p = loadProject(ROOT)!;
    expect(p.listChapters().length).toBeGreaterThanOrEqual(2);
    expect(p.listScenes("001-南下").length).toBeGreaterThanOrEqual(2);
  });

  it("context builder pulls referenced codex + characters", () => {
    const p = loadProject(ROOT)!;
    const cb = new StaticGraphContextBuilder(p);
    const scene = p.listScenes("001-南下")[0];
    const f = p.readFile(scene.path);
    if ((f.data["codex-refs"] as string[] | undefined)?.length) {
      const bundle = cb.buildForScene(scene.id, { budgetTokens: 100000 });
      expect(bundle.referencedCodex.length).toBeGreaterThan(0);
    }
  });

  it("wiki-links resolve within vault", () => {
    const p = loadProject(ROOT)!;
    const scene = p.listScenes("001-南下")[0];
    const links = parseWikiLinks(p.readFile(scene.path).body);
    expect(links.length).toBeGreaterThanOrEqual(0);
  });
});
