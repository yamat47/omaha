import { describe, expect, it } from "vitest";
import { BannedSyntaxError, parseBanned } from "../../src/lib/prose/banned.ts";
import { check, lines, only, positions } from "./helpers.ts";

function hits(text: string): string[] {
  return only(`${text}\n`, "banned").map((finding) => finding.excerpt.toLowerCase());
}

describe("banned: what is flagged", () => {
  it.each([
    ["The scheme enables the quarterback to see it.", "enables"],
    ["That makes it possible to keep the safety deep.", "makes it possible"],
    ["The drill improves tackling.", "improves"],
    ["The rule ensures a clean read.", "ensures"],
    ["A robust plan and a seamless handoff.", "robust"],
    ["He moves efficiently and reacts appropriately.", "efficiently"],
    ["Coaches leverage the film to prepare.", "leverage the"],
    ["Teams utilize two tight ends.", "utilize"],
    ["It will facilitate a quick throw.", "facilitate"],
    ["The call will streamline the read.", "streamline"],
    ["Film can empower players.", "empower"],
    ["The motion will unlock the coverage.", "unlock"],
    ["To summarize, the zone wins.", "to summarize"],
    ["It is worth noting that the safety rolls.", "it is worth noting"],
    ["It's worth noting that the safety rolls.", "it's worth noting"],
    ["Notably, the corner jams.", "notably"],
    ["Let's dive in to the rules.", "let's dive in"],
    ["This page covers the rules.", "this page covers"],
    ["It seems the safety rolls late.", "it seems"],
    ["The corner seems to bail.", "seems to"],
    ["The corner is kind of slow.", "kind of"],
    ["The corner is sort of slow.", "sort of"],
    ["Perhaps the safety rolls.", "perhaps"],
    ["The Mike will delve into the gap.", "delve"],
    ["It is a testament to the line.", "a testament"],
    ["At its core, the play is a zone run.", "at its core"],
    ["When it comes to tackling, angles matter.", "when it comes to"],
    ["A game-changer for the offense.", "game-changer"],
    ["A game changer for the offense.", "game changer"],
    ["Coverage is crucial on third down.", "crucial"],
    ["His vital role is the flat.", "vital role"],
    ["The safety plays a role in the run fit.", "plays a role in"],
    ["The offense boasts three tight ends.", "boasts"],
    ["The call underscores the point.", "underscores"],
    ["The defensive landscape changed.", "landscape"],
    ["He must navigate the complexities of the front.", "navigate the complexities"],
    ["The call is not only simple but also fast.", "not only simple but also"],
    ["The corner plays in order to take the slant.", "in order to"],
    ["Due to the fact that he is late, he bails.", "due to the fact that"],
    ["The safety serves as the middle man.", "serves as"],
    ["He essentially plays man.", "essentially"],
    ["It is fundamentally a zone call.", "fundamentally"],
    ["The corner is very good.", "very"],
    ["He truly reads the QB.", "truly"],
    ["It is really simple.", "really"],
    ["That is quite a throw.", "quite"],
  ])("flags %j", (text, expected) => {
    expect(hits(text)).toContain(expected);
  });

  it("matches without regard to case", () => {
    expect(hits("Notably the corner jams. VERY good. In Order To win.")).toEqual([
      "notably",
      "very",
      "in order to",
    ]);
  });

  it("matches a curly apostrophe as well as a straight one", () => {
    expect(hits("It’s worth noting the safety rolls.")).toEqual(["it’s worth noting"]);
  });

  it("matches a phrase split across two lines of a paragraph", () => {
    const found = only(lines("The corner plays in order", "to take the slant."), "banned");

    expect(positions(found)).toEqual(["1:18"]);
    expect(found[0]?.excerpt).toBe("in order to");
  });

  it("matches a phrase split over a wrapped list item and over an indent", () => {
    const content = lines(
      "- The scheme is very",
      "  much a zone call, and in",
      "  order to run it you rep it.",
    );

    expect(positions(only(content, "banned"))).toEqual(["1:17", "2:25"]);
  });

  it("matches a phrase that bold or a link cuts through", () => {
    expect(hits("The corner plays in **order** to take it.")).toEqual(["in order to"]);
    expect(hits("Say it [very](https://example.com/very) well.")).toEqual(["very"]);
  });

  it("flags the pair not only and but also inside one sentence, and not across two", () => {
    expect(hits("Not only the line, but also the back, blocks.")).toEqual([
      "not only the line, but also",
    ]);
    expect(hits("The line is not only big. The back is also big, but also fast.")).toEqual([]);
  });

  it("reports one finding for overlapping expressions", () => {
    expect(hits("It is a testament to the line.")).toEqual(["a testament"]);
  });

  it("puts the suggestion into the message", () => {
    const [finding] = only("The corner plays in order to take it.\n", "banned");

    expect(finding?.message).toBe('Say "to" instead of "in order to".');
  });

  it("tells the writer to cut a phrase that has no suggestion", () => {
    const [finding] = only("The corner is very good.\n", "banned");

    expect(finding?.message).toBe('Cut "very" or say plainly what happens.');
  });

  it("checks headings, table cells and list items", () => {
    const content = lines(
      "## A very good rule",
      "",
      "- It is really so",
      "",
      "| a | b |",
      "| --- | --- |",
      "| quite | c |",
    );

    expect(positions(only(content, "banned"))).toEqual(["1:6", "3:9", "7:3"]);
  });

  it("checks the title and the summary of the frontmatter", () => {
    const content = lines(
      "---",
      "title: A very good rule",
      "summary: It is quite long.",
      "tags: [very]",
      "---",
      "",
      "Body.",
    );

    expect(positions(only(content, "banned"))).toEqual(["2:10", "3:16"]);
  });
});

