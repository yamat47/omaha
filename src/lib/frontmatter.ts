import { parse } from "yaml";

export type Split = { ok: true; data: unknown; body: string } | { ok: false; problem: string };

const FENCE = /^---[ \t]*$/;

/**
 * Cuts a Markdown file into its YAML frontmatter and its body.
 *
 * The YAML is read with the library's default schema, which leaves `2026-11-22` a string. A
 * loader that read dates as dates would hand the schema a `Date` where the validation script
 * hands it text, and one schema could not serve both.
 */
export function splitFrontmatter(text: string): Split {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  if (!FENCE.test(lines[0] ?? ""))
    return { ok: false, problem: "the file does not start with ---" };

  const end = lines.findIndex((line, index) => index > 0 && FENCE.test(line));
  if (end === -1) return { ok: false, problem: "the frontmatter has no closing ---" };

  try {
    const data: unknown = parse(lines.slice(1, end).join("\n"));
    return { ok: true, data, body: lines.slice(end + 1).join("\n") };
  } catch (error) {
    const message = error instanceof Error ? (error.message.split("\n")[0] ?? "") : String(error);
    return { ok: false, problem: `the frontmatter is not valid YAML: ${message}` };
  }
}
