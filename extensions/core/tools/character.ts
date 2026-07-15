import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { loadProject } from "../project";

function ok(text: string) {
  return { content: [{ type: "text" as const, text }], details: {} };
}

function charPath(root: string, name: string): string | null {
  const base = join(root, "characters");
  if (!existsSync(base)) return null;
  for (const role of readdirSync(base)) {
    const p = join(base, role, `${name}.md`);
    if (existsSync(p)) return p;
  }
  return null;
}

export function registerCharacterTools(pi: ExtensionAPI, getCwd: () => string) {
  const proj = () => { const p = loadProject(getCwd()); if (!p) throw new Error("不在 novelForgePi 项目中"); return p; };

  pi.registerTool({ name: "novel_character_list", label: "List characters", description: "List characters, optionally by role.", parameters: Type.Object({ role: Type.Optional(Type.String()) }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const base = join(pr.root, "characters"); if (!existsSync(base)) return ok("[]"); const out: string[] = []; for (const role of readdirSync(base)) { if (p.role && role !== p.role) continue; for (const f of readdirSync(join(base, role))) if (f.endsWith(".md")) out.push(`${role}/${f.replace(/\.md$/, "")}`); } return ok(JSON.stringify(out, null, 2)); } });

  pi.registerTool({ name: "novel_character_read", label: "Read character", description: "Read a character card by name.", parameters: Type.Object({ name: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const path = charPath(pr.root, p.name); if (!path) return ok("error: not found"); const f = pr.readFile(path); return ok(JSON.stringify(f.data, null, 2) + "\n\n" + f.body); } });

  pi.registerTool({ name: "novel_character_update_dynamic", label: "Update character dynamic", description: "Replace the '## 动态信息' section body of a character. Args: name, newSection.", parameters: Type.Object({ name: Type.String(), newSection: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const path = charPath(pr.root, p.name); if (!path) return ok("error: not found"); let body = pr.readFile(path).body; body = body.replace(/## 动态信息[\s\S]*$/, `## 动态信息\n${p.newSection}`); pr.patch(path, {}); writeFileSync(path, `---\n${JSON.stringify(pr.readFile(path).data, null, 2)}\n---\n${body}`); return ok("ok"); } });

  pi.registerTool({ name: "novel_character_backlinks", label: "Character backlinks", description: "Find scenes whose characters-onstage includes [[name]].", parameters: Type.Object({ name: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const out: string[] = []; for (const ch of pr.listChapters()) for (const sc of pr.listScenes(ch.id)) { const f = pr.readFile(sc.path); const onstage = (f.data["characters-onstage"] as string[]) ?? []; if (onstage.some((l) => l.includes(p.name))) out.push(sc.id); } return ok(JSON.stringify(out, null, 2)); } });
}
