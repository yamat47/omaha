import { PAGE_TYPES, type PageType } from "./schema.ts";

/** What the site calls a type of page, and what the page of the type says of it. */
export const TYPE_INFO: Record<PageType, { label: string; blurb: string }> = {
  schemes: {
    label: "Schemes",
    blurb: "A scheme or a play, as the coaches who run it describe it.",
  },
  situations: {
    label: "Situations",
    blurb:
      "What to do about a front, a coverage, a formation or a concept, looked up from the problem.",
  },
  techniques: {
    label: "Techniques",
    blurb: "A technique or a drill, and how coaches teach it.",
  },
  terms: {
    label: "Terms",
    blurb: "The words of the game and what coaches mean by them.",
  },
};

export const TYPES = PAGE_TYPES.map((type) => ({ type, ...TYPE_INFO[type], href: `/${type}/` }));
