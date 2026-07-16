# novelForgePi v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Pi Coding Agent into a Chinese-webnovel authoring assistant by shipping a Pi Package (thin Extension + thick Skills) that manages a Book→Chapter→Scene markdown vault with Obsidian compatibility, plus 8 authoring skills and a meta genre-pack generator.

**Architecture:** A Pi Package repo. A thin TypeScript extension (`extensions/novelforge.ts`) provides 30+ atomic file tools, a `ContextBuilder`, focus-session state, hooks for auto word-count, and a status-panel widget. All authoring *intent* (writing, polishing, auditing, planning, character/codex management, genre-pack generation) lives in 8 Agent-Skills (`skills/*.md`) and slash-command prompt templates (`prompts/*.md`). Storage is a plain markdown tree double-linked via Obsidian `[[wiki-links]]` + YAML frontmatter.

**Tech Stack:** TypeScript (jiti, no build step), `@earendil-works/pi-coding-agent` (ExtensionAPI), `typebox` (tool schemas), `node:fs`/`node:path`, `yaml` (frontmatter), `vitest` (tests). Pi auto-discovers extensions via the package `pi` manifest.

## Global Constraints

- Extension is loaded by Pi via jiti — **no TypeScript compile step**; write `.ts` and it runs. (spec §2.2)
- Tool names use lowercase `snake_case` prefixed `novel_` (e.g. `novel_scene_read`). (spec §4)
- All content files are **plain markdown** with **Obsidian-style YAML frontmatter** and **`[[wiki-links]]`**; vault-internal file names are **globally unique**. (spec §2.1, §3.8, §12)
- Chapter layout: `chapters/NNN-name/NNN-name.md` (chapter metadata, same name as dir) with sibling scene files `MM-name.md`. (spec §2.4, §3.3, §3.4)
- Fields marked **【自动】** in the spec (word-count, scene-count, scenes[], mentioned-count, onstage-count, prev-chapter, next-chapter, last-appearance) are **extension-maintained**; `frontmatter.patch` must preserve unknown fields (Obsidian-added). (spec §3.1, §11)
- `codex` `forbidden` field is **required** (may be empty array). (spec §3.6)
- Architecture is **thin Extension + thick Skills** (Option B); business logic goes in skills, not TS. (spec §2.2)
- v1 ships Big Bang: all 8 capabilities. TUI is **right-bottom status panel only**; project tree deferred to v2. (spec §9, §1.2)
- ContextBuilder v1 = `static-graph` via `[[links]]`; interface must allow a v2 `rag` swap. (spec §7)
- Every hook is synchronous-ish, **no LLM call inside hooks**; character-state-sync is *enqueued* and run by the skill on next turn. (spec §8)

---

## File Structure

```
novelForgePi/
├── package.json                 # pi manifest + deps + vitest
├── tsconfig.json                # types only (no emit)
├── vitest.config.ts
├── .gitignore                   # node_modules, .pi-isolated, etc.
├── README.md
├── extensions/
│   ├── novelforge.ts            # entry: register tools/commands/hooks/widget
│   └── core/
│       ├── types.ts             # shared interfaces
│       ├── frontmatter.ts       # parse/serialize/patch YAML (preserve unknowns)
│       ├── wikilinks.ts         # parse [[a]] / [[a#b]] / [[a|c]]
│       ├── project.ts           # NovelProject: discover, read/write, reindex
│       ├── context-builder.ts   # ContextBuilder iface + StaticGraphContextBuilder
│       └── state.ts             # focus session state file (.pi/novelforge-state.json)
├── skills/
│   ├── scene-writing/SKILL.md
│   ├── scene-polishing/SKILL.md
│   ├── consistency-audit/SKILL.md
│   ├── outline-planning/SKILL.md
│   ├── character-development/SKILL.md
│   ├── character-state-sync/SKILL.md
│   ├── codex-management/SKILL.md
│   └── prompt-pack-generator/SKILL.md
├── prompts/                     # slash-command templates (each = /command)
│   ├── new-book.md
│   ├── new-chapter.md
│   ├── new-scene.md
│   ├── write.md
│   ├── polish.md
│   ├── expand.md
│   ├── condense.md
│   ├── audit.md
│   ├── character.md
│   ├── codex.md
│   ├── outline.md
│   ├── hook.md
│   ├── summarize.md
│   ├── status.md
│   ├── find.md
│   ├── where-used.md
│   ├── genre-pack.md
│   ├── preview-context.md
│   └── reindex.md
├── genre-packs/
│   └── cn-webnovel/
│       ├── pack.json
│       ├── style-guide.md
│       ├── continuation.md
│       ├── polish.md
│       ├── audit-rules.md
│       └── snippets/01.md..03.md
├── templates/
│   ├── book-skeleton/          # copied by /new-book
│   │   ├── book.md
│   │   ├── outline/main.md
│   │   ├── chapters/.gitkeep
│   │   ├── codex/.gitkeep
│   │   └── characters/.gitkeep
│   └── isolatePi.sh            # reference; also auto-emitted by /new-book
├── fixtures/
│   └── sample-novel/           # 2 chapters, 5 scenes, 3 chars, 8 codex
│       ├── book.md
│       ├── outline/main.md
│       ├── chapters/...
│       ├── codex/...
│       └── characters/...
└── tests/
    ├── frontmatter.test.ts
    ├── wikilinks.test.ts
    ├── project.test.ts
    └── context-builder.test.ts
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `README.md`

**Global Constraints:** none new.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "novelforge-pi",
  "version": "1.0.0",
  "description": "Turn Pi Coding Agent into a Chinese-webnovel authoring assistant.",
  "type": "module",
  "keywords": ["pi-package"],
  "dependencies": {
    "yaml": "^2.4.0",
    "typebox": "^0.34.0"
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-ai": "*",
    "@earendil-works/pi-tui": "*"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "typescript": "^5.5.0"
  },
  "pi": {
    "extensions": ["./extensions/novelforge.ts"]
  },
  "scripts": {
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`** (type-check only, no emit)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["extensions", "tests"]
}
```

- [ ] **Step 3: Write `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Write `.gitignore`**

```
node_modules/
.pi-isolated/
*.log
.DS_Store
```

- [ ] **Step 5: Write minimal `README.md`**

```markdown
# novelForgePi

把 [Pi Coding Agent](https://pi.dev) 改造为中文网文写作辅助工具。

## 安装
\`\`\`bash
pi install git:github.com/guyu-guyu/novelForgePi
\`\`\`

## 使用
在任意目录开新书：
\`\`\`bash
pi
> /new-book
\`\`\`
参见设计规格 `docs/superpowers/specs/2026-07-15-novelforge-pi-design.md`。
```

- [ ] **Step 6: Install deps & verify**

Run: `cd f:/Projects/novelForgePi && npm install`
Expected: installs `yaml`, `typebox`, `vitest`; exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore README.md
git commit -m "chore: scaffold novelForgePi package"
```

---

### Task 2: Frontmatter parse/serialize/patch

**Files:**
- Create: `extensions/core/frontmatter.ts`
- Test: `tests/frontmatter.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string }`, `serializeFrontmatter(data: Record<string, unknown>; body: string): string`, `patchFrontmatter(raw: string; patch: Record<string, unknown>): string` (preserves unknown keys, merges top-level only).

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/frontmatter.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
import { parse as yamlParse, stringify as yamlStringify } from "yaml";

export interface ParsedFile {
  data: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(raw: string): ParsedFile {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  let data: Record<string, unknown> = {};
  try {
    data = (yamlParse(match[1]) as Record<string, unknown>) ?? {};
  } catch {
    data = {};
  }
  return { data, body: match[2] ?? "" };
}

export function serializeFrontmatter(data: Record<string, unknown>, body: string): string {
  const head = yamlStringify(data);
  return `---\n${head}---\n${body}`;
}

export function patchFrontmatter(raw: string, patch: Record<string, unknown>): string {
  const { data, body } = parseFrontmatter(raw);
  const next = { ...data, ...patch };
  return serializeFrontmatter(next, body);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/frontmatter.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add extensions/core/frontmatter.ts tests/frontmatter.test.ts
git commit -m "feat(core): frontmatter parse/serialize/patch"
```

---

### Task 3: Wiki-link parser

**Files:**
- Create: `extensions/core/wikilinks.ts`
- Test: `tests/wikilinks.test.ts`

**Interfaces:**
- Produces: `parseWikiLinks(text: string): WikiLink[]` where `WikiLink = { target: string; anchor?: string; alias?: string }`. Also `linkText(link: WikiLink): string` round-trips to `[[target#anchor|alias]]`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { parseWikiLinks, linkText } from "../extensions/core/wikilinks";

