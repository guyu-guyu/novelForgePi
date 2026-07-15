import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { loadProject } from "../project";

function ok(text: string) {
  return { content: [{ type: "text" as const, text }], details: {} };
}

function codexDir(root: string) { return join(root, "codex"); }
function findEntry(root: string, name: string): string | null {
  const base = codexDir(root);
  if (!existsSync(base)) return null;
  for (const cat of readdirSync(base)) {
    const p = join(base, cat, `${name}.md`);
    if (existsSync(p)) return p;
  }
  return null;
}

export function registerCodexTools(pi: ExtensionAPI, getCwd: () => string) {
  const proj = () => { const p = loadProject(getCwd()); if (!p) throw new Error("不在 novelForgePi 项目中"); return p; };

  pi.registerTool({ name: "novel_codex_list", label: "List codex", description: "List codex entries, optionally by category.", parameters: Type.Object({ category: Type.Optional(Type.String()) }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const base = codexDir(pr.root); if (!existsSync(base)) return ok("[]"); const out: string[] = []; for (const cat of readdirSync(base)) { if (p.category && cat !== p.category) continue; for (const f of readdirSync(join(base, cat))) if (f.endsWith(".md")) out.push(`${cat}/${f.replace(/\.md$/, "")}`); } return ok(JSON.stringify(out, null, 2)); } });

  pi.registerTool({ name: "novel_codex_read", label: "Read codex", description: "Read a codex entry by name (e.g. 令牌-北极星).", parameters: Type.Object({ name: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const path = findEntry(pr.root, p.name); if (!path) return ok("error: not found"); const f = pr.readFile(path); return ok(JSON.stringify(f.data, null, 2) + "\n\n" + f.body); } });

  pi.registerTool({ name: "novel_codex_query", label: "Query codex", description: "Keyword search across codex bodies + frontmatter.", parameters: Type.Object({ keyword: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const base = codexDir(pr.root); const hits: string[] = []; if (existsSync(base)) for (const cat of readdirSync(base)) for (const f of readdirSync(join(base, cat))) { const path = join(base, cat, f); const txt = readFileSync(path, "utf8"); if (txt.includes(p.keyword)) hits.push(join(cat, f).replace(/\.md$/, "")); } return ok(JSON.stringify(hits, null, 2)); } });

  pi.registerTool({ name: "novel_codex_create", label: "Create codex", description: "Create a codex entry. Args: category, name, forbiddenJson (required, may be []).", parameters: Type.Object({ category: Type.String(), name: Type.String(), forbiddenJson: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const forbidden = JSON.parse(p.forbiddenJson); if (!Array.isArray(forbidden)) return ok("error: forbidden must be an array"); const dir = join(codexDir(pr.root), p.category); mkdirSync(dir, { recursive: true }); const path = join(dir, `${p.name}.md`); const fm = { type: "codex", category: p.category, forbidden, "mentioned-count": 0, tags: [] }; writeFileSync(path, `---\n${JSON.stringify(fm, null, 2)}\n---\n# ${p.name}\n`); return ok(p.name); } });

  pi.registerTool({ name: "novel_codex_backlinks", label: "Codex backlinks", description: "Find all [[name]] references to this codex entry across the vault.", parameters: Type.Object({ name: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const link = `[[${p.name}]]`; const hits: string[] = []; const walk = (d: string) => { for (const e of readdirSync(d)) { const fp = join(d, e); const st = statSync(fp); if (st.isDirectory()) walk(fp); else if (fp.endsWith(".md") && readFileSync(fp, "utf8").includes(link)) hits.push(fp); } }; walk(pr.root); return ok(JSON.stringify(hits, null, 2)); } });
}
