import { describe, expect, it } from "vitest";
import { parseDocument } from "../../src/lib/prose/markdown.ts";
import { check, lines, only, positions } from "./helpers.ts";

function blocks(content: string) {
  return parseDocument(content).blocks.map((block) => [
    block.kind,
    block.plain.replace(/\s+/g, " ").trim(),
  ]);
}

describe("positions", () => {
  it("counts lines and columns from one, in the original file", () => {
    const content = lines(
      "---",
      "title: Cover 3",
      "---",
      "",
      "First paragraph.",
      "",
      "A very odd line.",
    );

    expect(positions(only(content, "banned"))).toEqual(["7:3"]);
  });

  it("counts a column in characters, not in code units", () => {
    expect(positions(only("🏈 A very odd line.\n", "banned"))).toEqual(["1:5"]);
  });

  it("counts a column after a tab as one character", () => {
    expect(positions(only("\tA very odd line.\n", "banned"))).toEqual(["1:4"]);
  });

  it("reads a file with Windows line endings the same way", () => {
    const content =
      "---\r\ntitle: A very good title\r\n---\r\n\r\nThe corner is quite slow — and late.\r\n";

    expect(positions(check(content))).toEqual(["2:10", "5:15", "5:26"]);
  });

  it("starts a column after a byte order mark at one", () => {
    expect(positions(only("\uFEFFA very odd line.\n", "banned"))).toEqual(["1:3"]);
  });

  it("puts a finding at the line where a wrapped phrase starts", () => {
    const content = lines(
      "Line one is clean.",
      "The corner is just in",
      "case the safety is late.",
    );

    expect(positions(only(content, "banned"))).toEqual(["2:15"]);
  });
});

describe("what is never checked", () => {
  const bad = "It is very — really -> quite 😀 in order to ![i](a.png)";

  it("skips a fenced block of backticks or tildes, whatever its info string", () => {
    const fences = [
      ["```", "```"],
      ["~~~", "~~~"],
      ["````", "````"],
      ['```ts title="a"', "```"],
    ] as const;
    for (const [opening, closing] of fences) {
      expect(check(lines(opening, bad, closing))).toEqual([]);
    }
  });

  it("skips a fence indented under a list item and one that is never closed", () => {
    expect(check(lines("- An item:", "", "  ```", `  ${bad}`, "  ```"))).toEqual([]);
    expect(check(lines("Text.", "", "```", bad))).toEqual([]);
  });

  it("closes a fence only with a mark at least as long", () => {
    expect(check(lines("````", "```", bad, "```", "````", "", "Clean."))).toEqual([]);
  });

  it("skips code spans of any backtick length, and one that crosses a wrapped line", () => {
    expect(check(`A \`${bad}\` and \`\`${bad}\`\` and \`a\n${bad}\` done.\n`)).toEqual([]);
  });

  it("does not take a lone backtick for a code span", () => {
    expect(only("A `very odd line.\n", "banned")).toHaveLength(1);
    expect(only("A `very odd` line and `\n\nvery odd.\n", "banned")).toHaveLength(1);
  });

  it("skips link destinations, titles and bare, angle and reference URLs", () => {
    const content = lines(
      '[a](https://example.com/very-quite "very quite") and [b](https://en.wikipedia.org/wiki/Very_(film)) and <https://example.com/very>.',
      "",
      "A [c][ref] and https://example.com/really-quite. And www.example.com/very.",
      "",
      '[ref]: https://example.com/very "really"',
    );

    expect(only(content, "banned")).toEqual([]);
  });

  it("checks the text of a link", () => {
    expect(only("A [very good](https://example.com/a) read.\n", "banned")).toHaveLength(1);
  });

  it("skips single-line and multi-line HTML comments", () => {
    expect(
      check(lines("A <!-- very -->clean line.", "<!--", "very quite —", "-->", "Clean.")).length,
    ).toBe(0);
  });

  it("skips HTML tags and their attributes", () => {
    expect(check('A <span class="very quite">clean</span> line and a <br/> break.\n')).toEqual([]);
  });

  it("skips a table separator row and reads the cells of a table", () => {
    const content = lines("| a | b |", "| -- | :-- |", "| very | c |");

    expect(positions(check(content))).toEqual(["3:3"]);
  });

  it("reads a table without outer pipes and one with an escaped pipe", () => {
    expect(positions(check(lines("a | b", "-- | --", "very | c"))).toString()).toBe("3:1");
    expect(blocks(lines("| a \\| b | c |", "| --- | --- |"))).toEqual([
      ["cell", "a | b"],
      ["cell", "c"],
    ]);
  });

  it("checks nothing in the frontmatter except the title and the summary", () => {
    const content = lines(
      "---",
      "title: Cover 3",
      "summary: A zone.",
      "notes: very — really -> quite",
      "list:",
      "  - very",
      "---",
      "",
      "Clean.",
    );

    expect(check(content)).toEqual([]);
  });

  it("reads a quoted and a folded title or summary and points inside the quotes", () => {
    const content = lines(
      "---",
      'title: "A very good title"',
      "summary: 'It is quite long.'",
      "---",
      "",
      "Clean.",
    );

    expect(positions(check(content))).toEqual(["2:11", "3:17"]);
  });

  it("does not treat a rule at the top of a file as frontmatter", () => {
    expect(positions(only(lines("---", "Very odd.", "", "text"), "banned"))).toEqual(["2:1"]);
    expect(only(lines("---", "title: [unclosed", "---", "", "Clean."), "frontmatter")).toHaveLength(
      1,
    );
  });
});

describe("blocks", () => {
  it("keeps a paragraph whole around a line that is only a code span", () => {
    expect(blocks(lines("Run the", "`4-3`", "front."))).toEqual([
      ["paragraph", "Run the \u25A1\u25A1\u25A1\u25A1\u25A1 front."],
    ]);
  });

  it("splits paragraphs at blank lines, rules and headings", () => {
    expect(blocks(lines("One.", "", "Two.", "***", "Three.", "# Four", "Five."))).toEqual([
      ["paragraph", "One."],
      ["paragraph", "Two."],
      ["paragraph", "Three."],
      ["heading", "Four"],
      ["paragraph", "Five."],
    ]);
  });

  it("reads list items of every marker, with their wrapped lines", () => {
    expect(blocks(lines("- a", "  b", "* c", "+ d", "1. e", "2) f", "   g"))).toEqual([
      ["item", "a b"],
      ["item", "c"],
      ["item", "d"],
      ["item", "e"],
      ["item", "f g"],
    ]);
  });
});

describe("code and addresses inside a sentence", () => {
  it("does not let a code span join two words of a phrase", () => {
    expect(only("The corner plays in order `x` to take the slant.\n", "banned")).toEqual([]);
    expect(only("The corner plays in order https://example.com/x to take it.\n", "banned")).toEqual(
      [],
    );
  });

  it("still ends a sentence before a code span", () => {
    const run = (count: number) => Array.from({ length: count }, () => "run").join(" ");
    const content = `Run ${run(25)}. \`Cover 3\` ${run(25)}. https://example.com/a ${run(25)}.\n`;

    expect(only(content, "sentence-length")).toEqual([]);
  });

  it("does not count a code span or an address as a word", () => {
    const run = (count: number) => Array.from({ length: count }, () => "run").join(" ");

    expect(
      only(
        `Run ${run(30)} \`a b c d e f\` https://example.com/a <https://example.com/b>.\n`,
        "sentence-length",
      ),
    ).toEqual([]);
  });
});
