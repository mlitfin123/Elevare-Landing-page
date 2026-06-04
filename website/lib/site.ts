import type { Metadata } from "next";

export const siteConfig = {
  name: "Elevare",
  title: "Elevare",
  description:
    "Join the Elevare waitlist and explore the connected ecosystem around coaching, tracking, and prep.",
  url: "https://www.elevarefit.org",
  analytics: {
    googleAnalyticsId: "G-NL9H9SEZJ8",
  },
};

export type ProductName = "Logbook" | "StageLab" | "Elevare";

export const productConfig: Record<
  ProductName,
  {
    slug: string;
    title: string;
    description: string;
    status: string;
    idealUser: string;
    ctaLabel: string;
    ctaHref: string;
  }
> = {
  Logbook: {
    slug: "logbook",
    title: "Logbook",
    description:
      "A focused fitness tracker that makes workouts easier to record, review, and repeat with consistency.",
    status: "Live now",
    idealUser:
      "Lifters, athletes, and everyday users who want better visibility into their training.",
    ctaLabel: "Download Logbook",
    ctaHref: "https://apps.apple.com/us/app/logbook-fitness-tracker/id6762474210",
  },
  StageLab: {
    slug: "stagelab",
    title: "StageLab",
    description:
      "A competition prep app built for more deliberate structure, cleaner feedback loops, and better planning.",
    status: "Coming soon",
    idealUser:
      "Coaches and competitors who think in systems, prep phases, and performance structure.",
    ctaLabel: "Learn about StageLab",
    ctaHref: "/stagelab",
  },
  Elevare: {
    slug: "elevare",
    title: "Elevare",
    description:
      "A coaching marketplace built to help members find the right coach and help coaches get discovered by the right people.",
    status: "Waitlist open",
    idealUser:
      "People looking for coaching and coaches looking for better discovery and fit.",
    ctaLabel: "Join the Elevare waitlist",
    ctaHref: "/#waitlist",
  },
};

export function absoluteUrl(pathname: string) {
  return new URL(pathname, siteConfig.url).toString();
}

export function buildMetadata({
  title,
  description,
  pathname,
  type = "website",
}: {
  title: string;
  description: string;
  pathname: string;
  type?: "website" | "article";
}): Metadata {
  const url = absoluteUrl(pathname);

  return {
    title,
    description,
    alternates: {
      canonical: pathname,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.title,
      type,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
