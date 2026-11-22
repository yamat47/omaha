/** What every page says about the site, and where a visitor can send a correction. */
export const SITE = {
  name: "omaha",
  url: "https://omaha.yamat47.me",
  description:
    "A wiki of American football: schemes, techniques and drills across the whole game, written from what coaches publish about their own systems.",
  lang: "en",
  // Named in the copyright line of the footer.
  author: "yamat47",
  repositoryUrl: "https://github.com/yamat47/omaha",
} as const;

/** The page there is one of that is not a page of the wiki. */
export const ABOUT = { href: "/about/", title: "About" } as const;
