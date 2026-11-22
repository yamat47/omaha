import { type LinkItem, Page, SiteFooter, SiteHeader } from "@yamat47/pylon";
import type { ComponentProps, ReactNode } from "react";
import { TYPES } from "../lib/types.ts";
import { ABOUT, SITE } from "../site.ts";

/** How wide a page's content is: `wide` for a list, `text` for a page to read. */
export type PageWidth = ComponentProps<typeof Page>["width"];

type SiteFrameProps = {
  width: PageWidth;
  /** The URL path of the page, which marks its entry in the header as the current one. */
  path: string;
  /** Whether the site's name is the page's heading, which it is on the top page alone. */
  nameIsHeading: boolean;
  children?: ReactNode;
};

// The footer's links: the pages of the site, and where a correction goes.
const footerGroups = [
  {
    label: "Pages",
    links: [
      ...TYPES.map(({ label, href }) => ({ label, href })),
      { label: ABOUT.title, href: ABOUT.href },
    ],
  },
  { label: "Source", links: [{ label: "GitHub", href: SITE.repositoryUrl }] },
];

// The copyright is stated for the year the site is built in.
const copyright = { year: new Date().getUTCFullYear(), holder: SITE.author };

/**
 * What every page has around its content: the design system's page, with this site's header and
 * footer in it.
 *
 * It is a React component because the page takes its header and footer as props. A layout written
 * in Astro can only hand them over as named slots, which the typecheck does not count as the
 * props the page requires. It is rendered when the site is built and ships no script.
 */
export function SiteFrame({ width, path, nameIsHeading, children }: SiteFrameProps) {
  const nav: LinkItem[] = TYPES.map(({ label, href }) => ({
    label,
    href,
    current: path.startsWith(href),
  }));

  return (
    <Page
      width={width}
      header={
        <SiteHeader
          name={SITE.name}
          href="/"
          description={SITE.description}
          heading={nameIsHeading}
          nav={nav}
        />
      }
      footer={<SiteFooter name={SITE.name} href="/" groups={footerGroups} copyright={copyright} />}
    >
      {children}
    </Page>
  );
}