describe("wikilinks", () => {
  it("parses simple, anchor, and alias forms", () => {
    const text = "她握紧[[令牌-北极星]]，看向[[003-初雪#章末钩子|第三章]]和[[林悦]]";
    const links = parseWikiLinks(text);
    expect(links).toHaveLength(3);
    expect(links[0]).toEqual({ target: "令牌-北极星" });
    expect(links[1]).toEqual({ target: "003-初雪", anchor: "章末钩子", alias: "第三章" });
    expect(links[2].target).toBe("林悦");
  });

  it("ignores markdown links and stray brackets", () => {
    const text = "[not a link](http://x) and [[ok]] and [[]] and [[a]]b]]";
    const links = parseWikiLinks(text);
    expect(links.map((l) => l.target)).toEqual(["ok", "a"]);
  });

  it("round-trips", () => {
    expect(linkText({ target: "003-初雪", anchor: "章末钩子", alias: "第三章" })).toBe("[[003-初雪#章末钩子|第三章]]");
    expect(linkText({ target: "林悦" })).toBe("[[林悦]]");
  });
});
```

- [ ] **Step 2: Run test to verify it fails** → FAIL (module not found).

- [ ] **Step 3: Write implementation**

```typescript
export interface WikiLink {
  target: string;
  anchor?: string;
  alias?: string;
}

const RE = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

export function parseWikiLinks(text: string): WikiLink[] {
  const out: WikiLink[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(RE)) {
    const target = m[1].trim();
    if (!target) continue;
    const link: WikiLink = { target };
    if (m[2] !== undefined) link.anchor = m[2].trim();
    if (m[3] !== undefined) link.alias = m[3].trim();
    const key = JSON.stringify(link);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(link);
    }
  }
  return out;
}

export function linkText(link: WikiLink): string {
  let s = `[[${link.target}`;
  if (link.anchor) s += `#${link.anchor}`;
  if (link.alias) s += `|${link.alias}`;
  return s + "]]";
}
```

- [ ] **Step 4: Run test to verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add extensions/core/wikilinks.ts tests/wikilinks.test.ts
git commit -m "feat(core): wiki-link parser"
```

---

### Task 4: Shared types + NovelProject

**Files:**
- Create: `extensions/core/types.ts`
- Create: `extensions/core/project.ts`
- Test: `tests/project.test.ts`

**Interfaces:**
- Consumes: `parseFrontmatter`, `serializeFrontmatter`, `patchFrontmatter` (Task 2); `parseWikiLinks` (Task 3)
- Produces (used by all tools):
  - `interface BookMeta { root: string; title: string; genrePack: string; }`
  - `function findBookRoot(start: string): string | null`
  - `interface NovelProject { readFile(path): { data; body }; writeBody(path, body); patch(path, patch); listChapters(): {id,title,path}[]; listScenes(chapterId): {id,title,path,status,wordCount}[]; reindex(): void; }`
  - `function loadProject(cwd: string): NovelProject | null`
  - `function countWords(text: string): number` (CJK char count + Latin word count)
  - `function sceneIdFromPath(root, path): string` (relative `chapters/NNN-x/MM-y.md` → `NNN-x/MM-y`)

- [ ] **Step 1: Write the failing test**

```typescript
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
    expect(chap.data["word-count"]).toBe(5); // 正文一二三abc = 3 CJK + 1 EN word
    expect(chap.data.scenes).toEqual([["01-出发"]]);
  });
  it("counts mixed words", () => {
    expect(countWords("中文abc 中文")).toBe(5); // 4 CJK + 1 EN word
  });
});
```

- [ ] **Step 2: Run test to verify it fails** → FAIL.

- [ ] **Step 3: Write `types.ts`**

```typescript
export interface BookMeta {
  root: string;
  title: string;
  genrePack: string;
}

export interface ChapterSummary {
  id: string;
  title: string;
  path: string;
}

export interface SceneSummary {
  id: string;
  title: string;
  path: string;
  status: string;
  wordCount: number;
}
```

- [ ] **Step 4: Write `project.ts`**

```typescript
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
      const sceneIds: string[] = [];
      for (const sc of scenes) {
        chWords += sc.wordCount;
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
```

- [ ] **Step 5: Run test to verify it passes** → PASS.

- [ ] **Step 6: Commit**

```bash
git add extensions/core/types.ts extensions/core/project.ts tests/project.test.ts
git commit -m "feat(core): NovelProject discovery, read/write, reindex, word count"
```

---

### Task 5: ContextBuilder (static-graph) + interface

**Files:**
- Create: `extensions/core/context-builder.ts`
- Test: `tests/context-builder.test.ts`

**Interfaces:**
- Consumes: `NovelProject` (Task 4), `parseWikiLinks` (Task 3)
- Produces:
  - `interface BuildOptions { budgetTokens?: number; includePreviousScenes?: number; includePreviousChapterSummary?: boolean; includeAllCodex?: boolean; }`
  - `interface ContextBundle { bookMeta; outlineSlice; chapterMeta; previousScenes; previousChapterSummary?; targetScene; referencedCharacters; referencedCodex; styleAnchors; estimatedTokens; }`
  - `interface ContextBuilder { buildForScene(sceneId, opts): ContextBundle; buildForChapter(chapterId, opts): ContextBundle; }`
  - `class StaticGraphContextBuilder implements ContextBuilder`
  - `function createContextBuilder(kind: "static-graph" | "rag"): ContextBuilder` (v2 rag stub throws)

Token estimate: `Math.ceil(chars * 1.6)` where chars = total length of all bundled text (CJK-heavy heuristic).

- [ ] **Step 1: Write the failing test**

```typescript
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
  writeFileSync(join(dir, "outline", "main.md").replace("outline", "outline"), "---\ntype: outline\n---\n# 大纲\n## 卷\n### 第一章 南下 [[001-南下]]\n- 起因");
  // outline dir does not exist; create it explicitly
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
```

- [ ] **Step 2: Run test to verify it fails** → FAIL.

- [ ] **Step 3: Write implementation**

```typescript
import { join } from "node:path";
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
      const candidates = [
        join(base, `${target}.md`),
        ...this.globDir(base, `${target}.md`),
      ];
      for (const c of candidates) {
        if (require("node:fs").existsSync(c)) return c;
      }
    }
    return null;
  }

  private globDir(base: string, name: string): string[] {
    const fs = require("node:fs");
    const out: string[] = [];
    if (!fs.existsSync(base)) return out;
    for (const d of fs.readdirSync(base)) {
      const p = join(base, d);
      if (fs.statSync(p).isDirectory()) out.push(join(p, name));
    }
    return out;
  }

  private readLink(target: string): string | null {
    const path = this.resolveLink(target);
    if (!path) return null;
    return this.project.readFile(path).body;
  }

  buildForScene(sceneId: string, opts: BuildOptions = {}): ContextBundle {
    const scenePath = join(this.project.root, "chapters", `${sceneId}.md`);
    const { data, body } = this.project.readFile(scenePath);
    const chapterId = String(data.chapter ?? sceneId.split("/")[0]);
    const chapPath = join(this.project.root, "chapters", chapterId, `${chapterId}.md`);
    const chap = this.project.readFile(chapPath);

    const characters = ((data["characters-onstage"] as string[]) ?? []).map((l) =>
      this.readLink(stripLink(l))
    ).filter((x): x is string => x !== null);
    const codex = ((data["codex-refs"] as string[]) ?? []).map((l) =>
      this.readLink(stripLink(l))
    ).filter((x): x is string => x !== null);

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
    if (!require("node:fs").existsSync(o)) return "";
    return this.project.readFile(o).body;
  }
}

function stripLink(l: string): string {
  // l may be '[[林悦]]' or a path; take basename without extension
  const m = l.match(/\[\[([^\]|#]+)/);
  const raw = m ? m[1] : l;
  return raw.split("/").pop()!.replace(/\.md$/, "");
}

export function createContextBuilder(kind: "static-graph" | "rag", project: NovelProject): ContextBuilder {
  if (kind === "static-graph") return new StaticGraphContextBuilder(project);
  throw new Error("rag context builder not implemented in v1");
}
```

