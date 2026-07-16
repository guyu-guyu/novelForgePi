import { parse as yamlParse, stringify as yamlStringify } from "yaml";

export interface ParsedFile {
  data: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(raw: string): ParsedFile {
  // 兼容 LF / CRLF / 混合行尾。`\r?\n` 让 frontmatter 边界匹配 CRLF，
  // 内部 YAML 由 yaml 库解析（它本身容忍 CRLF）。
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  let data: Record<string, unknown> = {};
  try {
    data = (yamlParse(match[1]) as Record<string, unknown>) ?? {};
  } catch {
    data = {};
  }
  return { data, body: match[2] ?? "" };
}

export function serializeFrontmatter(data: Record<string, unknown>, body: string): string {
  const head = yamlStringify(data);
  return `---\n${head}---\n${body}`;
}

export function patchFrontmatter(raw: string, patch: Record<string, unknown>): string {
  const { data, body } = parseFrontmatter(raw);
  const next = { ...data, ...patch };
  return serializeFrontmatter(next, body);
}
