import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface NovelForgeState {
  focusSceneId?: string;
  autoSyncSession: boolean;
}

const DEFAULT: NovelForgeState = { autoSyncSession: false };

export function loadState(root: string): NovelForgeState {
  const path = join(root, ".pi", "novelforge-state.json");
  if (!existsSync(path)) return { ...DEFAULT };
  try {
    return { ...DEFAULT, ...JSON.parse(readFileSync(path, "utf8")) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveState(root: string, state: NovelForgeState): void {
  const dir = join(root, ".pi");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "novelforge-state.json"), JSON.stringify(state, null, 2));
}
