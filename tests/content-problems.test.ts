import { describe, expect, it } from "vitest";
import { findContentProblems, latestUpdated } from "../src/lib/content-problems.ts";
import type { Page } from "../src/lib/pages.ts";
import type { Frontmatter } from "../src/lib/schema.ts";

const NOW = new Date("2026-11-22T12:00:00Z");

function page(path: string, data: Partial<Frontmatter> = {}): Page {
  const [type, file] = path.split("/") as [Page["type"], string];
  return {
    path,
    type,
    slug: file.replace(/\.md$/, ""),
    body: "",
    data: {
      title: `Title of ${path}`,
      summary: "A summary.",
      side: "offense",
      area: "run-game",
      sources: [
        { url: "https://example.com/a", title: "A", author: "One" },
        { url: "https://example.com/b", title: "B", author: "Two" },
      ],
      updated: "2026-11-10",
      ...data,
    },
  };
}

describe("findContentProblems", () => {
  it("accepts pages that agree", () => {
    const pages = [
      page("schemes/a.md", { related: ["terms/b"] }),
      page("terms/b.md", { related: ["schemes/a"] }),
    ];
    expect(findContentProblems(pages, NOW)).toEqual([]);
  });

  it("accepts no page at all", () => {
    expect(findContentProblems([], NOW)).toEqual([]);
  });

  it("refuses two pages with one title, whatever the case", () => {
    const pages = [
      page("schemes/a.md", { title: "Reach block" }),
      page("terms/b.md", { title: "reach BLOCK" }),
    ];
    expect(findContentProblems(pages, NOW)).toEqual([
      'terms/b.md: the title "reach BLOCK" is also the title of schemes/a.md',
    ]);
  });

  it("refuses a related page that does not exist", () => {
    const pages = [page("schemes/a.md", { related: ["terms/missing"] })];
    expect(findContentProblems(pages, NOW)).toEqual([
      "schemes/a.md: related: terms/missing is not a page",
    ]);
  });

  it("refuses a page that lists itself", () => {
    const pages = [page("schemes/a.md", { related: ["schemes/a"] })];
    expect(findContentProblems(pages, NOW)).toEqual([
      "schemes/a.md: related: lists the page itself",
    ]);
  });

  it("refuses a date in the future", () => {
    const pages = [page("schemes/a.md", { updated: "2026-11-24" })];
    expect(findContentProblems(pages, NOW)).toEqual([
      "schemes/a.md: updated: 2026-11-24 is in the future",
    ]);
  });
});

describe("latestUpdated", () => {
  it("is today in the zone furthest ahead of UTC", () => {
    expect(latestUpdated(new Date("2026-11-22T09:59:00Z"))).toBe("2026-11-22");
    expect(latestUpdated(new Date("2026-11-22T10:00:00Z"))).toBe("2026-11-23");
  });
});
