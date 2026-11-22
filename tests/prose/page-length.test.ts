import { describe, expect, it } from "vitest";
import { check, lines, only, positions } from "./helpers.ts";

// Ten words per sentence, so that no sentence trips the sentence limit on the way.
function words(count: number): string {
  const sentences: string[] = [];
  for (let left = count; left > 0; left -= 10) {
    const size = Math.min(10, left);
    sentences.push(
      `${Array.from({ length: size }, (_, i) => (i === 0 ? "Run" : "run")).join(" ")}.`,
    );
  }
  return sentences.join(" ");
}

describe("page-length", () => {
  it.each([
    ["terms", 250],
    ["techniques", 700],
    ["situations", 700],
    ["schemes", 900],
  ])("allows %s up to its limit and flags the next word", (type, limit) => {
    const file = `content/${type}/page.md`;

    expect(only(`${words(limit)}\n`, "page-length", file)).toEqual([]);
    const [finding] = only(`${words(limit + 1)}\n`, "page-length", file);

    expect(finding?.message).toBe(
      `The page has ${limit + 1} words (limit ${limit} for ${type}); cut 1 or move some to another page.`,
    );
  });

  it("points at the first word over the limit", () => {
    const content = `${words(250)} Extra words follow.\n`;
    const column = content.indexOf("Extra") + 1;

    expect(positions(only(content, "page-length", "content/terms/a.md"))).toEqual([`1:${column}`]);
  });

  it("points at the line of that word", () => {
    const last = words(100);
    const content = lines(words(200), "", "- one two three", "", last);
    // 203 words come before the paragraph, so the 251st word is its 48th.
    const column = last.split(" ").slice(0, 47).join(" ").length + 2;

    expect(positions(only(content, "page-length", "content/terms/a.md"))).toEqual([`5:${column}`]);
  });

  it("counts list items and table cells, and leaves out headings, code and links", () => {
    const items = lines(
      ...Array.from({ length: 24 }, () => "- run run run run run run run run run run"),
    );
    const table = lines("| a | b |", "| --- | --- |", "| run | run |");
    const ignored = lines(
      "## A heading of five words here",
      "",
      "```",
      words(300),
      "```",
      "",
      `[a](https://example.com/${words(100).replaceAll(" ", "-")})`,
    );

    expect(only(`${items}\n${table}\n${ignored}`, "page-length", "content/terms/a.md")).toEqual([]);
    expect(
      only(`${items}\n${table}\n${words(10)}\n`, "page-length", "content/terms/a.md"),
    ).toHaveLength(1);
  });

  it("does not count the frontmatter", () => {
    const content = lines(
      "---",
      `title: ${words(300)}`,
      `summary: ${words(300)}`,
      "---",
      "",
      "Short.",
    );

    expect(only(content, "page-length", "content/terms/a.md")).toEqual([]);
  });

  it("counts the words of a link and of bold text", () => {
    const content = `[${words(130)}](https://example.com/a) **${words(130)}**\n`;

    expect(only(content, "page-length", "content/terms/a.md")).toHaveLength(1);
  });

  it("reads the type from the directory of the file only", () => {
    const long = `${words(1000)}\n`;

    for (const file of [
      "page.md",
      "content/page.md",
      "content/other/page.md",
      "content/terms/nested/page.md",
      "content/constructor/page.md",
      "content/toString/page.md",
      "terms.md",
    ]) {
      expect(only(long, "page-length", file)).toEqual([]);
    }
    expect(only(long, "page-length", "a/b/content/terms/page.md")).toHaveLength(1);
    expect(only(long, "page-length", "content\\terms\\page.md")).toHaveLength(1);
  });

  it("is a rule of the page profile only", () => {
    expect(check(`${words(300)}\n`, "sources/notes/terms/a.md")).toEqual([]);
  });
});
