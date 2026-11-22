import { isScalar, parseDocument as parseYaml } from "yaml";
import { PLACEHOLDER } from "./text.ts";

// Why the document is read as layers of one string instead of being parsed into a tree: every
// layer has the length of the file, with what is not prose replaced by spaces. An offset in any
// layer is therefore the offset in the file, and a finding gets its line and column without a
// source map. A Markdown parser would also have to be kept in step with what the rules count as
// prose, which is a narrower thing than what Markdown calls text.

export type BlockKind = "paragraph" | "item" | "heading" | "cell" | "meta";

export interface Block {
  kind: BlockKind;
  start: number;
  end: number;
  // The block with code, URLs, link destinations, comments and HTML tags blanked out. Bold and
  // italic markers are still there: the rules about bold and labels need them.
  text: string;
  // The same, with the markers of emphasis and links blanked too, so that a phrase split by
  // **bold** or [a link](url) is still one phrase, and so that words can be counted.
  plain: string;
  hasLink: boolean;
}

export interface QuoteRun {
  offset: number;
  excerpt: string;
}

export interface ImageHit {
  offset: number;
  excerpt: string;
}

export interface FrontmatterError {
  offset: number;
  line: number | null;
  excerpt: string;
  message: string;
}

export interface ParsedDocument {
  frontmatterError: FrontmatterError | null;
  blocks: Block[];
  quoteRuns: QuoteRun[];
  imageHits: ImageHit[];
  locate: (offset: number) => { line: number; column: number };
}

interface Layers {
  // Code is "x" here, so that a line made of a code span is still a line of text. Fenced code
  // and comments are blank.
  shape: string;
  text: string;
  plain: string;
  links: number[];
}

type Range = [number, number];

function blank(chars: string[], from: number, to: number, fill = " "): void {
  for (let i = from; i < to && i < chars.length; i++) {
    if (chars[i] !== "\n") chars[i] = fill;
  }
}

