"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthNavigationLink } from "@/components/AuthNavigationLink";
import { TrackedLink } from "@/components/TrackedLink";
import { LanguageSelector } from "@/components/localization/LanguageSelector";
import { localizePathname, localeFromPathname, stripLocalePrefix } from "@/lib/i18n/config";
import { getShellMessages } from "@/lib/i18n/shell-messages";
import { analysisDiscoveryCopy, getStageAnalysisEntryHref } from "@/lib/stage-analysis-discovery";
import { STAGE_ANALYSIS_PRODUCTS } from "@/lib/stage-analysis";

const labels = {
  en: { find: "Find a Professional", free: "Free Resources", pro: "For Professionals", menu: "Menu", close: "Close menu", shop: "Shop", allShop: "Explore the Shop", physical: "Physical products", hub: "All free resources", blog: "Blog · English" },
  "es-419": { find: "Encontrar un profesional", free: "Recursos gratis", pro: "Para profesionales", menu: "Menú", close: "Cerrar menú", shop: "Tienda", allShop: "Explorar la tienda · Inglés", physical: "Productos físicos · Inglés", hub: "Todos los recursos gratis", blog: "Blog · Inglés" },
  "pt-BR": { find: "Encontrar um profissional", free: "Recursos grátis", pro: "Para profissionais", menu: "Menu", close: "Fechar menu", shop: "Loja", allShop: "Explorar a loja · Inglês", physical: "Produtos físicos · Inglês", hub: "Todos os recursos grátis", blog: "Blog · Inglês" },
} as const;

export function Header() {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const messages = getShellMessages(locale);
  const m = labels[locale];
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const localizedHome = localizePathname("/", locale);
  const href = (path: string) => localizePathname(path, locale);
  const current = stripLocalePrefix(pathname);
  const isActive = (path: string) => current.startsWith(path);
  const closeDisclosures = () => root.current?.querySelectorAll("details[open]").forEach((node) => node.removeAttribute("open"));
  useEffect(() => {
    const onOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) closeDisclosures();
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, []);
  return (
    <header className="site-header discovery-header" ref={root}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        const disclosure = (event.target as HTMLElement).closest("details[open]");
        if (disclosure) {
          disclosure.removeAttribute("open");
          disclosure.querySelector("summary")?.focus();
        } else { setOpen(false); menuButton.current?.focus(); }
      }}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) { setOpen(false); closeDisclosures(); }
      }}>
      <div className="container header-inner">
        <Link className="brand-lockup" href={localizedHome}>
          <span className="brand-mark" aria-hidden="true"><Image className="brand-mark-image" src="/logo_transparent.png" alt="" width={34} height={34} priority /></span>
          <span className="brand-copy"><span className="brand-word">ElevareFit</span><span className="brand-sub">{messages.brandSubtitle}</span></span>
        </Link>
        <button ref={menuButton} className="header-menu-toggle" aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>{open ? m.close : m.menu}<span aria-hidden="true">{open ? " ×" : " ☰"}</span></button>
        <nav id="primary-navigation" className={`header-nav${open ? " is-open" : ""}`} aria-label={messages.primaryNavigationLabel}>
          <Link className="nav-link" href={href("/professionals/")} aria-current={isActive("/professionals/") ? "page" : undefined}>{m.find}</Link>
          <details name="primary-menu" className="nav-disclosure">
            <summary className="nav-link" data-active={["/calculators/", "/exercises/", "/workouts/", "/nutrition/", "/blog/"].some(isActive)}>{m.free}</summary>
            <div className="nav-dropdown">
              <Link href={href("/calculators/")}>{m.hub}</Link>
              <Link href={href("/calculators/")}>{locale === "en" ? "Calculators" : locale === "es-419" ? "Calculadoras" : "Calculadoras"}</Link>
              <Link href={href("/workouts/")}>{messages.navigation.workouts}</Link>
              <Link href={href("/exercises/")}>{messages.navigation.exercises}</Link>
              <Link href={href("/nutrition/")}>{messages.navigation.nutrition}</Link>
              <Link href="/blog/" hrefLang="en">{locale === "en" ? "Blog" : m.blog}</Link>
            </div>
          </details>
          <details name="primary-menu" className="nav-disclosure">
            <summary className="nav-link" data-active={isActive("/logbook/") || isActive("/stagelab/")}>{messages.navigation.apps}</summary>
            <div className="nav-dropdown"><Link href={href("/logbook/")}>Logbook</Link><Link href={href("/stagelab/")}>StageLab</Link></div>
          </details>
          <details name="primary-menu" className="nav-disclosure">
            <summary className="nav-link" data-active={isActive("/shop/")}>{m.shop}</summary>
            <div className="nav-dropdown nav-shop-dropdown">
              <Link href="/shop/" hrefLang="en">{m.allShop}</Link>
              {STAGE_ANALYSIS_PRODUCTS.map((product) => <TrackedLink key={product} href={getStageAnalysisEntryHref(product, "navigation", locale)} eventName="stage_analysis_product_selected" eventParams={{ analysis_product: product, source: "navigation" }}>{analysisDiscoveryCopy[locale].products[product].title}</TrackedLink>)}
              <Link href="/shop/#physical-products" hrefLang="en">{m.physical}</Link>
            </div>
          </details>
          <Link className="nav-link" href={href("/account/professional-profile/")} aria-current={isActive("/account/professional-profile/") ? "page" : undefined}>{m.pro}</Link>
          <AuthNavigationLink className="button-link" signedInLabel={messages.authentication.signedIn} signInLabel={messages.authentication.signIn} signInHref={`/sign-in/?redirect=${encodeURIComponent(localizedHome)}`} signedInHref={href("/account/")} />
          <LanguageSelector />
        </nav>
      </div>
    </header>
  );
}
