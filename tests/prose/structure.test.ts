import { describe, expect, it } from "vitest";
import { lines, only, positions } from "./helpers.ts";

describe("labelled-bullet", () => {
  it.each([
    "- **Mike**: the middle linebacker.",
    "- **Mike:** the middle linebacker.",
    "- **Mike** - the middle linebacker.",
    "* _Mike_ - the middle linebacker.",
    "+ *Mike*: the middle linebacker.",
    "1. **Mike**: the middle linebacker.",
    "2) __Mike__: the middle linebacker.",
    "- **Mike** – the middle linebacker.",
    "  - **Mike**: nested items count too.",
  ])("flags %j", (item) => {
    expect(only(`${item}\n`, "labelled-bullet")).toHaveLength(1);
  });

  it("points at the opening mark of the label and shows the label", () => {
    const [finding] = only("1. **Mike:** the middle linebacker.\n", "labelled-bullet");

    expect(`${finding?.line}:${finding?.column}`).toBe("1:4");
    expect(finding?.excerpt).toBe("**Mike:**");
  });

  it.each([
    "- **Mike linebacker**",
    "- **Mike: the middle linebacker**",
    "- **Run the ball.**",
    "- **Mike** is the middle linebacker.",
    "- **Mike**, the middle linebacker, calls the front.",
    "- *Mike* and the Will drop into the hook zones.",
    "- The **Mike** linebacker calls the front: it is his job.",
    "- Mike: the middle linebacker.",
    "- **Y-cross**-style routes.",
    "- _snake_case: not a label_",
    "**Mike**: a paragraph, not a list item.",
    "- `Mike`: code is not a label.",
  ])("does not flag %j", (item) => {
    expect(only(`${item}\n`, "labelled-bullet")).toEqual([]);
  });

  it("does not take a wrapped line that starts with a year for a list item", () => {
    const content = lines(
      "The defense changed the front in",
      "2019. **Mike**: moved to the weak side.",
    );

    expect(only(content, "labelled-bullet")).toEqual([]);
  });
});

describe("bold-density", () => {
  it("allows one bold span and flags the second", () => {
    expect(only("A **zone** call and a man call.\n", "bold-density")).toEqual([]);
    const found = only("A **zone** call and a **man** call.\n", "bold-density");

    expect(positions(found)).toEqual(["1:23"]);
    expect(found[0]?.excerpt).toBe("**man**");
  });

  it("counts underscores as bold and not an intra-word pair", () => {
    expect(only("A __zone__ call and a __man__ call.\n", "bold-density")).toHaveLength(1);
    expect(only("Set __init__ and __main__ in snake__case__name.\n", "bold-density")).toHaveLength(
      1,
    );
  });

  it("counts a list item by item, not as one paragraph", () => {
    const content = lines(
      "- The **Mike** calls it.",
      "- The **Will** plays the flat.",
      "- The **Sam** plays the edge.",
    );

    expect(only(content, "bold-density")).toEqual([]);
  });

  it("counts every paragraph on its own and across its wrapped lines", () => {
    const content = lines(
      "One **zone** call",
      "and one **man** call.",
      "",
      "A **third** paragraph.",
    );

    expect(positions(only(content, "bold-density"))).toEqual(["2:9"]);
  });

  it("flags every item that holds too many spans", () => {
    const content = lines("- A **a** and **b** pair.", "- A **c** only.");

    expect(positions(only(content, "bold-density"))).toEqual(["1:15"]);
  });

  it("does not count italics, bold in a heading, or a table", () => {
    const content = lines(
      "An *italic* and *another* one.",
      "",
      "## **Bold** and **bold** again",
      "",
      "| **a** | **b** |",
      "| --- | --- |",
    );

    expect(only(content, "bold-density")).toEqual([]);
  });

  it("counts bold inside a link text and ignores asterisks in code", () => {
    expect(only("A [**zone**](https://example.com) and `**x** **y**`.\n", "bold-density")).toEqual(
      [],
    );
  });
});

describe("stock-heading", () => {
  it.each([
    "Overview",
    "Introduction",
    "Summary",
    "Conclusion",
    "Conclusions",
    "Key Takeaways",
    "Takeaways",
    "Final Thoughts",
    "Background",
    "overview",
    "KEY TAKEAWAYS",
    "Summary:",
    "**Overview**",
  ])("flags the heading %j", (title) => {
    expect(only(`## ${title}\n`, "stock-heading")).toHaveLength(1);
  });

  it.each([
    "Overview of the 4-3 front",
    "Cover 3 overview",
    "Background checks",
    "Summary of the rules",
    "The conclusion of the drive",
    "What the safety reads",
  ])("does not flag the heading %j", (title) => {
    expect(only(`## ${title}\n`, "stock-heading")).toEqual([]);
  });

  it("reads every level, a closing hash run and an underlined heading", () => {
    const content = lines("# Overview", "", "### Summary ###", "", "Background", "----------");

    expect(positions(only(content, "stock-heading"))).toEqual(["1:3", "3:5", "5:1"]);
  });

  it("does not take a line that is not a heading, or a heading in code", () => {
    const content = lines("Overview", "", "#Overview", "", "```", "# Overview", "```");

    expect(only(content, "stock-heading")).toEqual([]);
  });
});

