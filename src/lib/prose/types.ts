export const RULES = [
  "dash",
  "banned",
  "labelled-bullet",
  "sentence-length",
  "block-quote",
  "quote-length",
  "quote-source",
  "emoji-arrow",
  "image",
  "bold-density",
  "stock-heading",
  "page-length",
  "frontmatter",
] as const;

export type RuleId = (typeof RULES)[number];

export type Profile = "page" | "note";

export interface Finding {
  rule: RuleId;
  file: string;
  line: number;
  column: number;
  excerpt: string;
  message: string;
}

export interface Limits {
  sentenceWords: number;
  quoteWords: number;
  boldPerParagraph: number;
  pageWords: Record<string, number>;
}

export interface BannedEntry {
  // The line of banned.txt the entry comes from, so a message can point back at it.
  line: number;
  pattern: RegExp;
  suggestion: string | null;
}
