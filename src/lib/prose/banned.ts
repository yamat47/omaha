import type { BannedEntry } from "./types.ts";

export class BannedSyntaxError extends Error {
  line: number;

  constructor(line: number, message: string) {
    super(`banned.txt:${line}: ${message}`);
    this.name = "BannedSyntaxError";
    this.line = line;
  }
}

const WORD_CHAR = "[\\p{L}\\p{N}]";

function escapeLiteral(phrase: string): string {
  return phrase
    .split(/\s+/)
    .map((word) =>
      word
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        // A phrase is typed with a straight apostrophe, pages may carry a curly one.
        .replaceAll("'", "['\u2019]"),
    )
    .join("\\s+");
}

// A space in a regular expression has to match a line wrap as well, and an author cannot be
// asked to write \s+ in every expression. Escaped spaces and spaces in a class are left alone.
function allowWraps(source: string): string {
  let out = "";
  let inClass = false;
  for (let i = 0; i < source.length; i++) {
    const char = source.charAt(i);
    if (char === "\\") {
      out += char + source.charAt(i + 1);
      i++;
    } else if (char === "[") {
      inClass = true;
      out += char;
    } else if (char === "]") {
      inClass = false;
      out += char;
    } else if (char === " " && !inClass) {
      out += "\\s+";
    } else {
      out += char;
    }
  }
  return out;
}

function compile(source: string, line: number): RegExp {
  let pattern: RegExp;
  try {
    pattern = new RegExp(source, "giu");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BannedSyntaxError(line, `invalid regular expression: ${reason}`);
  }
  if (new RegExp(source, "iu").test("")) {
    throw new BannedSyntaxError(line, "the regular expression matches the empty string");
  }
  return pattern;
}

export function parseBanned(text: string): BannedEntry[] {
  const entries: BannedEntry[] = [];
  const lines = text.split(/\r?\n/);
  for (const [index, raw] of lines.entries()) {
    const line = index + 1;
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const arrow = trimmed.indexOf(" => ");
    let phrase = arrow === -1 ? trimmed : trimmed.slice(0, arrow).trim();
    let suggestion = arrow === -1 ? null : trimmed.slice(arrow + 4).trim();
    const isRegex = phrase.length >= 3 && phrase.startsWith("/") && /\/i?$/.test(phrase);

    if (!isRegex) {
      // A trailing comment is only safe on a literal phrase: a regular expression may hold a #.
      const comment = /\s#.*$/;
      phrase = phrase.replace(comment, "").trim();
      if (suggestion !== null) suggestion = suggestion.replace(comment, "").trim();
    }
    if (suggestion === "") suggestion = null;

    const source = isRegex
      ? allowWraps(phrase.slice(1).replace(/\/i?$/, ""))
      : `(?<!${WORD_CHAR})(?:${escapeLiteral(phrase)})(?!${WORD_CHAR})`;
    entries.push({ line, pattern: compile(source, line), suggestion });
  }
  return entries;
}
