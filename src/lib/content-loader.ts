import type { Loader } from "astro/loaders";
import { contentDir, loadContent } from "./load-content.ts";
import { pageKey } from "./pages.ts";

/**
 * Reads the pages with the code the validation script runs, so that a page which validates
 * builds. The glob loader would read the frontmatter with its own YAML parser, which turns a
 * date into a `Date`, and the schema would need a second form to accept both.
 */
export function contentLoader(): Loader {
  return {
    name: "omaha-content",
    async load({ config, store, parseData, renderMarkdown, generateDigest, watcher, logger }) {
      const dir = contentDir(config.root, process.env);

      const reload = async () => {
        const { pages, problems } = await loadContent(dir, new Date());
        if (problems.length > 0) {
          throw new Error(`The content has problems:\n${problems.join("\n")}`);
        }

        store.clear();
        for (const page of pages) {
          const id = pageKey(page.type, page.slug);
          const data = await parseData({ id, data: page.data, filePath: page.path });
          store.set({
            id,
            data,
            body: page.body,
            filePath: page.path,
            digest: generateDigest({ data: page.data, body: page.body }),
            rendered: await renderMarkdown(page.body),
          });
        }
      };

      await reload();

      // The dev server reads the files again when one of them changes.
      watcher?.add(dir);
      watcher?.on("all", (_event, changed) => {
        if (!changed.startsWith(dir)) return;
        reload().catch((error: unknown) => {
          logger.error(error instanceof Error ? error.message : String(error));
        });
      });
    },
  };
}
