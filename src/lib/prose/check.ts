import { parseDocument } from "./markdown.ts";
import { CHECKS } from "./rules.ts";
import type { BannedEntry, Finding, Limits, Profile, RuleId } from "./types.ts";
import { RULES } from "./types.ts";

// A note on a source is a list of points. What it must not do is carry the source's text or
// figures, so the style rules that shape a page's prose do not apply to it.
const NOTE_RULES: readonly RuleId[] = ["block-quote", "quote-length", "image", "frontmatter"];

export function profileForPath(file: string): Profile {
  const parts = file.replaceAll("\\", "/").split("/");
  for (let i = 0; i + 1 < parts.length; i++) {
    if (parts[i] === "sources" && parts[i + 1] === "notes") return "note";
  }
  return "page";
}

export interface CheckInput {
  file: string;
  content: string;
  banned: BannedEntry[];
  limits: Limits;
  profile?: Profile;
}

function compareFindings(a: Finding, b: Finding): number {
  return (
    a.line - b.line ||
    a.column - b.column ||
    (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0) ||
    (a.excerpt < b.excerpt ? -1 : a.excerpt > b.excerpt ? 1 : 0)
  );
}

export function checkDocument(input: CheckInput): Finding[] {
  const profile = input.profile ?? profileForPath(input.file);
  const context = {
    file: input.file,
    doc: parseDocument(input.content),
    profile,
    limits: input.limits,
    banned: input.banned,
  };
  const rules = profile === "note" ? NOTE_RULES : RULES;
  return rules.flatMap((rule) => CHECKS[rule](context)).sort(compareFindings);
}
