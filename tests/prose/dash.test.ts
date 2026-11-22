import { describe, expect, it } from "vitest";
import { lines, only, positions } from "./helpers.ts";

describe("dash", () => {
  it("flags an em dash and points at it", () => {
    const found = only("The corner jams the receiver — and falls off.\n", "dash");

    expect(positions(found)).toEqual(["1:30"]);
    expect(found[0]?.message).toMatch(/em dash/);
  });

  it("flags an en dash between words", () => {
    expect(positions(only("The 4–3 front – a base look.\n", "dash"))).toEqual(["1:15"]);
  });

  it("lets an en dash stand between two digits", () => {
    const content = lines(
      "The score was 4–3 and the run lasted 2019–2022.",
      "Plays 12–15 were all zone.",
    );

    expect(only(content, "dash")).toEqual([]);
  });

  it("flags an en dash that has a space beside the digits", () => {
    expect(only("The years 2019 – 2022 were quiet.\n", "dash")).toHaveLength(1);
  });

  it("flags a double hyphen used as a dash", () => {
    expect(positions(only("The safety rolls down -- and the corner stays.\n", "dash"))).toEqual([
      "1:23",
    ]);
  });

  it("flags a double hyphen with no spaces between two words", () => {
    expect(only("The safety rolls down--and the corner stays.\n", "dash")).toHaveLength(1);
  });

  it("does not flag the double hyphen of a command line option", () => {
    expect(only("Run it with --json to get an array.\n", "dash")).toEqual([]);
  });

  it("does not flag a horizontal rule or a table separator", () => {
    const content = lines("One.", "", "---", "", "| a | b |", "| -- | -- |", "| c | d |");

    expect(only(content, "dash")).toEqual([]);
  });

  it("does not flag a plain hyphen or a hyphenated word", () => {
    expect(only("A pre-snap read of the Y-cross and the 4-3 front.\n", "dash")).toEqual([]);
  });

  it("flags dashes in a heading, a list item and a table cell", () => {
    const content = lines(
      "## Cover 2 — the shell",
      "",
      "- the nickel — a third corner",
      "",
      "| a | b — c |",
      "| --- | --- |",
    );

    expect(positions(only(content, "dash"))).toEqual(["1:12", "3:14", "5:9"]);
  });

  it("does not look inside code, links, URLs or comments", () => {
    const content = lines(
      "Write `a — b` as code.",
      "A [link](https://example.com/a—b) and https://example.com/c—d are fine.",
      "<!-- an — aside -->",
      "```",
      "a — b",
      "```",
    );

    expect(only(content, "dash")).toEqual([]);
  });

  it("checks the title and the summary of the frontmatter, and nothing else in it", () => {
    const content = lines(
      "---",
      "title: Cover 2 — the shell",
      "summary: >-",
      "  Two safeties — split deep.",
      "tags: [a — b]",
      "---",
      "",
      "Body.",
    );

    expect(positions(only(content, "dash"))).toEqual(["2:16", "4:16"]);
  });

  it.each([
    ["&mdash;", "He ran&mdash;and fell."],
    ["&#8212;", "He ran&#8212;and fell."],
    ["&#x2014;", "He ran &#x2014; and fell."],
    ["&ndash;", "He ran &ndash; and fell."],
    ["a horizontal bar", "He ran \u2015 and fell."],
    ["a two-em dash", "He ran \u2E3A and fell."],
  ])("flags %s, which prints as a dash", (_name, text) => {
    expect(only(`${text}\n`, "dash")).toHaveLength(1);
  });

  it("lets an en dash entity stand between digits", () => {
    expect(only("The years 2019&ndash;2022 were quiet.\n", "dash")).toEqual([]);
  });
});
