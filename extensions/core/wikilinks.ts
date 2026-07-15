export interface WikiLink {
  target: string;
  anchor?: string;
  alias?: string;
}

const RE = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

export function parseWikiLinks(text: string): WikiLink[] {
  const out: WikiLink[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(RE)) {
    const target = m[1].trim();
    if (!target) continue;
    const link: WikiLink = { target };
    if (m[2] !== undefined) link.anchor = m[2].trim();
    if (m[3] !== undefined) link.alias = m[3].trim();
    const key = JSON.stringify(link);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(link);
    }
  }
  return out;
}

export function linkText(link: WikiLink): string {
  let s = `[[${link.target}`;
  if (link.anchor) s += `#${link.anchor}`;
  if (link.alias) s += `|${link.alias}`;
  return s + "]]";
}
