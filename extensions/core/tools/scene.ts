import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { writeFileSync, rmSync } from "node:fs";
import { loadProject } from "../project";

function ok(text: string) {
  return { content: [{ type: "text" as const, text }], details: {} };
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
      writeFileSync(path, `---\n${JSON.stringify(fm, null, 2)}\n---\n`);
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
      if (idx < 0) throw new Error(`splitMarker not found in scene ${params.sceneId}`);
      const a = f.body.slice(0, idx);
      const b = f.body.slice(idx);
      p.writeBody(path, a);
      const scenes = p.listScenes(params.sceneId.split("/")[0]);
      const num = String(scenes.length + 1).padStart(2, "0");
      const idB = `${num}-续`;
      const pathB = join(p.root, "chapters", params.sceneId.split("/")[0], `${idB}.md`);
      writeFileSync(pathB, `---\ntype: scene\nchapter: [[${params.sceneId.split("/")[0]}]] \nnumber: ${scenes.length + 1}\ntitle: 续\nstatus: draft\nword-count: 0\n---\n${b}`);
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
      for (const id of ids.slice(1)) rmSync(join(p.root, "chapters", `${id}.md`));
      p.reindex();
      return ok(ids[0]);
    },
  });
}
