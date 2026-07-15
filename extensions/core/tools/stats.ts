import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { loadProject, countWords } from "../project";

function ok(text: string) {
  return { content: [{ type: "text" as const, text }], details: {} };
}

export function registerStatsTools(pi: ExtensionAPI, getCwd: () => string) {
  const proj = () => { const p = loadProject(getCwd()); if (!p) throw new Error("不在 novelForgePi 项目中"); return p; };

  pi.registerTool({ name: "novel_stats_recount_scene", label: "Recount scene", description: "Recompute a scene's word-count. Args: sceneId (bare id as returned by novel_scene_list).", parameters: Type.Object({ sceneId: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); let target: string | null = null; for (const ch of pr.listChapters()) { for (const sc of pr.listScenes(ch.id)) { if (sc.id === p.sceneId) { target = sc.path; break; } } if (target) break; } if (!target) return ok(`error: scene not found: ${p.sceneId}`); const body = pr.readFile(target).body; pr.patch(target, { "word-count": countWords(body) }); return ok("ok"); } });

  pi.registerTool({ name: "novel_stats_recount_book", label: "Recount book", description: "Recompute all word-counts (full reindex).", parameters: Type.Object({}), async execute(_i, _p, _s, _u, _c) { proj().reindex(); return ok("ok"); } });

  pi.registerTool({ name: "novel_stats_pov_conflict", label: "POV conflict", description: "Scan for scenes whose pov differs from their chapter pov.", parameters: Type.Object({}), async execute(_i, _p, _s, _u, _c) { const pr = proj(); const conflicts: string[] = []; for (const ch of pr.listChapters()) { const chap = pr.readFile(join(pr.root, "chapters", ch.id, `${ch.id}.md`)).data; for (const sc of pr.listScenes(ch.id)) { const s = pr.readFile(sc.path).data; if (s.pov && chap.pov && s.pov !== chap.pov) conflicts.push(`${sc.id}: scene pov ${s.pov} != chapter pov ${chap.pov}`); } } return ok(JSON.stringify(conflicts, null, 2)); } });

  pi.registerTool({ name: "novel_stats_timeline", label: "Timeline", description: "Output in-book timeline from each scene's 'timeline' field.", parameters: Type.Object({}), async execute(_i, _p, _s, _u, _c) { const pr = proj(); const lines: string[] = []; for (const ch of pr.listChapters()) for (const sc of pr.listScenes(ch.id)) { const s = pr.readFile(sc.path).data; lines.push(`${sc.id}\t${s.timeline ?? "?"}`); } return ok(lines.join("\n")); } });
}
