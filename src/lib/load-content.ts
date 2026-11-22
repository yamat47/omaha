import { readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { findContentProblems } from "./content-problems.ts";
import type { Page } from "./pages.ts";
import { parsePage } from "./parse-page.ts";

/**
 * The directory the pages are read from. `OMAHA_CONTENT_DIR` points the build and the validation
 * at another one (the fixtures under tests/fixtures/content/); a relative value is read from the
 * repository root, wherever the command was started.
 */
export function contentDir(root: URL, env: Readonly<Record<string, string | undefined>>): string {
  const { OMAHA_CONTENT_DIR: override } = env;
  return resolve(
    fileURLToPath(root),
    override === undefined || override === "" ? "content" : override,
  );
}

export type Content = { readonly pages: readonly Page[]; readonly problems: readonly string[] };

/** Every file under `dir`, as paths with forward slashes relative to it. A missing `dir` has none. */
async function listFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    return (
      entries
        .filter((entry) => entry.isFile())
        // Files of the editor and the system, which no one meant as a page.
        .filter((entry) => !entry.name.startsWith("."))
        .map((entry) => relative(dir, resolve(entry.parentPath, entry.name)).split(sep).join("/"))
        .sort()
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

/**
 * Reads every page under `dir` and checks them, each against the schema and all against each
 * other. A site with no page is a valid site: the directory may not exist.
 */
export async function loadContent(dir: string, now: Date): Promise<Content> {
  const pages: Page[] = [];
  const problems: string[] = [];

  for (const path of await listFiles(dir)) {
    const parsed = parsePage(path, await readFile(resolve(dir, path), "utf8"));
    if (parsed.ok) pages.push(parsed.page);
    else problems.push(...parsed.problems);
  }

  problems.push(...findContentProblems(pages, now));
  return { pages, problems: problems.sort() };
}
