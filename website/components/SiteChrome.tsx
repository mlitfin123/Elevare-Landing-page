"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { stripLocalePrefix } from "@/lib/i18n/config";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const focusedStart = stripLocalePrefix(usePathname()) === "/stagelab/start/";

  return (
    <div className="site-shell">
      {focusedStart ? null : <Header />}
      <main className="page-main">{children}</main>
      {focusedStart ? null : <Footer />}
    </div>
  );
}
