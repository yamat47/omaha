import type { Block, ParsedDocument } from "./markdown.ts";
import { countWords, findQuotes, splitSentences, wordSpans } from "./text.ts";
import type { BannedEntry, Finding, Limits, Profile, RuleId } from "./types.ts";

export interface Context {
  file: string;
  doc: ParsedDocument;
  profile: Profile;
  limits: Limits;
  banned: BannedEntry[];
}

const EXCERPT_LENGTH = 70;

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function clip(text: string): string {
  const line = oneLine(text);
  return line.length > EXCERPT_LENGTH ? `${line.slice(0, EXCERPT_LENGTH - 1)}\u2026` : line;
}

// A mark such as a dash says little alone, so the excerpt carries the words around it.
function around(text: string, start: number, end: number): string {
  return text.slice(Math.max(0, start - 14), Math.min(text.length, end + 14));
}

function report(
  context: Context,
  rule: RuleId,
  offset: number,
  excerpt: string,
  message: string,
): Finding {
  const { line, column } = context.doc.locate(offset);
  return { rule, file: context.file, line, column, excerpt: clip(excerpt), message };
}

function proseBlocks(context: Context, kinds: Block["kind"][]): Block[] {
  return context.doc.blocks.filter((block) => kinds.includes(block.kind));
}

// Besides the characters, the HTML entities that print them: a page is Markdown, and &mdash; shows
// as an em dash. The horizontal bar and the two- and three-em dashes are em dashes in all but name.
const EM_DASH = /\u2014|\u2015|\u2E3A|\u2E3B|\uFE58|&mdash;|&#8212;|&#x2014;/i;
const EN_DASH = /\u2013|&ndash;|&#8211;|&#x2013;/i;
const DASH = new RegExp(
  `${EM_DASH.source}|${EN_DASH.source}|(?<!\\S)--(?!\\S)|(?<=[\\p{L}\\p{N}])--(?=[\\p{L}\\p{N}])`,
  "giu",
);

export function checkDash(context: Context): Finding[] {
  const found: Finding[] = [];
  for (const block of context.doc.blocks) {
    for (const match of block.text.matchAll(DASH)) {
      const at = match.index;
      const mark = match[0];
      const end = at + mark.length;
      const isEn = EN_DASH.test(mark);
      if (isEn && /\d/.test(block.text.charAt(at - 1)) && /\d/.test(block.text.charAt(end)))
        continue;
      const message = isEn
        ? 'Write a hyphen, or "to" for a range; an en dash is only for numbers such as 2019\u20132022.'
        : EM_DASH.test(mark)
          ? "Replace the em dash with a period, a comma, a colon or parentheses, or reword."
          : "Replace the double hyphen with a period, a comma, a colon or parentheses, or reword.";
      found.push(report(context, "dash", block.start + at, around(block.text, at, end), message));
    }
  }
  return found;
}

function bannedMessage(match: string, suggestion: string | null): string {
  const shown = oneLine(match);
  return suggestion === null
    ? `Cut "${shown}" or say plainly what happens.`
    : `Say "${suggestion}" instead of "${shown}".`;
}

export function checkBanned(context: Context): Finding[] {
  const found: Finding[] = [];
  for (const block of context.doc.blocks) {
    // A quotation is someone else's wording, which the page may not change.
    const quotes = findQuotes(block.plain);
    const hits: Array<{ start: number; end: number; entry: BannedEntry }> = [];
    for (const entry of context.banned) {
      for (const match of block.plain.matchAll(entry.pattern)) {
        if (match[0] === "") continue;
        if (quotes.some((quote) => match.index >= quote.start && match.index < quote.end)) continue;
        hits.push({ start: match.index, end: match.index + match[0].length, entry });
      }
    }
    hits.sort((a, b) => a.start - b.start || b.end - a.end);
    // "a testament to" is in the list twice over; one report is enough.
    let reachedTo = -1;
    for (const hit of hits) {
      if (hit.start < reachedTo) continue;
      reachedTo = hit.end;
      const text = block.plain.slice(hit.start, hit.end);
      found.push(
        report(
          context,
          "banned",
          block.start + hit.start,
          text,
          bannedMessage(text, hit.entry.suggestion),
        ),
      );
    }
  }
  return found;
}

// A bold or italic opening, its label, then a colon or a dash: either right after the closing
// mark, or as the last character inside it (**Label:**).
const LABEL =
  /^(?:\*\*(?=\S)([^*\n]*?\S)\*\*|__(?=\S)([^_\n]*?\S)__(?![\p{L}\p{N}_])|\*(?=[^\s*])([^*\n]*?\S)\*|_(?=[^\s_])([^_\n]*?\S)_(?![\p{L}\p{N}_]))/u;

