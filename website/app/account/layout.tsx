import type { Metadata } from "next";
import { MarketplaceAccountShell } from "@/components/marketplace/MarketplaceAccountShell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="container">
      <MarketplaceAccountShell>{children}</MarketplaceAccountShell>
    </div>
  );
}
