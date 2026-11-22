import { describe, expect, it } from "vitest";
import { findQuotes } from "../../src/lib/prose/text.ts";
import { lines, only, positions } from "./helpers.ts";

function run(count: number): string {
  return Array.from({ length: count }, () => "run").join(" ");
}

const SOURCE = "[a clinic talk](https://example.com/talk)";

describe("quote-length", () => {
  it("allows a quotation of exactly the limit and flags one word more", () => {
    expect(only(`He said "${run(30)}." in ${SOURCE}.\n`, "quote-length")).toEqual([]);

    const [finding] = only(`He said "${run(31)}" in ${SOURCE}.\n`, "quote-length");

    expect(finding?.message).toMatch(/has 31 words \(limit 30\)/);
    expect(`${finding?.line}:${finding?.column}`).toBe("1:9");
  });

  it("flags a quotation of two sentences even when it is short", () => {
    const [finding] = only(`He said "Run it. Run it now." in ${SOURCE}.\n`, "quote-length");

    expect(finding?.message).toMatch(/holds 2 sentences/);
  });

  it("reads curly quotation marks", () => {
    expect(only(`He said “${run(31)}” in ${SOURCE}.\n`, "quote-length")).toHaveLength(1);
    expect(only(`He said “Run it. Run it now.” in ${SOURCE}.\n`, "quote-length")).toHaveLength(1);
    expect(only(`He said “${run(10)}.” in ${SOURCE}.\n`, "quote-length")).toEqual([]);
  });

  it("allows a quotation that ends in its own period or question mark", () => {
    expect(only(`He asked "Where is the Mike?" in ${SOURCE}.\n`, "quote-length")).toEqual([]);
    expect(only(`He said "Run it." in ${SOURCE}.\n`, "quote-length")).toEqual([]);
  });

  it("lets a term through whatever it holds", () => {
    expect(
      only('The "Mike" and the "Will" and the "nickel back" are linebackers.\n', "quote-length"),
    ).toEqual([]);
    expect(only('The "Run. Go." term.\n', "quote-length")).toEqual([]);
  });

  it("reports every long quotation of a paragraph", () => {
    const content = `One "${run(31)}" and two "${run(32)}" in ${SOURCE}.\n`;

    expect(only(content, "quote-length")).toHaveLength(2);
  });

  it("applies to list items and headings, and to table cells of a note only", () => {
    const content = lines(
      `- He said "${run(31)}" ${SOURCE}`,
      "",
      `## The "${run(31)}" rule`,
      "",
      "| a | b |",
      "| --- | --- |",
      `| "${run(31)}" | c |`,
    );

    expect(positions(only(content, "quote-length"))).toEqual(["1:11", "3:8"]);
    expect(positions(only(content, "quote-length", "sources/notes/a.md"))).toEqual([
      "1:11",
      "3:8",
      "7:3",
    ]);
  });

  it("does not look in code or URLs", () => {
    expect(
      only(`Use \`"${run(40)}"\` and https://example.com/"${run(40)}".\n`, "quote-length"),
    ).toEqual([]);
  });
});

describe("quote-source", () => {
  it("flags a quotation of four words with no link in its paragraph", () => {
    const found = only('He said "run it to the right" on film.\n', "quote-source");

    expect(positions(found)).toEqual(["1:9"]);
  });

  it("asks nothing of a quotation of three words or fewer", () => {
    expect(only('He called it "the nickel back" on film.\n', "quote-source")).toEqual([]);
    expect(only('He called it "nickel" on film.\n', "quote-source")).toEqual([]);
  });

  it("accepts a link anywhere in the same paragraph", () => {
    expect(only(`He said "run it to the right" on ${SOURCE}.\n`, "quote-source")).toEqual([]);
    expect(only(`See ${SOURCE}. He said "run it to the right" on film.\n`, "quote-source")).toEqual(
      [],
    );
    expect(
      only(
        'He said "run it to the right" on [film][1].\n\n[1]: https://example.com/film\n',
        "quote-source",
      ),
    ).toEqual([]);
    expect(
      only('He said "run it to the right" <https://example.com/film>\n', "quote-source"),
    ).toEqual([]);
    expect(
      only('He said "run it to the right" at https://example.com/film now.\n', "quote-source"),
    ).toEqual([]);
  });

  it("does not take a link in another paragraph, an image, or code for the source", () => {
    expect(
      only(`${SOURCE}\n\nHe said "run it to the right" on film.\n`, "quote-source"),
    ).toHaveLength(1);
    expect(only('He said "run it to the right" ![x](a.png).\n', "quote-source")).toHaveLength(1);
    expect(only('He said "run it to the right" `[x](y)`.\n', "quote-source")).toHaveLength(1);
  });

  it("asks once per paragraph or list item", () => {
    expect(
      only('A "run it to the right" and a "pass it to the left" quote.\n', "quote-source"),
    ).toHaveLength(1);
    expect(
      only(
        lines('- A "run it to the right" quote.', '- A "pass it to the left" quote.'),
        "quote-source",
      ),
    ).toHaveLength(2);
  });

  it("asks nothing of a table cell", () => {
    expect(
      only(lines("| a | b |", "| --- | --- |", '| "run it to the right" | c |'), "quote-source"),
    ).toEqual([]);
  });
});

describe("what is not a quotation", () => {
  it.each([
    "Mike's job is the gap, and the safety's is the flat.",
    "Don't let him cut back; the '90s offenses didn't either.",
    "The ‘nickel’ is a corner and the coaches’ call is zone.",
    "He is 6'2\" and 215 pounds, and the other is 5'11\" and 190 pounds, so he wins.",
    'A 5" gap, and then a lone " mark.',
  ])("%j holds none", (text) => {
    expect(findQuotes(text)).toEqual([]);
    expect(only(`${text}\n`, "quote-length")).toEqual([]);
    expect(only(`${text}\n`, "quote-source")).toEqual([]);
  });

  it("does not let an unmatched opening mark swallow a later quotation", () => {
    const text = `He said "go and then later "${run(40)}" in ${SOURCE}.`;

    expect(findQuotes(text)).toHaveLength(1);
  });

  it("pairs straight marks in order", () => {
    const text = 'The "Mike" and "Will" calls.';

    expect(findQuotes(text).map((q) => text.slice(q.start, q.end))).toEqual(['"Mike"', '"Will"']);
  });

  it("closes a quotation at a mark that follows punctuation", () => {
    const text = 'He said "stop." Then left.';

    expect(findQuotes(text).map((q) => text.slice(q.inner.start, q.inner.end))).toEqual(["stop."]);
  });
});
