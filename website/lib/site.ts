import type { Metadata } from "next";

export const siteConfig = {
  name: "Elevare",
  title: "Elevare",
  description:
    "Join the Elevare waitlist and explore the connected ecosystem around coaching, tracking, and prep.",
  url: "https://www.elevarefit.org",
  waitlist: {
    endpoint: "https://yozfzsudbcqjttepjnyg.supabase.co/functions/v1/resend-waitlist",
  },
  analytics: {
    googleAnalyticsId: "G-NL9H9SEZJ8",
  },
};

export type ProductName = "Logbook" | "StageLab" | "Elevare";
export type ProductStoreLink = {
  label: string;
  href: string;
  store: "ios" | "android";
};

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
    storeLinks?: ProductStoreLink[];
  }
> = {
  Logbook: {
    slug: "logbook",
    title: "Logbook",
    description:
      "A focused fitness tracker that makes workouts easier to record, review, and repeat with consistency.",
    status: "Live on iOS and Android",
    idealUser:
      "Lifters, athletes, and everyday users who want better visibility into their training.",
    ctaLabel: "Download on the App Store",
    ctaHref: "https://apps.apple.com/us/app/logbook-fitness-tracker/id6762474210",
    storeLinks: [
      {
        label: "Download on the App Store",
        href: "https://apps.apple.com/us/app/logbook-fitness-tracker/id6762474210",
        store: "ios",
      },
      {
        label: "Get it on Google Play",
        href: "https://play.google.com/store/apps/details?id=com.logbook.tracking",
        store: "android",
      },
    ],
  },
  StageLab: {
    slug: "stagelab",
    title: "StageLab",
    description:
      "A competition prep app built for more deliberate structure, cleaner feedback loops, and better planning.",
    status: "Live on iOS",
    idealUser:
      "Coaches and competitors who think in systems, prep phases, and performance structure.",
    ctaLabel: "Download on the App Store",
    ctaHref: "https://apps.apple.com/app/stagelab-competition-prep/id6764351799",
    storeLinks: [
      {
        label: "Download on the App Store",
        href: "https://apps.apple.com/app/stagelab-competition-prep/id6764351799",
        store: "ios",
      },
    ],
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
  canonicalPath,
  type = "website",
}: {
  title: string;
  description: string;
  pathname: string;
  canonicalPath?: string;
  type?: "website" | "article";
}): Metadata {
  const canonical = canonicalPath ?? pathname;
  const url = absoluteUrl(canonical);

  return {
    title,
    description,
    alternates: {
      canonical,
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
