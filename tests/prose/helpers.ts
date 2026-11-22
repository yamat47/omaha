import { readFileSync } from "node:fs";
import { parseBanned } from "../../src/lib/prose/banned.ts";
import { checkDocument } from "../../src/lib/prose/check.ts";
import { parseLimits } from "../../src/lib/prose/limits.ts";
import type { Finding, Profile, RuleId } from "../../src/lib/prose/types.ts";

function styleFile(name: string): string {
  return readFileSync(new URL(`../../style/${name}`, import.meta.url), "utf8");
}

// The tests run against the real rule data, so a change to banned.txt that breaks a football
// phrase is caught here and not by a page that fails to merge.
export const banned = parseBanned(styleFile("banned.txt"));
export const limits = parseLimits(JSON.parse(styleFile("limits.json")));

export function check(
  content: string,
  file = "content/techniques/page.md",
  profile?: Profile,
): Finding[] {
  const input = { file, content, banned, limits };
  return checkDocument(profile === undefined ? input : { ...input, profile });
}

export function lines(...rows: string[]): string {
  return `${rows.join("\n")}\n`;
}

export function ruleIds(findings: Finding[]): RuleId[] {
  return findings.map((finding) => finding.rule);
}

export function only(content: string, rule: RuleId, file?: string, profile?: Profile): Finding[] {
  return check(content, file, profile).filter((finding) => finding.rule === rule);
}

export function positions(findings: Finding[]): string[] {
  return findings.map((finding) => `${finding.line}:${finding.column}`);
}
