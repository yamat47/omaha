import { describe, expect, it } from "vitest";
import { splitFrontmatter } from "../src/lib/frontmatter.ts";

describe("splitFrontmatter", () => {
  it("returns the data and the body", () => {
    const split = splitFrontmatter("---\ntitle: A\nupdated: 2026-11-10\n---\n\nBody.\n");
    expect(split).toEqual({
      ok: true,
      data: { title: "A", updated: "2026-11-10" },
      body: "\nBody.\n",
    });
  });

  it("keeps a date as text", () => {
    const split = splitFrontmatter("---\nupdated: 2026-11-10\n---\n");
    expect(split.ok && split.data).toEqual({ updated: "2026-11-10" });
  });

  it("reads CRLF line ends", () => {
    const split = splitFrontmatter("---\r\ntitle: A\r\n---\r\nBody.");
    expect(split).toEqual({ ok: true, data: { title: "A" }, body: "Body." });
  });

  it("reports a file that does not start with the fence", () => {
    expect(splitFrontmatter("Body only.")).toEqual({
      ok: false,
      problem: "the file does not start with ---",
    });
  });

  it("reports a fence that never closes", () => {
    expect(splitFrontmatter("---\ntitle: A\n")).toEqual({
      ok: false,
      problem: "the frontmatter has no closing ---",
    });
  });

  it("reports YAML that does not parse", () => {
    const split = splitFrontmatter("---\ntitle: [a\n---\n");
    expect(!split.ok && split.problem).toMatch(/^the frontmatter is not valid YAML: /);
  });

  it("reports a key that appears twice", () => {
    const split = splitFrontmatter("---\ntitle: A\ntitle: B\n---\n");
    expect(split.ok).toBe(false);
  });
});
