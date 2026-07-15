import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { mkdirSync, writeFileSync, renameSync, readFileSync, readdirSync, statSync } from "node:fs";
import { loadProject } from "../project";

function ok(text: string) {
  return { content: [{ type: "text" as const, text }], details: {} };
}

export function registerChapterTools(pi: ExtensionAPI, getCwd: () => string) {
  const proj = () => { const p = loadProject(getCwd()); if (!p) throw new Error("不在 novelForgePi 项目中"); return p; };

  pi.registerTool({ name: "novel_chapter_list", label: "List chapters", description: "List all chapters.", parameters: Type.Object({}), async execute(_i, _p, _s, _u, _c) { return ok(JSON.stringify(proj().listChapters(), null, 2)); } });

  pi.registerTool({ name: "novel_chapter_read", label: "Read chapter", description: "Read chapter metadata file only.", parameters: Type.Object({ chapterId: Type.String() }), async execute(_i, p, _s, _u, _c) { const f = proj().readFile(join(proj().root, "chapters", p.chapterId, `${p.chapterId}.md`)); return ok(JSON.stringify(f.data, null, 2) + "\n\n" + f.body); } });

  pi.registerTool({ name: "novel_chapter_read_full", label: "Read full chapter", description: "Chapter meta + all scene bodies concatenated.", parameters: Type.Object({ chapterId: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const scenes = pr.listScenes(p.chapterId).map((s) => pr.readFile(s.path).body).join("\n\n"); const meta = pr.readFile(join(pr.root, "chapters", p.chapterId, `${p.chapterId}.md`)); return ok("# " + (meta.data.title as string) + "\n\n" + scenes); } });

  pi.registerTool({ name: "novel_chapter_create", label: "Create chapter", description: "Create chapter dir + same-name meta file. Args: title. Returns chapterId.", parameters: Type.Object({ title: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const n = String(pr.listChapters().length + 1).padStart(3, "0"); const id = `${n}-${p.title}`; const dir = join(pr.root, "chapters", id); mkdirSync(dir, { recursive: true }); const fm = { type: "chapter", number: pr.listChapters().length + 1, title: p.title, status: "outline", "word-count": 0, "scene-count": 0, scenes: [], tags: ["章"] }; writeFileSync(join(dir, `${id}.md`), `---\n${JSON.stringify(fm, null, 2)}\n---\n# ${p.title}\n`); pr.reindex(); return ok(id); } });

  pi.registerTool({ name: "novel_chapter_reorder", label: "Reorder chapters", description: "Move chapter from index from to index to (0-based), renumbering dirs/files and updating backlinks.", parameters: Type.Object({ from: Type.Number(), to: Type.Number() }), async execute(_i, p, _s, _u, _c) {
    const pr = proj();
    const chs = pr.listChapters();
    if (p.from < 0 || p.from >= chs.length || p.to < 0 || p.to >= chs.length) return ok("error: index out of range");
    const [moved] = chs.splice(p.from, 1);
    chs.splice(p.to, 0, moved);
    const renameMap: Record<string, string> = {};
    for (let i = 0; i < chs.length; i++) {
      const oldId = chs[i].id;
      const num = String(i + 1).padStart(3, "0");
      const newId = oldId.replace(/^\d{3}-/, `${num}-`);
      if (newId !== oldId) {
        const oldDir = join(pr.root, "chapters", oldId);
        const newDir = join(pr.root, "chapters", newId);
        renameSync(join(oldDir, `${oldId}.md`), join(oldDir, `${newId}.md`));
        renameSync(oldDir, newDir);
        renameMap[oldId] = newId;
      }
      chs[i].id = newId;
    }
    if (Object.keys(renameMap).length > 0) {
      const walk = (d: string) => {
        for (const e of readdirSync(d)) {
          const fp = join(d, e);
          const st = statSync(fp);
          if (st.isDirectory()) walk(fp);
          else if (fp.endsWith(".md")) {
            let txt = readFileSync(fp, "utf8");
            const before = txt;
            for (const [oldId, newId] of Object.entries(renameMap)) {
              txt = txt.split(`[[${oldId}]]`).join(`[[${newId}]]`);
            }
            if (txt !== before) writeFileSync(fp, txt);
          }
        }
      };
      walk(pr.root);
    }
    pr.reindex();
    return ok("ok");
  } });
}
