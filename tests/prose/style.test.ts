import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseLimits } from "../../src/lib/prose/limits.ts";
import { banned, check, limits } from "./helpers.ts";

describe("style/limits.json", () => {
  it("holds the limits of the brief", () => {
    expect(limits).toEqual({
      sentenceWords: 35,
      quoteWords: 30,
      boldPerParagraph: 1,
      pageWords: { schemes: 900, situations: 700, techniques: 700, terms: 250 },
    });
  });
});

describe("parseLimits", () => {
  const valid = { sentenceWords: 5, quoteWords: 6, boldPerParagraph: 1, pageWords: { terms: 7 } };

  it("reads a valid file", () => {
    expect(parseLimits(valid)).toEqual(valid);
  });

  it.each([
    ["a non-object", 3],
    ["null", null],
    ["an array", []],
    ["a missing limit", { ...valid, quoteWords: undefined }],
    ["a limit that is not a number", { ...valid, sentenceWords: "35" }],
    ["a limit of zero", { ...valid, sentenceWords: 0 }],
    ["a fractional limit", { ...valid, boldPerParagraph: 1.5 }],
    ["pageWords that is not an object", { ...valid, pageWords: 7 }],
    ["a page limit that is not a number", { ...valid, pageWords: { terms: "7" } }],
  ])("refuses %s", (_name, value) => {
    expect(() => parseLimits(value)).toThrow(/^limits: /);
  });
});

describe("style/banned.txt", () => {
  const text = readFileSync(new URL("../../style/banned.txt", import.meta.url), "utf8");

  it("compiles, and every entry is on its own line", () => {
    const entries = text.split("\n").filter((line) => line.trim() !== "" && !line.startsWith("#"));

    expect(banned).toHaveLength(entries.length);
  });

  it("explains each football exception in a comment", () => {
    for (const word of [
      "leverage",
      "unlock",
      "kind of",
      "navigate",
      "fundamentally",
      "landscape",
    ]) {
      const comments = text
        .split("\n")
        .filter((line) => line.startsWith("#"))
        .join("\n");

      expect(comments).toContain(word);
    }
  });
});

describe("a file with nothing to check", () => {
  it.each([
    ["an empty file", ""],
    ["only blank lines", "\n\n\n"],
    ["only frontmatter", "---\ntitle: Cover 3\n---\n"],
    ["frontmatter with no body line", "---\ntitle: Cover 3\n---"],
    ["only a comment", "<!-- very -->\n"],
    ["only code", "```\nvery\n```\n"],
  ])("raises nothing for %s", (_name, content) => {
    expect(check(content)).toEqual([]);
  });
});
