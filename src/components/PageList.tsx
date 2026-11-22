import { Text } from "@yamat47/pylon";
import type { Entry } from "../lib/listing.ts";
import { pagePath } from "../lib/pages.ts";

/** Pages as a list: the title as a link, and under it the summary. */
export function PageList({ entries }: { entries: readonly Entry[] }) {
  return (
    <ul>
      {entries.map((entry) => (
        <li key={`${entry.type}/${entry.slug}`}>
          <a href={pagePath(entry.type, entry.slug)}>{entry.title}</a>
          <Text variant="small" tone="muted">
            {entry.summary}
          </Text>
        </li>
      ))}
    </ul>
  );
}
