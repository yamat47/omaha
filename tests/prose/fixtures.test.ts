import { describe, expect, it } from "vitest";
import { RULES } from "../../src/lib/prose/types.ts";
import { CLEAN_PAGE, COPIED_NOTE, GOOD_NOTE, LONG_PAGE, TRIP_PAGE } from "./fixtures.ts";
import { check, ruleIds } from "./helpers.ts";

function bodyWords(text: string): number {
  return text
    .replace(/^---[\s\S]*?\n---\n/, "")
    .split(/\s+/)
    .filter(Boolean).length;
}

describe("a page that passes", () => {
  const { path, text } = CLEAN_PAGE;

  it("is between 300 and 400 words and has the Markdown a page has", () => {
    expect(bodyWords(text)).toBeGreaterThanOrEqual(300);
    expect(bodyWords(text)).toBeLessThanOrEqual(400);
    expect(text).toMatch(/^---\ntitle: /);
    expect(text).toContain("| --- |");
    expect(text).toMatch(/^- /m);
    expect(text).toMatch(/\]\(https:/);
    expect(text).toMatch(/"[a-z ]+"/);
  });

  it("raises no finding", () => {
    expect(check(text, path)).toEqual([]);
  });

  it("raises none as a note either, and as a page under another directory", () => {
    expect(check(text, "sources/notes/a.md")).toEqual([]);
    expect(check(text, "elsewhere/a.md")).toEqual([]);
  });
});

describe("a long page of real prose", () => {
  const { path, text } = LONG_PAGE;

  it("holds at least 500 words and raises no finding", () => {
    expect(bodyWords(text)).toBeGreaterThanOrEqual(500);
    expect(check(text, path)).toEqual([]);
  });
});

describe("a page that breaks every rule once", () => {
  const { path, text } = TRIP_PAGE;
  const findings = check(text, path);

  it("raises exactly one finding for each rule", () => {
    expect(ruleIds(findings).sort()).toEqual(RULES.filter((rule) => rule !== "frontmatter").sort());
  });

  it("points at each", () => {
    expect(findings.map((f) => `${f.line}:${f.column} ${f.rule}`)).toEqual([
      "6:4 stock-heading",
      "10:30 dash",
      "14:15 banned",
      "18:3 labelled-bullet",
      "22:1 sentence-length",
      "22:203 page-length",
      "26:1 block-quote",
      "30:9 quote-length",
      "34:9 quote-source",
      "38:17 emoji-arrow",
      "42:1 image",
      "46:23 bold-density",
    ]);
  });

  it("gives every finding an excerpt and a message", () => {
    for (const finding of findings) {
      expect(finding.file).toBe(path);
      expect(finding.excerpt).not.toBe("");
      expect(finding.message).toMatch(/\.$/);
      expect(finding.message).not.toMatch(/\n/);
    }
  });

  it("comes out the same each time, in order of line and column", () => {
    const again = check(text, path);

    expect(again).toEqual(findings);
    expect(findings.map((f) => f.line)).toEqual(
      [...findings.map((f) => f.line)].sort((a, b) => a - b),
    );
  });
});

describe("notes on a source", () => {
  it("pass when they are a list of points in their own words", () => {
    expect(check(GOOD_NOTE.text, GOOD_NOTE.path)).toEqual([]);
  });

  it("fail when they copy a block, a figure or a long quotation", () => {
    const findings = check(COPIED_NOTE.text, COPIED_NOTE.path);

    expect(findings.map((f) => `${f.line}:${f.column} ${f.rule}`)).toEqual([
      "1:1 block-quote",
      "4:1 image",
      "6:16 quote-length",
    ]);
  });
});