export function checkLabelledBullet(context: Context): Finding[] {
  const found: Finding[] = [];
  for (const block of proseBlocks(context, ["item"])) {
    const match = LABEL.exec(block.text);
    if (!match) continue;
    const label = match[1] ?? match[2] ?? match[3] ?? match[4] ?? "";
    const rest = block.text.slice(match[0].length);
    const separator = /^[ \t]*(?::|--?|\u2013|\u2014)(?=\s|$)/.exec(rest)?.[0] ?? "";
    const colonInside = /:$/.test(label) && (rest === "" || /^\s/.test(rest));
    if (separator === "" && !colonInside) continue;
    found.push(
      report(
        context,
        "labelled-bullet",
        block.start,
        block.text.slice(0, match[0].length + separator.length),
        "Write the item as a sentence that starts with its subject; no bold or italic label.",
      ),
    );
  }
  return found;
}

export function checkSentenceLength(context: Context): Finding[] {
  const found: Finding[] = [];
  const limit = context.limits.sentenceWords;
  for (const block of proseBlocks(context, ["paragraph", "item"])) {
    for (const sentence of splitSentences(block.plain)) {
      const words = countWords(block.plain.slice(sentence.start, sentence.end));
      if (words <= limit) continue;
      found.push(
        report(
          context,
          "sentence-length",
          block.start + sentence.start,
          block.plain.slice(sentence.start, sentence.end),
          `The sentence has ${words} words (limit ${limit}); split it in two.`,
        ),
      );
    }
  }
  return found;
}

export function checkBlockQuote(context: Context): Finding[] {
  return context.doc.quoteRuns.map((run) =>
    report(
      context,
      "block-quote",
      run.offset,
      run.excerpt,
      "Paraphrase it in your own words; a block quotation is not allowed.",
    ),
  );
}

// Three words or fewer is a term in quotation marks, not a quotation.
const TERM_WORDS = 3;

export function checkQuoteLength(context: Context): Finding[] {
  const found: Finding[] = [];
  const kinds: Block["kind"][] = ["paragraph", "item", "heading"];
  // A note exists to be checked against quotation, so its tables are read as well.
  if (context.profile === "note") kinds.push("cell");
  for (const block of proseBlocks(context, kinds)) {
    for (const quote of findQuotes(block.plain)) {
      const inner = block.plain.slice(quote.inner.start, quote.inner.end);
      const words = countWords(inner);
      if (words <= TERM_WORDS) continue;
      const sentences = splitSentences(inner).length;
      if (words <= context.limits.quoteWords && sentences <= 1) continue;
      const reason =
        words > context.limits.quoteWords
          ? `has ${words} words (limit ${context.limits.quoteWords})`
          : `holds ${sentences} sentences`;
      found.push(
        report(
          context,
          "quote-length",
          block.start + quote.start,
          block.plain.slice(quote.start, quote.end),
          `The quotation ${reason}; keep one sentence or less, or paraphrase it.`,
        ),
      );
    }
  }
  return found;
}

export function checkQuoteSource(context: Context): Finding[] {
  const found: Finding[] = [];
  for (const block of proseBlocks(context, ["paragraph", "item"])) {
    if (block.hasLink) continue;
    const quote = findQuotes(block.plain).find(
      (candidate) =>
        countWords(block.plain.slice(candidate.inner.start, candidate.inner.end)) > TERM_WORDS,
    );
    if (!quote) continue;
    found.push(
      report(
        context,
        "quote-source",
        block.start + quote.start,
        block.plain.slice(quote.start, quote.end),
        "Link the source of the quotation in the same paragraph.",
      ),
    );
  }
  return found;
}

// The arrows block, the long and supplemental arrows, then emoji. The copyright, registered and
// trademark signs are pictographs to Unicode but are ordinary text.
const ARROW = /[\u2190-\u21FF\u27F0-\u27FF\u2900-\u297F]|->|=>|&(?:[lrud]arr|[lrudh]Arr|harr);/;
const EMOJI_OR_ARROW = new RegExp(
  `${ARROW.source}|(?:(?![\\u00A9\\u00AE\\u2122])\\p{Extended_Pictographic}|\\p{Emoji_Presentation})(?:[\\uFE0F\\u20E3\\p{Emoji_Modifier}]|\\u200D(?:(?![\\u00A9\\u00AE\\u2122])\\p{Extended_Pictographic}|\\p{Emoji_Presentation}))*`,
  "gu",
);

