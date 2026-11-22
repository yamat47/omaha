import type { Limits } from "./types.ts";

function positiveInteger(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`limits: ${name} must be a positive integer`);
  }
  return value;
}

export function parseLimits(value: unknown): Limits {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("limits: the file must hold a JSON object");
  }
  const record = value as Partial<Record<keyof Limits, unknown>>;
  const pageWords = record.pageWords;
  if (typeof pageWords !== "object" || pageWords === null || Array.isArray(pageWords)) {
    throw new Error("limits: pageWords must be an object");
  }
  const checked: Record<string, number> = {};
  for (const [type, words] of Object.entries(pageWords)) {
    checked[type] = positiveInteger(words, `pageWords.${type}`);
  }
  return {
    sentenceWords: positiveInteger(record.sentenceWords, "sentenceWords"),
    quoteWords: positiveInteger(record.quoteWords, "quoteWords"),
    boldPerParagraph: positiveInteger(record.boldPerParagraph, "boldPerParagraph"),
    pageWords: checked,
  };
}