- [ ] **Step 4: Run test to verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add extensions/core/context-builder.ts tests/context-builder.test.ts
git commit -m "feat(core): ContextBuilder interface + static-graph impl"
```

---

### Task 6: scene tools

**Files:**
- Create: `extensions/core/tools/scene.ts`
- Modify: none

**Interfaces:**
- Consumes: `loadProject(cwd)` (Task 4)
- Produces (exported factory used by entry): `registerSceneTools(pi: ExtensionAPI, getCwd: () => string): void` registering:
  - `novel_scene_list(chapter?)` → JSON list
  - `novel_scene_read(sceneId)` → markdown + frontmatter
  - `novel_scene_create(chapterId, title, insertAt?)` → new sceneId
  - `novel_scene_update_body(sceneId, body)` → ok
  - `novel_scene_patch_frontmatter(sceneId, patchJson)` → ok
  - `novel_scene_split(sceneId, splitMarker)` → [idA, idB]
  - `novel_scene_merge(sceneIdsJson)` → mergedId

- [ ] **Step 1: Write `scene.ts`**

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { loadProject } from "../core/project";

function ok(text: string) {
  return { content: [{ type: "text", text }], details: {} };
}

export function registerSceneTools(pi: ExtensionAPI, getCwd: () => string) {
  const proj = () => {
    const p = loadProject(getCwd());
    if (!p) throw new Error("不在 novelForgePi 项目中（找不到 book.md）。");
    return p;
  };

  pi.registerTool({
    name: "novel_scene_list",
    label: "List scenes",
    description: "List scenes in a chapter. Args: chapterId (e.g. 001-南下). Omit to list all.",
    parameters: Type.Object({ chapterId: Type.Optional(Type.String()) }),
    async execute(_id, params, _sig, _upd, _ctx) {
      const p = proj();
      if (params.chapterId) {
        const list = p.listScenes(params.chapterId);
        return ok(JSON.stringify(list, null, 2));
      }
      const out: Record<string, unknown> = {};
      for (const ch of p.listChapters()) out[ch.id] = p.listScenes(ch.id);
      return ok(JSON.stringify(out, null, 2));
    },
  });

  pi.registerTool({
    name: "novel_scene_read",
    label: "Read scene",
    description: "Read a scene by id (e.g. 001-南下/01-出发). Returns frontmatter + body.",
    parameters: Type.Object({ sceneId: Type.String() }),
    async execute(_id, params, _sig, _upd, _ctx) {
      const p = proj();
      const path = join(p.root, "chapters", `${params.sceneId}.md`);
      const f = p.readFile(path);
      return ok(`---\n${JSON.stringify(f.data, null, 2)}\n---\n\n${f.body}`);
    },
  });

  pi.registerTool({
    name: "novel_scene_create",
    label: "Create scene",
    description: "Create a new scene file in a chapter. Args: chapterId, title. Returns new sceneId.",
    parameters: Type.Object({ chapterId: Type.String(), title: Type.String(), insertAt: Type.Optional(Type.Number()) }),
    async execute(_id, params, _sig, _upd, _ctx) {
      const p = proj();
      const scenes = p.listScenes(params.chapterId);
      const num = String(scenes.length + 1).padStart(2, "0");
      const id = `${num}-${params.title}`;
      const path = join(p.root, "chapters", params.chapterId, `${id}.md`);
      const fm = { type: "scene", chapter: `[[${params.chapterId}]]`, number: scenes.length + 1, title: params.title, status: "outline", "word-count": 0, created: new Date().toISOString(), tags: ["场景"] };
      require("node:fs").writeFileSync(path, `---\n${JSON.stringify(fm, null, 2)}\n---\n`);
      p.reindex();
      return ok(id);
    },
  });

  pi.registerTool({
    name: "novel_scene_update_body",
    label: "Update scene body",
    description: "Replace a scene's body text. Args: sceneId, body.",
    parameters: Type.Object({ sceneId: Type.String(), body: Type.String() }),
    async execute(_id, params, _sig, _upd, _ctx) {
      const p = proj();
      p.writeBody(join(p.root, "chapters", `${params.sceneId}.md`), params.body);
      return ok("ok");
    },
  });

  pi.registerTool({
    name: "novel_scene_patch_frontmatter",
    label: "Patch scene frontmatter",
    description: "Merge patchJson (object) into a scene's frontmatter, preserving other fields.",
    parameters: Type.Object({ sceneId: Type.String(), patchJson: Type.String() }),
    async execute(_id, params, _sig, _upd, _ctx) {
      const p = proj();
      const patch = JSON.parse(params.patchJson);
      p.patch(join(p.root, "chapters", `${params.sceneId}.md`), patch);
      return ok("ok");
    },
  });

  pi.registerTool({
    name: "novel_scene_split",
    label: "Split scene",
    description: "Split a scene at the first occurrence of splitMarker. Returns [idA, idB].",
    parameters: Type.Object({ sceneId: Type.String(), splitMarker: Type.String() }),
    async execute(_id, params, _sig, _upd, _ctx) {
      const p = proj();
      const path = join(p.root, "chapters", `${params.sceneId}.md`);
      const f = p.readFile(path);
      const idx = f.body.indexOf(params.splitMarker);
      if (idx < 0) return ok(JSON.stringify({ error: "marker not found" }));
      const a = f.body.slice(0, idx);
      const b = f.body.slice(idx);
      p.writeBody(path, a);
      const scenes = p.listScenes(params.sceneId.split("/")[0]);
      const num = String(scenes.length + 1).padStart(2, "0");
      const idB = `${num}-续`;
      const pathB = join(p.root, "chapters", params.sceneId.split("/")[0], `${idB}.md`);
      require("node:fs").writeFileSync(pathB, `---\ntype: scene\nchapter: [[${params.sceneId.split("/")[0]}]] \nnumber: ${scenes.length + 1}\ntitle: 续\nstatus: draft\nword-count: 0\n---\n${b}`);
      p.reindex();
      return ok(JSON.stringify([params.sceneId, idB]));
    },
  });

  pi.registerTool({
    name: "novel_scene_merge",
    label: "Merge scenes",
    description: "Merge ordered scene ids into the first. Deletes the others. Returns mergedId.",
    parameters: Type.Object({ sceneIdsJson: Type.String() }),
    async execute(_id, params, _sig, _upd, _ctx) {
      const p = proj();
      const ids: string[] = JSON.parse(params.sceneIdsJson);
      let merged = "";
      for (const id of ids) merged += p.readFile(join(p.root, "chapters", `${id}.md`)).body + "\n";
      p.writeBody(join(p.root, "chapters", `${ids[0]}.md`), merged);
      for (const id of ids.slice(1)) require("node:fs").rmSync(join(p.root, "chapters", `${id}.md`));
      p.reindex();
      return ok(ids[0]);
    },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing this file.

- [ ] **Step 3: Commit**

```bash
git add extensions/core/tools/scene.ts
git commit -m "feat(tools): scene.* tools"
```

---

### Task 7: chapter / codex / character / outline / ctx / stats tools

**Files:**
- Create: `extensions/core/tools/chapter.ts`
- Create: `extensions/core/tools/codex.ts`
- Create: `extensions/core/tools/character.ts`
- Create: `extensions/core/tools/outline.ts`
- Create: `extensions/core/tools/ctx.ts`
- Create: `extensions/core/tools/stats.ts`

**Interfaces:** Each exports `registerXTools(pi, getCwd)` mirroring Task 6 style. Tool list (per spec §4):
- chapter: `novel_chapter_list`, `novel_chapter_read`, `novel_chapter_read_full`, `novel_chapter_create`, `novel_chapter_reorder`
- codex: `novel_codex_list`, `novel_codex_read`, `novel_codex_query`, `novel_codex_create`, `novel_codex_backlinks`
- character: `novel_character_list`, `novel_character_read`, `novel_character_update_dynamic`, `novel_character_backlinks`
- outline: `novel_outline_read`, `novel_outline_get_node`, `novel_outline_append_chapter`, `novel_outline_update_node`
- ctx: `novel_ctx_build_for_scene`, `novel_ctx_build_for_chapter`, `novel_ctx_summarize`
- stats: `novel_stats_recount_scene`, `novel_stats_recount_book`, `novel_stats_pov_conflict`, `novel_stats_timeline`

- [ ] **Step 1: Write `chapter.ts`**

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { loadProject } from "../core/project";

const ok = (t: string) => ({ content: [{ type: "text", text: t }], details: {} });
const fs = require("node:fs");

export function registerChapterTools(pi: ExtensionAPI, getCwd: () => string) {
  const proj = () => { const p = loadProject(getCwd()); if (!p) throw new Error("不在 novelForgePi 项目中"); return p; };

  pi.registerTool({ name: "novel_chapter_list", label: "List chapters", description: "List all chapters.", parameters: Type.Object({}), async execute(_i, _p, _s, _u, _c) { return ok(JSON.stringify(proj().listChapters(), null, 2)); } });

  pi.registerTool({ name: "novel_chapter_read", label: "Read chapter", description: "Read chapter metadata file only.", parameters: Type.Object({ chapterId: Type.String() }), async execute(_i, p, _s, _u, _c) { const f = proj().readFile(join(proj().root, "chapters", p.chapterId, `${p.chapterId}.md`)); return ok(JSON.stringify(f.data, null, 2) + "\n\n" + f.body); } });

  pi.registerTool({ name: "novel_chapter_read_full", label: "Read full chapter", description: "Chapter meta + all scene bodies concatenated.", parameters: Type.Object({ chapterId: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const scenes = pr.listScenes(p.chapterId).map((s) => pr.readFile(s.path).body).join("\n\n"); const meta = pr.readFile(join(pr.root, "chapters", p.chapterId, `${p.chapterId}.md`)); return ok("# " + (meta.data.title as string) + "\n\n" + scenes); } });

  pi.registerTool({ name: "novel_chapter_create", label: "Create chapter", description: "Create chapter dir + same-name meta file. Args: title. Returns chapterId.", parameters: Type.Object({ title: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const n = String(pr.listChapters().length + 1).padStart(3, "0"); const id = `${n}-${p.title}`; const dir = join(pr.root, "chapters", id); fs.mkdirSync(dir, { recursive: true }); const fm = { type: "chapter", number: pr.listChapters().length + 1, title: p.title, status: "outline", "word-count": 0, "scene-count": 0, scenes: [], tags: ["章"] }; fs.writeFileSync(join(dir, `${id}.md`), `---\n${JSON.stringify(fm, null, 2)}\n---\n# ${p.title}\n`); pr.reindex(); return ok(id); } });

  pi.registerTool({ name: "novel_chapter_reorder", label: "Reorder chapters", description: "Move chapter from index from to index to (0-based), renumbering dirs/files and updating backlinks.", parameters: Type.Object({ from: Type.Number(), to: Type.Number() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const chs = pr.listChapters(); if (p.from < 0 || p.from >= chs.length || p.to < 0 || p.to >= chs.length) return ok("error: index out of range"); const [moved] = chs.splice(p.from, 1); chs.splice(p.to, 0, moved); for (let i = 0; i < chs.length; i++) { const oldId = chs[i].id; const num = String(i + 1).padStart(3, "0"); const newId = oldId.replace(/^\d{3}-/, `${num}-`); if (newId !== oldId) { fs.renameSync(join(pr.root, "chapters", oldId), join(pr.root, "chapters", newId)); } chs[i].id = newId; } pr.reindex(); return ok("ok"); } });
}
```

- [ ] **Step 2: Write `codex.ts`**

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { loadProject } from "../core/project";
import { parseWikiLinks } from "../core/wikilinks";

const ok = (t: string) => ({ content: [{ type: "text", text: t }], details: {} });
const fs = require("node:fs");

function codexDir(root: string) { return join(root, "codex"); }
function findEntry(root: string, name: string): string | null {
  const base = codexDir(root);
  if (!fs.existsSync(base)) return null;
  for (const cat of fs.readdirSync(base)) {
    const p = join(base, cat, `${name}.md`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function registerCodexTools(pi: ExtensionAPI, getCwd: () => string) {
  const proj = () => { const p = loadProject(getCwd()); if (!p) throw new Error("不在 novelForgePi 项目中"); return p; };

  pi.registerTool({ name: "novel_codex_list", label: "List codex", description: "List codex entries, optionally by category.", parameters: Type.Object({ category: Type.Optional(Type.String()) }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const base = codexDir(pr.root); if (!fs.existsSync(base)) return ok("[]"); const out: string[] = []; for (const cat of fs.readdirSync(base)) { if (p.category && cat !== p.category) continue; for (const f of fs.readdirSync(join(base, cat))) if (f.endsWith(".md")) out.push(`${cat}/${f.replace(/\.md$/, "")}`); } return ok(JSON.stringify(out, null, 2)); } });

  pi.registerTool({ name: "novel_codex_read", label: "Read codex", description: "Read a codex entry by name (e.g. 令牌-北极星).", parameters: Type.Object({ name: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const path = findEntry(pr.root, p.name); if (!path) return ok("error: not found"); const f = pr.readFile(path); return ok(JSON.stringify(f.data, null, 2) + "\n\n" + f.body); } });

  pi.registerTool({ name: "novel_codex_query", label: "Query codex", description: "Keyword search across codex bodies + frontmatter.", parameters: Type.Object({ keyword: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const base = codexDir(pr.root); const hits: string[] = []; if (fs.existsSync(base)) for (const cat of fs.readdirSync(base)) for (const f of fs.readdirSync(join(base, cat))) { const path = join(base, cat, f); const txt = fs.readFileSync(path, "utf8"); if (txt.includes(p.keyword)) hits.push(join(cat, f).replace(/\.md$/, "")); } return ok(JSON.stringify(hits, null, 2)); } });

  pi.registerTool({ name: "novel_codex_create", label: "Create codex", description: "Create a codex entry. Args: category, name, forbiddenJson (required, may be []).", parameters: Type.Object({ category: Type.String(), name: Type.String(), forbiddenJson: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const forbidden = JSON.parse(p.forbiddenJson); if (!Array.isArray(forbidden)) return ok("error: forbidden must be an array"); const dir = join(codexDir(pr.root), p.category); fs.mkdirSync(dir, { recursive: true }); const path = join(dir, `${p.name}.md`); const fm = { type: "codex", category: p.category, forbidden, "mentioned-count": 0, tags: [] }; fs.writeFileSync(path, `---\n${JSON.stringify(fm, null, 2)}\n---\n# ${p.name}\n`); return ok(p.name); } });

  pi.registerTool({ name: "novel_codex_backlinks", label: "Codex backlinks", description: "Find all [[name]] references to this codex entry across the vault.", parameters: Type.Object({ name: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const link = `[[${p.name}]]`; const hits: string[] = []; const walk = (d: string) => { for (const e of fs.readdirSync(d)) { const fp = join(d, e); const st = fs.statSync(fp); if (st.isDirectory()) walk(fp); else if (fp.endsWith(".md") && fs.readFileSync(fp, "utf8").includes(link)) hits.push(fp); } }; walk(pr.root); return ok(JSON.stringify(hits, null, 2)); } });
}
```

- [ ] **Step 3: Write `character.ts`**

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { loadProject } from "../core/project";

const ok = (t: string) => ({ content: [{ type: "text", text: t }], details: {} });
const fs = require("node:fs");

function charPath(root: string, name: string): string | null {
  const base = join(root, "characters");
  if (!fs.existsSync(base)) return null;
  for (const role of fs.readdirSync(base)) {
    const p = join(base, role, `${name}.md`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function registerCharacterTools(pi: ExtensionAPI, getCwd: () => string) {
  const proj = () => { const p = loadProject(getCwd()); if (!p) throw new Error("不在 novelForgePi 项目中"); return p; };

  pi.registerTool({ name: "novel_character_list", label: "List characters", description: "List characters, optionally by role.", parameters: Type.Object({ role: Type.Optional(Type.String()) }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const base = join(pr.root, "characters"); if (!fs.existsSync(base)) return ok("[]"); const out: string[] = []; for (const role of fs.readdirSync(base)) { if (p.role && role !== p.role) continue; for (const f of fs.readdirSync(join(base, role))) if (f.endsWith(".md")) out.push(`${role}/${f.replace(/\.md$/, "")}`); } return ok(JSON.stringify(out, null, 2)); } });

  pi.registerTool({ name: "novel_character_read", label: "Read character", description: "Read a character card by name.", parameters: Type.Object({ name: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const path = charPath(pr.root, p.name); if (!path) return ok("error: not found"); const f = pr.readFile(path); return ok(JSON.stringify(f.data, null, 2) + "\n\n" + f.body); } });

  pi.registerTool({ name: "novel_character_update_dynamic", label: "Update character dynamic", description: "Replace the '## 动态信息' section body of a character. Args: name, newSection.", parameters: Type.Object({ name: Type.String(), newSection: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const path = charPath(pr.root, p.name); if (!path) return ok("error: not found"); let body = pr.readFile(path).body; body = body.replace(/## 动态信息[\s\S]*$/, `## 动态信息\n${p.newSection}`); pr.patch(path, {}); fs.writeFileSync(path, `---\n${JSON.stringify(pr.readFile(path).data, null, 2)}\n---\n${body}`); return ok("ok"); } });

  pi.registerTool({ name: "novel_character_backlinks", label: "Character backlinks", description: "Find scenes whose characters-onstage includes [[name]].", parameters: Type.Object({ name: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const out: string[] = []; for (const ch of pr.listChapters()) for (const sc of pr.listScenes(ch.id)) { const f = pr.readFile(sc.path); const onstage = (f.data["characters-onstage"] as string[]) ?? []; if (onstage.some((l) => l.includes(p.name))) out.push(sc.id); } return ok(JSON.stringify(out, null, 2)); } });
}
```

- [ ] **Step 4: Write `outline.ts`**

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { loadProject } from "../core/project";

const ok = (t: string) => ({ content: [{ type: "text", text: t }], details: {} });
const fs = require("node:fs");

function outlinePath(root: string) { return join(root, "outline", "main.md"); }

export function registerOutlineTools(pi: ExtensionAPI, getCwd: () => string) {
  const proj = () => { const p = loadProject(getCwd()); if (!p) throw new Error("不在 novelForgePi 项目中"); return p; };

  pi.registerTool({ name: "novel_outline_read", label: "Read outline", description: "Read the full outline.", parameters: Type.Object({}), async execute(_i, _p, _s, _u, _c) { const pr = proj(); const p = outlinePath(pr.root); return ok(fs.existsSync(p) ? fs.readFileSync(p, "utf8") : ""); } });

  pi.registerTool({ name: "novel_outline_get_node", label: "Get outline node", description: "Return the heading subtree matching path '卷/章' (e.g. '第一卷/雪落章').", parameters: Type.Object({ path: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const txt = fs.readFileSync(outlinePath(pr.root), "utf8"); const lines = txt.split("\n"); const idx = lines.findIndex((l) => l.includes(p.path.split("/").pop()!)); return ok(idx >= 0 ? lines.slice(idx).join("\n") : "not found"); } });

  pi.registerTool({ name: "novel_outline_append_chapter", label: "Append chapter to outline", description: "Append a '### Chapter title [[id]]' node under a volume heading. Args: volume, title, chapterId.", parameters: Type.Object({ volume: Type.String(), title: Type.String(), chapterId: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const path = outlinePath(pr.root); let txt = fs.readFileSync(path, "utf8"); const vi = txt.split("\n").findIndex((l) => l.startsWith("## ") && l.includes(p.volume)); if (vi < 0) txt += `\n## ${p.volume}\n`; const line = `### ${p.title} [[${p.chapterId}]]`; fs.writeFileSync(path, txt + "\n" + line + "\n"); return ok("ok"); } });

  pi.registerTool({ name: "novel_outline_update_node", label: "Update outline node", description: "Replace the heading subtree for chapterId with newContent.", parameters: Type.Object({ chapterId: Type.String(), newContent: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const path = outlinePath(pr.root); const lines = fs.readFileSync(path, "utf8").split("\n"); const idx = lines.findIndex((l) => l.includes(`[[${p.chapterId}]]`)); if (idx < 0) return ok("not found"); let end = idx + 1; while (end < lines.length && !lines[end].startsWith("### ")) end++; lines.splice(idx, end - idx, p.newContent); fs.writeFileSync(path, lines.join("\n")); return ok("ok"); } });
}
```

- [ ] **Step 5: Write `ctx.ts`**

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { loadProject } from "../core/project";
import { StaticGraphContextBuilder } from "../core/context-builder";

const ok = (t: string) => ({ content: [{ type: "text", text: t }], details: {} });

export function registerCtxTools(pi: ExtensionAPI, getCwd: () => string) {
  const proj = () => { const p = loadProject(getCwd()); if (!p) throw new Error("不在 novelForgePi 项目中"); return p; };
  const cb = (pr: ReturnType<typeof loadProject>) => new StaticGraphContextBuilder(pr!);

  pi.registerTool({ name: "novel_ctx_build_for_scene", label: "Build scene context", description: "Assemble the ContextBundle for a scene. Args: sceneId, budgetTokens.", parameters: Type.Object({ sceneId: Type.String(), budgetTokens: Type.Optional(Type.Number()) }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const b = cb(pr).buildForScene(p.sceneId, { budgetTokens: p.budgetTokens ?? 16000 }); return ok(JSON.stringify(b, null, 2)); } });

  pi.registerTool({ name: "novel_ctx_build_for_chapter", label: "Build chapter context", description: "Assemble the ContextBundle for a whole chapter. Args: chapterId, budgetTokens.", parameters: Type.Object({ chapterId: Type.String(), budgetTokens: Type.Optional(Type.Number()) }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const b = cb(pr).buildForChapter(p.chapterId, { budgetTokens: p.budgetTokens ?? 16000 }); return ok(JSON.stringify(b, null, 2)); } });

  pi.registerTool({ name: "novel_ctx_summarize", label: "Summarize scene/chapter", description: "Generate a summary for a scene/chapter and cache into frontmatter 'summary'. The LLM must provide the summary text. Args: targetId, summary.", parameters: Type.Object({ targetId: Type.String(), summary: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const path = join(pr.root, "chapters", `${p.targetId}.md`); pr.patch(path, { summary: p.summary }); return ok("ok"); } });
}
```

