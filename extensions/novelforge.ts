import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, cpSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
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
    description: "初始化新书骨架（幂等）+ 隔离配置目录 + novelForgePi 包 symlink",
    handler: async (_args, ctx) => {
      const root = getCwd();
      const home = process.env.HOME ?? process.env.USERPROFILE ?? "~";
      const gAgent = process.env.PI_CODING_AGENT_DIR || join(home, ".pi", "agent");

      // 1. 幂等骨架：对 skeleton 里每个条目，不存在才创建（含 book.md 不覆盖）
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

      // 2. .pi-isolated/ + 冗余 .gitignore（与 pi-isolate 创建的相同，双保险）
      const iso = join(root, ".pi-isolated");
      mkdirSync(iso, { recursive: true });
      const gi = join(iso, ".gitignore");
      if (!existsSync(gi)) writeFileSync(gi, "*\n!.gitignore\n");

      // 3. novelForgePi 包 symlink 进 .pi-isolated/git/<host>/<path>
      //    （与 pi 的 git 包落盘规则一致，见 packages.md；symlink 保持与全局克隆天然同步）
      const pkgSpec = "git:github.com/guyu-guyu/novelForgePi";
      const pkgRel = "git/github.com/guyu-guyu/novelForgePi";
      const globalPkg = join(gAgent, pkgRel);
      const linkPath = join(iso, pkgRel);
      if (!existsSync(globalPkg)) {
        ctx.ui.notify(`未找到全局 novelForgePi 克隆（${globalPkg}）。请先运行：pi install ${pkgSpec}`, "error");
        return;
      }
      mkdirSync(dirname(linkPath), { recursive: true });
      if (!existsSync(linkPath)) {
        try {
          symlinkSync(globalPkg, linkPath, process.platform === "win32" ? "junction" : "dir");
        } catch (e) {
          ctx.ui.notify(`novelForgePi 包 symlink 失败：${(e as Error).message}`, "error");
          return;
        }
      }

      ctx.ui.notify(
        `新书骨架就绪（新建：${created.join(", ") || "无"}）。退出 pi 后运行 pi-isolate 以隔离模式启动。`,
        "info",
      );
    },
  });

  pi.registerCommand("install-isolate", {
    description: "全局安装 pi-isolate（npm 包，提供 pi-isolate 命令）",
    handler: async (_args, ctx) => {
      const pkgSpec = "github:guyu-guyu/pi-isolate";
      ctx.ui.notify(`正在安装 ${pkgSpec}（全局）...`, "info");
      const result = spawnSync("npm", ["install", "-g", pkgSpec], {
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      if (result.status === 0) {
        ctx.ui.notify("pi-isolate 已安装。任意目录运行 pi-isolate 即可以隔离模式启动 pi。", "info");
      } else {
        ctx.ui.notify(`安装失败（exit ${result.status}）。可手动运行：npm install -g ${pkgSpec}`, "error");
      }
    },
  });
}