export function checkEmojiArrow(context: Context): Finding[] {
  const found: Finding[] = [];
  for (const block of context.doc.blocks) {
    if (block.kind === "meta") continue;
    for (const match of block.text.matchAll(EMOJI_OR_ARROW)) {
      const isEmoji = !new RegExp(`^(?:${ARROW.source})$`, "u").test(match[0]);
      found.push(
        report(
          context,
          "emoji-arrow",
          block.start + match.index,
          around(block.text, match.index, match.index + match[0].length),
          isEmoji
            ? "Remove the emoji."
            : 'Write the direction out ("then", "to", "leads to") instead of an arrow.',
        ),
      );
    }
  }
  return found;
}

export function checkImage(context: Context): Finding[] {
  return context.doc.imageHits.map((hit) =>
    report(
      context,
      "image",
      hit.offset,
      hit.excerpt,
      "Remove the image; describe what it shows in words.",
    ),
  );
}

const BOLD =
  /\*\*(?=\S)(?:(?!\*\*)[\s\S])+?(?<=\S)\*\*|(?<![\p{L}\p{N}_])__(?=\S)(?:(?!__)[\s\S])+?(?<=\S)__(?![\p{L}\p{N}_])/gu;

export function checkBoldDensity(context: Context): Finding[] {
  const found: Finding[] = [];
  const limit = context.limits.boldPerParagraph;
  for (const block of proseBlocks(context, ["paragraph", "item"])) {
    const spans = [...block.text.matchAll(BOLD)];
    const over = spans[limit];
    if (!over) continue;
    found.push(
      report(
        context,
        "bold-density",
        block.start + over.index,
        over[0],
        `${spans.length} bold spans in one paragraph (limit ${limit}); bold only the term being defined.`,
      ),
    );
  }
  return found;
}

const STOCK_HEADINGS = new Set([
  "overview",
  "introduction",
  "summary",
  "conclusion",
  "conclusions",
  "key takeaways",
  "takeaways",
  "final thoughts",
  "background",
]);

export function checkStockHeading(context: Context): Finding[] {
  const found: Finding[] = [];
  for (const block of proseBlocks(context, ["heading"])) {
    const title = oneLine(block.plain).replace(/[:.]$/, "").toLowerCase();
    if (!STOCK_HEADINGS.has(title)) continue;
    found.push(
      report(
        context,
        "stock-heading",
        block.start,
        block.plain,
        "Name the heading after what the section says, not after its place in the page.",
      ),
    );
  }
  return found;
}

// The directory name is the page type. A name such as "constructor" must not find a property of
// the object, hence hasOwn.
export function pageType(file: string): string | null {
  const parts = file.replaceAll("\\", "/").split("/");
  return parts.length >= 2 ? (parts[parts.length - 2] ?? null) : null;
}

export function checkPageLength(context: Context): Finding[] {
  const type = pageType(context.file);
  if (type === null || !Object.hasOwn(context.limits.pageWords, type)) return [];
  const limit = context.limits.pageWords[type] ?? 0;
  const blocks = proseBlocks(context, ["paragraph", "item", "cell"]);
  const total = blocks.reduce((sum, block) => sum + countWords(block.plain), 0);
  if (total <= limit) return [];

  let seen = 0;
  for (const block of blocks) {
    for (const word of wordSpans(block.plain)) {
      seen++;
      if (seen <= limit) continue;
      return [
        report(
          context,
          "page-length",
          block.start + word.start,
          block.plain.slice(word.start, word.end),
          `The page has ${total} words (limit ${limit} for ${type}); cut ${total - limit} or move some to another page.`,
        ),
      ];
    }
  }
  return [];
}

export function checkFrontmatter(context: Context): Finding[] {
  const error = context.doc.frontmatterError;
  return error ? [report(context, "frontmatter", error.offset, error.excerpt, error.message)] : [];
}

export const CHECKS: Record<RuleId, (context: Context) => Finding[]> = {
  dash: checkDash,
  banned: checkBanned,
  "labelled-bullet": checkLabelledBullet,
  "sentence-length": checkSentenceLength,
  "block-quote": checkBlockQuote,
  "quote-length": checkQuoteLength,
  "quote-source": checkQuoteSource,
  "emoji-arrow": checkEmojiArrow,
  image: checkImage,
  "bold-density": checkBoldDensity,
  "stock-heading": checkStockHeading,
  "page-length": checkPageLength,
  frontmatter: checkFrontmatter,
};
