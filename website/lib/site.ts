import type { Metadata } from "next";

export const siteConfig = {
  name: "Elevare",
  title: "Elevare Ecosystem",
  description:
    "A clean, performance-focused content hub for Elevare, Logbook, and StageLab.",
  url: "https://elevarefit.org",
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
      "A simple tracking app for workouts, habits, and training consistency.",
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
      "A competition prep and performance workflow product for testing, refining, and staging high-output systems.",
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
      "A fitness coaching marketplace built to help the right members find the right coaches.",
    status: "Waitlist open",
    idealUser:
      "People looking for coaching and coaches looking for better discovery and fit.",
    ctaLabel: "Find or join coaching on Elevare",
    ctaHref: "/elevare",
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
