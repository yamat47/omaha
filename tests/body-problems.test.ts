import { describe, expect, it } from "vitest";
import { findBodyProblems } from "../src/lib/body-problems.ts";

describe("findBodyProblems", () => {
  it("accepts headings from level two", () => {
    expect(findBodyProblems("Text.\n\n## One\n\n### Two\n")).toEqual([]);
  });

  it("refuses a heading of level one", () => {
    expect(findBodyProblems("# Title\n")).toEqual([
      "body line 1: a heading of level one; the body's headings start at ##",
    ]);
  });

  it("refuses an underlined heading of level one", () => {
    expect(findBodyProblems("Title\n=====\n")).toHaveLength(1);
  });

  it("refuses an image, in Markdown or in HTML", () => {
    expect(findBodyProblems("![alt](a.png)\n")).toHaveLength(1);
    expect(findBodyProblems('<img src="a.png">\n')).toHaveLength(1);
  });

  it("accepts a link", () => {
    expect(findBodyProblems("[a link](https://example.com/)\n")).toEqual([]);
  });

  it("does not read inside a fenced block", () => {
    expect(findBodyProblems("```\n# a comment\n![x](y)\n```\n")).toEqual([]);
  });

  it("reads on after the fence closes", () => {
    expect(findBodyProblems("```\n# in\n```\n# out\n")).toEqual([
      "body line 4: a heading of level one; the body's headings start at ##",
    ]);
  });
});
