import { describe, expect, it } from "vitest";
import { profileForPath } from "../../src/lib/prose/check.ts";
import { check, lines, ruleIds } from "./helpers.ts";

const everything = lines(
  "---",
  "title: A very good title",
  "---",
  "",
  "## Overview",
  "",
  "It is very good — and plain -> clear. 😀 ![i](a.png)",
  "",
  '- **Mike**: He said "run it to the right side of the field" here.',
  "",
  "> a block quote",
  "",
  "A **zone** call and a **man** call.",
  "",
  `He said "${Array.from({ length: 31 }, () => "run").join(" ")}" at [a source](https://example.com).`,
);

describe("profileForPath", () => {
  it.each([
    ["content/schemes/a.md", "page"],
    ["sources/notes/a.md", "note"],
    ["sources/notes/deep/er/a.md", "note"],
    ["./sources/notes/a.md", "note"],
    ["/work/repo/sources/notes/a.md", "note"],
    ["sources\\notes\\a.md", "note"],
    ["sources/other/a.md", "page"],
    ["notes/a.md", "page"],
    ["sources.md", "page"],
    ["docs/a.md", "page"],
  ])("puts %s in the %s profile", (path, profile) => {
    expect(profileForPath(path)).toBe(profile);
  });
});

describe("profiles", () => {
  it("runs every rule on a page", () => {
    expect([...new Set(ruleIds(check(everything, "content/terms/a.md")))].sort()).toEqual(
      [
        "banned",
        "bold-density",
        "block-quote",
        "dash",
        "emoji-arrow",
        "image",
        "labelled-bullet",
        "quote-length",
        "quote-source",
        "sentence-length",
        "stock-heading",
      ].sort(),
    );
  });

  it("runs only the three quotation and image rules on a note", () => {
    expect([...new Set(ruleIds(check(everything, "sources/notes/a.md")))].sort()).toEqual([
      "block-quote",
      "image",
      "quote-length",
    ]);
  });

  it("lets the profile argument override the path", () => {
    expect(ruleIds(check(everything, "content/terms/a.md", "note")).sort()).toEqual([
      "block-quote",
      "image",
      "quote-length",
    ]);
    expect(ruleIds(check(everything, "sources/notes/a.md", "page")).length).toBeGreaterThan(5);
  });

  it("lets a note hold what a page may not: wordy points, dashes, bold labels", () => {
    const note = lines(
      "- **Claim**: it is very — really — important.",
      '- The coach says "run it to the right" about it.',
      "",
    );

    expect(check(note, "sources/notes/a.md")).toEqual([]);
  });

  it("reports invalid YAML in both profiles", () => {
    const content = lines("---", "title: [unclosed", "---", "", "Body.");

    expect(ruleIds(check(content, "content/terms/a.md"))).toEqual(["frontmatter"]);
    expect(ruleIds(check(content, "sources/notes/a.md"))).toEqual(["frontmatter"]);
  });

  it("does not look at the frontmatter of a note", () => {
    expect(
      check(lines("---", "title: A very — title", "---", "", "A point."), "sources/notes/a.md"),
    ).toEqual([]);
  });

  it("gives the YAML error one line, its line in the file, and points at line 1", () => {
    const [finding] = check(lines("---", "title: ok", "other: [unclosed", "---", "", "Body."));

    expect(finding).toMatchObject({ rule: "frontmatter", line: 1, column: 1 });
    expect(finding?.message).toMatch(/^The frontmatter is not valid YAML: .+ \(line \d+\)\.$/);
    expect(finding?.message).not.toMatch(/\n/);
  });

  it("asks nothing of a file with no frontmatter or with valid frontmatter", () => {
    expect(check("Body.\n")).toEqual([]);
    expect(check(lines("---", "title: A", "---", "", "Body."))).toEqual([]);
  });
});
