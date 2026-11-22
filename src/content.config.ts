import { defineCollection } from "astro:content";
import { contentLoader } from "./lib/content-loader.ts";
import { Frontmatter } from "./lib/schema.ts";

// The pages of the wiki, under content/ at the repository root and not under src/: the people
// who write and edit pages never touch the site's code. The id of an entry is its address
// without the slashes, `schemes/inside-zone`.
const pages = defineCollection({
  loader: contentLoader(),
  schema: Frontmatter,
});

export const collections = { pages };