describe("block-quote", () => {
  it("flags a line that starts with a greater-than sign, once for a run of lines", () => {
    const content = lines("A paragraph.", "", "> First line", "> second line", "", "> Another.");

    expect(positions(only(content, "block-quote"))).toEqual(["3:1", "6:1"]);
  });

  it("finds an indented mark and a nested one", () => {
    expect(positions(only("  > indented\n", "block-quote"))).toEqual(["1:3"]);
    expect(positions(only(">> nested\n", "block-quote"))).toEqual(["1:1"]);
  });

  it("flags a line that follows a blank line, the start of the body or a quote line", () => {
    expect(positions(only("> At the start\n", "block-quote"))).toEqual(["1:1"]);
    expect(
      positions(only(lines("---", "title: A", "---", "> After frontmatter"), "block-quote")),
    ).toEqual(["4:1"]);
  });

  it("does not take a wrapped paragraph line that begins with a greater-than sign", () => {
    const content = lines("The back gained", "> 40 yards on the drive", "and then fell.");

    expect(only(content, "block-quote")).toEqual([]);
    expect(only(lines("Text.", "> not after a blank line"), "block-quote")).toEqual([]);
  });

  it("does not flag a greater-than sign inside a line, in code or in a comment", () => {
    const content = lines(
      "A 4 > 3 count, and a -> b.",
      "",
      "```",
      "> not a quote",
      "```",
      "",
      "<!--",
      "> hidden",
      "-->",
    );

    expect(only(content, "block-quote")).toEqual([]);
  });
});

describe("image", () => {
  it.each([
    "![A diagram](diagram.png)",
    "![](a.png)",
    "![alt][ref]",
    '<img src="a.png">',
    "<IMG src=a.png>",
    "<figure>",
    "<svg viewBox='0 0 1 1'>",
  ])("flags %j", (markup) => {
    expect(only(`Before ${markup} after.\n`, "image")).toHaveLength(1);
  });

  it("points at the start of the image", () => {
    expect(positions(only("A look: ![Zone](zone.png).\n", "image"))).toEqual(["1:9"]);
  });

  it("does not flag a link, code, a comment or a word that starts like a tag", () => {
    const content = lines(
      "A [link](https://example.com/a.png) and an exclamation! [not an image](x).",
      "Write `![x](y)` and `<img>` as code. <!-- <img src=a> -->",
      "A <imaginary> tag and a <svgfoo> tag and 3 < 4.",
      "```html",
      '<img src="a.png">',
      "```",
    );

    expect(only(content, "image")).toEqual([]);
  });
});

describe("emoji-arrow", () => {
  it.each([
    ["an arrow", "Cover 3 → Cover 2."],
    ["a left arrow", "Cover 3 ← Cover 2."],
    ["the end of the arrows block", "A ⇿ B."],
    ["a long arrow", "A ⟶ B."],
    ["an ascii arrow", "Z -> slant."],
    ["a fat arrow", "Z => slant."],
    ["an emoji", "A great play 😀."],
    ["a football emoji", "The 🏈 game."],
    ["a flag", "The 🇺🇸 team."],
    ["an arrow entity", "Go &rarr; now."],
    ["a heavy arrow emoji", "Go ➡\uFE0F now."],
    ["a check mark emoji", "Done ✅."],
    ["route notation", "Y -> flat, Z -> post."],
  ])("flags %s", (_name, text) => {
    expect(only(`${text}\n`, "emoji-arrow").length).toBeGreaterThan(0);
  });

  it("reports an emoji family sequence once", () => {
    expect(only("A 👨\u200D👩\u200D👧 family.\n", "emoji-arrow")).toHaveLength(1);
  });

  it("points at the mark", () => {
    expect(positions(only("Cover 3 -> Cover 2.\n", "emoji-arrow"))).toEqual(["1:9"]);
  });

  it("flags an arrow in a table cell and a heading", () => {
    const content = lines("## Z -> slant", "", "| a | b |", "| --- | --- |", "| c | d → e |");

    expect(positions(only(content, "emoji-arrow"))).toEqual(["1:6", "5:9"]);
  });

  it.each([
    "Copyright © and a trademark™ and ®.",
    "The 4-3 front, the 3-4 front, and 2019-2022.",
    "Compare 3 > 2 and 2 >= 1, and a >> b.",
    "Digits 1 2 3 # and * are not emoji.",
    "Quarterback’s arm: 6′2″ tall.",
    "A — B and a … ellipsis, • bullet, ½, ±.",
  ])("does not flag %j", (text) => {
    expect(only(`${text}\n`, "emoji-arrow")).toEqual([]);
  });

  it("does not look inside code, URLs or comments", () => {
    const content = lines(
      "`a -> b` and https://example.com/a->b and <!-- -> -->",
      "```",
      "x => y → z",
      "```",
    );

    expect(only(content, "emoji-arrow")).toEqual([]);
  });

  it("does not check the frontmatter", () => {
    expect(only(lines("---", "title: A -> B", "---", "", "Body."), "emoji-arrow")).toEqual([]);
  });
});