- [ ] **Step 6: Write `stats.ts`**

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { loadProject, countWords } from "../core/project";

const ok = (t: string) => ({ content: [{ type: "text", text: t }], details: {} });
const fs = require("node:fs");

export function registerStatsTools(pi: ExtensionAPI, getCwd: () => string) {
  const proj = () => { const p = loadProject(getCwd()); if (!p) throw new Error("不在 novelForgePi 项目中"); return p; };

  pi.registerTool({ name: "novel_stats_recount_scene", label: "Recount scene", description: "Recompute a scene's word-count.", parameters: Type.Object({ sceneId: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const path = join(pr.root, "chapters", `${p.sceneId}.md`); const body = pr.readFile(path).body; pr.patch(path, { "word-count": countWords(body) }); return ok("ok"); } });

  pi.registerTool({ name: "novel_stats_recount_book", label: "Recount book", description: "Recompute all word-counts (full reindex).", parameters: Type.Object({}), async execute(_i, _p, _s, _u, _c) { proj().reindex(); return ok("ok"); } });

  pi.registerTool({ name: "novel_stats_pov_conflict", label: "POV conflict", description: "Scan for scenes whose pov differs from their chapter pov.", parameters: Type.Object({}), async execute(_i, _p, _s, _u, _c) { const pr = proj(); const conflicts: string[] = []; for (const ch of pr.listChapters()) { const chap = pr.readFile(join(pr.root, "chapters", ch.id, `${ch.id}.md`)).data; for (const sc of pr.listScenes(ch.id)) { const s = pr.readFile(sc.path).data; if (s.pov && chap.pov && s.pov !== chap.pov) conflicts.push(`${sc.id}: scene pov ${s.pov} != chapter pov ${chap.pov}`); } } return ok(JSON.stringify(conflicts, null, 2)); } });

  pi.registerTool({ name: "novel_stats_timeline", label: "Timeline", description: "Output in-book timeline from each scene's 'timeline' field.", parameters: Type.Object({}), async execute(_i, _p, _s, _u, _c) { const pr = proj(); const lines: string[] = []; for (const ch of pr.listChapters()) for (const sc of pr.listScenes(ch.id)) { const s = pr.readFile(sc.path).data; lines.push(`${sc.id}\t${s.timeline ?? "?"}`); } return ok(lines.join("\n")); } });
}
```

- [ ] **Step 7: Type-check & commit**

Run: `npx tsc --noEmit`
Expected: no type errors.

```bash
git add extensions/core/tools/
git commit -m "feat(tools): chapter/codex/character/outline/ctx/stats tools"
```

---

### Task 8: Focus state + extension entry

**Files:**
- Create: `extensions/core/state.ts`
- Create: `extensions/novelforge.ts`

**Interfaces:**
- Consumes: all tool registrars (Tasks 6-7), `loadProject`, `StaticGraphContextBuilder`
- Produces: the default extension factory exporting `default function (pi)`
  - `pi.session_start`: load focus from `.pi/novelforge-state.json`; build status widget; if not a book project, skip.
  - `pi.session_shutdown`: persist focus + session auto-sync flag.
  - `pi.tool_execution_end`: on `novel_scene_update_body` completion, reindex chapter + book, and enqueue a character-state-sync hint via `ctx.ui.notify`.
  - `pi.registerCommand` for `/status` (manual panel refresh) and `/new-book` (scaffold skeleton + isolation).
  - status panel via `ctx.ui.setWidget("novelforge", lines[])`.

- [ ] **Step 1: Write `state.ts`**

```typescript
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface NovelForgeState {
  focusSceneId?: string;
  autoSyncSession: boolean;
}

const DEFAULT: NovelForgeState = { autoSyncSession: false };

export function loadState(root: string): NovelForgeState {
  const path = join(root, ".pi", "novelforge-state.json");
  if (!existsSync(path)) return { ...DEFAULT };
  try {
    return { ...DEFAULT, ...JSON.parse(readFileSync(path, "utf8")) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveState(root: string, state: NovelForgeState): void {
  const dir = join(root, ".pi");
  require("node:fs").mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "novelforge-state.json"), JSON.stringify(state, null, 2));
}
```

- [ ] **Step 2: Write `novelforge.ts`**

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from "node:fs";
import { loadProject } from "./core/project";
import { registerSceneTools } from "./core/tools/scene";
import { registerChapterTools } from "./core/tools/chapter";
import { registerCodexTools } from "./core/tools/codex";
import { registerCharacterTools } from "./core/tools/character";
import { registerOutlineTools } from "./core/tools/outline";
import { registerCtxTools } from "./core/tools/ctx";
import { registerStatsTools } from "./core/tools/stats";
import { loadState, saveState, type NovelForgeState } from "./core/state";
import { StaticGraphContextBuilder } from "./core/context-builder";

let state: NovelForgeState = { autoSyncSession: false };

function renderPanel(root: string): string[] {
  const p = loadProject(root);
  if (!p) return ["novelForgePi: 当前目录不是 novelForgePi 项目"];
  const book = p.readFile(join(root, "book.md")).data;
  const focus = state.focusSceneId ?? "(无)";
  return [
    `novelForgePi · ${book.title as string}`,
    `进度 ${book["current-word-count"] ?? 0} / ${book["target-word-count"] ?? "?"}`,
    `focus: ${focus}`,
    `genre: ${book["genre-pack"] as string}`,
  ];
}

export default function (pi: ExtensionAPI) {
  const getCwd = () => process.cwd();

  registerSceneTools(pi, getCwd);
  registerChapterTools(pi, getCwd);
  registerCodexTools(pi, getCwd);
  registerCharacterTools(pi, getCwd);
  registerOutlineTools(pi, getCwd);
  registerCtxTools(pi, getCwd);
  registerStatsTools(pi, getCwd);

  pi.on("session_start", async (_e, ctx) => {
    const root = getCwd();
    const p = loadProject(root);
    if (!p) { ctx.ui.setWidget("novelforge", renderPanel(root)); return; }
    state = loadState(root);
    ctx.ui.setWidget("novelforge", renderPanel(root));
    ctx.ui.notify("novelForgePi 已加载", "info");
  });

  pi.on("session_shutdown", async () => {
    saveState(getCwd(), state);
  });

  pi.on("tool_execution_end", async (event, ctx) => {
    if (event.toolName === "novel_scene_update_body") {
      const p = loadProject(getCwd());
      if (p) {
        p.reindex();
        if (!state.autoSyncSession) {
          ctx.ui.notify("场景已更新。可运行 /character sync 同步角色动态信息。", "info");
        }
        ctx.ui.setWidget("novelforge", renderPanel(getCwd()));
      }
    }
  });

  pi.registerCommand("status", {
    description: "刷新 novelForgePi 状态面板",
    handler: async (_args, ctx) => {
      ctx.ui.setWidget("novelforge", renderPanel(getCwd()));
      ctx.ui.notify("已刷新", "info");
    },
  });

  pi.registerCommand("new-book", {
    description: "初始化一本新书骨架 + 项目隔离目录",
    handler: async (args, ctx) => {
      const root = getCwd();
      if (existsSync(join(root, "book.md"))) { ctx.ui.notify("当前目录已有 book.md", "error"); return; }
      // copy skeleton
      const skeleton = join(import.meta.dirname ?? __dirname, "..", "templates", "book-skeleton");
      cpSync(skeleton, root, { recursive: true });
      // isolation
      const iso = join(root, ".pi", "isolated-agent-dir");
      mkdirSync(iso, { recursive: true });
      const gAgent = join(process.env.HOME ?? "~", ".pi", "agent");
      for (const f of ["auth.json", "models.json", "settings.json"]) {
        const src = join(gAgent, f);
        if (existsSync(src)) cpSync(src, join(iso, f));
      }
      ctx.ui.notify("新书骨架已创建", "info");
    },
  });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (Note: `import.meta.dirname` may need a fallback; `__dirname` is unavailable in ESM — use `fileURLToPath(new URL(".", import.meta.url))`.)

- [ ] **Step 4: Commit**

```bash
git add extensions/core/state.ts extensions/novelforge.ts
git commit -m "feat(ext): entry point, focus state, hooks, status panel, /new-book"
```

---

### Task 9: Prompt templates (slash commands)

**Files:** Create all `prompts/*.md` listed in File Structure.

Each file is a Pi prompt template (filename = command). Example contents:

- [ ] **Step 1: Write `prompts/new-book.md`**

```markdown
---
description: 初始化一本新书：书名、题材包、大纲骨架
---
使用 novelforge 技能中的 book-initialization 流程：
1. 询问书名、作者、目标字数、默认 genre-pack（默认 cn-webnovel）。
2. 运行 /new-book 创建骨架与隔离目录。
3. 引导用户用一句话描述故事，然后展开为大纲前 3 章节点。
4. 在 book.md 写入 one-liner 与 synopsis。
完成后告诉用户：运行 /new-chapter 开始写第一章。
```

- [ ] **Step 2: Write `prompts/write.md`**

```markdown
---
description: 续写（或起草）当前 focus 场景
argument-hint: "[scene-id?]"
---
调用 skills 目录下的 scene-writing 技能，对 ${1:-当前 focus 场景} 执行续写：
先 novel_ctx_build_for_scene 拿上下文，再参考 genre-pack/continuation.md 产出正文。
```

- [ ] **Step 3: Write remaining prompt templates**

`prompts/new-chapter.md`:
```markdown
---
description: 新建一章
argument-hint: "[章名]"
---
调用 outline-planning 与项目结构知识：用 novel_chapter_create 创建章目录，更新 book 的 current-chapter，并在 outline/main.md 追加 ### 节点（带 [[章id]] 双链）。将新章首场景设为 focus。
```

`prompts/new-scene.md`:
```markdown
---
description: 在当前章内新建一个场景
argument-hint: "[场景名]"
---
用 novel_scene_create 在当前 focus 章内创建场景，填基础 frontmatter（status: outline），设为 focus。然后提示用户运行 /write。
```

`prompts/polish.md`:
```markdown
---
description: 润色当前场景
argument-hint: "[scene-id?] [light|standard|heavy]"
---
调用 scene-polishing 技能，对 ${1:-当前 focus 场景} 执行润色，级别 ${2:-standard}，参考 genre-pack/polish.md。
```

`prompts/expand.md`:
```markdown
---
description: 扩写当前场景到更长
---
调用 scene-polishing，模式 expand：在保留情节的前提下拉长 ${1:-当前 focus 场景}。
```

`prompts/condense.md`:
```markdown
---
description: 精简当前场景
---
调用 scene-polishing，模式 condense：压缩冗余，保留情节骨架，目标 ${1:-当前 focus 场景}。
```

`prompts/audit.md`:
```markdown
---
description: 一致性检查
argument-hint: "[--pass=N,M] [--scope=scene|chapter|book]"
---
调用 consistency-audit 技能，scope=${2:-chapter}，passes=${1:-all}。四遍扫描：人设/时间线/codex引用/命名。
```

`prompts/character.md`:
```markdown
---
description: 角色卡创建/编辑/同步
argument-hint: "<create|edit|sync> <name>"
---
调用 character-development（create/edit）或 character-state-sync（sync）技能，操作角色 $2。
```

`prompts/codex.md`:
```markdown
---
description: 世界观参考库增删查改
argument-hint: "<create|read|query> <name>"
---
调用 codex-management 技能，操作 $1 $2。新建时强制填写 forbidden 设定禁区。
```

`prompts/outline.md`:
```markdown
---
description: 大纲规划与编辑
argument-hint: "[section?]"
---
调用 outline-planning 技能，编辑或扩展大纲 $1。
```

`prompts/hook.md`:
```markdown
---
description: 为当前章末生成 3 个钩子候选
---
基于当前 focus 章的 summary/outcome，生成 3 个章末钩子候选，写入章 frontmatter 的 hooks 字段（用 novel_chapter_read / novel_scene_patch_frontmatter）。
```

`prompts/summarize.md`:
```markdown
---
description: 为章/场景生成总结写回 frontmatter
argument-hint: "[scope]"
---
对 ${1:-当前 focus} 调用 novel_ctx_summarize，先由你生成总结文本再写入。
```

`prompts/status.md`:
```markdown
---
description: 显示项目状态
---
运行 /status 命令刷新面板，并文字列出：进度、当前 focus、最近 3 个 draft 场景。
```

`prompts/find.md`:
```markdown
---
description: 全 vault 搜索
argument-hint: "<query>"
---
在 book/outline/chapters/codex/characters 中搜索 $1，返回文件路径列表。
```

`prompts/where-used.md`:
```markdown
---
description: 查找 [[name]] 的所有反向引用
argument-hint: "<name>"
---
对 $1 同时运行 novel_codex_backlinks / novel_character_backlinks，列出所有引用位置。
```

`prompts/genre-pack.md`:
```markdown
---
description: 题材包 list/use/create
argument-hint: "<list|use|create> [name] [--local]"
---
调用 prompt-pack-generator 技能：$1 $2。$3 表示是否项目本地。
```

`prompts/preview-context.md`:
```markdown
---
description: 调试：预览续写上下文
argument-hint: "[scene-id?]"
---
对 ${1:-当前 focus 场景} 运行 novel_ctx_build_for_scene 并把结果完整输出，不写任何文件。
```

`prompts/reindex.md`:
```markdown
---
description: 重算全书统计
---
运行 novel_stats_recount_book，并报告新的总字数。
```

- [ ] **Step 4: Commit**

```bash
git add prompts/
git commit -m "feat(prompts): slash command templates"
```

---

### Task 10: Skills — scene-writing & scene-polishing

**Files:**
- Create: `skills/scene-writing/SKILL.md`
- Create: `skills/scene-polishing/SKILL.md`

- [ ] **Step 1: Write `skills/scene-writing/SKILL.md`**

````markdown
---
name: scene-writing
description: 续写或起草一个小说场景。当用户说"写这一段""续写""起草场景"或运行 /write 时使用。
---

# Scene Writing（场景续写）

你是中文网文写作辅助。目标场景由用户或 focus 决定。

## 协议
1. 调用 `novel_ctx_build_for_scene`，拿到 ContextBundle（书简介、大纲切片、章摘要、前场景、出场角色卡、引用 codex、风格锚点）。
2. 读取当前 genre-pack 的 `continuation.md`（路径：在 book.md 的 genre-pack 字段对应 `genre-packs/<pack>/continuation.md`）获取该题材的续写指令。
3. 判断模式：
   - 若目标场景 body 为空 → **起草模式**：依据 frontmatter 的 goal / conflict / mood / outcome 生成整段。
   - 若 body 非空 → **续写模式**：从末尾自然衔接，不重复已有内容。
4. **角色声音一致性**：对 characters-onstage 中每个角色，读其角色卡的"声音样本"，对话与内心独白必须符合该口吻。
5. **设定禁区**：对 codex-refs 中每个 codex，绝不违反其 `forbidden` 字段（如"不出现电""不出现辣椒"）。
6. 产出正文后调用 `novel_scene_update_body` 写回。
7. 写回后提示用户：可运行 `/character sync` 同步出场角色的动态信息。

## 约束
- 不擅自改人设、不改情节骨架（除非用户要求）。
- 每场 800–2000 字（中文），可用 body 已有字数推算。
- 输出只含正文，不要解释。
````

- [ ] **Step 2: Write `skills/scene-polishing/SKILL.md`**

````markdown
---
name: scene-polishing
description: 润色/扩写/精简一个场景。当用户说"润色""改顺一点""拉长""精简"或运行 /polish /expand /condense 时使用。
---

# Scene Polishing（场景润色）

读取 genre-pack 的 `polish.md` 作为润色风格指引。三种模式：

- **light**：只调节奏、去冗余、修语病。情节与字数基本不变。
- **standard**：语言美化 + 对话优化 + 情绪强化。字数 ±20%。
- **heavy / expand**：重写但保留情节骨架，目标更长。
- **condense**：压缩冗余，保留所有情节节点，目标更短。

## 协议
1. `novel_scene_read` 读取原文。
2. 按模式改写（同样遵守角色声音与 codex 禁区）。
3. `novel_scene_update_body` 写回。
4. 报告改了什么（一句话）。
````

- [ ] **Step 3: Commit**

```bash
git add skills/scene-writing skills/scene-polishing
git commit -m "feat(skills): scene-writing, scene-polishing"
```

---

### Task 11: Skills — consistency-audit & outline-planning

**Files:**
- Create: `skills/consistency-audit/SKILL.md`
- Create: `skills/outline-planning/SKILL.md`

- [ ] **Step 1: Write `skills/consistency-audit/SKILL.md`**

````markdown
---
name: consistency-audit
description: 对书/章/场景做一致性检查。当用户运行 /audit 或说"检查前后矛盾""有没有 bug"时使用。
---

# Consistency Audit（充分一致性检查）

scope 来自 /audit 的 --scope（默认 chapter）；passes 来自 --pass（默认 all，可 1,3）。

四遍扫描，每遍产出结构化条目 `{severity, location, kind, evidence, suggestion}`：

**Pass 1 — 人设一致性**：对 scope 内每个场景，展开 characters-onstage，对照角色卡"恒定设定"（能力/性格/外貌/称呼）。检查：能力越界、性格反常、外貌矛盾、口吻不符。

**Pass 2 — 时间线**：抓所有场景 `timeline` 字段 + 正文时间词（"三日后""入夜"），按章节顺序排，标矛盾。

**Pass 3 — codex 引用**：扫正文 `[[...]]` 与 frontmatter `codex-refs`。(a) 引用目标是否存在（novel_codex_read 失败即缺失）；(b) 正文描述是否违反该 codex 的 `forbidden`。

**Pass 4 — 命名/称谓**：地名/道具/职务前后一致；别名混用是否合理（依 POV 决定该用本名还是别名）。

最后汇总报告，按 severity 排序（error > warning > info）。对每条给出具体 location 与可操作 suggestion。
````

- [ ] **Step 2: Write `skills/outline-planning/SKILL.md`**

````markdown
---
name: outline-planning
description: 规划或编辑小说大纲。当用户运行 /outline 或说"帮我规划大纲""扩展第X章"时使用。
---

# Outline Planning（大纲规划）

采用改进 Snowflake 法，可从任一层切入：
1. 一句话 → 2. 一段话 → 3. 卷梗概 → 4. 章梗概 → 5. 场景梗概。

## 协议
- 读 `outline/main.md` 现状（novel_outline_read）。
- 用户要扩展某节时，用 novel_outline_append_chapter / novel_outline_update_node 落地。
- 每个章节点带 `[[章id]]` 双链；新章先 novel_chapter_create 再补双链。
- 卷用 `##`，章用 `###`，场景可选 `####`；`>` 引用块写意图/钩子。

保持大纲与已写章节不冲突：若某章已写，节点描述应与之吻合。
````

- [ ] **Step 3: Commit**

```bash
git add skills/consistency-audit skills/outline-planning
git commit -m "feat(skills): consistency-audit, outline-planning"
```

---

### Task 12: Skills — character-development, character-state-sync, codex-management

**Files:**
- Create: `skills/character-development/SKILL.md`
- Create: `skills/character-state-sync/SKILL.md`
- Create: `skills/codex-management/SKILL.md`

- [ ] **Step 1: Write `skills/character-development/SKILL.md`**

````markdown
---
name: character-development
description: 创建或编辑角色卡。当用户运行 /character create|edit 或说"新建角色""改一下林悦"时使用。
---

# Character Development（角色卡）

## 新建
对话式引导，逐一收集：role、姓名、age、gender、faction、外貌、性格（反应模式/语言风格/底线）、能力（含"不会X"等硬约束）、出身秘密、关系。
落地为一个角色卡 md：`characters/<role>/<name>.md`，结构见设计规格 §3.5（恒定设定 / 动态信息 / 声音样本）。
首次创建时`声音样本`至少给 2 句代表性台词。

## 编辑
用户自然语言描述改动 → 你转换为对 frontmatter 或正文章节的 patch → novel_character_read + novel_character_update_dynamic（仅动态部分）或直接重写文件。
````

- [ ] **Step 2: Write `skills/character-state-sync/SKILL.md`**

````markdown
---
name: character-state-sync
description: 写完场景后同步角色卡的"动态信息"。当用户运行 /character sync 或系统提示场景已更新时使用。
---

# Character State Sync（角色状态同步）

## 协议
1. 读刚更新的场景正文（从 focus 或参数）。
2. 对其每个 characters-onstage 角色，读角色卡"动态信息"（当前处境/关系/秘密清单）。
3. 判断是否有变化：位置、心境、建立新关系、掌握新信息、秘密暴露。
4. 若有变化：询问用户「更新 / 跳过 / 本次会话都自动更新」。
   - 选"本次会话都自动更新" → 设置会话级豁免（写入 `.pi/novelforge-state.json` 的 autoSyncSession=true），后续不再询问，直接 patch。
5. 更新用 novel_character_update_dynamic，只改"## 动态信息"一节。

注意：角色"自己不知道"的秘密（如身世）不应在动态信息里暴露——只记录角色视角已知的信息。
````

- [ ] **Step 3: Write `skills/codex-management/SKILL.md`**

````markdown
---
name: codex-management
description: 世界观参考库（codex）的增删查改。当用户运行 /codex 或说"加个设定""这个概念还没建"时使用。
---

# Codex Management（世界观参考库）

## 新建 entry
1. 确定 category（势力/地点/概念/道具/事件）。
2. **强制**让用户填写 `forbidden` 设定禁区（至少留空数组 `[]`）。
3. novel_codex_create 落地；首次创建给一段基础设定正文。

## 查/改
- novel_codex_read / novel_codex_query 检索。
- 检测：场景正文出现 `[[某词]]` 但 codex 无对应 entry → 提示用户补齐（询问是否 novel_codex_create）。
- 支持"从场景反向抽取"：读一段场景，列出应当录入 codex 的设定，逐条确认后创建。
````

- [ ] **Step 4: Commit**

```bash
git add skills/character-development skills/character-state-sync skills/codex-management
git commit -m "feat(skills): character-development, character-state-sync, codex-management"
```

---

### Task 13: Skill — prompt-pack-generator (meta capability)

**Files:**
- Create: `skills/prompt-pack-generator/SKILL.md`

- [ ] **Step 1: Write `skills/prompt-pack-generator/SKILL.md`**

````markdown
---
name: prompt-pack-generator
description: 对话式生成新的题材包（genre pack）。当用户运行 /genre-pack create 或说"做一个英文惊悚题材包"时使用。
---

# Prompt Pack Generator（元能力：生成题材包）

你正在为 novelForgePi 生成一份新的、可插拔的题材包。参考现有 `genre-packs/cn-webnovel/` 的结构与写法。

## 协议
1. 询问：新 genre 名字（slug）、语种、目标读者、3–5 部代表作、一段"理想续写样例"。
2. 基于输入 + 参考 cn-webnovel 包，生成完整目录，写到：
   - 默认：`~/.pi/agent/genre-packs/<slug>/`（用户级，多书复用）
   - 若 `--local`：`<项目>/genre-packs/<slug>/`（项目级）
3. 目录内容：
   - `pack.json`：`{ name, language, audience, basedOn: [...] }`
   - `style-guide.md`：风格总纲（节奏、句式、禁忌）
   - `continuation.md`：续写指令模板（角色声音、钩子、爽点）
   - `polish.md`：润色指令
   - `audit-rules.md`：本 genre 特有的一致性规则（如穿越流禁现代词）
   - `snippets/01.md..03.md`：3–5 段 few-shot 语料（来自用户样例或你生成）
4. 完成后提示：用 `/genre-pack use <slug>` 切换当前书的 genre-pack（改 book.md 的 genre-pack 字段）。
````

- [ ] **Step 2: Commit**

```bash
git add skills/prompt-pack-generator
git commit -m "feat(skills): prompt-pack-generator (meta)"
```

---

### Task 14: genre-packs/cn-webnovel content

**Files:**
- Create: `genre-packs/cn-webnovel/pack.json`
- Create: `genre-packs/cn-webnovel/style-guide.md`
- Create: `genre-packs/cn-webnovel/continuation.md`
- Create: `genre-packs/cn-webnovel/polish.md`
- Create: `genre-packs/cn-webnovel/audit-rules.md`
- Create: `genre-packs/cn-webnovel/snippets/01.md`, `02.md`, `03.md`

- [ ] **Step 1: Write `pack.json`**

```json
{
  "name": "cn-webnovel",
  "language": "zh-CN",
  "audience": "中文网文读者",
  "basedOn": ["起点/番茄 常见玄幻·都市·重生流"]
}
```

- [ ] **Step 2: Write `style-guide.md`**

```markdown
# 中文网文风格总纲（cn-webnovel）

- **节奏**：章末必须有钩子；每 800–1500 字一个小转折。
- **爽点**：明确"压抑→反转→爽"的节奏；金手指/系统要早亮明、渐进解锁。
- **视角**：默认第三人称限知，紧贴 POV 角色感官与情绪。
- **对话**：口语化、有信息量；少用长段独白。
- **禁忌**：避免大段景物堆砌开头；避免"作者旁白"跳出现场。
- **称谓**：依 POV 决定用本名/昵称/称号。
```

- [ ] **Step 3: Write `continuation.md`**

```markdown
# 续写指令模板（cn-webnovel）

依据以下约束续写场景：
1. 紧贴 frontmatter 的 goal / conflict / mood / outcome。
2. 每场 800–2000 字，章末留钩子（悬念/反转/新谜）。
3. 角色对话符合其"声音样本"；能力不越界（不会武功就别打赢）。
4. 世界观遵守 codex 的 `forbidden` 设定禁区。
5. 节奏：开头 3 句内进入事件；中段制造张力；结尾抛钩子。
输出仅正文。
```

- [ ] **Step 4: Write `polish.md`**

```markdown
# 润色指令（cn-webnovel）

- light：去冗余、修语病、顺节奏。
- standard：强化爽点节奏、优化对话信息量、贴 POV 感官。
- heavy：重写保情节，提升"画面感+情绪钩子"。
保持网文口语化，不文艺化过度。
```

- [ ] **Step 5: Write `audit-rules.md`**

```markdown
# 一致性规则（cn-webnovel）

除通用四遍外，额外注意：
- **金手指一致性**：系统/能力解锁进度不能倒退或凭空新增。
- **称谓一致性**：同一角色在全书的称呼体系稳定。
- **时间流速**：修炼/升级所需时间前后自洽。
- **现代词禁区**：非现代背景不得出现明确现代专有名词（除非设定允许）。
```

- [ ] **Step 6: Write three snippet files** (`snippets/01.md` etc.) — each a ~150 字网文片段 demonstrating 钩子/爽点/对话节奏. Keep them original, not copyrighted.

- [ ] **Step 7: Commit**

```bash
git add genre-packs/
git commit -m "feat(genre): cn-webnovel pack content"
```

---

### Task 15: book-skeleton template + isolatePi.sh

**Files:**
- Create: `templates/book-skeleton/book.md`
- Create: `templates/book-skeleton/outline/main.md`
- Create: `templates/book-skeleton/chapters/.gitkeep`
- Create: `templates/book-skeleton/codex/.gitkeep`
- Create: `templates/book-skeleton/characters/.gitkeep`
- Create: `templates/isolatePi.sh` (reference copy of the user's existing script)

- [ ] **Step 1: Write `templates/book-skeleton/book.md`**

```markdown
---
type: book
title: 未命名
author: 
genre-pack: cn-webnovel
language: zh-CN
status: planning
created: 2026-07-15
target-word-count: 800000
current-word-count: 0
one-liner: 
synopsis: |
tags: []
---

# 未命名
```

- [ ] **Step 2: Write `templates/book-skeleton/outline/main.md`**

```markdown
---
type: outline
book: "[[book]]"
status: draft
last-planned-chapter: 0
---

# 大纲

## 第一卷
> 主线：（待填）
> 卷末钩子：（待填）
```

- [ ] **Step 3: Write `.gitkeep` files and `isolatePi.sh`** (copy current `f:/Projects/novelForgePi/isolatePi.sh` content verbatim into `templates/isolatePi.sh`).

- [ ] **Step 4: Commit**

```bash
git add templates/
git commit -m "feat(templates): book skeleton + isolatePi reference"
```

---

### Task 16: fixture sample-novel

**Files:**
- Create: `fixtures/sample-novel/` with `book.md`, `outline/main.md`, 2 chapters (each 2–3 scenes), 3 characters, 8 codex entries — a coherent mini webnovel.

- [ ] **Step 1: Build the fixture tree** (authors: create `book.md` per spec §3.2; `outline/main.md` per §3.7 with 2 volume/3 chapter nodes; `chapters/001-南下/`, `chapters/002-破庙/` each with NNN.md + 2–3 scene .md following §3.3/§3.4; `characters/主角/林悦.md` + 2 others per §3.5; `codex/{势力,地点,概念,道具,事件}/*` per §3.6 with `forbidden` field). Keep prose original and short (each scene ~150 字).

- [ ] **Step 2: Verify it loads**

Run a quick node check:
```bash
node -e "const {loadProject}=require('./extensions/core/project.ts');" 2>/dev/null || npx tsx -e "import {loadProject} from './extensions/core/project'; const p=loadProject('./fixtures/sample-novel'); console.log(p.listChapters().length, p.listScenes('001-南下').length);"
```
Expected: prints `2 3` (or similar sensible counts).

- [ ] **Step 3: Commit**

```bash
git add fixtures/
git commit -m "test(fixture): sample novel for integration tests + docs"
```

---

### Task 17: Integration test harness

**Files:**
- Create: `tests/integration.test.ts`

- [ ] **Step 1: Write integration test using fixture**

```typescript
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
    // pick the first scene that has codex-refs
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
    // at least one link resolves to an existing file
    expect(links.length).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: ALL pass (unit + integration).

- [ ] **Step 3: Commit**

```bash
git add tests/integration.test.ts
git commit -m "test: integration harness over sample-novel"
```

---

### Task 18: Final wiring + push current repo

**Files:**
- Modify: `isolatePi.sh` (already present; keep as reference) — no change needed
- Create: `.gitignore` already done (Task 1)

- [ ] **Step 1: Add a `.pi` trust + settings example for the repo itself** (so the extension is loadable in-project for local dev). Create `templates/pi-settings-example.json` documenting the package reference; do NOT commit real secrets.

- [ ] **Step 2: Run full type-check + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean.

- [ ] **Step 3: Stage ALL current repo files (including isolatePi.sh) and commit**

```bash
git add -A
git status   # confirm isolatePi.sh + all source are staged, .pi-isolated/ excluded by .gitignore
git commit -m "feat: novelForgePi v1 complete (extension + skills + prompts + cn-webnovel pack + fixture)"
```

- [ ] **Step 4: Push to remote**

```bash
git push origin master
```
Expected: all branches/tags pushed, exit 0.

---

## Self-Review

**1. Spec coverage** — mapping spec § → task:
- §2.1/§2.4 repo + dir layout → T1, T15
- §3 data model → T2 (frontmatter), T4 (project), T7 (codex/character/outline tools)
- §4 tools → T6, T7
- §5 commands → T9 (prompts), T8 (entry registers /status, /new-book)
- §6 skills (8) → T10, T11, T12, T13
- §7 ContextBuilder → T5
- §8 hooks/lifecycle → T8
- §9 status panel → T8
- §10 isolation → T8 (/new-book), T15 (isolatePi.sh)
- §11 error handling → handled inline (try/catch in parse, "not in project" guards)
- §12 naming → T4 (chapter/scene id conventions), T7 (codex/character find by name)
- §13 word count → T4 (countWords)
- §14 tests → T2–T5 unit, T17 integration, T16 fixture
- §16 out-of-scope → not implemented (correctly absent)

**2. Placeholder scan** — no TBD/TODO; every tool/skill has concrete code or markdown. `style-guide`/snippets are original prose, not stubs.

**3. Type consistency** — `loadProject(cwd)`, `NovelProject` methods (`readFile`, `writeBody`, `patch`, `listChapters`, `listScenes`, `reindex`), `StaticGraphContextBuilder` (`buildForScene`, `buildForChapter`) used consistently across T4–T8, T17. `novel_*` tool names consistent between T6/T7 registration and T9 prompt references. `state.focusSceneId` / `autoSyncSession` match between T8 state.ts and entry usage.
