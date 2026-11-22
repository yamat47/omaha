import { type CollectionEntry, getCollection } from "astro:content";
import type { Entry } from "./listing.ts";
import { isPageType, pagePath } from "./pages.ts";
import type { PageType } from "./schema.ts";

export type SitePage = CollectionEntry<"pages">;

/** The type and the slug of an entry, which its id spells as `schemes/inside-zone`. */
export function locate(page: SitePage): { type: PageType; slug: string } {
  const [type, slug] = page.id.split("/");
  if (type === undefined || slug === undefined || !isPageType(type)) {
    throw new Error(`${page.id} is not <type>/<slug>`);
  }
  return { type, slug };
}

export const hrefOf = (page: SitePage): string => {
  const { type, slug } = locate(page);
  return pagePath(type, slug);
};

export function toEntry(page: SitePage): Entry {
  const { type, slug } = locate(page);
  const { title, summary, area, updated } = page.data;
  return { type, slug, title, summary, area, updated };
}

let all: Promise<SitePage[]> | undefined;

/**
 * Every page. A build reads the collection once and not once per page rendered, which also says
 * once, and not once per page, that a site with no page has an empty collection. The dev server
 * reads it again every time, because its pages change under it.
 */
export function getPages(): Promise<SitePage[]> {
  if (import.meta.env.DEV) return getCollection("pages");
  all ??= getCollection("pages");
  return all;
}
