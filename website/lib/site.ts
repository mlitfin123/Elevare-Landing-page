import type { Metadata } from "next";

export const PRIMARY_SITE_ORIGIN = "https://www.elevarefit.com";
export const LEGACY_SITE_ORIGINS = [
  "https://www.elevarefit.org",
  "https://elevarefit.org",
] as const;

export const siteConfig = {
  name: "ElevareFit",
  title: "ElevareFit",
  description:
    "Discover trainers, coaches, nutrition professionals, wellness specialists, free fitness tools, and tracking apps on ElevareFit.",
  url: PRIMARY_SITE_ORIGIN,
  waitlist: {
    endpoint: "https://yozfzsudbcqjttepjnyg.supabase.co/functions/v1/resend-waitlist",
  },
  analytics: {
    googleAnalyticsId: "G-NL9H9SEZJ8",
  },
  contacts: {
    business: process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? "mlitfin@elevarefit.org",
    support: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "mlitfin@elevarefit.org",
    privacy: process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? "mlitfin@elevarefit.org",
    legal: process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? "mlitfin@elevarefit.org",
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
      "A fitness tracker for recording workouts, food, macros, bodyweight, and progress.",
    status: "Live on iOS and Android",
    idealUser:
      "Lifters, athletes, and everyday users who want one daily training and nutrition log.",
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
      "A competition prep app for check-ins, progress photos, prep timelines, and weekly plan recommendations.",
    status: "Live on iOS and Android",
    idealUser:
      "Physique athletes and coaches managing bodybuilding contest prep.",
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
      "A marketplace for comparing professionals by specialty, location, service mode, pricing, and credentials.",
    status: "Web live - iOS & Android coming soon",
    idealUser:
      "People looking for support and professionals who want to publish their services.",
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

function buildPageTitle(title: string) {
  const alreadyBranded = /(^Elevare(?:Fit)?\s*\|)|\|\s*Elevare(?:Fit)?$/i.test(title);
  return alreadyBranded ? title : `${title} | ${siteConfig.title}`;
}

export function buildSiteStructuredData() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: "Elevare Fit LLC",
      alternateName: siteConfig.name,
      url: siteConfig.url,
      logo: absoluteUrl("/logo_transparent.png"),
      email: siteConfig.contacts.business,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      name: siteConfig.name,
      url: siteConfig.url,
      publisher: {
        "@id": `${siteConfig.url}/#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: `${absoluteUrl("/professionals/")}?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

export function buildMetadata({
  title,
  description,
  pathname,
  canonicalPath,
  type = "website",
  robots,
  imageUrl,
}: {
  title: string;
  description: string;
  pathname: string;
  canonicalPath?: string;
  type?: "website" | "article";
  robots?: Metadata["robots"];
  imageUrl?: string;
}): Metadata {
  const canonical = normalizeSitePath(canonicalPath ?? pathname);
  const url = absoluteUrl(canonical);
  const pageTitle = buildPageTitle(title);
  const socialImage = imageUrl
    ? imageUrl.startsWith("/") ? absoluteUrl(imageUrl) : imageUrl
    : absoluteUrl("/logo_transparent.png");

  return {
    title: {
      absolute: pageTitle,
    },
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: pageTitle,
      description,
      url,
      siteName: siteConfig.title,
      type,
      images: [{ url: socialImage, alt: pageTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [socialImage],
    },
    robots,
  };
}
