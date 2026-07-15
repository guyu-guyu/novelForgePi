import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, cpSync } from "node:fs";
import { loadProject } from "./core/project";
import { registerSceneTools } from "./core/tools/scene";
import { registerChapterTools } from "./core/tools/chapter";
import { registerCodexTools } from "./core/tools/codex";
import { registerCharacterTools } from "./core/tools/character";
import { registerOutlineTools } from "./core/tools/outline";
import { registerCtxTools } from "./core/tools/ctx";
import { registerStatsTools } from "./core/tools/stats";
import { loadState, saveState, type NovelForgeState } from "./core/state";

let state: NovelForgeState = { autoSyncSession: false };
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

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
    handler: async (_args, ctx) => {
      const root = getCwd();
      if (existsSync(join(root, "book.md"))) { ctx.ui.notify("当前目录已有 book.md", "error"); return; }
      const skeleton = join(repoRoot, "templates", "book-skeleton");
      if (!existsSync(skeleton)) { ctx.ui.notify("骨架模板不存在（templates/book-skeleton）", "error"); return; }
      cpSync(skeleton, root, { recursive: true });
      const iso = join(root, ".pi", "isolated-agent-dir");
      mkdirSync(iso, { recursive: true });
      const home = process.env.HOME ?? process.env.USERPROFILE ?? "~";
      const gAgent = join(home, ".pi", "agent");
      for (const f of ["auth.json", "models.json", "settings.json"]) {
        const src = join(gAgent, f);
        if (existsSync(src)) cpSync(src, join(iso, f));
      }
      ctx.ui.notify("新书骨架已创建", "info");
    },
  });
}
