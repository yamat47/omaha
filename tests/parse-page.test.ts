import { describe, expect, it } from "vitest";
import { parsePage } from "../src/lib/parse-page.ts";

const FILE = `---
title: Reach block
summary: A block that turns the defender away from the play.
side: offense
area: run-game
sources:
  - url: https://example.com/a
    title: A
    author: One
  - url: https://example.com/b
    title: B
    author: Two
updated: 2026-11-10
---

Body.
`;

describe("parsePage", () => {
  it("returns the page with its type and slug from the path", () => {
    const parsed = parsePage("terms/reach-block.md", FILE);
    expect(parsed.ok && [parsed.page.type, parsed.page.slug, parsed.page.data.title]).toEqual([
      "terms",
      "reach-block",
      "Reach block",
    ]);
  });

  it("prefixes every problem with the path and the key", () => {
    const parsed = parsePage("terms/reach-block.md", FILE.replace("side: offense", "side: left"));
    expect(!parsed.ok && parsed.problems).toEqual([
      expect.stringMatching(/^terms\/reach-block\.md: side: /),
    ]);
  });

  it("names an unknown key, also inside a source", () => {
    const withKeys = FILE.replace("side: offense", "side: offense\ntags: [run]").replace(
      "    author: One",
      "    author: One\n    year: 2020",
    );
    const parsed = parsePage("terms/reach-block.md", withKeys);
    expect(!parsed.ok && parsed.problems).toEqual([
      "terms/reach-block.md: sources.0.year: unknown key",
      "terms/reach-block.md: tags: unknown key",
    ]);
  });

  it("reports the problems of the body with those of the frontmatter", () => {
    const parsed = parsePage(
      "terms/reach-block.md",
      `${FILE}\n# Again\n`.replace("area: run-game", "area: x"),
    );
    expect(!parsed.ok && parsed.problems).toHaveLength(2);
  });

  it("reports a path that is no page without reading the file", () => {
    const parsed = parsePage("notes/x.md", "nothing");
    expect(!parsed.ok && parsed.problems[0]).toContain("notes/ is not a type");
  });
});
