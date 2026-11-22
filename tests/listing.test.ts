import { describe, expect, it } from "vitest";
import {
  alphabetical,
  countByType,
  type Entry,
  groupByArea,
  pageCount,
  recentlyChanged,
} from "../src/lib/listing.ts";

const entry = (title: string, extra: Partial<Entry> = {}): Entry => ({
  type: "schemes",
  slug: title.toLowerCase().replaceAll(" ", "-"),
  title,
  summary: "A summary.",
  area: "run-game",
  updated: "2026-11-10",
  ...extra,
});

describe("alphabetical", () => {
  it("sorts by title, ignoring case", () => {
    const titles = alphabetical([entry("Zone"), entry("apex"), entry("Bunch")]).map((e) => e.title);
    expect(titles).toEqual(["apex", "Bunch", "Zone"]);
  });
});

describe("groupByArea", () => {
  it("keeps the order of the areas and leaves out an area with no page", () => {
    const groups = groupByArea([
      entry("B", { area: "coverage" }),
      entry("A", { area: "run-game" }),
      entry("C", { area: "run-game" }),
    ]);
    expect(groups.map((g) => [g.label, g.entries.map((e) => e.title)])).toEqual([
      ["Run game", ["A", "C"]],
      ["Coverage", ["B"]],
    ]);
  });

  it("is empty for no page", () => {
    expect(groupByArea([])).toEqual([]);
  });
});

describe("recentlyChanged", () => {
  it("lists the newest first and stops at the count", () => {
    const entries = [
      entry("Old", { updated: "2026-01-01" }),
      entry("New", { updated: "2026-11-01" }),
      entry("Mid", { updated: "2026-06-01" }),
    ];
    expect(recentlyChanged(entries, 2).map((e) => e.title)).toEqual(["New", "Mid"]);
  });

  it("puts pages of one day in title order", () => {
    const entries = [entry("B"), entry("A")];
    expect(recentlyChanged(entries, 10).map((e) => e.title)).toEqual(["A", "B"]);
  });
});

describe("countByType and pageCount", () => {
  it("counts the pages of a type", () => {
    const entries = [entry("A"), entry("B", { type: "terms" })];
    expect(countByType(entries, "schemes")).toBe(1);
    expect(countByType(entries, "situations")).toBe(0);
  });

  it("writes the count as words", () => {
    expect([0, 1, 2].map(pageCount)).toEqual(["0 pages", "1 page", "2 pages"]);
  });
});
