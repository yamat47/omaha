import { satteri } from "@astrojs/markdown-satteri";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { SITE } from "./src/site.ts";

export default defineConfig({
  site: SITE.url,

  // GitHub Pages serves a directory at a URL that ends in a slash without a redirect, and every
  // link on the site is written that way.
  trailingSlash: "always",

  // The pages are made of the design system's components (@yamat47/pylon), which are React. None
  // is hydrated: they are rendered to HTML when the site is built, and no page ships React.
  integrations: [react(), sitemap()],

  markdown: {
    // A page reaches the reader as it was typed: "..." stays three dots, quotes stay straight and
    // "--" stays two hyphens.
    processor: satteri({ features: { smartPunctuation: false } }),

    // Code is left as plain text, which the design system sets on its tint. It has no colors for
    // highlighted code, and a highlighter's own would not follow its light and dark.
    syntaxHighlight: false,
  },
});
