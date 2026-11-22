import { describe, expect, it } from "vitest";
import { AREA_LABELS, AREAS, Frontmatter, isOneSentence, normalizeUrl } from "../src/lib/schema.ts";

const valid = {
  title: "Inside zone",
  summary: "A run play that blocks an area.",
  side: "offense",
  area: "run-game",
  sources: [
    { url: "https://example.com/a", title: "A", author: "Coach One" },
    { url: "https://example.com/b", title: "B", author: "Coach Two", publisher: "Example" },
  ],
  updated: "2026-11-10",
};

const problems = (value: unknown) => {
  const result = Frontmatter.safeParse(value);
  return result.success
    ? []
    : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
};

describe("Frontmatter", () => {
  it("accepts a page with every key", () => {
    const full = { ...valid, related: ["terms/reach-block"], diagram: "A line.", exemplar: true };
    expect(problems(full)).toEqual([]);
  });

  it("refuses an unknown key", () => {
    expect(Frontmatter.safeParse({ ...valid, tags: ["run"] }).success).toBe(false);
  });

  it("refuses a side and an area outside the closed lists", () => {
    expect(problems({ ...valid, side: "offence", area: "kicking" })).toHaveLength(2);
  });

  it("wants two sources", () => {
    expect(problems({ ...valid, sources: valid.sources.slice(0, 1) })).toEqual([
      "sources: at least two sources",
    ]);
  });

  it("refuses two sources that share a URL, however it is spelled", () => {
    const sources = [
      { url: "https://Example.com/a/", title: "A", author: "One" },
      { url: "https://example.com/a#part", title: "B", author: "Two" },
    ];
    expect(problems({ ...valid, sources })).toEqual(["sources: two sources share a URL"]);
  });

  it("refuses a source that is not on https", () => {
    const sources = [valid.sources[0], { url: "http://example.com/b", title: "B", author: "Two" }];
    expect(problems({ ...valid, sources })).toEqual(["sources.1.url: an https URL"]);
  });

  it("refuses a source without an author", () => {
    const sources = [valid.sources[0], { url: "https://example.com/b", title: "B" }];
    expect(problems({ ...valid, sources })).toHaveLength(1);
  });

  it("refuses a related page that is not <type>/<slug>", () => {
    expect(problems({ ...valid, related: ["/schemes/inside-zone/"] })).toHaveLength(1);
    expect(problems({ ...valid, related: ["plays/inside-zone"] })).toHaveLength(1);
  });

  it("refuses a related page listed twice", () => {
    expect(problems({ ...valid, related: ["terms/a", "terms/a"] })).toEqual([
      "related: a page is listed twice",
    ]);
  });

  it("wants a date, as text", () => {
    expect(problems({ ...valid, updated: "2026-02-30" })).toHaveLength(1);
    expect(problems({ ...valid, updated: new Date("2026-02-01") })).toHaveLength(1);
  });

  it("refuses a summary over 200 characters", () => {
    expect(problems({ ...valid, summary: `${"a".repeat(200)}.` })).toHaveLength(1);
  });
});

describe("isOneSentence", () => {
  it("accepts one sentence", () => {
    expect(isOneSentence("A block that two linemen make together.")).toBe(true);
  });

  it("accepts an abbreviation inside the sentence", () => {
    expect(isOneSentence("How to play Cover 3 vs. Cover 2 shells.")).toBe(true);
  });

  it("refuses a second sentence", () => {
    expect(isOneSentence("A block. It is made by two linemen.")).toBe(false);
  });

  it("refuses a summary that does not end with a period", () => {
    expect(isOneSentence("A block that two linemen make together")).toBe(false);
  });
});

describe("normalizeUrl", () => {
  it("drops the fragment and the trailing slash and lowers the host", () => {
    expect(normalizeUrl("https://EXAMPLE.com/a/#x")).toBe("https://example.com/a");
  });
});

describe("AREA_LABELS", () => {
  it("gives every area its own label", () => {
    expect(new Set(AREAS.map((area) => AREA_LABELS[area])).size).toBe(AREAS.length);
  });
});
