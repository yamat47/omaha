import { findBodyProblems } from "./body-problems.ts";
import { splitFrontmatter } from "./frontmatter.ts";
import { locatePage, type Page } from "./pages.ts";
import { Frontmatter } from "./schema.ts";

export type Parsed = { ok: true; page: Page } | { ok: false; problems: string[] };

/** Turns one file into a page, or into every problem found with it, as `path: problem` lines. */
export function parsePage(path: string, text: string): Parsed {
  const located = locatePage(path);
  if (!located.ok) return { ok: false, problems: [`${path}: ${located.problem}`] };

  const split = splitFrontmatter(text);
  if (!split.ok) return { ok: false, problems: [`${path}: ${split.problem}`] };

  const problems: string[] = [];
  const parsed = Frontmatter.safeParse(split.data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      // An unknown key is reported on the object that holds it, with the keys in a list.
      if (issue.code === "unrecognized_keys") {
        const where = issue.path.map((part) => `${String(part)}.`).join("");
        for (const key of issue.keys) problems.push(`${path}: ${where}${key}: unknown key`);
        continue;
      }
      const key = issue.path.join(".");
      problems.push(`${path}: ${key === "" ? "" : `${key}: `}${issue.message}`);
    }
  }
  for (const problem of findBodyProblems(split.body)) problems.push(`${path}: ${problem}`);

  if (!parsed.success || problems.length > 0) return { ok: false, problems };
  return {
    ok: true,
    page: { path, type: located.type, slug: located.slug, data: parsed.data, body: split.body },
  };
}
