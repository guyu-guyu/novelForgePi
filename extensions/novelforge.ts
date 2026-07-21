import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, cpSync, readdirSync } from "node:fs";
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
  if (!p) return [];
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
    // 非项目目录：启动时不显示任何 novelForgePi 面板/提示。
    // 仅当用户实际调用 novelForgePi 命令时才检查并提示。
    if (!p) return;
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
      const root = getCwd();
      if (!loadProject(root)) {
        ctx.ui.notify("当前目录不是 novelForgePi 项目（找不到 type: book 的 book.md）", "error");
        return;
      }
      ctx.ui.setWidget("novelforge", renderPanel(root));
      ctx.ui.notify("已刷新", "info");
    },
  });

  pi.registerCommand("new-book", {
    description: "初始化新书骨架（幂等）",
    handler: async (_args, ctx) => {
      const root = getCwd();
      // 幂等骨架：对 skeleton 里每个条目，不存在才创建（含 book.md 不覆盖）
      const skeleton = join(repoRoot, "templates", "book-skeleton");
      if (!existsSync(skeleton)) { ctx.ui.notify("骨架模板不存在（templates/book-skeleton）", "error"); return; }
      const created: string[] = [];
      for (const entry of readdirSync(skeleton)) {
        const dst = join(root, entry);
        if (!existsSync(dst)) {
          cpSync(join(skeleton, entry), dst, { recursive: true });
          created.push(entry);
        }
      }
      ctx.ui.notify(`新书骨架就绪（新建：${created.join(", ") || "无"}）`, "info");
    },
  });
}
