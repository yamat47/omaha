import { Text } from "@yamat47/pylon";
import type { Source } from "../lib/schema.ts";

/** The sources of a page: each as a link with its title, and under it whose view it is. */
export function Sources({ sources }: { sources: readonly Source[] }) {
  return (
    <ul>
      {sources.map((source) => (
        <li key={source.url}>
          <a href={source.url}>{source.title}</a>
          <Text variant="small" tone="muted">
            {[source.author, source.publisher].filter((part) => part !== undefined).join(", ")}
          </Text>
        </li>
      ))}
    </ul>
  );
}
