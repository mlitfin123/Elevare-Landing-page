"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthNavigationLink } from "@/components/AuthNavigationLink";
import { LanguageSelector } from "@/components/localization/LanguageSelector";
import { localeFromPathname, localizePathname } from "@/lib/i18n/config";
import { getShellMessages } from "@/lib/i18n/shell-messages";

const navigation = [
  { href: "/calculators/", label: "tools" },
  { href: "/exercises/", label: "exercises" },
  { href: "/workouts/", label: "workouts" },
  { href: "/nutrition/", label: "nutrition" },
  { href: "/apps/", label: "apps" },
  { href: "/shop/", label: "shop" },
  { href: "/blog/", label: "blog" },
  { href: "/professionals/", label: "findSupport" },
] as const;

export function Header() {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const messages = getShellMessages(locale);
  const localizedHome = localizePathname("/", locale);
  const signInHref = `/sign-in/?redirect=${encodeURIComponent(localizedHome)}`;
  const englishOnlyHrefLang = locale === "en" ? undefined : "en";

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand-lockup" href={localizedHome}>
          <span className="brand-mark" aria-hidden="true">
            <Image
              className="brand-mark-image"
              src="/logo_transparent.png"
              alt=""
              width={34}
              height={34}
              priority
            />
          </span>
          <span className="brand-copy">
            <span className="brand-word">ElevareFit</span>
            <span className="brand-sub">{messages.brandSubtitle}</span>
          </span>
        </Link>

        <nav className="header-nav" aria-label={messages.primaryNavigationLabel}>
          {navigation.map((item) => (
            <Link
              key={item.href}
              className="nav-link"
              href={item.label === "tools" || item.label === "exercises" || item.label === "workouts" || item.label === "nutrition" ? localizePathname(item.href, locale) : item.href}
              hrefLang={item.label === "tools" || item.label === "exercises" || item.label === "workouts" || item.label === "nutrition" ? undefined : englishOnlyHrefLang}
            >
              {messages.navigation[item.label]}
            </Link>
          ))}
          <AuthNavigationLink
            className="button-link"
            signedInLabel={messages.authentication.signedIn}
            signInLabel={messages.authentication.signIn}
            signInHref={signInHref}
            hrefLang={englishOnlyHrefLang}
          />
          <LanguageSelector />
        </nav>
      </div>
    </header>
  );
}
