import { type Page, pageKey } from "./pages.ts";

/**
 * The latest day a page may be dated as of `now`. The date of a page is the day in the author's
 * time zone, which can be a day ahead of UTC, so a check on UTC alone would refuse a page dated
 * today in the morning. UTC+14 is the furthest ahead any zone is.
 */
export function latestUpdated(now: Date): string {
  return new Date(now.getTime() + 14 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * The rules that span pages: a title belongs to one page, a related page exists, and no page
 * is dated after today. The rules of a single file are in the schema.
 */
export function findContentProblems(pages: readonly Page[], now: Date): string[] {
  const problems: string[] = [];
  const keys = new Set(pages.map((page) => pageKey(page.type, page.slug)));
  const latest = latestUpdated(now);
  const titles = new Map<string, Page>();

  for (const page of pages) {
    const title = page.data.title.toLowerCase();
    const first = titles.get(title);
    if (first === undefined) titles.set(title, page);
    else
      problems.push(
        `${page.path}: the title "${page.data.title}" is also the title of ${first.path}`,
      );

    for (const ref of page.data.related ?? []) {
      if (ref === pageKey(page.type, page.slug)) {
        problems.push(`${page.path}: related: lists the page itself`);
      } else if (!keys.has(ref)) {
        problems.push(`${page.path}: related: ${ref} is not a page`);
      }
    }

    if (page.data.updated > latest) {
      problems.push(`${page.path}: updated: ${page.data.updated} is in the future`);
    }
  }

  return problems;
}
