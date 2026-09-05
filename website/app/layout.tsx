import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { DM_Mono, DM_Sans } from "next/font/google";
import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { Footer } from "@/components/Footer";
import { GoogleAnalyticsPageTracker } from "@/components/GoogleAnalyticsPageTracker";
import { Header } from "@/components/Header";
import { LocaleRuntime } from "@/components/localization/LocaleRuntime";
import { StructuredData } from "@/components/StructuredData";
import { buildGoogleAnalyticsBootstrap } from "@/lib/analytics-consent";
import { buildSiteStructuredData, siteConfig } from "@/lib/site";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.title}`,
  },
  description: siteConfig.description,
  openGraph: {
    siteName: siteConfig.title,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleAnalyticsId = siteConfig.analytics.googleAnalyticsId;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {googleAnalyticsId ? (
          <>
            <Script
              id="google-analytics-consent-default"
              strategy="beforeInteractive"
              dangerouslySetInnerHTML={{ __html: buildGoogleAnalyticsBootstrap(googleAnalyticsId) }}
            />
            <Script
              id="google-analytics-script"
              src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalyticsId)}`}
              strategy="afterInteractive"
            />
          </>
        ) : null}
      </head>
      <body className={`${dmSans.variable} ${dmMono.variable}`}>
        <LocaleRuntime />
        <StructuredData data={buildSiteStructuredData()} />
        {googleAnalyticsId ? (
          <>
            <AnalyticsConsent />
            <GoogleAnalyticsPageTracker measurementId={googleAnalyticsId} />
          </>
        ) : null}
        <div className="site-shell">
          <Header />
          <main className="page-main">{children}</main>
          <Footer />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
