import { join, basename, dirname } from "node:path";
import { existsSync, readdirSync, statSync } from "node:fs";
import type { NovelProject } from "./project";
import { parseWikiLinks } from "./wikilinks";

export interface BuildOptions {
  budgetTokens?: number;
  includePreviousScenes?: number;
  includePreviousChapterSummary?: boolean;
  includeAllCodex?: boolean;
}

export interface ContextBundle {
  bookMeta: { title: string; synopsis?: string; genrePack: string };
  outlineSlice: string;
  chapterMeta: { number?: number; title?: string; summary?: string; hooks?: string };
  previousScenes: { id: string; title?: string; body: string }[];
  previousChapterSummary?: string;
  targetScene: { id: string; data: Record<string, unknown>; body: string };
  referencedCharacters: string[];
  referencedCodex: string[];
  styleAnchors: string[];
  estimatedTokens: number;
}

export interface ContextBuilder {
  buildForScene(sceneId: string, opts?: BuildOptions): ContextBundle;
  buildForChapter(chapterId: string, opts?: BuildOptions): ContextBundle;
}

function estTokens(text: string): number {
  return Math.ceil(text.length * 1.6);
}

export class StaticGraphContextBuilder implements ContextBuilder {
  constructor(private project: NovelProject, private opts: { genrePacksDir?: string } = {}) {}

  private resolveLink(target: string): string | null {
    // search chapters, characters, codex for <target>.md
    const roots = ["chapters", "characters", "codex"];
    for (const r of roots) {
      const base = join(this.project.root, r);
      // shallow + one subdir
      const candidates = [join(base, `${target}.md`), ...this.globDir(base, `${target}.md`)];
      for (const c of candidates) {
        if (existsSync(c)) return c;
      }
    }
    return null;
  }

  private globDir(base: string, name: string): string[] {
    const out: string[] = [];
    if (!existsSync(base)) return out;
    for (const d of readdirSync(base)) {
      const p = join(base, d);
      if (statSync(p).isDirectory()) out.push(join(p, name));
    }
    return out;
  }

  private readLink(target: string): string | null {
    const path = this.resolveLink(target);
    if (!path) return null;
    return this.project.readFile(path).body;
  }

  private resolveScenePath(sceneId: string): string {
    const direct = join(this.project.root, "chapters", `${sceneId}.md`);
    if (existsSync(direct)) return direct;
    for (const ch of this.project.listChapters()) {
      const cand = join(this.project.root, "chapters", ch.id, `${sceneId}.md`);
      if (existsSync(cand)) return cand;
    }
    throw new Error(`scene not found: ${sceneId}`);
  }

  buildForScene(sceneId: string, opts: BuildOptions = {}): ContextBundle {
    const scenePath = this.resolveScenePath(sceneId);
    const { data, body } = this.project.readFile(scenePath);
    const chapterId = basename(dirname(scenePath));
    const chapPath = join(this.project.root, "chapters", chapterId, `${chapterId}.md`);
    const chap = this.project.readFile(chapPath);

    const characters = ((data["characters-onstage"] as string[]) ?? [])
      .map((l) => this.readLink(stripLink(l)))
      .filter((x): x is string => x !== null);
    const codex = ((data["codex-refs"] as string[]) ?? [])
      .map((l) => this.readLink(stripLink(l)))
      .filter((x): x is string => x !== null);

    const bundle: ContextBundle = {
      bookMeta: this.bookMeta(),
      outlineSlice: this.outlineSlice(chapterId),
      chapterMeta: {
        number: chap.data.number as number,
        title: chap.data.title as string,
        summary: chap.data.summary as string,
        hooks: chap.data.hooks as string,
      },
      previousScenes: [],
      targetScene: { id: sceneId, data, body },
      referencedCharacters: characters,
      referencedCodex: codex,
      styleAnchors: [],
      estimatedTokens: estTokens(body + characters.join("\n") + codex.join("\n")),
    };
    return bundle;
  }

  buildForChapter(chapterId: string, opts: BuildOptions = {}): ContextBundle {
    const chapPath = join(this.project.root, "chapters", chapterId, `${chapterId}.md`);
    const chap = this.project.readFile(chapPath);
    const scenes = this.project.listScenes(chapterId);
    const bodies = scenes.map((s) => this.project.readFile(s.path).body).join("\n");
    return {
      bookMeta: this.bookMeta(),
      outlineSlice: this.outlineSlice(chapterId),
      chapterMeta: {
        number: chap.data.number as number,
        title: chap.data.title as string,
        summary: chap.data.summary as string,
      },
      previousScenes: [],
      targetScene: { id: chapterId, data: chap.data, body: bodies },
      referencedCharacters: [],
      referencedCodex: [],
      styleAnchors: [],
      estimatedTokens: estTokens(bodies),
    };
  }

  private bookMeta() {
    const b = this.project.readFile(join(this.project.root, "book.md"));
    return {
      title: b.data.title as string,
      synopsis: b.data.synopsis as string,
      genrePack: (b.data["genre-pack"] as string) ?? "cn-webnovel",
    };
  }

  private outlineSlice(chapterId: string): string {
    const o = join(this.project.root, "outline", "main.md");
    if (!existsSync(o)) return "";
    return this.project.readFile(o).body;
  }
}

function stripLink(l: string): string {
  // l may be '[[林悦]]' or a path; take basename without extension
  const m = l.match(/\[\[([^\]|#]+)/);
  const raw = m ? m[1] : l;
  return raw.split("/").pop()!.replace(/\.md$/, "");
}

export function createContextBuilder(
  kind: "static-graph" | "rag",
  project?: NovelProject
): ContextBuilder {
  if (kind === "static-graph") {
    if (!project) throw new Error("static-graph context builder requires a project");
    return new StaticGraphContextBuilder(project);
  }
  throw new Error("rag context builder not implemented in v1");
}
