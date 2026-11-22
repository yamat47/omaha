// What stands in the text of a block for code and for an address: neither a space nor a letter. A
// space would let "in `x` order to" read as the phrase "in order to", and nothing at all would
// let the sentence before a code span run into the one after it.
export const PLACEHOLDER = "\u25A1";

export interface Span {
  start: number;
  end: number;
}

const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

// A word is anything between spaces that holds a letter or a digit. Splitting on spaces instead of
// matching letter runs keeps 4-3, B.O.B. and don't whole, which is how a coach counts them.
export function wordSpans(text: string): Span[] {
  const spans: Span[] = [];
  for (const match of text.matchAll(/\S+/g)) {
    if (HAS_LETTER_OR_DIGIT.test(match[0])) {
      spans.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  return spans;
}

export function countWords(text: string): number {
  return wordSpans(text).length;
}

// A period, question mark or exclamation mark, with the closing marks that may follow it, and
// then a space and something a sentence can start with.
const BOUNDARY = /[.!?]+["'\u201D\u2019)\]]*(?=\s+["'\u201C\u2018([\p{Lu}\p{N}\u25A1])/gu;

// Words after which a period is not the end of a sentence. The list is short on purpose: a
// sentence split in the wrong place only gets shorter, while one that is not split can be
// reported as too long when it is not, and a wrong report stops a page from merging.
const ABBREVIATIONS = new Set(["e.g", "i.e", "vs", "mr", "mrs", "ms", "dr", "prof", "st", "mt"]);
const ABBREVIATIONS_BEFORE_A_NUMBER = new Set([
  "no",
  "jan",
  "feb",
  "mar",
  "apr",
  "jun",
  "jul",
  "aug",
  "sep",
  "sept",
  "oct",
  "nov",
  "dec",
]);

function continuesAfterPeriod(text: string, match: RegExpExecArray): boolean {
  const marks = /^[.!?]+/.exec(match[0])?.[0];
  if (marks !== ".") return false;
  const before = /(\S+)$/.exec(text.slice(0, match.index))?.[1] ?? "";
  const word = before.replace(/^["'\u201C\u2018([]+/, "").toLowerCase();
  if (ABBREVIATIONS.has(word)) return true;
  const next = text.slice(match.index + match[0].length).trimStart();
  return ABBREVIATIONS_BEFORE_A_NUMBER.has(word) && /^\d/.test(next);
}

export function splitSentences(text: string): Span[] {
  const spans: Span[] = [];
  let from = 0;
  const push = (end: number) => {
    const piece = text.slice(from, end);
    const lead = piece.length - piece.trimStart().length;
    const trimmed = piece.trim();
    if (trimmed !== "") spans.push({ start: from + lead, end: from + lead + trimmed.length });
    from = end;
  };
  for (const match of text.matchAll(BOUNDARY)) {
    if (continuesAfterPeriod(text, match)) continue;
    push(match.index + match[0].length);
  }
  push(text.length);
  return spans;
}

export interface QuoteSpan {
  start: number;
  end: number;
  inner: Span;
}

// Only double quotes count. A single quote mark is an apostrophe far more often than not
// (Mike's, the '90s, don't), and guessing which is which would flag lines that are fine.
export function findQuotes(text: string): QuoteSpan[] {
  const found: QuoteSpan[] = [];
  // An object, not a variable, so that the narrowing of the compiler survives the closure.
  const state: { open: { curly: boolean; at: number } | null } = { open: null };
  const close = (at: number, end: number) => {
    found.push({ start: at, end, inner: { start: at + 1, end: end - 1 } });
    state.open = null;
  };
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    const open = state.open;
    if (char === "\u201C") {
      state.open = { curly: true, at: i };
    } else if (char === "\u201D") {
      if (open?.curly) close(open.at, i + 1);
    } else if (char === '"') {
      const previous = text.charAt(i - 1);
      const next = text.charAt(i + 1);
      // 6'2" is a height, not a quotation.
      if (/\d/.test(previous) || open?.curly) continue;
      const followsOpener = previous === "" || /[\s([{\u2014\u2013-]/.test(previous);
      const canOpen = followsOpener && next !== "" && !/\s/.test(next);
      if (open && !followsOpener) {
        close(open.at, i + 1);
      } else if (canOpen) {
        // A second opening mark means the first one never closed.
        state.open = { curly: false, at: i };
      }
    }
  }
  return found;
}
