import { describe, expect, it } from "vitest";
import { countWords, splitSentences } from "../../src/lib/prose/text.ts";
import { lines, only, positions } from "./helpers.ts";

// Starts with a capital, as a sentence does: a period before a lowercase word is no boundary.
function run(count: number): string {
  return Array.from({ length: count }, (_, i) => (i === 0 ? "Run" : "run")).join(" ");
}

describe("sentence-length", () => {
  it("allows a sentence of exactly the limit and flags one word more", () => {
    expect(only(`${run(35)}.\n`, "sentence-length")).toEqual([]);

    const [finding] = only(`${run(36)}.\n`, "sentence-length");

    expect(finding?.message).toBe("The sentence has 36 words (limit 35); split it in two.");
    expect(positions([finding ?? never()])).toEqual(["1:1"]);
  });

  it("points at the start of the long sentence, not of the paragraph", () => {
    const content = `Short one. ${run(40)}. Short two.\n`;

    expect(positions(only(content, "sentence-length"))).toEqual(["1:12"]);
  });

  it("reports each long sentence of a paragraph", () => {
    const content = `${run(40)}. ${run(5)}. ${run(41)}!\n`;

    expect(only(content, "sentence-length")).toHaveLength(2);
  });

  it("splits on a question mark and an exclamation mark", () => {
    expect(only(`${run(30)}? ${run(30)}! ${run(30)}.\n`, "sentence-length")).toEqual([]);
  });

  it("counts across wrapped lines", () => {
    const content = `${lines(run(20), run(20))}`;

    expect(positions(only(content, "sentence-length"))).toEqual(["1:1"]);
  });

  it("treats a list item as its own sentence", () => {
    const content = lines(`- ${run(20)}`, `- ${run(20)}`, `- ${run(20)}`);

    expect(only(content, "sentence-length")).toEqual([]);
    expect(positions(only(lines(`- ${run(36)}`, "- Short."), "sentence-length"))).toEqual(["1:3"]);
  });

  it("does not take the next line of a paragraph for another item", () => {
    const content = lines(`- ${run(20)}`, `  ${run(20)}`);

    expect(only(content, "sentence-length")).toHaveLength(1);
  });

  it("exempts headings and table cells", () => {
    const content = lines(
      `## ${run(60)}`,
      "",
      `| ${run(60)} | b |`,
      "| --- | --- |",
      `| ${run(60)} | b |`,
    );

    expect(only(content, "sentence-length")).toEqual([]);
  });

  it("does not count code, URLs or link destinations as words", () => {
    const content = `${run(30)} \`${run(20)}\` [x](https://example.com/${run(20)}) https://example.com/b.\n`;

    expect(only(content, "sentence-length")).toEqual([]);
  });

  it("counts the text of a link", () => {
    expect(
      only(`${run(30)} [${run(10)}](https://example.com/a).\n`, "sentence-length"),
    ).toHaveLength(1);
  });

  it.each([
    ["e.g.", `${run(20)}, e.g. Cover 3, ${run(20)}.`],
    ["i.e.", `${run(20)}, i.e. The Mike, ${run(20)}.`],
    ["vs.", `${run(20)} vs. Cover 2 ${run(20)}.`],
    ["No. before a digit", `${run(20)} wore No. 1 ${run(20)}.`],
    ["St.", `${run(20)} met St. Louis ${run(20)}.`],
    ["a decimal", `${run(20)} gained 4.3 yards ${run(20)}.`],
  ])("does not split after %s", (_name, sentence) => {
    expect(only(`${sentence}\n`, "sentence-length")).toHaveLength(1);
  });

  it("still splits where a period ends a sentence about a coverage", () => {
    expect(
      only(`${run(30)} Cover 3. ${run(30)} Cover 2. ${run(30)}.\n`, "sentence-length"),
    ).toEqual([]);
  });

  it("does not report a sentence that only an abbreviation or an initial would glue together", () => {
    expect(only(`${run(20)} the B.O.B. Cover 3 ${run(20)}.\n`, "sentence-length")).toEqual([]);
    expect(only(`${run(20)} Plan B. Then ${run(20)}.\n`, "sentence-length")).toEqual([]);
  });

  it("counts football notation as one word each", () => {
    const notation = "4-3 3-4 2x2 3x1 Y-cross Cover-3 B.O.B. 6'2\" 4.3 12–15 and/or";

    expect(countWords(notation)).toBe(11);
    expect(only(`${run(25)} ${notation}.\n`, "sentence-length")).toEqual([]);
  });

  it("does not count a bare dash or marks with no letter", () => {
    expect(countWords("a — b - c ... d")).toBe(4);
  });

  it("splits after a closing quote or bracket", () => {
    expect(
      only(`${run(30)} (a note.) ${run(30)}. "${run(5)}." ${run(30)}.\n`, "sentence-length"),
    ).toEqual([]);
  });
});

describe("splitSentences", () => {
  const texts = (input: string) =>
    splitSentences(input).map((span) => input.slice(span.start, span.end));

  it("splits before an uppercase letter, a digit, a quote or a bracket", () => {
    expect(texts('One. Two? "Three." (Four) 5 six.')).toEqual([
      "One.",
      "Two?",
      '"Three."',
      "(Four) 5 six.",
    ]);
    expect(texts("One. 2 Two. [Three]")).toEqual(["One.", "2 Two.", "[Three]"]);
  });

  it("does not split before a lowercase letter or inside a number", () => {
    expect(texts("About 4.3 yards. then more. Go.")).toEqual([
      "About 4.3 yards. then more.",
      "Go.",
    ]);
  });

  it("returns nothing for an empty text", () => {
    expect(splitSentences("  \n ")).toEqual([]);
  });
});

function never(): never {
  throw new Error("expected a finding");
}
