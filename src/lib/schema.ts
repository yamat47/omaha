import { z } from "zod";

// A slug is part of a URL (/schemes/inside-zone/).
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const Slug = z.string().regex(SLUG_PATTERN, "lower-case letters, digits and hyphens");

/** The directories under content/. The type of a page is the one it is in. */
export const PAGE_TYPES = ["schemes", "situations", "techniques", "terms"] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const SIDES = ["offense", "defense", "special-teams", "game"] as const;
export type Side = (typeof SIDES)[number];

/** The parts of the game a page belongs to, in the order the lists show them. */
export const AREAS = [
  "run-game",
  "pass-game",
  "protection",
  "fronts",
  "pressure",
  "coverage",
  "special-teams",
  "game-planning",
  "teaching",
] as const;
export type Area = (typeof AREAS)[number];

export const AREA_LABELS: Record<Area, string> = {
  "run-game": "Run game",
  "pass-game": "Pass game",
  protection: "Protection",
  fronts: "Fronts",
  pressure: "Pressure",
  coverage: "Coverage",
  "special-teams": "Special teams",
  "game-planning": "Game planning",
  teaching: "Teaching",
};

export const SUMMARY_MAX_LENGTH = 200;

/**
 * Whether a summary reads as one sentence: it ends with a period and no other sentence ends
 * inside it. A word of at most three letters before a period (vs., etc.) is not taken for the
 * end of a sentence, so that "Cover 3 vs. Cover 2" passes.
 */
export function isOneSentence(text: string): boolean {
  if (!text.endsWith(".")) return false;
  return !/\b[A-Za-z]{4,}[.!?]\s+\S/.test(text);
}

const Summary = z
  .string()
  .trim()
  .min(1)
  .max(SUMMARY_MAX_LENGTH)
  .refine((text) => !text.includes("\n"), "one line")
  .refine(isOneSentence, "one sentence that ends with a period");

/** `<type>/<slug>`, the address of another page without its slashes. */
const PAGE_REF_PATTERN = new RegExp(`^(?:${PAGE_TYPES.join("|")})/[a-z0-9]+(?:-[a-z0-9]+)*$`);
const PageRef = z
  .string()
  .regex(PAGE_REF_PATTERN, "a page as <type>/<slug>, such as schemes/inside-zone");

const HttpsUrl = z.url().refine((value) => new URL(value).protocol === "https:", "an https URL");

/**
 * One address in one spelling, so that two entries that point at the same page are caught: the
 * host in lower case, no fragment, no trailing slash.
 */
export function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  return url.href.replace(/\/$/, "");
}

export const Source = z.strictObject({
  url: HttpsUrl,
  title: z.string().trim().min(1),
  /** The coach or writer whose view it is. */
  author: z.string().trim().min(1),
  publisher: z.string().trim().min(1).optional(),
});
export type Source = z.infer<typeof Source>;

export const Frontmatter = z.strictObject({
  title: z.string().trim().min(1),
  summary: Summary,
  side: z.enum(SIDES),
  area: z.enum(AREAS),
  sources: z
    .array(Source)
    .min(2, "at least two sources")
    .refine(
      (sources) =>
        new Set(sources.map((source) => normalizeUrl(source.url))).size === sources.length,
      "two sources share a URL",
    ),
  related: z
    .array(PageRef)
    .refine((refs) => new Set(refs).size === refs.length, "a page is listed twice")
    .optional(),
  /** What diagram the page needs. Recorded for later and shown nowhere. */
  diagram: z.string().trim().min(1).optional(),
  /** True on a page the owner has edited as a model of the prose. Shown nowhere. */
  exemplar: z.boolean().optional(),
  /** The day the page last changed in substance. */
  updated: z.iso.date(),
});
export type Frontmatter = z.infer<typeof Frontmatter>;
