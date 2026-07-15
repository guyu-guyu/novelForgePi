import { describe, it, expect } from "vitest";
import { parseWikiLinks, linkText } from "../extensions/core/wikilinks";

describe("wikilinks", () => {
  it("parses simple, anchor, and alias forms", () => {
    const text = "她握紧[[令牌-北极星]]，看向[[003-初雪#章末钩子|第三章]]和[[林悦]]";
    const links = parseWikiLinks(text);
    expect(links).toHaveLength(3);
    expect(links[0]).toEqual({ target: "令牌-北极星" });
    expect(links[1]).toEqual({ target: "003-初雪", anchor: "章末钩子", alias: "第三章" });
    expect(links[2].target).toBe("林悦");
  });

  it("ignores markdown links and stray brackets", () => {
    const text = "[not a link](http://x) and [[ok]] and [[]] and [[a]]b]]";
    const links = parseWikiLinks(text);
    expect(links.map((l) => l.target)).toEqual(["ok", "a"]);
  });

  it("round-trips", () => {
    expect(linkText({ target: "003-初雪", anchor: "章末钩子", alias: "第三章" })).toBe("[[003-初雪#章末钩子|第三章]]");
    expect(linkText({ target: "林悦" })).toBe("[[林悦]]");
  });
});
