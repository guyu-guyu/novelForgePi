import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { loadProject } from "../project";

function ok(text: string) {
  return { content: [{ type: "text" as const, text }], details: {} };
}

function outlinePath(root: string) { return join(root, "outline", "main.md"); }

export function registerOutlineTools(pi: ExtensionAPI, getCwd: () => string) {
  const proj = () => { const p = loadProject(getCwd()); if (!p) throw new Error("不在 novelForgePi 项目中"); return p; };

  pi.registerTool({ name: "novel_outline_read", label: "Read outline", description: "Read the full outline.", parameters: Type.Object({}), async execute(_i, _p, _s, _u, _c) { const pr = proj(); const p = outlinePath(pr.root); return ok(existsSync(p) ? readFileSync(p, "utf8") : ""); } });

  pi.registerTool({ name: "novel_outline_get_node", label: "Get outline node", description: "Return the heading subtree matching path '卷/章' (e.g. '第一卷/雪落章').", parameters: Type.Object({ path: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const txt = readFileSync(outlinePath(pr.root), "utf8"); const lines = txt.split("\n"); const idx = lines.findIndex((l) => l.includes(p.path.split("/").pop()!)); return ok(idx >= 0 ? lines.slice(idx).join("\n") : "not found"); } });

  pi.registerTool({ name: "novel_outline_append_chapter", label: "Append chapter to outline", description: "Append a '### Chapter title [[id]]' node under a volume heading. Args: volume, title, chapterId.", parameters: Type.Object({ volume: Type.String(), title: Type.String(), chapterId: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const path = outlinePath(pr.root); let txt = readFileSync(path, "utf8"); const vi = txt.split("\n").findIndex((l) => l.startsWith("## ") && l.includes(p.volume)); if (vi < 0) txt += `\n## ${p.volume}\n`; const line = `### ${p.title} [[${p.chapterId}]]`; writeFileSync(path, txt + "\n" + line + "\n"); return ok("ok"); } });

  pi.registerTool({ name: "novel_outline_update_node", label: "Update outline node", description: "Replace the heading subtree for chapterId with newContent.", parameters: Type.Object({ chapterId: Type.String(), newContent: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const path = outlinePath(pr.root); const lines = readFileSync(path, "utf8").split("\n"); const idx = lines.findIndex((l) => l.includes(`[[${p.chapterId}]]`)); if (idx < 0) return ok("not found"); let end = idx + 1; while (end < lines.length && !lines[end].startsWith("### ")) end++; lines.splice(idx, end - idx, p.newContent); writeFileSync(path, lines.join("\n")); return ok("ok"); } });
}
