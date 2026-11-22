import { type Frontmatter, PAGE_TYPES, type PageType, SLUG_PATTERN } from "./schema.ts";

/** A page of the wiki as the validation and the site read it. */
export type Page = {
  /** The file's path under the content directory, with forward slashes. */
  readonly path: string;
  readonly type: PageType;
  readonly slug: string;
  readonly data: Frontmatter;
  readonly body: string;
};

/** The id of a page in the content collection and in `related`: `schemes/inside-zone`. */
export function pageKey(type: PageType, slug: string): string {
  return `${type}/${slug}`;
}

/** The URL path of a page, with the slash every URL of the site ends in. */
export function pagePath(type: PageType, slug: string): string {
  return `/${type}/${slug}/`;
}

export function isPageType(value: string): value is PageType {
  return (PAGE_TYPES as readonly string[]).includes(value);
}

export type Located = { ok: true; type: PageType; slug: string } | { ok: false; problem: string };

/**
 * Reads the type and the slug of a page from where its file is: `schemes/inside-zone.md`.
 * `path` is relative to the content directory and uses forward slashes.
 */
export function locatePage(path: string): Located {
  const parts = path.split("/");
  const [type, file] = parts;
  if (parts.length !== 2 || type === undefined || file === undefined) {
    return { ok: false, problem: "a page lives at <type>/<slug>.md, one directory below content/" };
  }
  if (!isPageType(type)) {
    return { ok: false, problem: `${type}/ is not a type; the types are ${PAGE_TYPES.join(", ")}` };
  }
  if (!file.endsWith(".md")) return { ok: false, problem: "a page is a .md file" };

  const slug = file.slice(0, -".md".length);
  if (!SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      problem: `the slug "${slug}" is not lower-case letters, digits and hyphens`,
    };
  }
  return { ok: true, type, slug };
}
