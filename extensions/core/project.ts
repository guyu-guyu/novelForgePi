import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, renameSync } from "node:fs";
import { join, dirname, relative, basename } from "node:path";
import { parseFrontmatter, serializeFrontmatter, patchFrontmatter } from "./frontmatter";
import type { BookMeta, ChapterSummary, SceneSummary } from "./types";

export function countWords(text: string): number {
  const cjk = (text.match(/[一-鿿]/g) ?? []).length;
  const en = text
    .replace(/[一-鿿]/g, " ")
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
  return cjk + en;
}

export function findBookRoot(start: string): string | null {
  let cur = start;
  for (;;) {
    if (existsSync(join(cur, "book.md"))) {
      const fm = parseFrontmatter(readFileSync(join(cur, "book.md"), "utf8"));
      if (fm.data.type === "book") return cur;
    }
    const parent = dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

export function sceneIdFromPath(root: string, path: string): string {
  return relative(root, path).replace(/\\/g, "/").replace(/\.md$/, "");
}

export class NovelProject {
  constructor(public readonly root: string) {}

  readFile(path: string): { data: Record<string, unknown>; body: string } {
    return parseFrontmatter(readFileSync(path, "utf8"));
  }

  writeBody(path: string, body: string): void {
    const { data } = this.readFile(path);
    writeFileSync(path, serializeFrontmatter(data, body));
    this.patch(path, { "word-count": countWords(body), updated: new Date().toISOString() });
  }

  patch(path: string, patch: Record<string, unknown>): void {
    writeFileSync(path, patchFrontmatter(readFileSync(path, "utf8"), patch));
  }

  listChapters(): ChapterSummary[] {
    const chDir = join(this.root, "chapters");
    if (!existsSync(chDir)) return [];
    return readdirSync(chDir)
      .filter((d) => statSync(join(chDir, d)).isDirectory())
      .sort()
      .map((d) => {
        const metaPath = join(chDir, d, `${d}.md`);
        const fm = existsSync(metaPath) ? this.readFile(metaPath).data : {};
        return { id: d, title: (fm.title as string) ?? d, path: metaPath };
      });
  }

  listScenes(chapterId: string): SceneSummary[] {
    const cDir = join(this.root, "chapters", chapterId);
    if (!existsSync(cDir)) return [];
    return readdirSync(cDir)
      .filter((f) => f.endsWith(".md") && f !== `${chapterId}.md`)
      .sort()
      .map((f) => {
        const fm = this.readFile(join(cDir, f)).data;
        return {
          id: f.replace(/\.md$/, ""),
          title: (fm.title as string) ?? f,
          path: join(cDir, f),
          status: (fm.status as string) ?? "draft",
          wordCount: (fm["word-count"] as number) ?? 0,
        };
      });
  }

  reindex(): void {
    const chapters = this.listChapters();
    let bookWords = 0;
    for (const ch of chapters) {
      const scenes = this.listScenes(ch.id);
      let chWords = 0;
      const sceneIds: string[][] = [];
      for (const sc of scenes) {
        const wc = countWords(this.readFile(sc.path).body);
        this.patch(sc.path, { "word-count": wc });
        chWords += wc;
        sceneIds.push([sc.id]);
      }
      bookWords += chWords;
      this.patch(ch.path, { "word-count": chWords, "scene-count": scenes.length, scenes: sceneIds });
    }
    const bookPath = join(this.root, "book.md");
    if (existsSync(bookPath)) this.patch(bookPath, { "current-word-count": bookWords });
  }
}

export function loadProject(cwd: string): NovelProject | null {
  const root = findBookRoot(cwd);
  return root ? new NovelProject(root) : null;
}
