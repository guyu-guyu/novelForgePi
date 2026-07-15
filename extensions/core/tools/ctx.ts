import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { loadProject } from "../project";
import { StaticGraphContextBuilder } from "../context-builder";
import { existsSync } from "node:fs";

function ok(text: string) {
  return { content: [{ type: "text" as const, text }], details: {} };
}

export function registerCtxTools(pi: ExtensionAPI, getCwd: () => string) {
  const proj = () => { const p = loadProject(getCwd()); if (!p) throw new Error("不在 novelForgePi 项目中"); return p; };
  const cb = (pr: ReturnType<typeof loadProject>) => new StaticGraphContextBuilder(pr!);

  pi.registerTool({ name: "novel_ctx_build_for_scene", label: "Build scene context", description: "Assemble the ContextBundle for a scene. Args: sceneId, budgetTokens.", parameters: Type.Object({ sceneId: Type.String(), budgetTokens: Type.Optional(Type.Number()) }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const b = cb(pr).buildForScene(p.sceneId, { budgetTokens: p.budgetTokens ?? 16000 }); return ok(JSON.stringify(b, null, 2)); } });

  pi.registerTool({ name: "novel_ctx_build_for_chapter", label: "Build chapter context", description: "Assemble the ContextBundle for a whole chapter. Args: chapterId, budgetTokens.", parameters: Type.Object({ chapterId: Type.String(), budgetTokens: Type.Optional(Type.Number()) }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const b = cb(pr).buildForChapter(p.chapterId, { budgetTokens: p.budgetTokens ?? 16000 }); return ok(JSON.stringify(b, null, 2)); } });

  pi.registerTool({ name: "novel_ctx_summarize", label: "Summarize scene/chapter", description: "Cache a summary into frontmatter 'summary'. For a chapter pass its id (e.g. 001-南下); for a scene pass its relative path (e.g. 001-南下/001). Args: targetId, summary.", parameters: Type.Object({ targetId: Type.String(), summary: Type.String() }), async execute(_i, p, _s, _u, _c) { const pr = proj(); const root = pr.root; const asChapter = join(root, "chapters", p.targetId, `${p.targetId}.md`); const asScene = join(root, "chapters", p.targetId + (p.targetId.endsWith(".md") ? "" : ".md")); const path = existsSync(asChapter) ? asChapter : (existsSync(asScene) ? asScene : asChapter); if (!existsSync(path)) return ok(`error: target not found: ${p.targetId}`); pr.patch(path, { summary: p.summary }); return ok("ok"); } });
}
