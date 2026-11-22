import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contentDir, loadContent } from "../src/lib/load-content.ts";

const NOW = new Date("2026-11-22T12:00:00Z");
const ROOT = new URL("../", import.meta.url);
const FIXTURES = fileURLToPath(new URL("fixtures/content/", import.meta.url));

describe("contentDir", () => {
  it("is content/ at the repository root by default", () => {
    expect(contentDir(ROOT, {})).toBe(fileURLToPath(new URL("content", ROOT)));
    expect(contentDir(ROOT, { OMAHA_CONTENT_DIR: "" })).toBe(
      fileURLToPath(new URL("content", ROOT)),
    );
  });

  it("reads a relative override from the repository root", () => {
    expect(contentDir(ROOT, { OMAHA_CONTENT_DIR: "tests/fixtures/content" })).toBe(
      fileURLToPath(new URL("tests/fixtures/content", ROOT)).replace(/\/$/, ""),
    );
  });
});

describe("loadContent", () => {
  it("accepts a directory that does not exist, as a site with no page", async () => {
    const content = await loadContent(join(tmpdir(), "omaha-no-such-directory"), NOW);
    expect(content).toEqual({ pages: [], problems: [] });
  });

  it("accepts the fixtures: one page of each type, none with a problem", async () => {
    const content = await loadContent(FIXTURES, NOW);
    expect(content.problems).toEqual([]);
    expect(content.pages.map((page) => page.type).sort()).toEqual([
      "schemes",
      "situations",
      "techniques",
      "terms",
    ]);
  });

  it("reports a file that is no page and a page with a problem, by path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "omaha-content-"));
    await mkdir(join(dir, "schemes"));
    await writeFile(join(dir, "schemes", "bad.md"), "---\ntitle: Bad\n---\n");
    await writeFile(join(dir, "schemes", "notes.txt"), "x");
    await writeFile(join(dir, "schemes", ".DS_Store"), "x");

    const { problems } = await loadContent(dir, NOW);
    expect(problems.map((problem) => problem.split(":")[0])).toEqual([
      "schemes/bad.md",
      "schemes/bad.md",
      "schemes/bad.md",
      "schemes/bad.md",
      "schemes/bad.md",
      "schemes/notes.txt",
    ]);
  });
});
