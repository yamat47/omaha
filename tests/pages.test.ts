import { describe, expect, it } from "vitest";
import { locatePage, pageKey, pagePath } from "../src/lib/pages.ts";

describe("locatePage", () => {
  it("reads the type and the slug from the path", () => {
    expect(locatePage("schemes/inside-zone.md")).toEqual({
      ok: true,
      type: "schemes",
      slug: "inside-zone",
    });
  });

  it("refuses a directory that is not a type", () => {
    const located = locatePage("plays/inside-zone.md");
    expect(!located.ok && located.problem).toContain("plays/ is not a type");
  });

  it("refuses a file at the top or two directories down", () => {
    expect(locatePage("inside-zone.md").ok).toBe(false);
    expect(locatePage("schemes/run/inside-zone.md").ok).toBe(false);
  });

  it("refuses a file that is not Markdown", () => {
    expect(locatePage("schemes/inside-zone.txt").ok).toBe(false);
  });

  it.each([
    "Inside-Zone",
    "inside_zone",
    "inside--zone",
    "-inside",
    "inside-",
    "inside zone",
    "ゾーン",
  ])("refuses the slug %s", (slug) => {
    expect(locatePage(`schemes/${slug}.md`).ok).toBe(false);
  });
});

describe("pagePath and pageKey", () => {
  it("ends the URL in a slash", () => {
    expect(pagePath("schemes", "inside-zone")).toBe("/schemes/inside-zone/");
  });

  it("writes the key without the slashes around it", () => {
    expect(pageKey("terms", "reach-block")).toBe("terms/reach-block");
  });
});
