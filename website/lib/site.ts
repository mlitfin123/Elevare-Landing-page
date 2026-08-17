import type { Metadata } from "next";

export const siteConfig = {
  name: "ElevareFit",
  title: "ElevareFit",
  description:
    "ElevareFit is a fitness platform with free tools, exercise guides, workout templates, nutrition resources, tracking apps, and a marketplace for finding the right support.",
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

export type UpcomingPlatformLink = {
  label: "iOS" | "Android";
  available: boolean;
  url?: string;
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
    status: "Live on iOS and Android",
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
      {
        label: "Get it on Google Play",
        href: "https://play.google.com/store/apps/details?id=com.stagelab.app",
        store: "android",
      },
    ],
  },
  Elevare: {
    slug: "elevare",
    title: "Elevare",
    description:
      "A marketplace built to help people find the right health, fitness, or wellness support and help good-fit profiles get discovered more clearly.",
    status: "Web live - iOS & Android coming soon",
    idealUser:
      "People looking for support and coaches, trainers, and wellness providers who want a clearer discovery path.",
    ctaLabel: "Find your match",
    ctaHref: "/professionals",
  },
};

export const elevareMobileAppConfig = {
  heading: "Elevare is coming to iOS & Android",
  statusLabel: "Coming Soon",
  description:
    "Find, connect with, and manage your fitness and wellness support from anywhere. Your Elevare account and profile will carry over to the mobile app when it launches.",
  webNowTitle: "Use Elevare on the web now.",
  webNowDescription:
    "Browse profiles, save good-fit options, and request consultations today so you do not need to start from scratch later.",
  continuityTitle: "Your web account will be ready on mobile.",
  continuityDescription:
    "Join on the web now. Your Elevare account and profile will carry over to the mobile app when it launches.",
  proTitle: "Build your presence before the app launches.",
  proDescription:
    "Create your Elevare profile now so you're ready to be discovered as the marketplace expands to iOS and Android.",
  proCarryOverDescription:
    "Your public profile details will carry over when the mobile app launches.",
  platforms: [
    {
      label: "iOS",
      available: false,
      url: undefined,
    },
    {
      label: "Android",
      available: false,
      url: undefined,
    },
  ] satisfies UpcomingPlatformLink[],
} as const;

function hasFileExtension(pathname: string) {
  return /\.[a-z0-9]+$/i.test(pathname);
}

export function normalizeSitePath(pathname: string) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  const [pathWithQuery, hash = ""] = pathname.split("#");
  const [rawPath, search = ""] = pathWithQuery.split("?");
  const normalizedPath =
    rawPath === "/" || hasFileExtension(rawPath) ? rawPath : rawPath.endsWith("/") ? rawPath : `${rawPath}/`;

  return `${normalizedPath}${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`;
}

export function absoluteUrl(pathname: string) {
  return new URL(normalizeSitePath(pathname), siteConfig.url).toString();
}

export function buildMetadata({
  title,
  description,
  pathname,
  canonicalPath,
  type = "website",
  robots,
}: {
  title: string;
  description: string;
  pathname: string;
  canonicalPath?: string;
  type?: "website" | "article";
  robots?: Metadata["robots"];
}): Metadata {
  const canonical = normalizeSitePath(canonicalPath ?? pathname);
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
    robots,
  };
}
