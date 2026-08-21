import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { DM_Mono, DM_Sans } from "next/font/google";
import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { StructuredData } from "@/components/StructuredData";
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
    <html lang="en">
      <body className={`${dmSans.variable} ${dmMono.variable}`}>
        <StructuredData data={buildSiteStructuredData()} />
        {googleAnalyticsId ? <AnalyticsConsent measurementId={googleAnalyticsId} /> : null}
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