function blankFences(source: string, layers: string[][]): void {
  let position = 0;
  let fence: { char: string; length: number } | null = null;
  for (const line of source.split("\n")) {
    const end = position + line.length;
    if (fence) {
      const closing = /^\s*(`{3,}|~{3,})\s*$/.exec(line)?.[1];
      if (closing?.startsWith(fence.char) && closing.length >= fence.length) fence = null;
      for (const chars of layers) blank(chars, position, end);
    } else {
      const opening = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
      const marks = opening?.[1] ?? "";
      // The info string of a backtick fence cannot hold a backtick: ```x``` is a code span.
      if (opening && !(marks.startsWith("`") && (opening[2] ?? "").includes("`"))) {
        fence = { char: marks.charAt(0), length: marks.length };
        for (const chars of layers) blank(chars, position, end);
      }
    }
    position = end + 1;
  }
}

function findClosingRun(source: string, from: number, length: number): number {
  let position = from;
  while (position < source.length) {
    const found = source.indexOf("`", position);
    if (found === -1) return -1;
    let run = 1;
    while (source.charAt(found + run) === "`") run++;
    if (run === length) return found;
    position = found + run;
  }
  return -1;
}

const BLANK_LINE_BETWEEN = /\n[ \t]*\n/;

function blankCodeAndComments(source: string, shape: string[], text: string[]): void {
  let i = 0;
  while (i < source.length) {
    const char = source.charAt(i);
    if (char === "\\") {
      i += 2;
    } else if (char === "<" && source.startsWith("<!--", i)) {
      const close = source.indexOf("-->", i + 4);
      const stop = close === -1 ? source.length : close + 3;
      blank(shape, i, stop);
      blank(text, i, stop);
      i = stop;
    } else if (char === "`") {
      let run = 1;
      while (source.charAt(i + run) === "`") run++;
      const close = findClosingRun(source, i + run, run);
      const stop = close + run;
      if (close === -1 || BLANK_LINE_BETWEEN.test(source.slice(i, stop))) {
        i += run;
      } else {
        blank(shape, i, stop, "x");
        blank(text, i, stop, PLACEHOLDER);
        i = stop;
      }
    } else {
      i++;
    }
  }
}

// The end of a link destination, which may hold balanced parentheses (a Wikipedia address).
function findDestinationEnd(source: string, from: number): number {
  let depth = 1;
  for (let i = from; i < source.length && i < from + 2000; i++) {
    const char = source.charAt(i);
    if (char === "\\") {
      i++;
    } else if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth--;
      if (depth === 0) return i;
    } else if (char === "\n" && BLANK_LINE_BETWEEN.test(source.slice(i, i + 80))) {
      return -1;
    }
  }
  return -1;
}

function findOpenBracket(source: string, closeAt: number): number {
  let depth = 0;
  for (let i = closeAt - 1; i >= 0 && i > closeAt - 600; i--) {
    const char = source.charAt(i);
    if (char === "]") {
      depth++;
    } else if (char === "[") {
      if (depth === 0) {
        return BLANK_LINE_BETWEEN.test(source.slice(i, closeAt)) ? -1 : i;
      }
      depth--;
    }
  }
  return -1;
}

const REFERENCE_DEFINITION =
  /^[ \t]{0,3}\[(?!\^)[^\]\n]+\]:[ \t]*\S+(?:[ \t]+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?[ \t]*$/gm;

function maskLinks(shape: string[], text: string[]): { syntax: Range[]; links: number[] } {
  const syntax: Range[] = [];
  const links: number[] = [];

  const definitions = text.join("");
  for (const match of definitions.matchAll(REFERENCE_DEFINITION)) {
    blank(shape, match.index, match.index + match[0].length);
    blank(text, match.index, match.index + match[0].length);
  }

  const source = text.join("");
  let from = 0;
  for (;;) {
    const at = source.indexOf("](", from);
    if (at === -1) break;
    const close = findDestinationEnd(source, at + 2);
    const open = close === -1 ? -1 : findOpenBracket(source, at);
    if (open === -1) {
      from = at + 2;
      continue;
    }
    const isImage = source.charAt(open - 1) === "!";
    blank(text, at + 2, close);
    syntax.push([isImage ? open - 1 : open, open + 1], [at, close + 1]);
    if (!isImage) links.push(open);
    from = close + 1;
  }

  for (const match of source.matchAll(/\]\[([^\]\n]*)\]/g)) {
    const open = findOpenBracket(source, match.index);
    if (open === -1) continue;
    blank(text, match.index + 2, match.index + 2 + (match[1] ?? "").length);
    syntax.push([open, open + 1], [match.index, match.index + match[0].length]);
    if (source.charAt(open - 1) !== "!") links.push(open);
  }

  for (const match of source.matchAll(/<(?:https?:\/\/|mailto:)[^>\s]*>/g)) {
    blank(text, match.index, match.index + match[0].length, PLACEHOLDER);
    links.push(match.index);
  }

  const rest = text.join("");
  for (const match of rest.matchAll(/(?:https?:\/\/|www\.)[^\s<>]+/g)) {
    let url = match[0].replace(/[.,;:!?"'\u201D\u2019]+$/, "");
    // A closing parenthesis belongs to the address only if the address opened one.
    while (url.endsWith(")") && url.split(")").length > url.split("(").length) {
      url = url.slice(0, -1);
    }
    blank(text, match.index, match.index + url.length, PLACEHOLDER);
    links.push(match.index);
  }

  const afterUrls = text.join("");
  for (const match of afterUrls.matchAll(/<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?>/g)) {
    blank(text, match.index, match.index + match[0].length);
  }
  return { syntax, links };
}

function spaces(match: string): string {
  return " ".repeat(match.length);
}

function maskLayers(source: string): Layers {
  const shape = source.replaceAll("\r", " ").split("");
  const text = [...shape];
  blankFences(source, [shape, text]);
  blankCodeAndComments(shape.join(""), shape, text);
  const { syntax, links } = maskLinks(shape, text);

  const plain = [...text];
  for (const [from, to] of syntax) blank(plain, from, to);
  const emphasis = plain
    .join("")
    .replace(/\\(?=[!-/:-@[-`{-~])/g, " ")
    .replace(/\*+|~~+/g, spaces)
    .replace(/(?<![\p{L}\p{N}])_+|_+(?![\p{L}\p{N}])/gu, spaces);
  return { shape: shape.join(""), text: text.join(""), plain: emphasis, links };
}

interface Frontmatter {
  innerStart: number;
  innerEnd: number;
  end: number;
}

function findFrontmatter(content: string): Frontmatter | null {
  const first = /^\uFEFF?---[ \t]*\r?\n/.exec(content);
  if (!first) return null;
  let position = first[0].length;
  while (position <= content.length) {
    let eol = content.indexOf("\n", position);
    if (eol === -1) eol = content.length;
    if (/^(?:---|\.\.\.)[ \t]*$/.test(content.slice(position, eol).replace(/\r$/, ""))) {
      return { innerStart: first[0].length, innerEnd: position, end: eol };
    }
    if (eol >= content.length) return null;
    position = eol + 1;
  }
  return null;
}

function blankOutside(content: string, from: number, to: number): string {
  return (
    content.slice(0, from).replace(/[^\n]/g, " ") +
    content.slice(from, to) +
    content.slice(to).replace(/[^\n]/g, " ")
  );
}

// The title and the summary are checked as prose; the rest of the frontmatter is data. The
// scalar is read from the YAML for its position only: a quoted or folded scalar has marks that
// are not prose, and those are blanked so a column still points at the right character.
function metaBlocks(
  content: string,
  frontmatter: Frontmatter,
): { blocks: Block[]; error: FrontmatterError | null } {
  const inner = content.slice(frontmatter.innerStart, frontmatter.innerEnd);
  const document = parseYaml(inner);
  const [problem] = document.errors;
  if (problem) {
    // The parser counts lines from the first line after the opening ---, and its message repeats
    // that position and a code frame, which a one-line finding has no room for.
    const first = (problem.message.split("\n")[0] ?? "").replace(/ at line \d+, column \d+:?$/, "");
    const relative = problem.linePos?.[0]?.line ?? null;
    const line = relative === null ? null : relative + 1;
    const where = line === null ? "" : ` (line ${line})`;
    return {
      blocks: [],
      error: {
        offset: content.startsWith("\uFEFF") ? 1 : 0,
        line,
        excerpt: relative === null ? "---" : (inner.split("\n")[relative - 1] ?? "---"),
        message: `The frontmatter is not valid YAML: ${first.replace(/\.$/, "")}${where}.`,
      },
    };
  }
  const blocks: Block[] = [];
  for (const key of ["title", "summary"]) {
    const node = document.get(key, true);
    if (!isScalar(node) || typeof node.value !== "string" || !node.range) continue;
    const start = frontmatter.innerStart + node.range[0];
    const end = frontmatter.innerStart + node.range[1];
    const chars = [...blankOutside(content, start, end)];
    if (node.type === "QUOTE_DOUBLE" || node.type === "QUOTE_SINGLE") {
      blank(chars, start, start + 1);
      blank(chars, end - 1, end);
    } else if (node.type === "BLOCK_FOLDED" || node.type === "BLOCK_LITERAL") {
      const headerEnd = content.indexOf("\n", start);
      blank(chars, start, headerEnd === -1 ? end : headerEnd);
    }
    const layers = maskLayers(chars.join(""));
    const text = layers.text.slice(start, end);
    if (text.trim() === "") continue;
    blocks.push({
      kind: "meta",
      start,
      end,
      text,
      plain: layers.plain.slice(start, end),
      hasLink: false,
    });
  }
  return { blocks, error: null };
}

function makeLocator(content: string): ParsedDocument["locate"] {
  const starts = [content.startsWith("\uFEFF") ? 1 : 0];
  for (let i = 0; i < content.length; i++) {
    if (content.charAt(i) === "\n") starts.push(i + 1);
  }
  return (offset) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if ((starts[middle] ?? 0) <= offset) low = middle;
      else high = middle - 1;
    }
    const lineStart = starts[low] ?? 0;
    return { line: low + 1, column: Array.from(content.slice(lineStart, offset)).length + 1 };
  };
}

const THEMATIC_BREAK = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const SETEXT_UNDERLINE = /^ {0,3}(?:=+|-{2,})[ \t]*$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;
const LIST_ITEM = /^[ \t]*(?:[-+*]|(\d{1,9})[.)])(?:[ \t]+|$)/;
const ATX_HEADING = /^ {0,3}#{1,6}(?:[ \t]+|$)/;

interface Pending {
  kind: "paragraph" | "item" | "table";
  start: number;
  end: number;
  rows: Range[];
}

interface Line {
  start: number;
  shape: string;
}

function buildBlocks(layers: Layers, source: string): { blocks: Block[]; quoteRuns: QuoteRun[] } {
  const blocks: Block[] = [];
  const quoteRuns: QuoteRun[] = [];
  let pending: Pending | null = null;

  const emit = (kind: BlockKind, start: number, end: number) => {
    const text = layers.text.slice(start, end);
    if (text.trim() === "") return;
    blocks.push({
      kind,
      start,
      end,
      text,
      plain: layers.plain.slice(start, end),
      hasLink: layers.links.some((at) => at >= start && at < end),
    });
  };

  const cellsOf = (from: number, to: number) => {
    const row = layers.text.slice(from, to);
    let cellStart = 0;
    for (let i = 0; i <= row.length; i++) {
      if (i < row.length && !(row.charAt(i) === "|" && row.charAt(i - 1) !== "\\")) continue;
      const cell = row.slice(cellStart, i);
      const lead = cell.length - cell.trimStart().length;
      const trimmed = cell.trim();
      if (trimmed !== "")
        emit("cell", from + cellStart + lead, from + cellStart + lead + trimmed.length);
      cellStart = i + 1;
    }
  };

  const flush = () => {
    if (!pending) return;
    if (pending.kind === "table") {
      for (const [from, to] of pending.rows) cellsOf(from, to);
    } else {
      emit(pending.kind, pending.start, pending.end);
    }
    pending = null;
  };

  const lineEnd = (line: Line) => line.start + line.shape.trimEnd().length;
  const contentStart = (line: Line) =>
    line.start + line.shape.length - line.shape.trimStart().length;

  const lines: Line[] = [];
  let offset = 0;
  for (const shape of layers.shape.split("\n")) {
    lines.push({ start: offset, shape });
    offset += shape.length + 1;
  }

  let lastQuoteLine = -2;
  for (const [index, line] of lines.entries()) {
    const shape = line.shape;
    if (shape.trim() === "") {
      flush();
      continue;
    }
    const open = pending as Pending | null;

    if (open?.kind === "paragraph" && SETEXT_UNDERLINE.test(shape)) {
      emit("heading", open.start, open.end);
      pending = null;
      continue;
    }
    if (THEMATIC_BREAK.test(shape)) {
      flush();
      continue;
    }
    const heading = ATX_HEADING.exec(shape);
    if (heading) {
      flush();
      let end = shape.trimEnd().length;
      end -= /[ \t]+#+$/.exec(shape.slice(0, end))?.[0].length ?? 0;
      if (end > heading[0].length)
        emit("heading", line.start + heading[0].length, line.start + end);
      continue;
    }
    // CommonMark lets a > line interrupt a paragraph, so "> 40 yards" at the start of a wrapped
    // line would open a quotation. The check is narrower on purpose: a finding stops a page from
    // merging, and a writer who means a block quote puts a blank line before it.
    const startsBlock =
      index === 0 || (lines[index - 1]?.shape.trim() ?? "") === "" || lastQuoteLine === index - 1;
    if (shape.trimStart().startsWith(">") && startsBlock) {
      flush();
      if (lastQuoteLine !== index - 1) {
        const at = line.start + shape.indexOf(">");
        quoteRuns.push({
          offset: at,
          excerpt: source.slice(at, line.start + shape.trimEnd().length),
        });
      }
      lastQuoteLine = index;
      continue;
    }

    const isSeparator = shape.includes("|") && TABLE_SEPARATOR.test(shape);
    if (open?.kind === "table" && isSeparator) continue;
    if (open?.kind === "paragraph" && isSeparator) {
      // A table with no leading pipe: the paragraph line just above is its header row.
      const last = open.rows[open.rows.length - 1];
      if (last && layers.shape.slice(last[0], last[1]).includes("|")) {
        open.rows.pop();
        const before = open.rows[open.rows.length - 1];
        if (before) {
          open.end = before[1];
          flush();
        } else {
          pending = null;
        }
        pending = { kind: "table", start: last[0], end: last[1], rows: [last] };
        continue;
      }
    }

    const marker = LIST_ITEM.exec(shape);
    // Only a list that starts at 1 may interrupt a paragraph, so a wrapped line that happens to
    // begin with "2019. " stays in its paragraph.
    const interrupts = open?.kind !== "paragraph" || marker?.[1] === undefined || marker[1] === "1";
    if (marker && interrupts) {
      flush();
      pending = {
        kind: "item",
        start: line.start + marker[0].length,
        end: lineEnd(line),
        rows: [],
      };
      pending.rows.push([line.start + marker[0].length, lineEnd(line)]);
      continue;
    }
    if (shape.trimStart().startsWith("|")) {
      if (open?.kind === "table") {
        open.rows.push([contentStart(line), lineEnd(line)]);
      } else {
        flush();
        pending = {
          kind: "table",
          start: contentStart(line),
          end: lineEnd(line),
          rows: [[contentStart(line), lineEnd(line)]],
        };
      }
      continue;
    }
    if (open?.kind === "table") {
      if (shape.includes("|")) {
        open.rows.push([contentStart(line), lineEnd(line)]);
        continue;
      }
      flush();
    }
    const current = pending as Pending | null;
    if (current) {
      current.end = lineEnd(line);
      current.rows.push([contentStart(line), lineEnd(line)]);
    } else {
      pending = {
        kind: "paragraph",
        start: contentStart(line),
        end: lineEnd(line),
        rows: [[contentStart(line), lineEnd(line)]],
      };
    }
  }
  flush();
  return { blocks, quoteRuns };
}

const IMAGE = /!\[[^\]]*\](?:\([^)]*\)|\[[^\]]*\])|<(?:img|figure|svg)\b/gi;

export function parseDocument(content: string): ParsedDocument {
  const frontmatter = findFrontmatter(content);
  const body = frontmatter
    ? content.slice(0, frontmatter.end).replace(/[^\n]/g, " ") + content.slice(frontmatter.end)
    : content;
  const meta = frontmatter ? metaBlocks(content, frontmatter) : { blocks: [], error: null };
  const layers = maskLayers(body);
  const { blocks, quoteRuns } = buildBlocks(layers, content);
  const imageHits: ImageHit[] = [];
  for (const match of layers.shape.matchAll(IMAGE)) {
    imageHits.push({ offset: match.index, excerpt: match[0] });
  }
  return {
    frontmatterError: meta.error,
    blocks: [...meta.blocks, ...blocks],
    quoteRuns,
    imageHits,
    locate: makeLocator(content),
  };
}
