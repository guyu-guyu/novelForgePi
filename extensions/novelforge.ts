import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, cpSync, readdirSync, symlinkSync, writeFileSync, chmodSync } from "node:fs";
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
    description: "初始化新书骨架（幂等）+ 隔离配置目录 + novelForgePi 包 symlink + 拷贝 isolatePi.sh",
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

      // 2. .pi-isolated/ + 冗余 .gitignore（与 isolatePi.sh 创建的相同，双保险）
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

      // 4. 拷贝 isolatePi.sh 到当前目录，方便用户退出 pi 后直接 ./isolatePi.sh
      const scriptSrc = join(repoRoot, "templates", "isolatePi.sh");
      const scriptDst = join(root, "isolatePi.sh");
      if (existsSync(scriptSrc)) {
        cpSync(scriptSrc, scriptDst);
        try { chmodSync(scriptDst, 0o755); } catch {}
      }

      ctx.ui.notify(
        `新书骨架就绪（新建：${created.join(", ") || "无"}）。退出 pi 后运行 ./isolatePi.sh 以隔离模式启动。`,
        "info",
      );
    },
  });
}