describe("banned: what football keeps", () => {
  it.each([
    "The safety has leverage on the ball.",
    "The corner leverages the ball and forces it inside.",
    "The defender must leverage the ballcarrier to the sideline.",
    "Good leverage makes the tackle.",
    "Fundamentals win games, and the fundamentals of tackling are simple.",
    "This kind of blitz works against max protection.",
    "What kind of look does a 3x1 formation give?",
    "A kind of hybrid zone, and the same kind of rush.",
    "It is a different kind of pressure.",
    "What sort of coverage is that?",
    "He can unlock his hips and run.",
    "The back navigates the traffic and finds the cutback.",
    "The safety acts as a robber in the hole.",
    "He served as defensive coordinator for six years.",
    "Drills improve tackling.",
    "Every rep counts and a quiet corner is a good one.",
    "The line can enable the back to cut.",
    "Each corner has a role in the shell.",
    "The play is not only a run. It is also a pass.",
    "The tight end is a key player.",
    "His value in the offense is clear.",
    "A truism of the zone game.",
  ])("does not flag %j", (text) => {
    expect(hits(text)).toEqual([]);
  });

  it("leaves a word inside a longer word alone", () => {
    expect(hits("Every squad has verybody? No. Quietly he reads. Reality is hard.")).toEqual([]);
  });

  it("does not look in code, links or comments", () => {
    const content = lines(
      "Use `very` here and https://example.com/very-really there.",
      "[a link](https://example.com/crucial) <!-- really -->",
      "```",
      "very really",
      "```",
    );

    expect(only(content, "banned")).toEqual([]);
  });

  it("does not check the other keys of the frontmatter", () => {
    const content = lines("---", "title: Cover 2", "author: very good", "---", "", "Body.");

    expect(check(content)).toEqual([]);
  });
});

describe("banned: inside a quotation", () => {
  it("does not apply to a straight or curly quoted span", () => {
    expect(hits('The coach said "that corner is very quick" on film.')).toEqual([]);
    expect(hits("The coach said \u201Cthat corner is really quick\u201D on film.")).toEqual([]);
  });

  it("still flags the same word outside the quotes in the same sentence", () => {
    const found = only('The "very quick" corner is very fast.\n', "banned");

    expect(positions(found)).toEqual(["1:28"]);
  });

  it("flags a word before and after a quoted span, and not one in a quoted term", () => {
    expect(hits('Really, the "quite" corner is quite fast.')).toEqual(["really", "quite"]);
  });

  it("does not shield a phrase that starts before the quote", () => {
    expect(hits('It is worth "a testament to" this.')).toEqual([]);
    expect(hits('He is very "quick".')).toEqual(["very"]);
  });
});

describe("parseBanned", () => {
  it("skips comments and blank lines and reads suggestions", () => {
    const entries = parseBanned(
      lines("# a comment", "", "in order to => to", "very  # trailing note"),
    );

    expect(entries.map((entry) => [entry.line, entry.suggestion])).toEqual([
      [3, "to"],
      [4, null],
    ]);
  });

  it("reads a line between slashes as a regular expression", () => {
    const [entry] = parseBanned("/in order to\\b/\n");

    expect(entry?.pattern.test("in order to")).toBe(true);
  });

  it("lets a regular expression carry a hash and a suggestion", () => {
    const [entry] = parseBanned("/#hashtag/ => a word\n");

    expect(entry?.suggestion).toBe("a word");
    expect("a #hashtag".match(entry?.pattern ?? /$^/giu)?.[0]).toBe("#hashtag");
  });

  it("turns a space in a regular expression into a wrap-tolerant space", () => {
    const [entry] = parseBanned("/in order to\\b/\n");

    expect(entry?.pattern.test("in order\n  to")).toBe(true);
  });

  it("names the line of an expression it cannot read", () => {
    const text = lines("# first", "very", "/(unclosed/");

    expect(() => parseBanned(text)).toThrow(BannedSyntaxError);
    expect(() => parseBanned(text)).toThrow(/banned\.txt:3: invalid regular expression/);
  });

  it("refuses an expression that matches the empty string", () => {
    expect(() => parseBanned("/a*/\n")).toThrow(/banned\.txt:1: .*empty string/);
  });

  it("escapes the characters of a literal phrase", () => {
    const [entry] = parseBanned("a (b) c.d\n");

    expect(entry?.pattern.test("see a (b) c.d now")).toBe(true);
    expect(entry?.pattern.test("see a (b) cxd now")).toBe(false);
  });
});
