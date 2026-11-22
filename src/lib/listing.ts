import { AREA_LABELS, AREAS, type Area, type PageType } from "./schema.ts";

/** What a list shows of a page. */
export type Entry = {
  readonly type: PageType;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly area: Area;
  /** YYYY-MM-DD */
  readonly updated: string;
};

const byTitle = (a: Entry, b: Entry) =>
  a.title.localeCompare(b.title, "en", { sensitivity: "base" }) || a.slug.localeCompare(b.slug);

/** The pages by title, as one alphabetical list. */
export function alphabetical(entries: readonly Entry[]): Entry[] {
  return [...entries].sort(byTitle);
}

/** The pages of each area that has one, in the order of the areas and by title within one. */
export function groupByArea(
  entries: readonly Entry[],
): { area: Area; label: string; entries: Entry[] }[] {
  return AREAS.flatMap((area) => {
    const inArea = entries.filter((entry) => entry.area === area);
    return inArea.length === 0
      ? []
      : [{ area, label: AREA_LABELS[area], entries: inArea.sort(byTitle) }];
  });
}

/** The `count` pages changed most recently, newest first; pages of one day go by title. */
export function recentlyChanged(entries: readonly Entry[], count: number): Entry[] {
  return [...entries]
    .sort((a, b) => b.updated.localeCompare(a.updated) || byTitle(a, b))
    .slice(0, count);
}

export function countByType(entries: readonly Entry[], type: PageType): number {
  return entries.filter((entry) => entry.type === type).length;
}

/** "1 page", "3 pages". */
export function pageCount(count: number): string {
  return `${count} ${count === 1 ? "page" : "pages"}`;
}
